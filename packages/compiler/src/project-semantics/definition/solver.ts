import {
  getDefinitionFieldRule,
  type DefinitionComparatorStage,
  type DefinitionFieldPath,
  type DefinitionFieldRule,
} from "./rules.js";

export type DefinitionSourceKind =
  | "explicit-config"
  | "manifest-resource"
  | "analysis-explicit"
  | "analysis-convention"
  | "builtin";

export type DefinitionValueState<T> =
  | { readonly state: "absent" }
  | { readonly state: "unknown" }
  | { readonly state: "known"; readonly value: T };

export interface DefinitionSubjectKey {
  readonly kind: string;
  readonly name: string;
  readonly scope: "root" | { readonly local: string };
}

export interface DefinitionEvidenceAtom<T = unknown> {
  readonly atomId: string;
  readonly subject: DefinitionSubjectKey;
  readonly field: DefinitionFieldPath;
  readonly value: DefinitionValueState<T>;
  /**
   * Optional semantic identity payload for conflict checks.
   *
   * When omitted, conflict detection falls back to the atom known value.
   */
  readonly conflictValue?: unknown;
  readonly sourceKind: DefinitionSourceKind;
  /**
   * Lower values are stronger evidence.
   */
  readonly evidenceRank: number;
}

export type DefinitionReductionReasonCode =
  | "source-shadowed"
  | "field-conflict"
  | "unknown-backfilled"
  | "incomplete-fragment"
  | "kind-mismatch";

export interface DefinitionReductionReason {
  readonly code: DefinitionReductionReasonCode;
  readonly field: DefinitionFieldPath;
  readonly detail?: string;
}

export interface DefinitionReductionTrace {
  readonly field: DefinitionFieldPath;
  readonly ruleKey: string;
  readonly atomOrder: readonly string[];
  readonly winnerAtomId: string | null;
  readonly reasons: readonly DefinitionReductionReason[];
}

export interface DefinitionReductionResult<T> {
  readonly value: DefinitionValueState<T>;
  readonly trace: DefinitionReductionTrace;
}

export const DEFINITION_SOURCE_PRIORITY: readonly DefinitionSourceKind[] = [
  "explicit-config",
  "manifest-resource",
  "analysis-explicit",
  "analysis-convention",
  "builtin",
] as const;

