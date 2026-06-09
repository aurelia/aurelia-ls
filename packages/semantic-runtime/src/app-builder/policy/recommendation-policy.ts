import {
  AppBuilderApplicationPatternId,
} from '../ontology/application-pattern.js';
import {
  AppBuilderControlManifestRowId,
  AppBuilderControlPatternId,
} from '../ontology/control.js';
import {
  AppBuilderPolicyAxisId,
} from '../ontology/policy.js';
import {
  AppBuilderInputContractId,
  AppBuilderInputFacetId,
} from '../ontology/input.js';
import {
  appBuilderOntologyRelationsFrom,
} from '../ontology/relation-index.js';
import {
  AppBuilderOntologyRowKind,
  AppBuilderOntologyRelationKind,
  appBuilderOntologyRowRef,
  type AppBuilderOntologyRowRef,
} from '../ontology/relation.js';
import {
  AppBuilderStylingMechanismId,
  AppBuilderVisualPolicyId,
} from '../ontology/style.js';
import {
  appBuilderDefaultingCandidateForTarget,
  appBuilderDefaultingCandidatePolicyRow,
  type AppBuilderDefaultingCandidatePolicyRow,
} from './defaulting-candidate-policy.js';
import {
  AppBuilderOntologyReasonAuthority,
  AppBuilderRecommendationStatus,
  type AppBuilderOntologyStatus,
} from '../ontology/status.js';

/** Why a recommendation policy row can apply in one app-building context. */
export enum AppBuilderRecommendationApplicabilityKind {
  /** Existing ontology input-dependency edges determine the required caller/app/policy facts. */
  InputDependency = 'input-dependency',
  /** A scalar domain field with a compatible value kind is required before the row should be chosen. */
  DomainFieldKind = 'domain-field-kind',
  /** A finite value set, enum-like option model, or selection domain is required. */
  ChoiceValueSet = 'choice-value-set',
  /** Numeric bounds, step, or conversion facts are required before generation can be honest. */
  NumericConstraint = 'numeric-constraint',
  /** Collection projection facts such as display fields, columns, or query features are required. */
  CollectionProjection = 'collection-projection',
  /** The row only makes sense after another pattern, manifest, or policy row is selected. */
  RelatedOntologySelection = 'related-ontology-selection',
  /** The row needs a concrete placement/naming/file-layout decision before source can be emitted. */
  SourcePlacement = 'source-placement',
  /** The row needs caller/AI/design-tool visual input rather than invented app-builder taste. */
  VisualInput = 'visual-input',
  /** The row is legal terrain, but a caller or policy must explicitly choose it before generation. */
  ExplicitSelection = 'explicit-selection',
  /** The row remains visible while a later semantic-runtime or app-builder substrate is completed. */
  DeferredSubstrate = 'deferred-substrate',
}

/** Stable value list for recommendation-applicability transport and review counts. */
export const APP_BUILDER_RECOMMENDATION_APPLICABILITY_KINDS = [
  AppBuilderRecommendationApplicabilityKind.InputDependency,
  AppBuilderRecommendationApplicabilityKind.DomainFieldKind,
  AppBuilderRecommendationApplicabilityKind.ChoiceValueSet,
  AppBuilderRecommendationApplicabilityKind.NumericConstraint,
  AppBuilderRecommendationApplicabilityKind.CollectionProjection,
  AppBuilderRecommendationApplicabilityKind.RelatedOntologySelection,
  AppBuilderRecommendationApplicabilityKind.SourcePlacement,
  AppBuilderRecommendationApplicabilityKind.VisualInput,
  AppBuilderRecommendationApplicabilityKind.ExplicitSelection,
  AppBuilderRecommendationApplicabilityKind.DeferredSubstrate,
] as const;

/** Evidence lane explaining why a recommendation policy row is grounded. */
export enum AppBuilderRecommendationEvidenceKind {
  /** The row is admitted into semantic-runtime's app-builder ontology. */
  SemanticRuntimeOntology = 'semantic-runtime-ontology',
  /** A source-lowering registry can currently spend this exact target. */
  SourceLoweringRegistry = 'source-lowering-registry',
  /** Operator interview or steering explicitly established this policy posture. */
  OperatorInterview = 'operator-interview',
  /** Aurelia framework source, docs, tests, or corpus rows ground the framework legality or semantics. */
  FrameworkCorpus = 'framework-corpus',
  /** Native browser, DOM, form, or platform behavior grounds the control/mechanism. */
  WebPlatform = 'web-platform',
  /** Public accessibility or design-system research grounds a deferred or rich-control obligation. */
  PublicResearch = 'public-research',
  /** SourcePlan/source-project substrate grounds placement, file layout, tooling, or generated artifact policy. */
  SourcePlanSubstrate = 'source-plan-substrate',
  /** Deterministic existing-app analysis products ground app facts without inferring business intent. */
  ExistingAppAnalysis = 'existing-app-analysis',
  /** Aurelia framework capability terrain grounds legal framework mechanisms. */
  FrameworkCapability = 'framework-capability',
  /** App-builder and semantic-runtime control manifest contracts ground component/control facts. */
  ControlManifestContract = 'control-manifest-contract',
  /** Migrated old source-backed authority; replace with a more precise evidence lane when pressure reaches it. */
  LegacySourceBackedAuthority = 'legacy-source-backed-authority',
  /** The row is intentionally visible but still lacks enough evidence to recommend. */
  ToBeDetermined = 'tbd',
}

