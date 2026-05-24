/**
 * Intent and proof metadata for typed inquiry continuations.
 *
 * This file deliberately does not define a query-level caller frame. Query
 * cost, retention, analysis depth, paging, and materialization policy already
 * live in the app-query and query-claim policy layers. Continuation intent is a
 * narrower affordance: it helps a caller choose which suggested next move is
 * relevant when an answer can truthfully offer many possible follow-ups.
 */

/** Next-move intent used to filter continuations without inventing app facts. */
export const enum InquiryContinuationIntent {
  /** Build a compact first map before choosing a narrower follow-up. */
  Orient = 'orient',
  /** Inspect evidence, source context, product detail, or provenance behind the answer. */
  Inspect = 'inspect',
  /** Find, cluster, or explain modeled issues. */
  Diagnose = 'diagnose',
  /** Move from a diagnostic or open seam toward a possible fix plan. */
  Repair = 'repair',
  /** Move to related source, semantic references, or definition-like facts. */
  Navigate = 'navigate',
  /** Produce or refine app source, source plans, or fixtures. */
  Author = 'author',
  /** Check whether modeled facts satisfy an expected contract. */
  Verify = 'verify',
  /** Inspect cost, memory, timing, retention, or cache behavior. */
  Profile = 'profile',
}

/** Transport-safe value form for next-move intent enum members. */
export type InquiryContinuationIntentValue = InquiryContinuationIntent | `${InquiryContinuationIntent}`;

/** Public value set for validating caller-requested continuation intent filters. */
export const INQUIRY_CONTINUATION_INTENTS: readonly InquiryContinuationIntent[] = [
  InquiryContinuationIntent.Orient,
  InquiryContinuationIntent.Inspect,
  InquiryContinuationIntent.Diagnose,
  InquiryContinuationIntent.Repair,
  InquiryContinuationIntent.Navigate,
  InquiryContinuationIntent.Author,
  InquiryContinuationIntent.Verify,
  InquiryContinuationIntent.Profile,
];

/** Cost boundary for following a typed continuation. */
export const enum InquiryContinuationCost {
  /** Continuation only changes presentation or uses already-returned facts. */
  Free = 'free',
  /** Continuation asks another projection over already-opened products. */
  ProjectionOnly = 'projection-only',
  /** Continuation spends answer-time TypeChecker/type-projection work. */
  QueryTypeProjection = 'query-type-projection',
  /** Continuation requires opening or reusing an app-world epoch. */
  AppWorld = 'app-world',
  /** Continuation intentionally spends broad or expensive semantic substrates. */
  Deep = 'deep',
}

/** Transport-safe value form for continuation cost enum members. */
export type InquiryContinuationCostValue = InquiryContinuationCost | `${InquiryContinuationCost}`;

/** Evidence authority state a caller should inspect before trusting a continuation. */
export const enum InquiryEvidenceState {
  /** Continuation is operational and does not require source/product evidence. */
  NotRequired = 'not-required',
  /** Continuation is grounded in authored or framework source. */
  SourceBacked = 'source-backed',
  /** Continuation depends on TypeScript checker/type-projection evidence. */
  TypeProjected = 'type-projected',
  /** Continuation uses modeled inference that should remain explainable. */
  Inferred = 'inferred',
  /** Continuation is useful specifically because an open seam remains. */
  Open = 'open',
}

/** Transport-safe value form for continuation evidence-state enum members. */
export type InquiryEvidenceStateValue = InquiryEvidenceState | `${InquiryEvidenceState}`;

/** Completeness posture for evidence behind a continuation. */
export const enum InquiryEvidenceCoverage {
  /** Evidence is complete for the selected locus. */
  CompleteForLocus = 'complete-for-locus',
  /** Evidence is useful but known route-local gaps remain. */
  PartialKnownGaps = 'partial-known-gaps',
  /** Evidence is a sample or canary, not a full proof. */
  Sampled = 'sampled',
  /** Completeness is not known yet and should not be implied. */
  Unknown = 'unknown',
}

/** Transport-safe value form for continuation evidence-coverage enum members. */
export type InquiryEvidenceCoverageValue = InquiryEvidenceCoverage | `${InquiryEvidenceCoverage}`;

/** Source precision available for an answer or continuation. */
export const enum InquirySourcePrecision {
  /** Source precision is irrelevant for this continuation. */
  NotRequired = 'not-required',
  /** Continuation can point at an exact authored source span. */
  ExactAuthoredSpan = 'exact-authored-span',
  /** Continuation only knows a broader carrier/header span. */
  CarrierSpan = 'carrier-span',
  /** Continuation points at generated overlay or synthetic source evidence. */
  GeneratedAnchor = 'generated-anchor',
  /** Continuation points outside the admitted authored project source. */
  External = 'external',
}

/** Transport-safe value form for continuation source-precision enum members. */
export type InquirySourcePrecisionValue = InquirySourcePrecision | `${InquirySourcePrecision}`;

/** Epoch sensitivity for evidence carried by a continuation. */
export const enum InquiryEvidenceStaleness {
  /** Evidence belongs to the current answer/app epoch. */
  CurrentEpoch = 'current-epoch',
  /** Evidence must be invalidated when the owning source file changes. */
  SourceEpochSensitive = 'source-epoch-sensitive',
  /** Evidence must be invalidated when the project shape changes. */
  ProjectEpochSensitive = 'project-epoch-sensitive',
  /** Staleness has not been modeled yet and should stay visible. */
  Unknown = 'unknown',
}