export function sourcePriorityRank(kind: DefinitionSourceKind): number {
  const index = DEFINITION_SOURCE_PRIORITY.indexOf(kind);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

export function compareDefinitionAtoms<T>(
  left: DefinitionEvidenceAtom<T>,
  right: DefinitionEvidenceAtom<T>,
  rule: DefinitionFieldRule = getDefinitionFieldRule(left.field),
): number {
  for (const stage of rule.order) {
    const delta = compareStage(stage, left, right);
    if (delta !== 0) return delta;
  }
  return 0;
}

export function sortDefinitionAtoms<T>(
  atoms: readonly DefinitionEvidenceAtom<T>[],
): DefinitionEvidenceAtom<T>[] {
  if (atoms.length <= 1) return [...atoms];
  const rule = getDefinitionFieldRule(atoms[0]!.field);
  return [...atoms].sort((left, right) => compareDefinitionAtoms(left, right, rule));
}

export function reduceDefinitionAtoms<T>(
  atoms: readonly DefinitionEvidenceAtom<T>[],
): DefinitionReductionResult<T> {
  if (atoms.length === 0) {
    throw new Error("Cannot reduce empty atom list");
  }

  const sorted = sortDefinitionAtoms(atoms);
  const field = sorted[0]!.field;
  const rule = getDefinitionFieldRule(field);
  const reasons: DefinitionReductionReason[] = [];

  const selected = selectByRule(sorted, rule, reasons);
  const winner = selected.atomId ?? null;

  for (const atom of sorted) {
    if (atom.atomId === winner) continue;
    reasons.push({
      code: "source-shadowed",
      field,
      detail: `${atom.atomId} shadowed by ${winner}`,
    });
  }

  return {
    value: selected.value,
    trace: {
      field,
      ruleKey: rule.key,
      atomOrder: sorted.map((atom) => atom.atomId),
      winnerAtomId: winner,
      reasons,
    },
  };
}

function selectByRule<T>(
  sorted: readonly DefinitionEvidenceAtom<T>[],
  rule: DefinitionFieldRule,
  reasons: DefinitionReductionReason[],
): { readonly atomId: string | null; readonly value: DefinitionValueState<T> } {
  switch (rule.operator) {
    case "stable-union":
      return reduceStableUnion(sorted);
    case "patch-object":
      return reducePatchObject(sorted);
    case "locked-identity":
      return reduceLockedIdentity(sorted, reasons);
    case "known-over-unknown":
      return reduceKnownOverUnknown(sorted, reasons);
    case "select":
    default:
      return reduceSelect(sorted);
  }
}

function reduceSelect<T>(
  sorted: readonly DefinitionEvidenceAtom<T>[],
): { readonly atomId: string | null; readonly value: DefinitionValueState<T> } {
  for (const atom of sorted) {
    if (atom.value.state === "absent") continue;
    return { atomId: atom.atomId, value: atom.value };
  }
  return { atomId: null, value: { state: "absent" } };
}

function reduceKnownOverUnknown<T>(
  sorted: readonly DefinitionEvidenceAtom<T>[],
  reasons: DefinitionReductionReason[],
): { readonly atomId: string | null; readonly value: DefinitionValueState<T> } {
  const selected = reduceSelect(sorted);
  if (selected.value.state !== "unknown") {
    return selected;
  }
  const field = sorted[0]!.field;
  for (const atom of sorted) {
    if (atom.value.state !== "known") continue;
    reasons.push({
      code: "unknown-backfilled",
      field,
      detail: `${selected.atomId ?? "unknown"} backfilled by ${atom.atomId}`,
    });
    return { atomId: atom.atomId, value: atom.value };
  }
  return selected;
}

function reduceStableUnion<T>(
  sorted: readonly DefinitionEvidenceAtom<T>[],
): { readonly atomId: string | null; readonly value: DefinitionValueState<T> } {
  const knownArrays: { atomId: string; value: readonly unknown[] }[] = [];
  for (const atom of sorted) {
    if (atom.value.state !== "known") continue;
    if (!Array.isArray(atom.value.value)) continue;
    knownArrays.push({ atomId: atom.atomId, value: atom.value.value });
  }
  if (knownArrays.length === 0) {
    return reduceSelect(sorted);
  }
  const merged: unknown[] = [];
  const seen = new Set<string>();
  for (const entry of knownArrays) {
    for (const item of entry.value) {
      const key = stableKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return {
    atomId: knownArrays[0]!.atomId,
    value: { state: "known", value: merged as T },
  };
}

function reducePatchObject<T>(
  sorted: readonly DefinitionEvidenceAtom<T>[],
): { readonly atomId: string | null; readonly value: DefinitionValueState<T> } {
  const knownObjects: { atomId: string; value: Record<string, unknown> }[] = [];
  for (const atom of sorted) {
    if (atom.value.state !== "known") continue;
    if (!isRecord(atom.value.value)) continue;
    knownObjects.push({ atomId: atom.atomId, value: atom.value.value });
  }
  if (knownObjects.length === 0) {
    return reduceSelect(sorted);
  }
  const merged: Record<string, unknown> = {};
  for (let i = knownObjects.length - 1; i >= 0; i -= 1) {
    Object.assign(merged, knownObjects[i]!.value);
  }
  return {
    atomId: knownObjects[0]!.atomId,
    value: { state: "known", value: merged as T },
  };
}

function reduceLockedIdentity<T>(
  sorted: readonly DefinitionEvidenceAtom<T>[],
  reasons: DefinitionReductionReason[],
): { readonly atomId: string | null; readonly value: DefinitionValueState<T> } {
  const selected = reduceSelect(sorted);
  if (selected.value.state !== "known") {
    return selected;
  }
  const field = sorted[0]!.field;
  const selectedAtom = sorted.find((atom) => atom.atomId === selected.atomId);
  const selectedConflictKey = stableKey(selectedAtom?.conflictValue ?? selected.value.value);
  for (const atom of sorted) {
    if (atom.atomId === selected.atomId) continue;
    if (atom.value.state !== "known") continue;
    const atomConflictKey = stableKey(atom.conflictValue ?? atom.value.value);
    if (atomConflictKey === selectedConflictKey) continue;
    reasons.push({
      code: "field-conflict",
      field,
      detail: `Locked identity conflict between ${selected.atomId ?? "winner"} and ${atom.atomId}`,
    });
    break;
  }
  return selected;
}

function compareStage<T>(
  stage: DefinitionComparatorStage,
  left: DefinitionEvidenceAtom<T>,
  right: DefinitionEvidenceAtom<T>,
): number {
  switch (stage) {
    case "source-priority":
      return sourcePriorityRank(left.sourceKind) - sourcePriorityRank(right.sourceKind);
    case "evidence-rank":
      return left.evidenceRank - right.evidenceRank;
    case "known-completeness":
      return knownCompleteness(right.value) - knownCompleteness(left.value);
    case "canonical-atom-id":
      return left.atomId.localeCompare(right.atomId);
  }
}

function knownCompleteness<T>(value: DefinitionValueState<T>): number {
  switch (value.state) {
    case "known":
      return 2;
    case "unknown":
      return 1;
    case "absent":
      return 0;
  }
}

function stableKey(value: unknown): string {
  if (value === null) return "null";
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableKey).join(",")}]`;
  }
  if (type === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableKey(nested)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(null);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