/** Stable value list for recommendation-evidence transport and review counts. */
export const APP_BUILDER_RECOMMENDATION_EVIDENCE_KINDS = [
  AppBuilderRecommendationEvidenceKind.SemanticRuntimeOntology,
  AppBuilderRecommendationEvidenceKind.SourceLoweringRegistry,
  AppBuilderRecommendationEvidenceKind.OperatorInterview,
  AppBuilderRecommendationEvidenceKind.FrameworkCorpus,
  AppBuilderRecommendationEvidenceKind.WebPlatform,
  AppBuilderRecommendationEvidenceKind.PublicResearch,
  AppBuilderRecommendationEvidenceKind.SourcePlanSubstrate,
  AppBuilderRecommendationEvidenceKind.ExistingAppAnalysis,
  AppBuilderRecommendationEvidenceKind.FrameworkCapability,
  AppBuilderRecommendationEvidenceKind.ControlManifestContract,
  AppBuilderRecommendationEvidenceKind.LegacySourceBackedAuthority,
  AppBuilderRecommendationEvidenceKind.ToBeDetermined,
] as const;

/** Context condition explaining when a recommendation posture should be spendable. */
export interface AppBuilderRecommendationApplicabilityRow {
  /** Applicability kind for machine-readable review and later context graph work. */
  readonly kind: AppBuilderRecommendationApplicabilityKind;
  /** Human review summary for why this applicability condition exists. */
  readonly summary: string;
  /** Related ontology row when this condition is backed by an input or selected concept edge. */
  readonly targetRef?: AppBuilderOntologyRowRef;
  /** Narrowed input facets when an input-dependency relation is more precise than its contract. */
  readonly inputFacetIds?: readonly AppBuilderInputFacetId[];
}

/** Evidence row explaining why policy may recommend, defer, or avoid one target. */
export interface AppBuilderRecommendationEvidenceRow {
  /** Evidence lane for machine-readable review and future provenance refinement. */
  readonly kind: AppBuilderRecommendationEvidenceKind;
  /** Human review summary for the evidence lane. */
  readonly summary: string;
  /** Related ontology row when this evidence is anchored in a registry or row admission. */
  readonly targetRef?: AppBuilderOntologyRowRef;
}

/** Review-oriented recommendation policy projection for one ontology row. */
export interface AppBuilderRecommendationPolicyRow {
  /** Exact ontology row governed by this recommendation policy projection. */
  readonly targetRef: AppBuilderOntologyRowRef;
  /** Display title carried from the ontology descriptor for operator review. */
  readonly title: string;
  /** Current recommendation posture before caller/project policy overrides. */
  readonly recommendationStatus: AppBuilderRecommendationStatus;
  /** Conditions under which this recommendation row can honestly apply. */
  readonly applicability: readonly AppBuilderRecommendationApplicabilityRow[];
  /** Multi-lane evidence for the current recommendation posture. */
  readonly evidence: readonly AppBuilderRecommendationEvidenceRow[];
  /** Local candidate for caller/context defaulting, not a blank-slate app-builder default. */
  readonly defaultingCandidate: boolean;
  /** Reviewable local defaulting policy row when this target is an active candidate. */
  readonly defaultingCandidatePolicy?: AppBuilderDefaultingCandidatePolicyRow;
  /** Whether source generation or use still needs explicit caller, policy, or app-fact input. */
  readonly requiresExplicitInput: boolean;
  /** Whether executable source lowering exists after registry-backed projection. */
  readonly sourceLoweringImplemented: boolean;
  /** Short maintainer note from the status row, when present. */
  readonly note?: string;
}

/** Descriptor-like subject accepted by the recommendation policy review projection. */
export interface AppBuilderRecommendationPolicySubject {
  /** Exact ontology row governed by recommendation policy. */
  readonly ref: AppBuilderOntologyRowRef;
  /** Display title for operator review. */
  readonly title: string;
  /** Projected public status for this row. */
  readonly status: AppBuilderOntologyStatus;
}

