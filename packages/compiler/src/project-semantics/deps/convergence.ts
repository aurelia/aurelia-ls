/**
 * Convergence Algebra — Per-Field Operator Implementation
 *
 * Merges observation claims into conclusion claims using the five
 * operators from L1 convergence.md and L3 product.md.
 *
 * Operators:
 * - locked-identity: detect conflicts on identity fields
 * - known-over-unknown: backfill known values past unknown/absent
 * - stable-union: collect from all, deduplicate; unknown poisons
 * - patch-object: union of keys, per-key higher-rank wins
 * - first-defined: highest-rank candidate that has a value
 * - first-available: first candidate that carries (stratum 2)
 *
 * Evidence ranking (highest to lowest):
 *   explicit-config > manifest > analysis-explicit > analysis-convention > builtin
 */

import type { GreenValue } from '../../value/green.js';
import type { Sourced } from '../../value/sourced.js';
import type { EvidenceSource, EvidenceTier, ObservationEntry, ConvergenceFunction } from './types.js';

// =============================================================================
// Evidence Ranking
// =============================================================================

const RANK: Record<string, number> = {
  'config': 5,
  'manifest': 4,
  'analysis-explicit': 3,
  'analysis-convention': 2,
  'builtin': 1,
};

function rank(tier: EvidenceTier | string): number {
  return RANK[tier] ?? 0;
}

function sortByRank(observations: readonly ObservationEntry[]): ObservationEntry[] {
  return [...observations].sort((a, b) => rank(b.source.tier) - rank(a.source.tier));
}

// =============================================================================
// Operator Classification
// =============================================================================

type Operator =
  | 'locked-identity'
  | 'known-over-unknown'
  | 'stable-union'
  | 'patch-object'
  | 'first-defined'
  | 'first-available';

/**
 * Determine the operator for a given field path.
 *
 * Derived from L3 product.md §2.3-§2.10 and §3.1.
 */
function getOperator(fieldPath: string): Operator {
  // Identity fields
  if (fieldPath === 'name' || fieldPath === 'className') return 'locked-identity';

  // Bindable sub-fields: property is identity, rest are known-over-unknown
  if (fieldPath.startsWith('bindable:')) {
    const subField = fieldPath.split(':')[2];
    if (subField === 'property') return 'locked-identity';
    return 'known-over-unknown';
  }

  // Collection fields
  if (fieldPath === 'aliases' || fieldPath === 'dependencies' || fieldPath === 'watches') {
    return 'stable-union';
  }

  // Behavioral fields (stratum 2)
  if (fieldPath.startsWith('semantics.') || fieldPath === 'semantics') {
    return 'first-available';
  }

  // Location fields
  if (fieldPath === 'file' || fieldPath === 'package') return 'first-defined';

  // Kind is preserved (identity-like)
  if (fieldPath === 'kind') return 'locked-identity';

  // All other fields: known-over-unknown
  // (containerless, capture, processContent, shadowOptions, enhance,
  //  strict, inlineTemplate, noMultiBindings, defaultProperty,
  //  containerStrategy)
  return 'known-over-unknown';
}

// =============================================================================
// Operator Implementations
// =============================================================================

/**
 * locked-identity: Higher rank wins. If values differ across observations,
 * winner takes the field value and a conflict is detected (NL-2).
 */
function applyLockedIdentity(
  sorted: ObservationEntry[],
): { green: GreenValue; red: Sourced<unknown>; conflict?: ConflictInfo } {
  const winner = sorted[0]!;

  // Check if any other observation disagrees
  for (let i = 1; i < sorted.length; i++) {
    if (greenToString(sorted[i]!.green) !== greenToString(winner.green)) {
      // NL-2: convergence creates a gap that no individual observation contained.
      // Winner's value is used; conflict metadata recorded.
      return {
        green: winner.green,
        red: winner.red,
        conflict: {
          field: '', // filled by caller
          winner: winner,
          loser: sorted[i]!,
          reason: sorted.length > 1 && rank(winner.source.tier) > rank(sorted[i]!.source.tier)
            ? 'resolved-by-evidence-rank'
            : 'resolved-by-canonical-order',
        },
      };
    }
  }

  return { green: winner.green, red: winner.red };
}

/** Conflict information for locked-identity disagreements (NL-2). */
interface ConflictInfo {
  field: string;
  winner: ObservationEntry;
  loser: ObservationEntry;
  reason: 'resolved-by-evidence-rank' | 'resolved-by-canonical-order';
}

/**
 * known-over-unknown: Highest-rank known value wins. If highest is
 * absent or unknown, backfill from lower rank. Information-monotone.
 */
function applyKnownOverUnknown(
  sorted: ObservationEntry[],
): { green: GreenValue; red: Sourced<unknown> } {
  // Find the first observation with a known value (not absent, not gap)
  for (const obs of sorted) {
    if (isKnown(obs)) {
      return { green: obs.green, red: obs.red };
    }
  }
  // No known values. Check if any are gaps (unknown) vs all absent.
  for (const obs of sorted) {
    if (isGap(obs)) {
      // Gap survives — return the gap observation
      return { green: obs.green, red: obs.red };
    }
  }
  // All absent → field is absent (not specified by anyone)
  return { green: { kind: 'literal', value: undefined }, red: sorted[0]!.red };
}

