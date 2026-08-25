import type {
  CompilerAuthorityReference,
  CompilerObligationId,
} from "./compiler-case.js";

export const COMPILER_OBLIGATION_FAMILIES = [
  "entry",
  "browser-tree",
  "extension",
  "node",
  "element",
  "attribute",
  "command",
  "custom-attribute",
  "template-controller",
  "projection",
  "local-element",
  "let",
  "capture-spread",
  "surrogate",
  "order",
  "definition",
  "wire",
  "diagnostic",
  "interaction",
] as const;

export type CompilerObligationFamily = typeof COMPILER_OBLIGATION_FAMILIES[number];

export type CompilerAuditSourceDisposition =
  | "unreviewed"
  | "reviewed"
  | "ambiguous"
  | "conflict"
  | "stale";

export type CompilerAuditOracleDisposition =
  | "absent"
  | "exact-product"
  | "focused-field"
  | "runtime-effect"
  | "throws-only"
  | "generated-interaction"
  | "contradictory";

export type CompilerAuditSemanticRuntimeDisposition =
  | "unqueried"
  | "matched"
  | "mismatch"
  | "owned-dropped"
  | "projection-gap"
  | "missing-substrate"
  | "explicit-seam";

export type CompilerAuditEffectDisposition =
  | "closed"
  | "statically-modeled"
  | "build-execution"
  | "runtime-retained"
  | "refused"
  | "unknown";

export type CompilerAuditPolicyDisposition =
  | "required"
  | "profile-dependent"
  | "deferred"
  | "intentionally-excluded"
  | "maintainer-decision";

export type CompilerAuditGapKind =
  | "browser-lineage"
  | "effect-closure"
  | "projection-shape"
  | "dropped-connection"
  | "runtime-retention"
  | "oracle-quality"
  | "framework-contract"
  | "policy"
  | "cross-lane-unqueried";

/** Overall conservation is a claim, never an inference from the other audit axes. */
export interface CompilerAuditClosureDisposition {
  readonly state: "not-claimed" | "open" | "closed";
  readonly reason: string;
}

/**
 * Independent audit axes for one semantic compiler obligation.
 *
 * Keeping these axes separate prevents a strong source inventory or a passing runtime test from
 * silently standing in for cross-lane conservation, effect closure, or product policy.
 */
export interface CompilerObligationAuditDisposition {
  readonly source: CompilerAuditSourceDisposition;
  readonly oracle: CompilerAuditOracleDisposition;
  readonly semanticRuntime: CompilerAuditSemanticRuntimeDisposition;
  readonly effect: CompilerAuditEffectDisposition;
  readonly policy: CompilerAuditPolicyDisposition;
  readonly closure: CompilerAuditClosureDisposition;
  readonly gaps: readonly CompilerAuditGapKind[];
}

/** Source-reviewed control-plane record; executable cases witness these obligations separately. */
export interface CompilerObligationCatalogEntry {
  readonly id: CompilerObligationId;
  readonly family: CompilerObligationFamily;
  readonly requirement: string;
  readonly authorities: readonly CompilerAuthorityReference[];
  readonly disposition: CompilerObligationAuditDisposition;
}
