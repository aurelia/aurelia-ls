/** Stable row family for the read-only app-builder ontology. */
export enum AppBuilderOntologyDomain {
  /** Input contracts and supplied-input provenance. */
  Input = 'input',
  /** App-builder policy axes selected by caller/project/context before lowering. */
  Policy = 'policy',
  /** App-building moves that can later become menus or source plans. */
  Affordance = 'affordance',
  /** Expected source/effect/verification promises for app-builder moves. */
  Effect = 'effect',
  /** Application design patterns that guide generated Aurelia structure. */
  ApplicationPattern = 'application-pattern',
  /** Collection data, query, projection, and presentation concepts. */
  Collection = 'collection',
  /** Form/control patterns and component manifest concepts. */
  Control = 'control',
  /** Styling mechanisms, visual inputs, and design integration posture. */
  Style = 'style',
}

/** Stable value list for app-builder ontology domain transport schemas. */
export const APP_BUILDER_ONTOLOGY_DOMAINS = [
  AppBuilderOntologyDomain.Input,
  AppBuilderOntologyDomain.Policy,
  AppBuilderOntologyDomain.Affordance,
  AppBuilderOntologyDomain.Effect,
  AppBuilderOntologyDomain.ApplicationPattern,
  AppBuilderOntologyDomain.Collection,
  AppBuilderOntologyDomain.Control,
  AppBuilderOntologyDomain.Style,
] as const;

/** Grounding authority for why an ontology row has its current status. */
export enum AppBuilderOntologyReasonAuthority {
  /** Explicit operator steering or interview answers established the status. */
  OperatorConfirmed = 'operator-confirmed',
  /** Coarse status bucket for source/research grounded rows; inspect policy evidence for exact provenance. */
  SourceBacked = 'source-backed',
  /** The row is intentionally visible but still needs better grounding. */
  ToBeDetermined = 'tbd',
}

/** Stable value list for app-builder ontology reason-authority transport schemas. */
export const APP_BUILDER_ONTOLOGY_REASON_AUTHORITIES = [
  AppBuilderOntologyReasonAuthority.OperatorConfirmed,
  AppBuilderOntologyReasonAuthority.SourceBacked,
  AppBuilderOntologyReasonAuthority.ToBeDetermined,
] as const;

/** Recommendation posture for a row before any caller/project policy override. */
export enum AppBuilderRecommendationStatus {
  /** App-builder may emit this when its needed inputs are satisfied. */
  Recommendable = 'recommendable',
  /** App-builder may emit this only under explicit project/user/context policy. */
  Contextual = 'contextual',
  /** The concept is intentionally parked for a later generation ring. */
  Deferred = 'deferred',
  /** The concept is legal Aurelia but should not be emitted unless explicitly requested. */
  AvoidByDefault = 'avoid-by-default',
  /** Semantic-runtime should understand this, but app-builder should not emit it. */
  AnalysisOnly = 'analysis-only',
  /** The recommendation posture is not settled enough to act on. */
  ToBeDetermined = 'tbd',
}

/** Stable value list for app-builder recommendation-status transport schemas. */
export const APP_BUILDER_RECOMMENDATION_STATUSES = [
  AppBuilderRecommendationStatus.Recommendable,
  AppBuilderRecommendationStatus.Contextual,
  AppBuilderRecommendationStatus.Deferred,
  AppBuilderRecommendationStatus.AvoidByDefault,
  AppBuilderRecommendationStatus.AnalysisOnly,
  AppBuilderRecommendationStatus.ToBeDetermined,
] as const;

/** Honest status matrix shared by read-only app-builder ontology rows. */
export interface AppBuilderOntologyStatus {
  /** Whether the row is admitted into the app-builder ontology. */
  readonly modeled: boolean;
  /** Whether executable app-builder source lowering currently exists for this row. */
  readonly sourceLoweringImplemented: boolean;
  /** Whether app-builder should recommend, defer, avoid, or only analyze the row. */
  readonly recommendationStatus: AppBuilderRecommendationStatus;
  /** Whether generation needs explicit caller, policy, or app-fact input. */
  readonly requiresExplicitInput: boolean;
  /** The strongest available reason authority for this status. */
  readonly reasonAuthority: AppBuilderOntologyReasonAuthority;
  /** Short human-maintainer note; not a replacement for structured status fields. */
  readonly note?: string;
}

/** Construct a fully spelled status row without hiding unknowns behind defaults. */
export function appBuilderOntologyStatus(
  status: AppBuilderOntologyStatus,
): AppBuilderOntologyStatus {
  return status;
}