/** Transport-safe value form for continuation evidence-staleness enum members. */
export type InquiryEvidenceStalenessValue = InquiryEvidenceStaleness | `${InquiryEvidenceStaleness}`;

/** Evidence gate attached to a continuation so callers know what kind of proof it carries. */
export interface InquiryContinuationEvidenceGate {
  /** Evidence authority state for the continuation. */
  readonly evidenceState?: InquiryEvidenceStateValue;
  /** Completeness posture for the selected locus. */
  readonly coverage?: InquiryEvidenceCoverageValue;
  /** Source precision available for navigation, edits, or explanation. */
  readonly sourcePrecision?: InquirySourcePrecisionValue;
  /** Epoch sensitivity that should guide reuse or invalidation. */
  readonly staleness?: InquiryEvidenceStalenessValue;
}

/** Intent, cost, evidence, and blocker envelope for one typed continuation. */
export interface InquiryContinuationApplicability {
  /** Next-move intents this continuation can serve; omitted or empty means intent-neutral. */
  readonly intents?: readonly InquiryContinuationIntentValue[];
  /** Coarse cost boundary for following this continuation. */
  readonly cost?: InquiryContinuationCostValue;
  /** Evidence obligations a caller should inspect before treating this continuation as actionable. */
  readonly evidence?: InquiryContinuationEvidenceGate;
  /** Explicit blockers that make the continuation informative but not currently followable/actionable. */
  readonly blockers?: readonly string[];
}

/** Default applicability for generic continuations that have not declared intent-specific policy yet. */
export const INTENT_NEUTRAL_CONTINUATION: InquiryContinuationApplicability = {
  intents: [],
  cost: InquiryContinuationCost.ProjectionOnly,
  evidence: {
    evidenceState: InquiryEvidenceState.NotRequired,
    coverage: InquiryEvidenceCoverage.Unknown,
    sourcePrecision: InquirySourcePrecision.NotRequired,
    staleness: InquiryEvidenceStaleness.Unknown,
  },
  blockers: [],
};

/** Applicability for ordinary next-page continuations over an already-selected row family. */
export const PAGED_INQUIRY_CONTINUATION: InquiryContinuationApplicability = {
  intents: [InquiryContinuationIntent.Inspect],
  cost: InquiryContinuationCost.Free,
  evidence: {
    evidenceState: InquiryEvidenceState.NotRequired,
    coverage: InquiryEvidenceCoverage.PartialKnownGaps,
    sourcePrecision: InquirySourcePrecision.NotRequired,
    staleness: InquiryEvidenceStaleness.CurrentEpoch,
  },
  blockers: [],
};

/** Applicability for narrowing an ambiguous source-file selector to one admitted source. */
export const SOURCE_SELECTION_CONTINUATION: InquiryContinuationApplicability = {
  intents: [InquiryContinuationIntent.Navigate, InquiryContinuationIntent.Inspect],
  cost: InquiryContinuationCost.ProjectionOnly,
  evidence: {
    evidenceState: InquiryEvidenceState.SourceBacked,
    coverage: InquiryEvidenceCoverage.CompleteForLocus,
    sourcePrecision: InquirySourcePrecision.CarrierSpan,
    staleness: InquiryEvidenceStaleness.SourceEpochSensitive,
  },
  blockers: [],
};

/** Applicability for listing admitted sources before selecting a narrower source locus. */
export const SOURCE_INVENTORY_CONTINUATION: InquiryContinuationApplicability = {
  intents: [InquiryContinuationIntent.Orient, InquiryContinuationIntent.Inspect],
  cost: InquiryContinuationCost.ProjectionOnly,
  evidence: {
    evidenceState: InquiryEvidenceState.SourceBacked,
    coverage: InquiryEvidenceCoverage.PartialKnownGaps,
    sourcePrecision: InquirySourcePrecision.CarrierSpan,
    staleness: InquiryEvidenceStaleness.ProjectEpochSensitive,
  },
  blockers: [],
};

/** Applicability for inspecting claim neighborhoods around a selected kernel product. */
export const CLAIM_NEIGHBORHOOD_CONTINUATION: InquiryContinuationApplicability = {
  intents: [InquiryContinuationIntent.Inspect],
  cost: InquiryContinuationCost.ProjectionOnly,
  evidence: {
    evidenceState: InquiryEvidenceState.Inferred,
    coverage: InquiryEvidenceCoverage.CompleteForLocus,
    sourcePrecision: InquirySourcePrecision.NotRequired,
    staleness: InquiryEvidenceStaleness.CurrentEpoch,
  },
  blockers: [],
};

/** Normalize untrusted continuation intents and reject vocabulary drift at the API boundary. */
export function inquiryContinuationIntents(
  values: readonly string[] | null | undefined,
): readonly InquiryContinuationIntent[] {
  if (values == null || values.length === 0) {
    return [];
  }
  const normalized: InquiryContinuationIntent[] = [];
  for (const value of values) {
    if (!(INQUIRY_CONTINUATION_INTENTS as readonly string[]).includes(value)) {
      throw new Error(`Unknown inquiry continuation intent '${value}'.`);
    }
    normalized.push(value as InquiryContinuationIntent);
  }
  return [...new Set(normalized)];
}
