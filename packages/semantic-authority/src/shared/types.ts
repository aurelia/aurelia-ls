export type ClaimState = "holds" | "fails" | "unevaluated" | "error";

export type WitnessState = "satisfied" | "unsatisfied" | "open";

export type ValidityState = "valid" | "stale";

export type RetentionTier = "pinned" | "hot" | "warm" | "cold";

export type RevisionToken = number;

export type FamilyTag = string;

export type MechanismId = string;

export type DegradationTarget = string;