/** Compact counts for reviewable recommendation policy terrain. */
export interface AppBuilderRecommendationPolicySummary {
  /** Number of ontology rows inspected. */
  readonly rowCount: number;
  /** Count by recommendation posture. */
  readonly recommendationStatusCounts: Readonly<Record<AppBuilderRecommendationStatus, number>>;
  /** Count by applicability lane across projected rows. */
  readonly applicabilityKindCounts: Readonly<Record<AppBuilderRecommendationApplicabilityKind, number>>;
  /** Count by evidence lane across projected rows. */
  readonly evidenceKindCounts: Readonly<Record<AppBuilderRecommendationEvidenceKind, number>>;
  /** Rows that policy currently admits as local defaulting candidates, not blank-slate defaults. */
  readonly defaultingCandidateCount: number;
  /** Rows whose source-lowering support is registry-projected. */
  readonly sourceLoweringImplementedCount: number;
  /** Rows that still require explicit caller, policy, or app-fact input. */
  readonly explicitInputCount: number;
}

/** Project recommendation policy rows from ontology descriptors for review/reporting. */
export function appBuilderRecommendationPolicyRows(
  subjects: readonly AppBuilderRecommendationPolicySubject[],
): readonly AppBuilderRecommendationPolicyRow[] {
  return subjects.map((subject) =>
    appBuilderRecommendationPolicyRow(subject.ref, subject.title, subject.status)
  );
}

/** Summarize reviewable recommendation policy rows without dumping the full ontology. */
export function appBuilderRecommendationPolicySummary(
  rows: readonly AppBuilderRecommendationPolicyRow[],
): AppBuilderRecommendationPolicySummary {
  return {
    rowCount: rows.length,
    recommendationStatusCounts: countBy(
      APP_BUILDER_RECOMMENDATION_STATUSES_FOR_POLICY,
      rows.map((row) => row.recommendationStatus),
    ),
    applicabilityKindCounts: countBy(
      APP_BUILDER_RECOMMENDATION_APPLICABILITY_KINDS,
      rows.flatMap((row) => row.applicability.map((applicability) => applicability.kind)),
    ),
    evidenceKindCounts: countBy(
      APP_BUILDER_RECOMMENDATION_EVIDENCE_KINDS,
      rows.flatMap((row) => row.evidence.map((evidence) => evidence.kind)),
    ),
    defaultingCandidateCount: rows.filter((row) => row.defaultingCandidate).length,
    sourceLoweringImplementedCount: rows.filter((row) => row.sourceLoweringImplemented).length,
    explicitInputCount: rows.filter((row) => row.requiresExplicitInput).length,
  };
}

/** Rank recommendation statuses for AI-facing menus without making a blank-slate default decision. */
export function appBuilderRecommendationStatusRank(
  recommendationStatus: AppBuilderRecommendationStatus,
): number {
  return APP_BUILDER_RECOMMENDATION_STATUS_RANKS[recommendationStatus];
}

/** Project the reviewable recommendation policy facet from a public ontology status. */
export function appBuilderRecommendationPolicyRow(
  targetRef: AppBuilderOntologyRowRef,
  title: string,
  status: AppBuilderOntologyStatus,
): AppBuilderRecommendationPolicyRow {
  const override = appBuilderRecommendationPolicyOverride(targetRef);
  const sourceLoweringEvidence = appBuilderSourceLoweringEvidence(targetRef, status);
  const overrideEvidence = override?.evidence ?? [];
  const defaultingCandidatePolicy = appBuilderDefaultingCandidatePolicyRow(targetRef);
  const defaultingCandidate = appBuilderDefaultingCandidateForTarget(targetRef, status.recommendationStatus);
  return {
    targetRef,
    title,
    recommendationStatus: status.recommendationStatus,
    applicability: [
      ...appBuilderInputDependencyApplicabilityRows(targetRef),
      ...(override?.applicability ?? []),
      ...appBuilderFallbackApplicabilityRows(targetRef, status),
    ],
    evidence: [
      appBuilderSemanticRuntimeOntologyEvidence(targetRef),
      ...appBuilderStatusAuthorityEvidence(status, [...sourceLoweringEvidence, ...overrideEvidence]),
      ...sourceLoweringEvidence,
      ...overrideEvidence,
    ],
    defaultingCandidate,
    ...(defaultingCandidate && defaultingCandidatePolicy != null ? { defaultingCandidatePolicy } : {}),
    requiresExplicitInput: status.requiresExplicitInput,
    sourceLoweringImplemented: status.sourceLoweringImplemented,
    ...(status.note == null ? {} : { note: status.note }),
  };
}

