import type { DegradationForm } from "./enums.js";
import type { DegradationTarget } from "./types.js";

export const DEGRADATION_TARGET_CATEGORIES = [
  "observation-limit",
  "convergence-conflict",
  "governed-unassigned",
  "world-open",
  "activation-gap",
  "reachability-open",
  "classification-weakened",
  "closure-reopened",
  "claim-unevaluated",
  "evaluator-error",
] as const;

export type DegradationTargetCategory = (typeof DEGRADATION_TARGET_CATEGORIES)[number];

export interface DegradationTargetAtom {
  readonly category: DegradationTargetCategory;
  readonly detail: string;
}

export interface DegradationTargetFormRelation {
  readonly relation: "shared-identifier" | "target-only";
  readonly form?: DegradationForm;
}

export const DEGRADATION_TARGET_FORM_RELATIONS = {
  "observation-limit": { relation: "shared-identifier", form: "observation-limit" },
  "convergence-conflict": { relation: "shared-identifier", form: "convergence-conflict" },
  "governed-unassigned": { relation: "shared-identifier", form: "governed-unassigned" },
  "world-open": { relation: "shared-identifier", form: "world-open" },
  "activation-gap": { relation: "shared-identifier", form: "activation-gap" },
  "reachability-open": { relation: "shared-identifier", form: "reachability-open" },
  "classification-weakened": { relation: "shared-identifier", form: "classification-weakened" },
  "closure-reopened": { relation: "shared-identifier", form: "closure-reopened" },
  "claim-unevaluated": { relation: "shared-identifier", form: "claim-unevaluated" },
  "evaluator-error": { relation: "target-only" },
} as const satisfies Record<DegradationTargetCategory, DegradationTargetFormRelation>;

export const DEGRADATION_FORM_ONLY_VALUES = [
  "site-unknown",
] as const satisfies readonly DegradationForm[];

export function isDegradationTargetCategory(
  value: string,
): value is DegradationTargetCategory {
  return (DEGRADATION_TARGET_CATEGORIES as readonly string[]).includes(value);
}

export function parseDegradationTarget(
  value: DegradationTarget | null,
): readonly DegradationTargetAtom[] {
  if (value === null) {
    return [];
  }

  return value
    .split("|")
    .filter((atom) => atom.length > 0)
    .map((atom) => {
      const separatorIndex = atom.indexOf(":");
      if (separatorIndex <= 0 || separatorIndex === atom.length - 1) {
        throw new Error(`Malformed degradation target atom "${atom}".`);
      }

      const category = atom.slice(0, separatorIndex);
      const detail = atom.slice(separatorIndex + 1);
      if (!isDegradationTargetCategory(category)) {
        throw new Error(`Unknown degradation target category "${category}".`);
      }

      return { category, detail };
    });
}

export function serializeDegradationTarget(
  atoms: readonly DegradationTargetAtom[],
): DegradationTarget | null {
  if (atoms.length === 0) {
    return null;
  }

  const normalized = atoms
    .map(({ category, detail }) => {
      if (!isDegradationTargetCategory(category)) {
        throw new Error(`Unknown degradation target category "${category}".`);
      }
      if (detail.includes("|")) {
        throw new Error("Degradation target detail must not contain '|'.");
      }
      if (detail.length === 0) {
        throw new Error("Degradation target detail must not be empty.");
      }

      return `${category}:${detail}`;
    })
    .sort((left, right) => left.localeCompare(right));

  return normalized.join("|");
}