/**
 * stable-union: Collect from ALL observations, deduplicate.
 * If ANY observation is unknown, result is unknown (conservative —
 * the union is incomplete).
 */
function applyStableUnion(
  sorted: ObservationEntry[],
): { green: GreenValue; red: Sourced<unknown> } {
  // Filter out absent observations — they contribute nothing to the union.
  const effective = sorted.filter(obs => !isAbsent(obs));

  // If all observations were absent, the field is absent (not specified by anyone)
  if (effective.length === 0) {
    return { green: { kind: 'literal', value: undefined }, red: sorted[0]!.red };
  }

  // Check if any non-absent observation is unknown (gap) — poisons the union
  for (const obs of effective) {
    if (isGap(obs)) {
      return { green: obs.green, red: obs.red };
    }
  }

  // Collect all array elements, deduplicate.
  // Iterate lowest rank first to preserve first-occurrence order
  // (analysis observations registered before fixtures).
  const seen = new Set<string>();
  const elements: GreenValue[] = [];
  const reversed = [...effective].reverse();

  for (const obs of reversed) {
    if (obs.green.kind === 'array') {
      for (const el of obs.green.elements) {
        const key = greenToString(el);
        if (!seen.has(key)) {
          seen.add(key);
          elements.push(el);
        }
      }
    }
  }

  const green: GreenValue = { kind: 'array', elements };
  const value = elements.map(el => el.kind === 'literal' ? el.value : el);
  const red: Sourced<unknown> = { origin: 'source', state: 'known', value };
  return { green, red };
}

/**
 * first-defined: Highest-rank candidate that has a value.
 */
function applyFirstDefined(
  sorted: ObservationEntry[],
): { green: GreenValue; red: Sourced<unknown> } {
  for (const obs of sorted) {
    if (isKnown(obs)) {
      return { green: obs.green, red: obs.red };
    }
  }
  return { green: sorted[0]!.green, red: sorted[0]!.red };
}

/**
 * first-available: First candidate that carries the field (stratum 2).
 * No evidence competition.
 */
function applyFirstAvailable(
  sorted: ObservationEntry[],
): { green: GreenValue; red: Sourced<unknown> } {
  // Any observation that has the field — first one wins
  return { green: sorted[0]!.green, red: sorted[0]!.red };
}

// =============================================================================
// Helpers
// =============================================================================

function isKnown(obs: ObservationEntry): boolean {
  if (obs.green.kind === 'unknown') return false;
  // Absent: literal undefined represents "evaluated, field not specified" (T2005).
  // This is NOT known — it's a successful "nothing here" result.
  if (obs.green.kind === 'literal' && obs.green.value === undefined) return false;
  return true;
}

function isAbsent(obs: ObservationEntry): boolean {
  return obs.green.kind === 'literal' && obs.green.value === undefined;
}

function isGap(obs: ObservationEntry): boolean {
  return obs.green.kind === 'unknown';
}

function greenToString(g: GreenValue): string {
  if (g.kind === 'literal') return String(g.value);
  if (g.kind === 'array') return `[${g.elements.map(greenToString).join(',')}]`;
  if (g.kind === 'object') {
    const props = [...g.properties.entries()].map(([k, v]) => `${k}:${greenToString(v)}`);
    return `{${props.join(',')}}`;
  }
  return `<${g.kind}>`;
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Create a convergence function implementing the full operator algebra.
 *
 * Optionally accepts a callback to record evidence source metadata
 * for diagnostics and test assertions.
 */
export function createConvergence(
  onEvidence?: (resourceKey: string, fieldPath: string, source: EvidenceSource) => void,
): ConvergenceFunction {
  return (resourceKey, fieldPath, observations) => {
    if (observations.length === 0) {
      return {
        green: { kind: 'unknown', reasonKind: 'no-observations' },
        red: { origin: 'source', state: 'unknown', reason: 'no-observations' } as Sourced<unknown>,
      };
    }

    const sorted = sortByRank(observations);
    const operator = getOperator(fieldPath);

    let result: { green: GreenValue; red: Sourced<unknown>; conflict?: ConflictInfo };

    switch (operator) {
      case 'locked-identity': {
        const liResult = applyLockedIdentity(sorted);
        if (liResult.conflict) {
          liResult.conflict.field = fieldPath;
        }
        result = liResult;
        break;
      }
      case 'known-over-unknown':
        result = applyKnownOverUnknown(sorted);
        break;
      case 'stable-union':
        result = applyStableUnion(sorted);
        break;
      case 'patch-object':
        // patch-object at the observation level is handled by
        // per-bindable-field observations. The merge is equivalent
        // to known-over-unknown per bindable key.
        result = applyKnownOverUnknown(sorted);
        break;
      case 'first-defined':
        result = applyFirstDefined(sorted);
        break;
      case 'first-available':
        result = applyFirstAvailable(sorted);
        break;
    }

    if (onEvidence) {
      onEvidence(resourceKey, fieldPath, result.red && 'origin' in result.red
        ? sorted.find(o => o.green === result.green)?.source ?? sorted[0]!.source
        : sorted[0]!.source);
    }

    return result;
  };
}
