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

/** Source evidence an intended continuation requires before a consumer may act on it. */
export const enum InquirySourceRequirement {
  /** The continuation does not depend on source evidence. */
  NotRequired = 'not-required',
  /** The continuation requires an admitted authored source file, but not a token span. */
  AuthoredSource = 'authored-source',
  /** The continuation requires an exact authored token or expression span. */
  ExactAuthoredSpan = 'exact-authored-span',
}

/** Transport-safe value form for continuation source requirements. */
export type InquirySourceRequirementValue =
  InquirySourceRequirement | `${InquirySourceRequirement}`;

/** Independent facets retained for each source reference behind a continuation. */
export const enum InquirySourceFacet {
  /** The reference resolves into an admitted authored source file. */
  AuthoredSource = 'authored-source',
  /** The reference resolves to an exact authored source span. */
  ExactAuthoredSpan = 'exact-authored-span',
  /** The authored reference reaches only a file/header/carrier span. */
  CarrierSpan = 'carrier-span',
  /** The reference itself is generated or synthetic, independently from any authored anchor. */
  Generated = 'generated',
  /** The reference points outside admitted authored project source. */
  External = 'external',
  /** No source reference was available for a fact that requires one. */
  Unavailable = 'unavailable',
}

/** Transport-safe value form for source-facet enum members. */
export type InquirySourceFacetValue = InquirySourceFacet | `${InquirySourceFacet}`;

/** Generation authorities whose change can invalidate or reshape a continuation target. */
export const enum InquiryContinuationEpochDependency {
  /** The target is valid only for the currently booted semantic-runtime session. */
  RuntimeSession = 'runtime-session',
  /** The target depends on the admitted project source/configuration generation. */
  ProjectInput = 'project-input',
  /** The target depends on the exact materialized app-world generation. */
  AppWorld = 'app-world',
  /** The target carries a source-file locus whose authored generation must remain current. */
  SourceInput = 'source-input',
}

/** Transport-safe value form for continuation epoch-dependency enum members. */
export type InquiryContinuationEpochDependencyValue =
  InquiryContinuationEpochDependency | `${InquiryContinuationEpochDependency}`;

/** Intent, cost, source requirement, and blocker envelope for one typed continuation. */
export interface InquiryContinuationApplicability {
  /** Next-move intents this continuation can serve; omitted or empty means intent-neutral. */
  readonly intents?: readonly InquiryContinuationIntentValue[];
  /** Coarse cost boundary for following this continuation. */
  readonly cost?: InquiryContinuationCostValue;
  /** Source evidence the intended move requires; actual answer coverage is reported by the followed query. */
  readonly sourceRequirement?: InquirySourceRequirementValue;
  /** Generation authorities whose change can invalidate or reshape the target query. */
  readonly epochDependencies?: readonly InquiryContinuationEpochDependencyValue[];
  /** Explicit blockers that make the continuation informative but not currently followable/actionable. */
  readonly blockers?: readonly string[];
}

/** Default applicability for generic continuations that have not declared intent-specific policy yet. */
export const INTENT_NEUTRAL_CONTINUATION: InquiryContinuationApplicability = {
  intents: [],
  cost: InquiryContinuationCost.ProjectionOnly,
  sourceRequirement: InquirySourceRequirement.NotRequired,
  epochDependencies: [InquiryContinuationEpochDependency.RuntimeSession],
  blockers: [],
};

/** Applicability for ordinary next-page continuations over an already-selected row family. */
export const PAGED_INQUIRY_CONTINUATION: InquiryContinuationApplicability = {
  intents: [InquiryContinuationIntent.Inspect],
  cost: InquiryContinuationCost.Free,
  sourceRequirement: InquirySourceRequirement.NotRequired,
  epochDependencies: [InquiryContinuationEpochDependency.RuntimeSession],
  blockers: [],
};

/** Applicability for narrowing an ambiguous source-file selector to one admitted source. */
export const SOURCE_SELECTION_CONTINUATION: InquiryContinuationApplicability = {
  intents: [InquiryContinuationIntent.Navigate, InquiryContinuationIntent.Inspect],
  cost: InquiryContinuationCost.ProjectionOnly,
  sourceRequirement: InquirySourceRequirement.AuthoredSource,
  epochDependencies: [
    InquiryContinuationEpochDependency.ProjectInput,
    InquiryContinuationEpochDependency.SourceInput,
  ],
  blockers: [],
};

/** Applicability for listing admitted sources before selecting a narrower source locus. */
export const SOURCE_INVENTORY_CONTINUATION: InquiryContinuationApplicability = {
  intents: [InquiryContinuationIntent.Orient, InquiryContinuationIntent.Inspect],
  cost: InquiryContinuationCost.ProjectionOnly,
  sourceRequirement: InquirySourceRequirement.NotRequired,
  epochDependencies: [InquiryContinuationEpochDependency.ProjectInput],
  blockers: [],
};

/** Applicability for inspecting claim neighborhoods around a selected kernel product. */
export const CLAIM_NEIGHBORHOOD_CONTINUATION: InquiryContinuationApplicability = {
  intents: [InquiryContinuationIntent.Inspect],
  cost: InquiryContinuationCost.ProjectionOnly,
  sourceRequirement: InquirySourceRequirement.NotRequired,
  epochDependencies: [InquiryContinuationEpochDependency.AppWorld],
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
