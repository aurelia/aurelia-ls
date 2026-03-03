/**
 * Resource Provenance Types — The Red Layer
 *
 * Carries everything the green layer doesn't: source locations,
 * declaration forms, convergence decisions, gap details. Does NOT
 * participate in value-sensitive cutoff.
 *
 * Relationship to existing types:
 * - Sourced<T> (value/sourced.ts): the current conflated green+red type.
 *   Sourced<T> carries value state (green) AND provenance (red) on the
 *   same type. This file defines the red half of that decomposition.
 *   During migration, Sourced<T> remains as-is in the old pipeline.
 *   The new pipeline uses FieldValue<T> (green) + FieldProvenance (red)
 *   separately. A bridge function converts between the two.
 *
 * - ConvergenceEntry (convergence/entry.ts): currently a bridge type
 *   wrapping ResourceDef. Evolves into per-resource provenance that
 *   carries the convergence decision alongside the green resource.
 *
 * - AnalysisGap (evaluate/types.ts): gap details with structured
 *   reasons. The gap PRESENCE is green (FieldValue 'unknown' with
 *   reasonKind). The gap DETAILS (remediation, location, suggestion)
 *   are red — they carry positional information and human-readable
 *   guidance that doesn't affect structural evaluation.
 *
 * Design principle (value-representation L1 §S1): the green layer
 * carries NO provenance. The red layer carries NO structural content
 * that would need to participate in cutoff. The split is enforced by
 * the type system, not by convention.
 */

import type { BindingMode } from '../../model/ir.js';
import type { ResourceKind, FieldValue, EvidenceOrigin, DeclarationForm } from './types.js';

// =============================================================================
// Source Location (span-free path + offset, no ts.Node)
// =============================================================================

/**
 * A source location — file path + byte offsets.
 *
 * Unlike the existing SourceLocation in value/sourced.ts, this type
 * does NOT carry ts.Node references. Source locations are serializable
 * and survive across sessions.
 */
export interface SourceLocation {
  readonly file: string;
  readonly pos: number;
  readonly end: number;
}

// =============================================================================
// Per-Field Provenance
// =============================================================================

/**
 * Provenance for a single field value.
 *
 * Answers: "where did this value come from?"
 * - origin: evidence tier (builtin/config/manifest/source)
 * - form: how the field was declared (decorator arg, static property, etc.)
 * - location: source file + byte offsets where the value was found
 *
 * This is the red half of what Sourced<T> currently carries.
 * The green half is FieldValue<T>.
 */
export interface FieldProvenance {
  readonly origin: EvidenceOrigin;
  /** How this specific field value was declared. Open string vocabulary:
   *  'decorator-arg', 'decorator-string', 'static-$au', 'static-property',
   *  'define-call-arg', 'convention', 'meta-element', 'field-decorator',
   *  'builtin-catalog', 'manifest-entry', 'config-file', etc. */
  readonly form?: string;
  /** Source location where the value was declared. Absent for builtins. */
  readonly location?: SourceLocation;
}

// =============================================================================
// Per-Field Gap Detail
// =============================================================================

/**
 * Detail for a gapped (unknown) field.
 *
 * Answers: "why is this field unknown, and what can be done about it?"
 *
 * The gap PRESENCE is on the green layer (FieldValue 'unknown' with
 * reasonKind). This type carries the gap DETAILS — the actionable
 * information that diagnostics and hover present to the developer.
 *
 * Derived from AnalysisGap (evaluate/types.ts) but without the
 * ts.Node references and with the intrinsic/contingent classification
 * from resource-model L1 §Gap Structure.
 */
export interface GapDetail {
  /** Human-readable description of what's unknown. */
  readonly what: string;
  /** Structured reason kind — matches FieldValue.reasonKind on the green. */
  readonly reasonKind: string;
  /** Whether the gap is intrinsic (domain-limited, only declaration can
   *  close it) or contingent (analysis-limited, better analysis or
   *  configuration might close it). From resource-model L1 §Gap Structure. */
  readonly nature: 'intrinsic' | 'contingent';
  /** Where the analysis hit its limit. */
  readonly location?: SourceLocation;
  /** Actionable suggestion for the developer. */
  readonly suggestion?: string;
}

// =============================================================================
// Per-Resource Provenance
// =============================================================================