const APP_BUILDER_RECOMMENDATION_STATUS_RANKS: Readonly<Record<AppBuilderRecommendationStatus, number>> = {
  [AppBuilderRecommendationStatus.Recommendable]: 0,
  [AppBuilderRecommendationStatus.Contextual]: 1,
  [AppBuilderRecommendationStatus.Deferred]: 2,
  [AppBuilderRecommendationStatus.ToBeDetermined]: 3,
  [AppBuilderRecommendationStatus.AvoidByDefault]: 4,
  [AppBuilderRecommendationStatus.AnalysisOnly]: 5,
};

const APP_BUILDER_RECOMMENDATION_STATUSES_FOR_POLICY = [
  AppBuilderRecommendationStatus.Recommendable,
  AppBuilderRecommendationStatus.Contextual,
  AppBuilderRecommendationStatus.Deferred,
  AppBuilderRecommendationStatus.AvoidByDefault,
  AppBuilderRecommendationStatus.AnalysisOnly,
  AppBuilderRecommendationStatus.ToBeDetermined,
] as const;

interface AppBuilderRecommendationPolicyOverride {
  readonly targetRef: AppBuilderOntologyRowRef;
  readonly applicability?: readonly AppBuilderRecommendationApplicabilityRow[];
  readonly evidence?: readonly AppBuilderRecommendationEvidenceRow[];
}

