export const RESOURCE_KINDS = [
  "custom-element",
  "custom-attribute",
  "value-converter",
  "binding-behavior",
  "binding-command",
  "attribute-pattern",
  "local-custom-element",
] as const;

export type ResourceKind = (typeof RESOURCE_KINDS)[number];

export const TRAIT_KINDS = ["attribute", "mode", "callback", "set"] as const;

export type TraitKind = (typeof TRAIT_KINDS)[number];

export const POSITION_FAMILIES = [
  "attribute-name",
  "attribute-value",
  "text-interpolation",
  "projection-outlet",
  "projection-routing",
  "local-declaration",
  "let-binding",
  "template-meta",
  "local-bindable-declaration",
  "surrogate-metadata",
  "namespace-sensitive",
  "binding-command-segment",
  "iterator-declaration",
  "ref-target",
  "spread-marker",
  "tag-name",
  "template-controller-attribute",
  "identity-override",
] as const;

export type PositionFamily = (typeof POSITION_FAMILIES)[number];

export const POSITION_GATING_TIERS = [
  "grammar-only",
  "vocabulary-gated",
  "resource-gated",
] as const;

export type PositionGatingTier = (typeof POSITION_GATING_TIERS)[number];

export const CORRECTNESS_CLAIM_KINDS = [
  "absence",
  "violation",
  "governed-misuse",
  "deferred-open",
] as const;

export type CorrectnessClaimKind = (typeof CORRECTNESS_CLAIM_KINDS)[number];

export const LOOKUP_DOMAINS = [
  "resource-scope",
  "vocabulary-entry",
  "schema-surface",
  "bindable-interface",
  "template-scope",
  "binding-behavior",
  "binding-command",
] as const;

export type LookupDomain = (typeof LOOKUP_DOMAINS)[number];

export const WITNESS_FAMILIES = [
  "open-boundary",
  "declaration-surface",
  "support-bundle",
  "grammar-shape",
  "resource-admission",
  "vocabulary-admission",
  "resource-scope",
  "template-scope",
  "type-closure",
] as const;

export type WitnessFamily = (typeof WITNESS_FAMILIES)[number];

export type CompletenessFamily = WitnessFamily;

export const BOUNDARY_LEVELS = [
  "site",
  "registration-boundary",
  "program-boundary",
] as const;

export type BoundaryLevel = (typeof BOUNDARY_LEVELS)[number];

export const DEGRADATION_FORMS = [
  "observation-limit",
  "claim-unevaluated",
  "site-unknown",
  "convergence-conflict",
  "governed-unassigned",
  "world-open",
  "activation-gap",
  "reachability-open",
  "classification-weakened",
  "closure-reopened",
] as const;

export type DegradationForm = (typeof DEGRADATION_FORMS)[number];

export const CONSUMER_TYPE_TAGS = [
  "ide-observation",
  "ide-adjudication",
  "ide-transformation",
  "semantic-authority-api",
] as const;

export type ConsumerTypeTag = (typeof CONSUMER_TYPE_TAGS)[number];

export const PROJECTION_PATHS = [
  "graph-only",
  "graph-local-ts",
  "graph-program-ts",
] as const;

export type ProjectionPath = (typeof PROJECTION_PATHS)[number];

export const SEMANTIC_OUTCOMES = [
  "claim",
  "partial-claim",
  "no-claim",
  "refusal",
] as const;

export type SemanticOutcome = (typeof SEMANTIC_OUTCOMES)[number];

export const NOT_APPLICABLE_REASONS = [
  "not-claim-bearing",
  "subject-not-found",
  "kind-inapplicable",
  "family-inapplicable",
  "outside-scope",
] as const;

export type NotApplicableReason = (typeof NOT_APPLICABLE_REASONS)[number];

export const CLOSABILITY_STATUSES = [
  "closable",
  "open-placeholder",
  "terminal-open",
] as const;

export type ClosabilityStatus = (typeof CLOSABILITY_STATUSES)[number];

export const REFERENCE_ROLES = ["declaration", "usage"] as const;

export type ReferenceRole = (typeof REFERENCE_ROLES)[number];

export const SITE_KINDS = [
  "tag-name",
  "attribute-name",
  "attribute-value",
  "expression",
  "command-segment",
  "interpolation-segment",
  "local-declaration",
] as const;

export type SiteKind = (typeof SITE_KINDS)[number];

export const CONTROLLERHOOD_STATES = ["plain", "template-controller"] as const;

export type Controllerhood = (typeof CONTROLLERHOOD_STATES)[number];

export const ADMISSION_STATES = [
  "admitted",
  "not-admitted",
  "activation-gap",
  "admission-open",
] as const;

export type AdmissionState = (typeof ADMISSION_STATES)[number];

export const REACHABILITY_STATES = [
  "reachable",
  "not-reachable",
  "reachability-open",
] as const;

export type ReachabilityState = (typeof REACHABILITY_STATES)[number];