/**
 * Provenance for an entire resource — the red-layer companion to
 * a ResourceGreen.
 *
 * Carries:
 * - Resource-level metadata (origin, declaration form, source file, package)
 * - Per-field provenance (where each field value came from)
 * - Per-field gap details (for unknown fields)
 * - Convergence decision (when produced by convergence)
 *
 * Keyed by the same (kind, name) identity as the green resource.
 * Queried separately — consumers that need only structural content
 * (template analysis, cutoff) never touch this.
 */
export interface ResourceProvenance {
  readonly kind: ResourceKind;
  readonly name: string;

  /** Evidence origin of the winning observation. */
  readonly origin: EvidenceOrigin;
  /** How the resource was discovered. */
  readonly declarationForm?: DeclarationForm;
  /** Source file where the resource was declared. */
  readonly file?: string;
  /** Package the resource belongs to. */
  readonly package?: string;

  /** Per-field provenance, keyed by field path (same paths as the
   *  graph's observation/conclusion node IDs: 'containerless',
   *  'bindable:value:mode', etc.). */
  readonly fields: Readonly<Record<string, FieldProvenance>>;

  /** Gap details for unknown fields. Keyed by field path.
   *  Only present for fields whose green FieldValue is 'unknown'. */
  readonly gaps: Readonly<Record<string, GapDetail>>;

  /** Convergence decision — present when this resource was produced
   *  by merging multiple observations. */
  readonly convergence?: ConvergenceDecision;
}

// =============================================================================
// Convergence Decision Provenance
// =============================================================================

/**
 * Records HOW convergence produced a conclusion.
 *
 * Answers: "why did convergence pick this value?"
 * This is the decision-level provenance from resource-model L1
 * §Provenance Structure — the second stage of the provenance chain
 * (after value-level provenance).
 */
export interface ConvergenceDecision {
  /** How many observation sources contributed to this resource. */
  readonly observationCount: number;
  /** Per-field decisions — which source won and why. */
  readonly decisions: Readonly<Record<string, FieldDecision>>;
  /** Fields where convergence detected conflicts between sources
   *  (NL-2 from convergence L1: convergence can create gaps that
   *  no individual observation contained). */
  readonly conflicts: readonly FieldConflict[];
}

/**
 * Per-field convergence decision.
 */
export interface FieldDecision {
  /** The operator that was applied. */
  readonly operator: string;
  /** The evidence tier of the winning observation. */
  readonly winnerTier: string;
  /** The evidence form of the winning observation. */
  readonly winnerForm?: string;
  /** How many observations contributed to this field. */
  readonly candidateCount: number;
}

/**
 * A conflict detected during convergence.
 *
 * From convergence L1 NL-2: two observations may each be individually
 * valid, but their relationship reveals a conflict — a gap kind that
 * existed in neither input.
 */
export interface FieldConflict {
  readonly fieldPath: string;
  readonly reason: 'resolved-by-evidence-rank' | 'resolved-by-canonical-order';
  readonly winnerTier: string;
  readonly loserTier: string;
}

// =============================================================================
// Annotated Resource (green + red combined for consumers that need both)
// =============================================================================

/**
 * A resource with both structural content and provenance.
 *
 * This is the full representation that consumers like hover and rename
 * need. Template analysis only needs the green half. The graph stores
 * them separately and assembles this on demand.
 *
 * This replaces the role that ResourceDef + ConvergenceEntry + Stub<T>
 * collectively played in the old pipeline — one type that carries
 * everything, with clear structural separation.
 */
export interface AnnotatedResource<TGreen> {
  readonly green: TGreen;
  readonly provenance: ResourceProvenance;
}

/**
 * A single field with both its value and provenance.
 *
 * This is the decomposed Sourced<T>: instead of one type that carries
 * value + state + origin + location, this separates them into
 * FieldValue<T> (structural, green) + FieldProvenance (positional, red).
 *
 * The bridge from old Sourced<T>:
 * - Sourced<T> { origin: 'builtin', value } →
 *   green: { state: 'known', value }, red: { origin: 'builtin' }
 * - Sourced<T> { origin: 'source', state: 'known', value, location } →
 *   green: { state: 'known', value }, red: { origin: 'source', location }
 * - Sourced<T> { origin: 'source', state: 'unknown', location } →
 *   green: { state: 'unknown', reasonKind }, red: { origin: 'source', location }
 */
export interface AnnotatedField<T> {
  readonly green: FieldValue<T>;
  readonly red: FieldProvenance;
}