const APP_BUILDER_RECOMMENDATION_POLICY_OVERRIDES: readonly AppBuilderRecommendationPolicyOverride[] = [
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeTextInput),
    applicability: [
      domainFieldApplicability('Text/string scalar field or explicit string-like binding expression.'),
    ],
    evidence: [
      webPlatformEvidence('Native text inputs are browser form controls; Aurelia binding supplies the value channel.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeEmailInput),
    applicability: [
      domainFieldApplicability('Text field with explicit email-address affordance or explicit email binding target.'),
    ],
    evidence: [
      webPlatformEvidence('Native email inputs are browser form controls; Aurelia binding supplies the value channel.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeUrlInput),
    applicability: [
      domainFieldApplicability('Text field with explicit URL affordance or explicit URL binding target.'),
    ],
    evidence: [
      webPlatformEvidence('Native URL inputs are browser form controls; Aurelia binding supplies the value channel.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeTelInput),
    applicability: [
      domainFieldApplicability('Text field with explicit telephone affordance or explicit telephone binding target.'),
    ],
    evidence: [
      webPlatformEvidence('Native telephone inputs are browser form controls; Aurelia binding supplies the value channel.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativePasswordInput),
    applicability: [
      domainFieldApplicability('Text field with explicit secret/password affordance.'),
    ],
    evidence: [
      webPlatformEvidence('Native password inputs are browser form controls; Aurelia binding supplies the value channel.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeSearchInput),
    applicability: [
      domainFieldApplicability('Text field with explicit search/filter affordance.'),
    ],
    evidence: [
      webPlatformEvidence('Native search inputs are browser form controls; Aurelia binding supplies the value channel.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeTimeInput),
    applicability: [
      domainFieldApplicability('Text field with explicit time-of-day string affordance.'),
    ],
    evidence: [
      webPlatformEvidence('Native time inputs are browser form controls; Aurelia binding supplies the value channel as string transport.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeDateTimeLocalInput),
    applicability: [
      domainFieldApplicability('Text field with explicit local date-time string affordance.'),
    ],
    evidence: [
      webPlatformEvidence('Native datetime-local inputs are browser form controls; Aurelia binding supplies the value channel as string transport.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeMonthInput),
    applicability: [
      domainFieldApplicability('Text field with explicit month string affordance.'),
    ],
    evidence: [
      webPlatformEvidence('Native month inputs are browser form controls; Aurelia binding supplies the value channel as string transport.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeWeekInput),
    applicability: [
      domainFieldApplicability('Text field with explicit week string affordance.'),
    ],
    evidence: [
      webPlatformEvidence('Native week inputs are browser form controls; Aurelia binding supplies the value channel as string transport.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeNumberInput),
    applicability: [
      domainFieldApplicability('Numeric scalar field or explicit numeric binding expression.'),
      numericConstraintApplicability('Min/max/step and conversion policy are optional for a plain number input, but must be supplied before constrained numeric UX is emitted.'),
    ],
    evidence: [
      webPlatformEvidence('Native number inputs are browser form controls; Aurelia binding supplies the value channel.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeDateInput),
    applicability: [
      domainFieldApplicability('Date-like scalar field with a native browser date string boundary. Date-object conversion remains a separate explicit policy.'),
    ],
    evidence: [
      webPlatformEvidence('Native date inputs are browser form controls; current generated source uses Aurelia value binding against the browser date string value.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeRangeInput),
    applicability: [
      domainFieldApplicability('Numeric scalar field where slider interaction fits the domain.'),
      numericConstraintApplicability('Range generation needs explicit min/max/step or equivalent domain constraints.'),
    ],
    evidence: [
      webPlatformEvidence('Native range inputs are browser form controls for bounded numeric interaction.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeBooleanCheckbox),
    applicability: [
      domainFieldApplicability('Boolean field or explicit checked-channel binding expression.'),
    ],
    evidence: [
      webPlatformEvidence('Native checkboxes are browser form controls; Aurelia checked/value channels model their state.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeCheckboxList),
    applicability: [
      choiceValueSetApplicability('Finite option domain plus collection-membership state.'),
    ],
    evidence: [
      webPlatformEvidence('Checkbox groups are composed from native controls; Aurelia checked/value channels model option membership.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeRadioGroup),
    applicability: [
      choiceValueSetApplicability('Finite mutually-exclusive option domain with one selected value.'),
    ],
    evidence: [
      webPlatformEvidence('Radio groups are composed from native controls; Aurelia checked/value channels model the selected value.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeSingleSelect),
    applicability: [
      choiceValueSetApplicability('Finite option domain with one selected value and explicit option label/value projection.'),
    ],
    evidence: [
      webPlatformEvidence('Native select elements are browser controls; Aurelia option/value channels model selected values.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeMultiSelect),
    applicability: [
      choiceValueSetApplicability('Finite option domain plus collection-valued selected state.'),
    ],
    evidence: [
      webPlatformEvidence('Native multi-select elements are browser controls; Aurelia option/value channels model selected collections.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeTextarea),
    applicability: [
      domainFieldApplicability('Multiline text field or explicit string-like binding expression.'),
    ],
    evidence: [
      webPlatformEvidence('Native textarea elements are browser form controls; Aurelia binding supplies the value channel.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.NativeButton),
    applicability: [
      {
        kind: AppBuilderRecommendationApplicabilityKind.RelatedOntologySelection,
        summary: 'Requires a selected domain action, submit action, or explicit event handler target.',
      },
    ],
    evidence: [
      webPlatformEvidence('Native buttons are browser controls; Aurelia event bindings model command invocation.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.FieldGroup),
    applicability: [
      {
        kind: AppBuilderRecommendationApplicabilityKind.RelatedOntologySelection,
        summary: 'Requires a selected field/control context that needs label, help, error, or grouping structure.',
      },
    ],
    evidence: [
      publicResearchEvidence('Field grouping is grounded in accessible form structure, but exact visual treatment remains caller/design input.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.FormMessage),
    applicability: [
      {
        kind: AppBuilderRecommendationApplicabilityKind.RelatedOntologySelection,
        summary: 'Requires a selected field, form, validation, help, or status context before source should emit a message.',
      },
    ],
    evidence: [
      publicResearchEvidence('Form messages are grounded in accessibility/help/error relationships, not app-builder visual taste.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.CollectionList),
    applicability: [
      collectionProjectionApplicability(
        'Needs collection source plus display-field projection before source can choose list content.',
        [AppBuilderInputFacetId.CollectionDisplayFields],
      ),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.CollectionCard),
    applicability: [
      collectionProjectionApplicability(
        'Needs collection source plus card display roles such as title, summary, status, or action fields.',
        [AppBuilderInputFacetId.CollectionDisplayFields],
      ),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.CollectionTable),
    applicability: [
      collectionProjectionApplicability(
        'Needs table-column projection before source can choose table mechanics; selected query features may add more constraints.',
        [AppBuilderInputFacetId.CollectionTableColumns],
      ),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.RouterBackedListDetail),
    applicability: [
      {
        kind: AppBuilderRecommendationApplicabilityKind.RelatedOntologySelection,
        summary: 'Requires router admission plus an area-local decision that addressable list/detail navigation fits the user task.',
      },
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ApplicationPattern, AppBuilderApplicationPatternId.EditBuffer),
    applicability: [
      {
        kind: AppBuilderRecommendationApplicabilityKind.DeferredSubstrate,
        summary: 'Visible as an important later app-design pattern; source generation waits for edit-buffer/state/validation policy design.',
      },
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputContract, AppBuilderInputContractId.ControlAccessibility),
    evidence: [
      controlManifestContractEvidence('Control accessibility is a first-class manifest/input contract for generated and analyzed controls.'),
      publicResearchEvidence('Labels, descriptions, help/error state, and interaction expectations are grounded in accessibility practice, not app-builder taste.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputFacet, AppBuilderInputFacetId.SourceRoot),
    evidence: [
      sourcePlanSubstrateEvidence('Source roots are resolved by the SourcePlan placement boundary before generated artifacts become actionable.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputFacet, AppBuilderInputFacetId.SourceTargetPath),
    evidence: [
      sourcePlanSubstrateEvidence('Concrete target paths are SourcePlan placement facts, not fixture-local defaults.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputFacet, AppBuilderInputFacetId.SourceFileLayout),
    evidence: [
      sourcePlanSubstrateEvidence('File layout choices are carried by SourcePlan/custom-element layout helpers before source is emitted.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputFacet, AppBuilderInputFacetId.SourceProjectTooling),
    evidence: [
      sourcePlanSubstrateEvidence('Package dependencies, scripts, tsconfig, declarations, and style tooling are SourcePlan project-tooling consequences.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputFacet, AppBuilderInputFacetId.ExistingResourceFacts),
    evidence: [
      existingAppAnalysisEvidence('Existing resource facts come from deterministic semantic-runtime resource/app-world products, not business-domain inference.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputFacet, AppBuilderInputFacetId.ExistingRouteFacts),
    evidence: [
      existingAppAnalysisEvidence('Existing route facts come from deterministic semantic-runtime router/app-world products.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputFacet, AppBuilderInputFacetId.ExistingPluginFacts),
    evidence: [
      existingAppAnalysisEvidence('Existing plugin facts come from deterministic manifest/admission/plugin products.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputFacet, AppBuilderInputFacetId.AccessibilityLabels),
    evidence: [
      controlManifestContractEvidence('Accessibility labels are control manifest facts that can be generated or analyzed structurally.'),
      publicResearchEvidence('Accessible name/label input is a standard control-design requirement rather than a visual preference.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputFacet, AppBuilderInputFacetId.AccessibilityHelpError),
    evidence: [
      controlManifestContractEvidence('Help, error, validation, and status relationships are control manifest facts.'),
      publicResearchEvidence('Help/error relationships are grounded in accessible form practice.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.InputFacet, AppBuilderInputFacetId.AccessibilityInteraction),
    evidence: [
      controlManifestContractEvidence('Keyboard, focus, role, and state obligations belong to the control manifest contract before rich widgets are generated.'),
      publicResearchEvidence('Rich-control interaction remains deferred until APG-grade behavior contracts are modeled.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.PolicyAxis, AppBuilderPolicyAxisId.DomEncapsulation),
    evidence: [
      frameworkCapabilityEvidence('Light DOM and Shadow DOM are Aurelia/web-platform capabilities, but app-builder should choose them only by context or policy.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.RichCombobox),
    evidence: [
      publicResearchEvidence('Combobox generation is deferred until rich-widget accessibility and interaction contracts are modeled.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlPattern, AppBuilderControlPatternId.RichDialog),
    evidence: [
      publicResearchEvidence('Dialog generation is deferred until focus, lifecycle, and interaction contracts are modeled.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlManifest, AppBuilderControlManifestRowId.AccessibilityContract),
    evidence: [
      controlManifestContractEvidence('AccessibilityContract is the canonical control/component manifest row for label, help/error, role/state, and keyboard obligations.'),
      publicResearchEvidence('Accessibility obligations are grounded in platform/accessibility practice.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.ControlManifest, AppBuilderControlManifestRowId.ValueContract),
    evidence: [
      controlManifestContractEvidence('ValueContract is the canonical control/component manifest row for Aurelia value, checked, select, event, class, and style channels.'),
      frameworkCapabilityEvidence('Aurelia binding/value-channel semantics ground generated and analyzed control value contracts.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.StylingMechanism, AppBuilderStylingMechanismId.ComponentStylesheet),
    evidence: [
      frameworkCapabilityEvidence('Component stylesheets are an Aurelia resource/style capability, not app-builder visual taste.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.StylingMechanism, AppBuilderStylingMechanismId.CssModules),
    evidence: [
      frameworkCapabilityEvidence('CSS Modules are a real Aurelia/tooling style mechanism, currently deferred for generated output.'),
      sourcePlanSubstrateEvidence('CSS Modules require project-tooling/source-plan integration before app-builder should emit them.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.StylingMechanism, AppBuilderStylingMechanismId.ShadowDom),
    evidence: [
      frameworkCapabilityEvidence('Shadow DOM is an Aurelia/web-platform encapsulation capability, not a blanket generated-code default.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.StylingMechanism, AppBuilderStylingMechanismId.ClassBinding),
    applicability: [
      {
        kind: AppBuilderRecommendationApplicabilityKind.RelatedOntologySelection,
        summary: 'Use when a selected pattern, control, or visual policy needs state-dependent classes or structural class hooks; it does not supply visual tokens by itself.',
      },
    ],
    evidence: [
      frameworkCapabilityEvidence('Aurelia class binding/class-token semantics ground state-dependent styling hooks.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.StylingMechanism, AppBuilderStylingMechanismId.StyleBinding),
    evidence: [
      frameworkCapabilityEvidence('Aurelia style binding/property-style semantics ground state-dependent style hooks.'),
    ],
  },
  {
    targetRef: appBuilderOntologyRowRef(AppBuilderOntologyRowKind.VisualPolicy, AppBuilderVisualPolicyId.UtilityClassFriendly),
    evidence: [
      publicResearchEvidence('Utility-class-friendly output is a visible design-tooling option, but it remains caller/project policy rather than an unconditional app-builder default.'),
    ],
  },
] as const;

const APP_BUILDER_RECOMMENDATION_POLICY_OVERRIDES_BY_KEY = new Map(
  APP_BUILDER_RECOMMENDATION_POLICY_OVERRIDES.map((row) => [appBuilderPolicyTargetRefKey(row.targetRef), row]),
);

function appBuilderRecommendationPolicyOverride(
  targetRef: AppBuilderOntologyRowRef,
): AppBuilderRecommendationPolicyOverride | undefined {
  return APP_BUILDER_RECOMMENDATION_POLICY_OVERRIDES_BY_KEY.get(appBuilderPolicyTargetRefKey(targetRef));
}

function appBuilderInputDependencyApplicabilityRows(
  targetRef: AppBuilderOntologyRowRef,
): readonly AppBuilderRecommendationApplicabilityRow[] {
  return appBuilderOntologyRelationsFrom(targetRef, [AppBuilderOntologyRelationKind.InputDependency])
    .map((relation) => ({
      kind: appBuilderApplicabilityKindForInputDependency(relation.to.id),
      summary: `Requires ${relation.to.id}${relation.inputFacetIds == null ? '' : ` facets: ${relation.inputFacetIds.join(', ')}`}.`,
      targetRef: relation.to,
      ...(relation.inputFacetIds == null ? {} : { inputFacetIds: relation.inputFacetIds }),
    }));
}

function appBuilderApplicabilityKindForInputDependency(
  inputContractId: string,
): AppBuilderRecommendationApplicabilityKind {
  switch (inputContractId) {
    case AppBuilderInputContractId.SourcePlacement:
      return AppBuilderRecommendationApplicabilityKind.SourcePlacement;
    case AppBuilderInputContractId.VisualStyleInput:
      return AppBuilderRecommendationApplicabilityKind.VisualInput;
    case AppBuilderInputContractId.CollectionProjection:
      return AppBuilderRecommendationApplicabilityKind.CollectionProjection;
    default:
      return AppBuilderRecommendationApplicabilityKind.InputDependency;
  }
}

function appBuilderFallbackApplicabilityRows(
  targetRef: AppBuilderOntologyRowRef,
  status: AppBuilderOntologyStatus,
): readonly AppBuilderRecommendationApplicabilityRow[] {
  if (status.recommendationStatus === AppBuilderRecommendationStatus.Deferred) {
    return [{
      kind: AppBuilderRecommendationApplicabilityKind.DeferredSubstrate,
      summary: 'Visible in the ontology, but parked for a later app-builder generation ring.',
    }];
  }
  if (status.requiresExplicitInput && appBuilderOntologyRelationsFrom(targetRef, [AppBuilderOntologyRelationKind.InputDependency]).length === 0) {
    return [{
      kind: AppBuilderRecommendationApplicabilityKind.ExplicitSelection,
      summary: 'Requires explicit caller, policy, or app-fact input; no more specific dependency edge is modeled yet.',
    }];
  }
  return [];
}

function appBuilderSemanticRuntimeOntologyEvidence(
  targetRef: AppBuilderOntologyRowRef,
): AppBuilderRecommendationEvidenceRow {
  return {
    kind: AppBuilderRecommendationEvidenceKind.SemanticRuntimeOntology,
    summary: 'Admitted into the current semantic-runtime app-builder ontology.',
    targetRef,
  };
}

function appBuilderStatusAuthorityEvidence(
  status: AppBuilderOntologyStatus,
  concreteEvidence: readonly AppBuilderRecommendationEvidenceRow[],
): readonly AppBuilderRecommendationEvidenceRow[] {
  switch (status.reasonAuthority) {
    case AppBuilderOntologyReasonAuthority.OperatorConfirmed:
      return [{
        kind: AppBuilderRecommendationEvidenceKind.OperatorInterview,
        summary: 'Current recommendation posture follows operator interview/steering.',
      }];
    case AppBuilderOntologyReasonAuthority.SourceBacked:
      if (concreteEvidence.length > 0) {
        return [];
      }
      return [{
        kind: AppBuilderRecommendationEvidenceKind.LegacySourceBackedAuthority,
        summary: 'Migrated from the old compressed source-backed authority; needs replacement with framework, web-platform, corpus, or research evidence when refined.',
      }];
    case AppBuilderOntologyReasonAuthority.ToBeDetermined:
      return [{
        kind: AppBuilderRecommendationEvidenceKind.ToBeDetermined,
        summary: status.note == null
          ? 'Evidence is intentionally incomplete and should remain review-visible.'
          : `Evidence is intentionally incomplete and should remain review-visible: ${status.note}`,
      }];
  }
}

function appBuilderSourceLoweringEvidence(
  targetRef: AppBuilderOntologyRowRef,
  status: AppBuilderOntologyStatus,
): readonly AppBuilderRecommendationEvidenceRow[] {
  if (!status.sourceLoweringImplemented) {
    return [];
  }
  return [{
    kind: AppBuilderRecommendationEvidenceKind.SourceLoweringRegistry,
    summary: 'Executable source-lowering registry currently admits this target.',
    targetRef,
  }];
}

function domainFieldApplicability(
  summary: string,
): AppBuilderRecommendationApplicabilityRow {
  return {
    kind: AppBuilderRecommendationApplicabilityKind.DomainFieldKind,
    summary,
    inputFacetIds: [AppBuilderInputFacetId.DomainFields],
  };
}

function choiceValueSetApplicability(
  summary: string,
): AppBuilderRecommendationApplicabilityRow {
  return {
    kind: AppBuilderRecommendationApplicabilityKind.ChoiceValueSet,
    summary,
    inputFacetIds: [
      AppBuilderInputFacetId.DomainFields,
      AppBuilderInputFacetId.DomainValueSets,
    ],
  };
}

function numericConstraintApplicability(
  summary: string,
): AppBuilderRecommendationApplicabilityRow {
  return {
    kind: AppBuilderRecommendationApplicabilityKind.NumericConstraint,
    summary,
    inputFacetIds: [AppBuilderInputFacetId.DomainFields],
  };
}

function collectionProjectionApplicability(
  summary: string,
  inputFacetIds: readonly AppBuilderInputFacetId[],
): AppBuilderRecommendationApplicabilityRow {
  return {
    kind: AppBuilderRecommendationApplicabilityKind.CollectionProjection,
    summary,
    inputFacetIds,
  };
}

function webPlatformEvidence(
  summary: string,
): AppBuilderRecommendationEvidenceRow {
  return {
    kind: AppBuilderRecommendationEvidenceKind.WebPlatform,
    summary,
  };
}

function publicResearchEvidence(
  summary: string,
): AppBuilderRecommendationEvidenceRow {
  return {
    kind: AppBuilderRecommendationEvidenceKind.PublicResearch,
    summary,
  };
}

function sourcePlanSubstrateEvidence(
  summary: string,
): AppBuilderRecommendationEvidenceRow {
  return {
    kind: AppBuilderRecommendationEvidenceKind.SourcePlanSubstrate,
    summary,
  };
}

function existingAppAnalysisEvidence(
  summary: string,
): AppBuilderRecommendationEvidenceRow {
  return {
    kind: AppBuilderRecommendationEvidenceKind.ExistingAppAnalysis,
    summary,
  };
}

function frameworkCapabilityEvidence(
  summary: string,
): AppBuilderRecommendationEvidenceRow {
  return {
    kind: AppBuilderRecommendationEvidenceKind.FrameworkCapability,
    summary,
  };
}

function controlManifestContractEvidence(
  summary: string,
): AppBuilderRecommendationEvidenceRow {
  return {
    kind: AppBuilderRecommendationEvidenceKind.ControlManifestContract,
    summary,
  };
}

function countBy<Value extends string>(
  values: readonly Value[],
  actualValues: readonly Value[],
): Readonly<Record<Value, number>> {
  const counts = Object.fromEntries(values.map((value) => [value, 0])) as Record<Value, number>;
  for (const value of actualValues) {
    counts[value] += 1;
  }
  return counts;
}

function appBuilderPolicyTargetRefKey(
  ref: AppBuilderOntologyRowRef,
): string {
  return `${ref.kind}\0${ref.domain}\0${ref.id}`;
}
