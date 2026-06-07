import {
  appBuilderPartMenu,
  type AppBuilderPartMenu,
  type AppBuilderPartMenuRequest,
  type AppBuilderPartMenuPart,
} from '../app-builder/part-menu.js';
import {
  appBuilderPartSlotCatalogIssues,
  type AppBuilderPartSlotCatalogIssue,
} from '../app-builder/part-application.js';
import {
  appBuilderPartCatalogIssues,
  type AppBuilderPartCatalogIssue,
} from '../app-builder/part-catalog.js';
import {
  appBuilderPartSourceLoweringCatalogIssues,
  appBuilderPartSourceLoweringPreview,
  lowerAppBuilderPartSourceInvocation,
  type AppBuilderPartSourceLoweringCatalogIssue,
  type AppBuilderPartSourceLoweringPreview,
  type AppBuilderPartSourceLoweringPreviewRequest,
} from '../app-builder/part-source-lowering.js';
import {
  appBuilderPartSourceGalleryCoverageIssues,
  appBuilderPartSourceGallerySourcePlan,
  type AppBuilderPartSourceGalleryCoverageIssue,
} from '../app-builder/part-source-gallery.js';
import {
  appBuilderSourceLoweringGalleryCoverageIssues,
  buildAppBuilderSourceLoweringGalleryPlans,
  type AppBuilderSourceLoweringGalleryCoverageIssue,
} from '../app-builder/source-lowering-gallery.js';
import type {
  AppBuilderPartSourceInvocation,
  AppBuilderPartSourceLowering,
} from '../app-builder/part-source-invocation.js';
import {
  appBuilderInputContractDetail,
  appBuilderInputReadiness,
  appBuilderAffordanceDetail,
  appBuilderApplicationPatternDetail,
  appBuilderCollectionConceptDetail,
  appBuilderControlManifestDetail,
  appBuilderControlPatternDetail,
  appBuilderEffectContractDetail,
  appBuilderPolicyDetail,
  appBuilderStatusAuditRows,
  appBuilderStatusAuditSummary,
  appBuilderSourceLoweringComposition,
  appBuilderSourceLoweringInvocation,
  appBuilderSourceLoweringPreflight,
  appBuilderSourceLoweringSourcePlan,
  appBuilderStyleDetail,
  appBuilderOntologyCatalog,
  appBuilderTargetCatalog,
  APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS,
  type AppBuilderAffordanceDetail,
  type AppBuilderAffordanceDetailRequest,
  type AppBuilderApplicationPatternDetail,
  type AppBuilderApplicationPatternDetailRequest,
  type AppBuilderCollectionConceptDetail,
  type AppBuilderCollectionConceptDetailRequest,
  type AppBuilderControlManifestDetail,
  type AppBuilderControlManifestDetailRequest,
  type AppBuilderControlPatternDetail,
  type AppBuilderControlPatternDetailRequest,
  type AppBuilderEffectContractDetail,
  type AppBuilderEffectContractDetailRequest,
  type AppBuilderPolicyDetail,
  type AppBuilderPolicyDetailRequest,
  type AppBuilderStatusAuditRow,
  type AppBuilderStatusAuditSummary,
  type AppBuilderSourceLoweringComposition,
  type AppBuilderSourceLoweringCompositionRequest,
  type AppBuilderSourceLoweringInvocation,
  type AppBuilderSourceLoweringInvocationRequest,
  type AppBuilderSourceLoweringPreflight,
  type AppBuilderSourceLoweringPreflightRequest,
  type AppBuilderSourceLoweringSourcePlan,
  type AppBuilderSourceLoweringSourcePlanRequest,
  type AppBuilderStyleDetail,
  type AppBuilderStyleDetailRequest,
  type AppBuilderInputContractDetail,
  type AppBuilderInputContractDetailRequest,
  type AppBuilderInputReadinessRequest,
  type AppBuilderInputReadinessResult,
  type AppBuilderOntologyCatalogRequest,
  type AppBuilderOntologyCatalog,
  type AppBuilderTargetCatalog,
  type AppBuilderTargetCatalogRequest,
  type AppBuilderTargetCatalogRow,
} from '../app-builder/ontology/index.js';
import {
  appBuilderRecommendationPolicyDetail,
  appBuilderRecommendationPolicyRows,
  appBuilderRecommendationPolicySummary,
  type AppBuilderRecommendationPolicyDetail,
  type AppBuilderRecommendationPolicyDetailRequest,
  type AppBuilderRecommendationPolicyRow,
  type AppBuilderRecommendationPolicySummary,
} from '../app-builder/policy/index.js';
import { answer } from './answer-helpers.js';
import {
  outcomeForPagedRows,
  pageRows,
} from './answer-helpers.js';
import {
  SemanticRuntimeAnswerOutcome,
  type SemanticRuntimeAnswer,
  type SemanticRuntimePageInput,
  type SemanticRuntimePageResult,
} from './contracts.js';
import { queryKeyPart } from './app-query-identity.js';
import type { InquiryContinuationIntentValue } from '../inquiry/continuation-intent.js';
import type { SemanticRuntimeInquiryProfile } from '../telemetry/inquiry-profile.js';
import type {
  SourcePlan,
  SourcePlanContribution,
  SourcePlanFile,
  SourcePlanPolicy,
  SourcePlanText,
  SourcePattern,
} from '../source-plan/source-plan.js';
import type {
  SourcePlanProjectTooling,
} from '../source-plan/package-tooling.js';

/** Public app-builder query family; kept separate from app-world queries because generation does not open an app. */
export enum SemanticRuntimeAppBuilderQueryKind {
  /** Describe supported app-builder static/generation query families. */
  Catalog = 'catalog',
  /** Return the neutral reusable part menu independent of a concrete app composition. */
  PartMenu = 'part-menu',
  /** Return the read-only app-builder ontology for app-builder inputs, affordances, controls, collections, and status. */
  OntologyCatalog = 'ontology-catalog',
  /** Project missing or satisfied app-builder input dependencies for selected ontology rows. */
  InputReadiness = 'input-readiness',
  /** Return payload schema details for app-builder input contracts and facets. */
  InputContractDetail = 'input-contract-detail',
  /** Return selected app-builder affordance details joined to inputs, effects, and declared follow-ups. */
  AffordanceDetail = 'affordance-detail',
  /** Return selected application pattern details joined to inputs, concept rows, and associated moves. */
  ApplicationPatternDetail = 'application-pattern-detail',
  /** Return selected collection concept details joined to inputs, coordinating patterns, controls, style facts, and moves. */
  CollectionConceptDetail = 'collection-concept-detail',
  /** Return selected control/component manifest details joined to inputs, coordinating patterns, and control/style facts. */
  ControlManifestDetail = 'control-manifest-detail',
  /** Return selected control pattern details joined to inputs, coordinating patterns, manifests, and style facts. */
  ControlPatternDetail = 'control-pattern-detail',
  /** Return selected effect contracts joined to promising affordances and their input/pattern context. */
  EffectContractDetail = 'effect-contract-detail',
  /** Return selected policy-axis details joined to input readiness and input contract payloads. */
  PolicyDetail = 'policy-detail',
  /** Return reviewable recommendation/defaulting policy rows without selecting policy or lowering source. */
  RecommendationPolicy = 'recommendation-policy',
  /** Return selected style mechanism and visual policy details joined to inputs and coordinating patterns. */
  StyleDetail = 'style-detail',
  /** Return selectable ontology targets with status and compact readiness counts. */
  TargetCatalog = 'target-catalog',
  /** Check app-builder source-lowering feasibility for selected ontology targets without lowering source. */
  SourceLoweringPreflight = 'source-lowering-preflight',
  /** Lower one selected app-builder ontology target into source fragments. */
  SourceLoweringInvocation = 'source-lowering-invocation',
  /** Compose several selected app-builder source-lowering invocations into one source fragment set. */
  SourceLoweringComposition = 'source-lowering-composition',
  /** Wrap app-builder source-lowering fragments in an explicit SourcePlan preview without writing files. */
  SourceLoweringSourcePlan = 'source-lowering-source-plan',
  /** Preview callable source-lowering invocations for app-builder parts. */
  PartSourceLoweringPreview = 'part-source-lowering-preview',
  /** Lower one concrete app-builder part invocation into source fragments. */
  PartSourceInvocation = 'part-source-invocation',
  /** Return catalog/source-lowering integrity issues for app-builder registries. */
  CatalogIntegrity = 'catalog-integrity',
}

/** Stable value list for public transports that need enum-shaped input schemas. */
export const SEMANTIC_RUNTIME_APP_BUILDER_QUERY_KINDS = [
  SemanticRuntimeAppBuilderQueryKind.Catalog,
  SemanticRuntimeAppBuilderQueryKind.PartMenu,
  SemanticRuntimeAppBuilderQueryKind.OntologyCatalog,
  SemanticRuntimeAppBuilderQueryKind.InputReadiness,
  SemanticRuntimeAppBuilderQueryKind.InputContractDetail,
  SemanticRuntimeAppBuilderQueryKind.AffordanceDetail,
  SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail,
  SemanticRuntimeAppBuilderQueryKind.CollectionConceptDetail,
  SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail,
  SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail,
  SemanticRuntimeAppBuilderQueryKind.EffectContractDetail,
  SemanticRuntimeAppBuilderQueryKind.PolicyDetail,
  SemanticRuntimeAppBuilderQueryKind.RecommendationPolicy,
  SemanticRuntimeAppBuilderQueryKind.StyleDetail,
  SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
  SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
  SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
  SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
  SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
  SemanticRuntimeAppBuilderQueryKind.PartSourceLoweringPreview,
  SemanticRuntimeAppBuilderQueryKind.PartSourceInvocation,
  SemanticRuntimeAppBuilderQueryKind.CatalogIntegrity,
] as const;

/** Coarse catalog group for app-builder public query rows. */
export enum SemanticRuntimeAppBuilderQueryGroup {
  /** Workflow menus and generation for AI-guided app creation. */
  Workflow = 'workflow',
  /** Reusable framework/app-building parts and source callbacks. */
  Parts = 'parts',
  /** Read-only app-builder ontology and status terrain. */
  Ontology = 'ontology',
  /** Internal catalog consistency exposed as a public quality signal. */
  Integrity = 'integrity',
}

/** How a public app-builder query relates to the app-builder ontology and source-generation path. */
export enum SemanticRuntimeAppBuilderQueryPosture {
  /** Describes the available app-builder query surfaces rather than app-building concepts. */
  SurfaceMap = 'surface-map',
  /** Owns current app-builder ontology facts without lowering source. */
  OntologyReadModel = 'ontology-read-model',
  /** Lowers app-builder ontology selections through app-builder source callbacks without opening an app world. */
  SourceLoweringSurface = 'source-lowering-surface',
  /** Exposes reusable app-building parts or callable source fragments that later lowerers can spend. */
  PartSourceSubstrate = 'part-source-substrate',
  /** Reports catalog/source-lowering consistency without selecting app-building policy. */
  IntegrityProbe = 'integrity-probe',
}

/** Whether the app-builder answer can include generated source text. */
export enum SemanticRuntimeAppBuilderSourceTextPolicy {
  /** This answer never carries generated source text. */
  Never = 'never',
  /** Source text is returned only when requested explicitly. */
  Optional = 'optional',
  /** Source text is the purpose of the answer, although callers still choose whether to write it. */
  GeneratedSourcePlan = 'generated-source-plan',
  /** Generated source fragments are returned for caller-selected composition into a larger source plan. */
  GeneratedSourceFragments = 'generated-source-fragments',
}

/** Top-level request envelope field accepted by one app-builder query kind. */
export enum SemanticRuntimeAppBuilderRequestField {
  /** Part-menu filters over the reusable app-builder part catalog. */
  PartMenu = 'partMenu',
  /** Read-only ontology catalog filters over row domains and status matrix fields. */
  OntologyCatalog = 'ontologyCatalog',
  /** Input-readiness request over selected app-builder ontology rows and supplied inputs. */
  InputReadiness = 'inputReadiness',
  /** Input-contract detail filters over contracts, facets, and payload schema states. */
  InputContractDetail = 'inputContractDetail',
  /** Affordance-detail filters over app-builder moves and joined readiness/detail rows. */
  AffordanceDetail = 'affordanceDetail',
  /** Application-pattern detail filters over pattern rows and coordinated concept joins. */
  ApplicationPatternDetail = 'applicationPatternDetail',
  /** Collection-concept detail filters over collection rows and coordinated concept joins. */
  CollectionConceptDetail = 'collectionConceptDetail',
  /** Control-manifest detail filters over component/control manifest scaffold rows. */
  ControlManifestDetail = 'controlManifestDetail',
  /** Control-pattern detail filters over control rows and coordinated concept joins. */
  ControlPatternDetail = 'controlPatternDetail',
  /** Effect-contract detail filters over promised effects and promising app-builder moves. */
  EffectContractDetail = 'effectContractDetail',
  /** Policy-detail filters over scoped policy-axis rows. */
  PolicyDetail = 'policyDetail',
  /** Recommendation-policy filters over recommendation/defaulting posture rows. */
  RecommendationPolicy = 'recommendationPolicy',
  /** Style-detail filters over styling mechanism and visual policy rows. */
  StyleDetail = 'styleDetail',
  /** Target-catalog request over selectable app-builder ontology rows. */
  TargetCatalog = 'targetCatalog',
  /** Source-lowering preflight request over selected ontology rows and supplied inputs. */
  SourceLoweringPreflight = 'sourceLoweringPreflight',
  /** Source-lowering invocation request over one selected ontology target and supplied inputs. */
  SourceLoweringInvocation = 'sourceLoweringInvocation',
  /** Source-lowering composition request over one selected ontology target and supplied inputs. */
  SourceLoweringComposition = 'sourceLoweringComposition',
  /** Source-lowering SourcePlan request over explicit source placement and one selected lowering result. */
  SourceLoweringSourcePlan = 'sourceLoweringSourcePlan',
  /** Part-source preview filters and source-text inclusion policy. */
  PartSourceLoweringPreview = 'partSourceLoweringPreview',
  /** Concrete selected part invocation with slot assignments. */
  PartSourceInvocation = 'partSourceInvocation',
  /** Page window applied to row-shaped answers. */
  Page = 'page',
  /** Response-envelope filter for typed continuations; does not change app-builder query identity. */
  ContinuationIntents = 'continuationIntents',
  /** Inquiry-cost/profile hint carried without changing query semantics. */
  InquiryProfile = 'inquiryProfile',
}

/** Stable value list for app-builder query request-field transport schemas. */
export const SEMANTIC_RUNTIME_APP_BUILDER_REQUEST_FIELDS = [
  SemanticRuntimeAppBuilderRequestField.PartMenu,
  SemanticRuntimeAppBuilderRequestField.OntologyCatalog,
  SemanticRuntimeAppBuilderRequestField.InputReadiness,
  SemanticRuntimeAppBuilderRequestField.InputContractDetail,
  SemanticRuntimeAppBuilderRequestField.AffordanceDetail,
  SemanticRuntimeAppBuilderRequestField.ApplicationPatternDetail,
  SemanticRuntimeAppBuilderRequestField.CollectionConceptDetail,
  SemanticRuntimeAppBuilderRequestField.ControlManifestDetail,
  SemanticRuntimeAppBuilderRequestField.ControlPatternDetail,
  SemanticRuntimeAppBuilderRequestField.EffectContractDetail,
  SemanticRuntimeAppBuilderRequestField.PolicyDetail,
  SemanticRuntimeAppBuilderRequestField.RecommendationPolicy,
  SemanticRuntimeAppBuilderRequestField.StyleDetail,
  SemanticRuntimeAppBuilderRequestField.TargetCatalog,
  SemanticRuntimeAppBuilderRequestField.SourceLoweringPreflight,
  SemanticRuntimeAppBuilderRequestField.SourceLoweringInvocation,
  SemanticRuntimeAppBuilderRequestField.SourceLoweringComposition,
  SemanticRuntimeAppBuilderRequestField.SourceLoweringSourcePlan,
  SemanticRuntimeAppBuilderRequestField.PartSourceLoweringPreview,
  SemanticRuntimeAppBuilderRequestField.PartSourceInvocation,
  SemanticRuntimeAppBuilderRequestField.Page,
  SemanticRuntimeAppBuilderRequestField.ContinuationIntents,
  SemanticRuntimeAppBuilderRequestField.InquiryProfile,
] as const;

/** Static description of an app-builder query shape. */
export interface SemanticRuntimeAppBuilderQueryCatalogRow {
  readonly queryKind: SemanticRuntimeAppBuilderQueryKind;
  readonly group: SemanticRuntimeAppBuilderQueryGroup;
  readonly posture: SemanticRuntimeAppBuilderQueryPosture;
  readonly title: string;
  readonly summary: string;
  readonly sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy;
  readonly acceptedRequestFields: readonly SemanticRuntimeAppBuilderRequestField[];
  readonly acceptedSelectionFields: readonly string[];
  readonly opensAppWorld: false;
}

/** Catalog request for app-builder query rows. */
export interface SemanticRuntimeAppBuilderQueryCatalogRequest {
  readonly queryKind?: SemanticRuntimeAppBuilderQueryKind | `${SemanticRuntimeAppBuilderQueryKind}` | null;
  readonly group?: SemanticRuntimeAppBuilderQueryGroup | `${SemanticRuntimeAppBuilderQueryGroup}` | null;
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
  /** Response-envelope filter for typed continuations; it does not change catalog query identity. */
  readonly continuationIntents?: readonly InquiryContinuationIntentValue[] | null;
}

/** Catalog result for public app-builder workflow and part queries. */
export interface SemanticRuntimeAppBuilderQueryCatalogResult {
  readonly displayText: string;
  readonly rows: readonly SemanticRuntimeAppBuilderQueryCatalogRow[];
}

/** Public app-builder query request. */
export interface SemanticRuntimeAppBuilderQueryRequest {
  readonly kind: SemanticRuntimeAppBuilderQueryKind | `${SemanticRuntimeAppBuilderQueryKind}`;
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
  /** Response-envelope filter for typed continuations; it does not change app-builder query identity. */
  readonly continuationIntents?: readonly InquiryContinuationIntentValue[] | null;
  readonly page?: SemanticRuntimePageInput | null;
  readonly partMenu?: AppBuilderPartMenuRequest;
  readonly ontologyCatalog?: AppBuilderOntologyCatalogRequest;
  readonly inputReadiness?: AppBuilderInputReadinessRequest;
  readonly inputContractDetail?: AppBuilderInputContractDetailRequest;
  readonly affordanceDetail?: AppBuilderAffordanceDetailRequest;
  readonly applicationPatternDetail?: AppBuilderApplicationPatternDetailRequest;
  readonly collectionConceptDetail?: AppBuilderCollectionConceptDetailRequest;
  readonly controlManifestDetail?: AppBuilderControlManifestDetailRequest;
  readonly controlPatternDetail?: AppBuilderControlPatternDetailRequest;
  readonly effectContractDetail?: AppBuilderEffectContractDetailRequest;
  readonly policyDetail?: AppBuilderPolicyDetailRequest;
  readonly recommendationPolicy?: AppBuilderRecommendationPolicyDetailRequest;
  readonly styleDetail?: AppBuilderStyleDetailRequest;
  readonly targetCatalog?: AppBuilderTargetCatalogRequest;
  readonly sourceLoweringPreflight?: AppBuilderSourceLoweringPreflightRequest;
  readonly sourceLoweringInvocation?: AppBuilderSourceLoweringInvocationRequest;
  readonly sourceLoweringComposition?: AppBuilderSourceLoweringCompositionRequest;
  readonly sourceLoweringSourcePlan?: AppBuilderSourceLoweringSourcePlanRequest;
  readonly partSourceLoweringPreview?: AppBuilderPartSourceLoweringPreviewRequest;
  readonly partSourceInvocation?: AppBuilderPartSourceInvocation;
}

/** Public app-builder query issue category for staged request-shape problems. */
export enum SemanticRuntimeAppBuilderQueryIssueKind {
  /** The query kind needs a partSourceInvocation payload before source fragments can be lowered. */
  MissingPartSourceInvocation = 'missing-part-source-invocation',
}

/** Public app-builder query issue that lets MCP/IDE callers repair request shape. */
export interface SemanticRuntimeAppBuilderQueryIssue {
  readonly issueKind: SemanticRuntimeAppBuilderQueryIssueKind;
  readonly queryKind: SemanticRuntimeAppBuilderQueryKind | `${SemanticRuntimeAppBuilderQueryKind}`;
  readonly summary: string;
}

/** Public app-builder failure result for incomplete query payloads. */
export interface SemanticRuntimeAppBuilderQueryFailure {
  readonly displayText: string;
  readonly queryKind: SemanticRuntimeAppBuilderQueryKind | `${SemanticRuntimeAppBuilderQueryKind}`;
  readonly issues: readonly SemanticRuntimeAppBuilderQueryIssue[];
}

/** Integrity result over app-builder catalog registries and source-lowering callbacks. */
export interface SemanticRuntimeAppBuilderCatalogIntegrityResult {
  readonly displayText: string;
  readonly partSlotCatalogIssues: readonly AppBuilderPartSlotCatalogIssue[];
  readonly partCatalogIssues: readonly AppBuilderPartCatalogIssue[];
  readonly partSourceLoweringIssues: readonly AppBuilderPartSourceLoweringCatalogIssue[];
  readonly partSourceGalleryCoverageIssues: readonly AppBuilderPartSourceGalleryCoverageIssue[];
  readonly sourceLoweringGalleryCoverageIssues: readonly AppBuilderSourceLoweringGalleryCoverageIssue[];
  readonly statusAuditRows: readonly AppBuilderStatusAuditRow[];
  readonly statusAuditSummary: AppBuilderStatusAuditSummary;
  readonly recommendationPolicySummary: AppBuilderRecommendationPolicySummary;
  readonly issueCount: number;
}

/** Catalog-integrity registry frame over part descriptors and executable part callbacks. */
interface SemanticRuntimeAppBuilderCatalogRegistryIssueFrame {
  readonly partSlotCatalogIssues: readonly AppBuilderPartSlotCatalogIssue[];
  readonly partCatalogIssues: readonly AppBuilderPartCatalogIssue[];
  readonly partSourceLoweringIssues: readonly AppBuilderPartSourceLoweringCatalogIssue[];
  readonly issueCount: number;
}

/** Catalog-integrity gallery frame over generated part/source-lowering pressure plans. */
interface SemanticRuntimeAppBuilderCatalogGalleryCoverageFrame {
  readonly partSourceGalleryCoverageIssues: readonly AppBuilderPartSourceGalleryCoverageIssue[];
  readonly sourceLoweringGalleryCoverageIssues: readonly AppBuilderSourceLoweringGalleryCoverageIssue[];
  readonly issueCount: number;
}

/** Catalog-integrity policy frame over status rows and recommendation policy summaries. */
interface SemanticRuntimeAppBuilderCatalogPolicyAuditFrame {
  readonly statusAuditRows: readonly AppBuilderStatusAuditRow[];
  readonly statusAuditSummary: AppBuilderStatusAuditSummary;
  readonly recommendationPolicySummary: AppBuilderRecommendationPolicySummary;
}

/** Public SourcePlan file row; contribution ledgers are opt-in because witness rows own compact provenance. */
export interface SemanticRuntimeAppBuilderSourcePlanFile {
  readonly kind: SourcePlanFile['kind'];
  readonly path: SourcePlanFile['path'];
  readonly role: SourcePlanFile['role'];
  readonly language: SourcePlanFile['language'];
  readonly editKind: SourcePlanFile['editKind'];
  readonly operationKind: SourcePlanFile['operationKind'];
  readonly text: SourcePlanText | null;
  readonly contributionCount: number;
  readonly contributions?: readonly SourcePlanContribution[];
}

/** Public SourcePlan projection for app-builder answers. */
export interface SemanticRuntimeAppBuilderSourcePlan {
  readonly kind: SourcePlan['kind'];
  readonly rootDir: SourcePlan['rootDir'];
  readonly policy: SourcePlanPolicy;
  readonly files: readonly SemanticRuntimeAppBuilderSourcePlanFile[];
  readonly projectTooling: SourcePlanProjectTooling | null;
  readonly pattern: SourcePattern | null;
  readonly hasCompleteFileText: boolean;
}

/** Public SourcePlan answer with compact file contribution ledgers by default. */
export interface SemanticRuntimeAppBuilderSourceLoweringSourcePlan extends Omit<AppBuilderSourceLoweringSourcePlan, 'sourcePlan'> {
  readonly sourcePlan: SemanticRuntimeAppBuilderSourcePlan | null;
}

export type SemanticRuntimeAppBuilderQueryResult =
  | SemanticRuntimeAppBuilderQueryCatalogResult
  | AppBuilderPartMenu
  | AppBuilderOntologyCatalog
  | AppBuilderInputReadinessResult
  | AppBuilderInputContractDetail
  | AppBuilderAffordanceDetail
  | AppBuilderApplicationPatternDetail
  | AppBuilderCollectionConceptDetail
  | AppBuilderControlManifestDetail
  | AppBuilderControlPatternDetail
  | AppBuilderEffectContractDetail
  | AppBuilderPolicyDetail
  | AppBuilderRecommendationPolicyDetail
  | AppBuilderStyleDetail
  | AppBuilderTargetCatalog
  | AppBuilderSourceLoweringPreflight
  | AppBuilderSourceLoweringInvocation
  | AppBuilderSourceLoweringComposition
  | SemanticRuntimeAppBuilderSourceLoweringSourcePlan
  | AppBuilderPartSourceLoweringPreview
  | AppBuilderPartSourceLowering
  | SemanticRuntimeAppBuilderQueryFailure
  | SemanticRuntimeAppBuilderCatalogIntegrityResult;

type SemanticRuntimeAppBuilderQueryAnswerer = (
  request: SemanticRuntimeAppBuilderQueryRequest,
) => SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult>;

const APP_BUILDER_QUERY_CATALOG_ROWS: readonly SemanticRuntimeAppBuilderQueryCatalogRow[] = [
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.Catalog,
    group: SemanticRuntimeAppBuilderQueryGroup.Workflow,
    posture: SemanticRuntimeAppBuilderQueryPosture.SurfaceMap,
    title: 'App-Builder Catalog',
    summary: 'Describe supported app-builder public query families without opening an app world.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [SemanticRuntimeAppBuilderRequestField.InquiryProfile],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.PartMenu,
    group: SemanticRuntimeAppBuilderQueryGroup.Parts,
    posture: SemanticRuntimeAppBuilderQueryPosture.PartSourceSubstrate,
    title: 'Part Menu',
    summary: 'Return paged compact reusable app-building parts; defaults to preferred authoring-tier rows unless exact part, package/resource-package, or explicit tier intent is supplied.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.PartMenu,
      SemanticRuntimeAppBuilderRequestField.Page,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.OntologyCatalog,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
    title: 'App-Builder Ontology Catalog',
    summary: 'Return read-only app-builder ontology terrain across input contracts, affordances, effects, application patterns, controls, collections, style policy, and honest status; no source is lowered.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.OntologyCatalog,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.InputReadiness,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
    title: 'App-Builder Input Readiness',
    summary: 'Report missing, satisfied, rejected, and deferred input dependencies for selected app-builder ontology rows without lowering source.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.InputReadiness,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.InputContractDetail,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
    title: 'App-Builder Input Contract Detail',
    summary: 'Return read-only payload schema details for app-builder input contracts and facets so callers can supply missing input intentionally.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.InputContractDetail,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.AffordanceDetail,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
    title: 'App-Builder Affordance Detail',
    summary: 'Return selected app-building moves joined to input readiness, input contract detail, promised effects, associated application patterns, and declared follow-up affordances; no source is lowered.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.AffordanceDetail,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
    title: 'App-Builder Application Pattern Detail',
    summary: 'Return selected application design patterns joined to input readiness, input contract detail, coordinated collection/control/style concept rows, and associated affordances; no source is lowered.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.ApplicationPatternDetail,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.CollectionConceptDetail,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
    title: 'App-Builder Collection Concept Detail',
    summary: 'Return selected collection source/query/projection/table concepts joined to input readiness, input contract detail, coordinating application patterns, control/style concept rows, and associated affordances; no source is lowered.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.CollectionConceptDetail,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
    title: 'App-Builder Control Manifest Detail',
    summary: 'Return selected control/component manifest rows joined to input readiness, input contract detail, manifest field descriptors, coordinating application patterns, control facts, style facts, and associated affordances; no source is lowered.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.ControlManifestDetail,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
    title: 'App-Builder Control Pattern Detail',
    summary: 'Return selected native-first or deferred rich control patterns joined to input readiness, input contract detail, coordinating application patterns, manifest rows, style facts, and associated affordances; no source is lowered.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.ControlPatternDetail,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.EffectContractDetail,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
    title: 'App-Builder Effect Contract Detail',
    summary: 'Return selected effect contracts joined back to witness descriptors, public app-query rows, control manifest rows/field descriptors, and affordances that promise them, plus those affordances input readiness, input contract detail, and associated application patterns; no verification is executed and no source is lowered.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.EffectContractDetail,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.PolicyDetail,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
    title: 'App-Builder Policy Detail',
    summary: 'Return selected scoped policy axes joined to input readiness and input contract detail; no recommendation policy is evaluated and no source is lowered.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.PolicyDetail,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.RecommendationPolicy,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
    title: 'App-Builder Recommendation Policy',
    summary: 'Return reviewable recommendation/defaulting policy rows, applicability lanes, evidence lanes, and contextual executable candidates; no policy is selected and no source is lowered.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.RecommendationPolicy,
      SemanticRuntimeAppBuilderRequestField.Page,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.StyleDetail,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
    title: 'App-Builder Style Detail',
    summary: 'Return selected styling mechanisms and visual policies joined to input readiness, input contract detail, coordinating application patterns, concept rows, and associated affordances; no source or CSS is lowered.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.StyleDetail,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.TargetCatalog,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
    title: 'App-Builder Target Catalog',
    summary: 'Return selectable app-builder ontology targets with honest status, compact input-readiness counts, and optional source-lowering availability coverage; no source is lowered.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.TargetCatalog,
      SemanticRuntimeAppBuilderRequestField.Page,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.OntologyReadModel,
    title: 'App-Builder Source-Lowering Preflight',
    summary: 'Check selected app-builder ontology targets against supplied inputs, honest source-lowering support, and source-lowering availability without lowering source.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.SourceLoweringPreflight,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.SourceLoweringSurface,
    title: 'App-Builder Source-Lowering Invocation',
    summary: 'Lower one selected app-builder ontology target with supplied inputs into source fragments, delegating concrete syntax to app-builder part source callbacks.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.GeneratedSourceFragments,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.SourceLoweringInvocation,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.SourceLoweringSurface,
    title: 'App-Builder Source-Lowering Composition',
    summary: 'Compose a selected app-builder ontology target, explicit supplied inputs, and member target invocations into source fragments without writing files.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.GeneratedSourceFragments,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.SourceLoweringComposition,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan,
    group: SemanticRuntimeAppBuilderQueryGroup.Ontology,
    posture: SemanticRuntimeAppBuilderQueryPosture.SourceLoweringSurface,
    title: 'App-Builder Source-Lowering SourcePlan',
    summary: 'Wrap app-builder source-lowering fragments in an explicit SourcePlan preview, including template-only previews and companion TypeScript/template component pairs with caller-supplied placement.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.GeneratedSourcePlan,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.SourceLoweringSourcePlan,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.PartSourceLoweringPreview,
    group: SemanticRuntimeAppBuilderQueryGroup.Parts,
    posture: SemanticRuntimeAppBuilderQueryPosture.PartSourceSubstrate,
    title: 'Part Source-Lowering Preview',
    summary: 'Preview paged callable source-lowering samples for app-builder parts, following the same preferred-by-default authoring-tier policy as the part menu.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Optional,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.PartSourceLoweringPreview,
      SemanticRuntimeAppBuilderRequestField.PartMenu,
      SemanticRuntimeAppBuilderRequestField.Page,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.PartSourceInvocation,
    group: SemanticRuntimeAppBuilderQueryGroup.Parts,
    posture: SemanticRuntimeAppBuilderQueryPosture.PartSourceSubstrate,
    title: 'Part Source Invocation',
    summary: 'Lower one caller-selected app-builder part invocation into source fragments without writing files.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.GeneratedSourceFragments,
    acceptedRequestFields: [
      SemanticRuntimeAppBuilderRequestField.PartSourceInvocation,
      SemanticRuntimeAppBuilderRequestField.InquiryProfile,
    ],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
  {
    queryKind: SemanticRuntimeAppBuilderQueryKind.CatalogIntegrity,
    group: SemanticRuntimeAppBuilderQueryGroup.Integrity,
    posture: SemanticRuntimeAppBuilderQueryPosture.IntegrityProbe,
    title: 'Catalog Integrity',
    summary: 'Report app-builder registry/source-lowering issues that should be fixed before public generation relies on them.',
    sourceTextPolicy: SemanticRuntimeAppBuilderSourceTextPolicy.Never,
    acceptedRequestFields: [SemanticRuntimeAppBuilderRequestField.InquiryProfile],
    acceptedSelectionFields: [],
    opensAppWorld: false,
  },
];

const APP_BUILDER_QUERY_ANSWERERS = new Map<
SemanticRuntimeAppBuilderQueryKind | `${SemanticRuntimeAppBuilderQueryKind}`,
SemanticRuntimeAppBuilderQueryAnswerer
>([
  [SemanticRuntimeAppBuilderQueryKind.Catalog, answerAppBuilderCatalogQuery],
  [SemanticRuntimeAppBuilderQueryKind.PartMenu, answerAppBuilderPartMenuQuery],
  [SemanticRuntimeAppBuilderQueryKind.OntologyCatalog, answerAppBuilderOntologyCatalogQuery],
  [SemanticRuntimeAppBuilderQueryKind.InputReadiness, answerAppBuilderInputReadinessQuery],
  [SemanticRuntimeAppBuilderQueryKind.InputContractDetail, answerAppBuilderInputContractDetailQuery],
  [SemanticRuntimeAppBuilderQueryKind.AffordanceDetail, answerAppBuilderAffordanceDetailQuery],
  [SemanticRuntimeAppBuilderQueryKind.ApplicationPatternDetail, answerAppBuilderApplicationPatternDetailQuery],
  [SemanticRuntimeAppBuilderQueryKind.CollectionConceptDetail, answerAppBuilderCollectionConceptDetailQuery],
  [SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail, answerAppBuilderControlManifestDetailQuery],
  [SemanticRuntimeAppBuilderQueryKind.ControlPatternDetail, answerAppBuilderControlPatternDetailQuery],
  [SemanticRuntimeAppBuilderQueryKind.EffectContractDetail, answerAppBuilderEffectContractDetailQuery],
  [SemanticRuntimeAppBuilderQueryKind.PolicyDetail, answerAppBuilderPolicyDetailQuery],
  [SemanticRuntimeAppBuilderQueryKind.RecommendationPolicy, answerAppBuilderRecommendationPolicyQuery],
  [SemanticRuntimeAppBuilderQueryKind.StyleDetail, answerAppBuilderStyleDetailQuery],
  [SemanticRuntimeAppBuilderQueryKind.TargetCatalog, answerAppBuilderTargetCatalogQuery],
  [SemanticRuntimeAppBuilderQueryKind.SourceLoweringPreflight, answerAppBuilderSourceLoweringPreflightQuery],
  [SemanticRuntimeAppBuilderQueryKind.SourceLoweringInvocation, answerAppBuilderSourceLoweringInvocationQuery],
  [SemanticRuntimeAppBuilderQueryKind.SourceLoweringComposition, answerAppBuilderSourceLoweringCompositionQuery],
  [SemanticRuntimeAppBuilderQueryKind.SourceLoweringSourcePlan, answerAppBuilderSourceLoweringSourcePlanQuery],
  [SemanticRuntimeAppBuilderQueryKind.PartSourceLoweringPreview, answerAppBuilderPartSourceLoweringPreviewQuery],
  [SemanticRuntimeAppBuilderQueryKind.PartSourceInvocation, answerAppBuilderPartSourceInvocationQuery],
  [SemanticRuntimeAppBuilderQueryKind.CatalogIntegrity, answerAppBuilderCatalogIntegrityQuery],
]);

assertCompleteAppBuilderQuerySurface();

/** Read the public app-builder query catalog without materializing any app or source plan. */
export function readSemanticRuntimeAppBuilderQueryCatalog(
  request: SemanticRuntimeAppBuilderQueryCatalogRequest = {},
): SemanticRuntimeAppBuilderQueryCatalogResult {
  const rows = APP_BUILDER_QUERY_CATALOG_ROWS.filter((row) => (
    (request.queryKind == null || row.queryKind === request.queryKind)
    && (request.group == null || row.group === request.group)
  )).map((row) => ({
    ...row,
    acceptedRequestFields: appBuilderRequestFieldsWithContinuationFilter(row.acceptedRequestFields),
  }));
  return {
    rows,
    displayText: `App-builder catalog: ${rows.length} quer${rows.length === 1 ? 'y' : 'ies'}; appWorld=false.`,
  };
}

/** Answer the static app-builder catalog without runtime claim wrapping or continuation projection. */
export function answerSemanticRuntimeAppBuilderQueryCatalog(
  request: SemanticRuntimeAppBuilderQueryCatalogRequest = {},
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryCatalogResult> {
  const value = readSemanticRuntimeAppBuilderQueryCatalog(request);
  return answer(
    SemanticRuntimeAnswerOutcome.Hit,
    `Returned ${value.rows.length} app-builder query catalog row(s).`,
    value,
  );
}

/** Dispatch one pure app-builder query without opening an app world, writing files, or attaching runtime continuations. */
export function answerSemanticRuntimeAppBuilderQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const answerer = APP_BUILDER_QUERY_ANSWERERS.get(request.kind);
  if (answerer == null) {
    throw new Error(`Unsupported app-builder query kind '${String(request.kind)}'.`);
  }
  return answerer(request);
}

function assertCompleteAppBuilderQuerySurface(): void {
  const catalogKinds = new Set<SemanticRuntimeAppBuilderQueryKind | `${SemanticRuntimeAppBuilderQueryKind}`>();
  for (const row of APP_BUILDER_QUERY_CATALOG_ROWS) {
    if (catalogKinds.has(row.queryKind)) {
      throw new Error(`Duplicate app-builder query catalog row '${row.queryKind}'.`);
    }
    catalogKinds.add(row.queryKind);
  }
  for (const kind of SEMANTIC_RUNTIME_APP_BUILDER_QUERY_KINDS) {
    if (!catalogKinds.has(kind)) {
      throw new Error(`Missing app-builder query catalog row '${kind}'.`);
    }
    if (!APP_BUILDER_QUERY_ANSWERERS.has(kind)) {
      throw new Error(`Missing app-builder query answerer '${kind}'.`);
    }
  }
  for (const kind of APP_BUILDER_QUERY_ANSWERERS.keys()) {
    if (!catalogKinds.has(kind)) {
      throw new Error(`App-builder query answerer '${kind}' has no catalog row.`);
    }
  }
}

function answerAppBuilderCatalogQuery(
  _request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  return answerSemanticRuntimeAppBuilderQueryCatalog();
}

function answerAppBuilderPartMenuQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderPartMenu(request.partMenu);
  const paged = pageAppBuilderPartMenu(value, request.page ?? undefined);
  return answer(
    outcomeForPagedRows(paged),
    `Returned ${paged.value.parts.length} of ${paged.page.totalRows} app-builder part row(s).`,
    paged.value,
    paged.page,
  );
}

function answerAppBuilderOntologyCatalogQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderOntologyCatalog(request.ontologyCatalog);
  return answer(
    SemanticRuntimeAnswerOutcome.Hit,
    `Returned app-builder ontology catalog with ${value.domainSummaries.length} domain summary row(s).`,
    value,
  );
}

function answerAppBuilderInputReadinessQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderInputReadiness(request.inputReadiness);
  return answer(
    value.issues.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    `Returned app-builder input readiness for ${value.targets.length} target row(s) with ${value.issues.length} issue(s).`,
    value,
  );
}

function answerAppBuilderInputContractDetailQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderInputContractDetail(request.inputContractDetail);
  return answer(
    SemanticRuntimeAnswerOutcome.Hit,
    `Returned app-builder input contract detail for ${value.rows.length} contract row(s).`,
    value,
  );
}

function answerAppBuilderAffordanceDetailQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderAffordanceDetail(request.affordanceDetail);
  return answer(
    value.issues.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    `Returned app-builder affordance detail for ${value.rows.length} affordance row(s) with ${value.issues.length} issue(s).`,
    value,
  );
}

function answerAppBuilderApplicationPatternDetailQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderApplicationPatternDetail(request.applicationPatternDetail);
  return answer(
    value.issues.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    `Returned app-builder application pattern detail for ${value.rows.length} pattern row(s) with ${value.issues.length} issue(s).`,
    value,
  );
}

function answerAppBuilderCollectionConceptDetailQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderCollectionConceptDetail(request.collectionConceptDetail);
  return answer(
    value.issues.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    `Returned app-builder collection concept detail for ${value.rows.length} collection concept row(s) with ${value.issues.length} issue(s).`,
    value,
  );
}

function answerAppBuilderControlManifestDetailQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderControlManifestDetail(request.controlManifestDetail);
  return answer(
    value.issues.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    `Returned app-builder control manifest detail for ${value.rows.length} manifest row(s) with ${value.issues.length} issue(s).`,
    value,
  );
}

function answerAppBuilderControlPatternDetailQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderControlPatternDetail(request.controlPatternDetail);
  return answer(
    value.issues.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    `Returned app-builder control pattern detail for ${value.rows.length} control pattern row(s) with ${value.issues.length} issue(s).`,
    value,
  );
}

function answerAppBuilderEffectContractDetailQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderEffectContractDetail(request.effectContractDetail);
  return answer(
    value.issues.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    `Returned app-builder effect contract detail for ${value.rows.length} effect contract row(s) with ${value.issues.length} issue(s).`,
    value,
  );
}

function answerAppBuilderPolicyDetailQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderPolicyDetail(request.policyDetail);
  return answer(
    value.issues.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    `Returned app-builder policy detail for ${value.rows.length} policy axis row(s) with ${value.issues.length} issue(s).`,
    value,
  );
}

function answerAppBuilderRecommendationPolicyQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderRecommendationPolicyDetail(request.recommendationPolicy);
  const paged = pageAppBuilderRecommendationPolicyDetail(value, request.page ?? undefined);
  const summary = value.rowsIncluded
    ? `Returned ${paged.value.rows.length} of ${paged.page.totalRows} app-builder recommendation policy row(s) with ${value.issues.length} issue(s).`
    : `Returned app-builder recommendation policy summary for ${value.filteredRowCount} of ${value.totalRowCount} row(s) with ${value.issues.length} issue(s).`;
  return answer(
    value.issues.length === 0 ? outcomeForPagedRows(paged) : SemanticRuntimeAnswerOutcome.Partial,
    summary,
    paged.value,
    paged.page,
  );
}

function answerAppBuilderStyleDetailQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderStyleDetail(request.styleDetail);
  return answer(
    value.issues.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    `Returned app-builder style detail for ${value.stylingMechanismRows.length} styling mechanism row(s) and ${value.visualPolicyRows.length} visual policy row(s) with ${value.issues.length} issue(s).`,
    value,
  );
}

function answerAppBuilderTargetCatalogQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderTargetCatalog(request.targetCatalog);
  const paged = pageAppBuilderTargetCatalog(value, appBuilderTargetCatalogPageInput(request));
  return answer(
    value.issues.length === 0 ? outcomeForPagedRows(paged) : SemanticRuntimeAnswerOutcome.Partial,
    `Returned ${paged.value.rows.length} of ${paged.page.totalRows} app-builder target row(s) with ${value.issues.length} issue(s).`,
    paged.value,
    paged.page,
  );
}

function appBuilderTargetCatalogPageInput(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimePageInput | undefined {
  if (request.page != null) {
    return request.page;
  }
  const targetCatalog = request.targetCatalog;
  return targetCatalog == null ? { size: 25 } : undefined;
}

function answerAppBuilderSourceLoweringPreflightQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderSourceLoweringPreflight(request.sourceLoweringPreflight);
  return answer(
    value.issues.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    `Returned app-builder source-lowering preflight for ${value.rows.length} target row(s) with ${value.issues.length} issue(s).`,
    value,
  );
}

function answerAppBuilderSourceLoweringInvocationQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderSourceLoweringInvocation(request.sourceLoweringInvocation);
  return answer(
    value.issues.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    `Lowered app-builder ontology source target '${value.targetRef == null ? 'none' : `${value.targetRef.kind}:${value.targetRef.id}`}' with ${value.fragments.length} fragment(s) and ${value.issues.length} issue(s).`,
    value,
  );
}

function answerAppBuilderSourceLoweringCompositionQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderSourceLoweringComposition(request.sourceLoweringComposition);
  return answer(
    value.issues.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    `Composed app-builder ontology source target '${value.targetRef == null ? 'none' : `${value.targetRef.kind}:${value.targetRef.id}`}' with ${value.fragments.length} fragment(s), ${value.contributingFragments.length} contributing fragment(s), and ${value.issues.length} issue(s).`,
    value,
  );
}

function answerAppBuilderSourceLoweringSourcePlanQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const sourcePlan = appBuilderSourceLoweringSourcePlan(request.sourceLoweringSourcePlan);
  const value = publicAppBuilderSourceLoweringSourcePlan(
    sourcePlan,
    request.sourceLoweringSourcePlan?.includeSourcePlanContributions === true,
  );
  return answer(
    value.issues.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    `Previewed app-builder ontology SourcePlan with ${value.sourcePlan?.files.length ?? 0} file(s) and ${value.issues.length} issue(s).`,
    value,
  );
}

function publicAppBuilderSourceLoweringSourcePlan(
  value: AppBuilderSourceLoweringSourcePlan,
  includeContributions: boolean,
): SemanticRuntimeAppBuilderSourceLoweringSourcePlan {
  return {
    ...value,
    sourcePlan: publicAppBuilderSourcePlan(value.sourcePlan, includeContributions),
  };
}

function publicAppBuilderSourcePlan(
  sourcePlan: SourcePlan | null,
  includeContributions: boolean,
): SemanticRuntimeAppBuilderSourcePlan | null {
  if (sourcePlan == null) {
    return null;
  }
  return {
    kind: sourcePlan.kind,
    rootDir: sourcePlan.rootDir,
    policy: sourcePlan.policy,
    files: sourcePlan.files.map((file): SemanticRuntimeAppBuilderSourcePlanFile => ({
      kind: file.kind,
      path: file.path,
      role: file.role,
      language: file.language,
      editKind: file.editKind,
      operationKind: file.operationKind,
      text: file.text,
      contributionCount: file.contributions.length,
      ...(includeContributions ? { contributions: file.contributions } : {}),
    })),
    projectTooling: sourcePlan.projectTooling,
    pattern: sourcePlan.pattern,
    hasCompleteFileText: sourcePlan.hasCompleteFileText,
  };
}

function answerAppBuilderPartSourceLoweringPreviewQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = appBuilderPartSourceLoweringPreview(request.partSourceLoweringPreview ?? request.partMenu);
  const paged = pageAppBuilderPartSourceLoweringPreview(value, request.page ?? undefined);
  return answer(
    value.issueCount === 0 ? outcomeForPagedRows(paged) : SemanticRuntimeAnswerOutcome.Partial,
    `Previewed ${paged.value.rows.length} of ${paged.page.totalRows} app-builder part source-lowering sample(s) with ${value.issueCount} issue(s).`,
    paged.value,
    paged.page,
  );
}

function answerAppBuilderPartSourceInvocationQuery(
  request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const invocation = request.partSourceInvocation;
  if (invocation == null) {
    const value = appBuilderQueryFailure(request.kind, [{
      issueKind: SemanticRuntimeAppBuilderQueryIssueKind.MissingPartSourceInvocation,
      queryKind: request.kind,
      summary: `App-builder query '${request.kind}' requires a partSourceInvocation payload with partKind, partId, and any required slotAssignments.`,
    }]);
    return answer(
      SemanticRuntimeAnswerOutcome.Partial,
      `App-builder part source invocation is incomplete: ${value.issues.length} issue(s).`,
      value,
    );
  }
  const value = lowerAppBuilderPartSourceInvocation(invocation);
  return answer(
    value.issues.length === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    `Lowered app-builder part invocation '${value.invocation.partKind}:${value.invocation.partId}' with state '${value.state}'.`,
    value,
  );
}

function answerAppBuilderCatalogIntegrityQuery(
  _request: SemanticRuntimeAppBuilderQueryRequest,
): SemanticRuntimeAnswer<SemanticRuntimeAppBuilderQueryResult> {
  const value = readSemanticRuntimeAppBuilderCatalogIntegrity();
  return answer(
    value.issueCount === 0 ? SemanticRuntimeAnswerOutcome.Hit : SemanticRuntimeAnswerOutcome.Partial,
    `Checked app-builder catalog integrity with ${value.issueCount} issue(s).`,
    value,
  );
}

/** Check app-builder catalog/source-lowering registries without throwing. */
export function readSemanticRuntimeAppBuilderCatalogIntegrity(): SemanticRuntimeAppBuilderCatalogIntegrityResult {
  const registryIssues = semanticRuntimeAppBuilderCatalogRegistryIssueFrame();
  const galleryCoverage = semanticRuntimeAppBuilderCatalogGalleryCoverageFrame();
  const policyAudit = semanticRuntimeAppBuilderCatalogPolicyAuditFrame();
  const issueCount = registryIssues.issueCount
    + galleryCoverage.issueCount
    + policyAudit.statusAuditSummary.integrityIssueCount;
  return {
    partSlotCatalogIssues: registryIssues.partSlotCatalogIssues,
    partCatalogIssues: registryIssues.partCatalogIssues,
    partSourceLoweringIssues: registryIssues.partSourceLoweringIssues,
    partSourceGalleryCoverageIssues: galleryCoverage.partSourceGalleryCoverageIssues,
    sourceLoweringGalleryCoverageIssues: galleryCoverage.sourceLoweringGalleryCoverageIssues,
    statusAuditRows: policyAudit.statusAuditRows,
    statusAuditSummary: policyAudit.statusAuditSummary,
    recommendationPolicySummary: policyAudit.recommendationPolicySummary,
    issueCount,
    displayText: semanticRuntimeAppBuilderCatalogIntegrityDisplayText(issueCount, registryIssues, galleryCoverage, policyAudit),
  };
}

function semanticRuntimeAppBuilderCatalogRegistryIssueFrame(): SemanticRuntimeAppBuilderCatalogRegistryIssueFrame {
  const partSlotCatalogIssues = appBuilderPartSlotCatalogIssues();
  const partCatalogIssues = appBuilderPartCatalogIssues();
  const partSourceLoweringIssues = appBuilderPartSourceLoweringCatalogIssues();
  return {
    partSlotCatalogIssues,
    partCatalogIssues,
    partSourceLoweringIssues,
    issueCount: partSlotCatalogIssues.length + partCatalogIssues.length + partSourceLoweringIssues.length,
  };
}

function semanticRuntimeAppBuilderCatalogGalleryCoverageFrame(): SemanticRuntimeAppBuilderCatalogGalleryCoverageFrame {
  const partSourceGalleryCoverageIssues = appBuilderPartSourceGalleryCoverageIssues(appBuilderPartSourceGallerySourcePlan({
    rootDir: 'app-builder-part-source-gallery',
    appName: 'App Builder Part Source Gallery',
  }));
  const sourceLoweringGalleryCoverageIssues = appBuilderSourceLoweringGalleryCoverageIssues(buildAppBuilderSourceLoweringGalleryPlans({
    rootDir: 'app-builder-source-lowering-gallery',
    appName: 'App Builder Source Lowering Gallery',
  }));
  return {
    partSourceGalleryCoverageIssues,
    sourceLoweringGalleryCoverageIssues,
    issueCount: partSourceGalleryCoverageIssues.length + sourceLoweringGalleryCoverageIssues.length,
  };
}

function semanticRuntimeAppBuilderCatalogPolicyAuditFrame(): SemanticRuntimeAppBuilderCatalogPolicyAuditFrame {
  const statusAuditRows = appBuilderStatusAuditRows();
  return {
    statusAuditRows,
    statusAuditSummary: appBuilderStatusAuditSummary(statusAuditRows),
    recommendationPolicySummary: appBuilderRecommendationPolicySummary(
      appBuilderRecommendationPolicyRows(APP_BUILDER_ONTOLOGY_ROW_DESCRIPTORS),
    ),
  };
}

function semanticRuntimeAppBuilderCatalogIntegrityDisplayText(
  issueCount: number,
  registryIssues: SemanticRuntimeAppBuilderCatalogRegistryIssueFrame,
  galleryCoverage: SemanticRuntimeAppBuilderCatalogGalleryCoverageFrame,
  policyAudit: SemanticRuntimeAppBuilderCatalogPolicyAuditFrame,
): string {
  return `App-builder integrity: ${issueCount} issue(s), partSlotCatalog=${registryIssues.partSlotCatalogIssues.length}, partCatalog=${registryIssues.partCatalogIssues.length}, partSource=${registryIssues.partSourceLoweringIssues.length}, partSourceGallery=${galleryCoverage.partSourceGalleryCoverageIssues.length}, sourceLoweringGallery=${galleryCoverage.sourceLoweringGalleryCoverageIssues.length}, statusAuditIssues=${policyAudit.statusAuditSummary.integrityIssueCount}, statusReview=${policyAudit.statusAuditSummary.reviewNeededCount}, recommendationRows=${policyAudit.recommendationPolicySummary.rowCount}, defaultingCandidates=${policyAudit.recommendationPolicySummary.defaultingCandidateCount}.`;
}

/** Stable cache key for the static app-builder catalog query. */
export function semanticRuntimeAppBuilderQueryCatalogKey(
  request: SemanticRuntimeAppBuilderQueryCatalogRequest,
): string {
  return [
    'app-builder-catalog',
    `group:${request.group ?? 'all'}`,
    `kind:${request.queryKind ?? 'all'}`,
  ].map(queryKeyPart).join('|');
}

/** Stable cache key for public app-builder query requests. */
export function semanticRuntimeAppBuilderQueryKey(
  request: SemanticRuntimeAppBuilderQueryRequest,
): string {
  const { inquiryProfile: _inquiryProfile, continuationIntents: _continuationIntents, ...keyRequest } = request;
  return [
    'app-builder',
    String(request.kind),
    canonicalQueryKey(keyRequest),
  ].map(queryKeyPart).join('|');
}

function appBuilderRequestFieldsWithContinuationFilter(
  fields: readonly SemanticRuntimeAppBuilderRequestField[],
): readonly SemanticRuntimeAppBuilderRequestField[] {
  return fields.includes(SemanticRuntimeAppBuilderRequestField.ContinuationIntents)
    ? fields
    : [...fields, SemanticRuntimeAppBuilderRequestField.ContinuationIntents];
}

function pageAppBuilderPartMenu(
  value: AppBuilderPartMenu,
  page: SemanticRuntimePageInput | undefined,
): { readonly value: AppBuilderPartMenu; readonly page: SemanticRuntimePageResult } {
  const paged = pageRows(value.parts, page);
  const selectedKeys = new Set(paged.rows.map(appBuilderPartMenuPartKey));
  return {
    value: {
      ...value,
      parts: paged.rows,
      ...(value.partDetails == null
        ? {}
        : { partDetails: value.partDetails.filter((part) => selectedKeys.has(appBuilderPartMenuPartKey(part))) }),
      displayText: `${value.displayText}\nReturned rows: ${paged.page.returnedRows}/${paged.page.totalRows}${paged.page.nextCursor == null ? '' : `; nextCursor=${paged.page.nextCursor}`}.`,
    },
    page: paged.page,
  };
}

function pageAppBuilderTargetCatalog(
  value: AppBuilderTargetCatalog,
  page: SemanticRuntimePageInput | undefined,
): { readonly value: AppBuilderTargetCatalog; readonly page: SemanticRuntimePageResult } {
  const paged = pageRows(value.rows, page);
  return {
    value: {
      ...value,
      rows: paged.rows,
      displayText: `${value.displayText}\nReturned rows: ${paged.page.returnedRows}/${paged.page.totalRows}${paged.page.nextCursor == null ? '' : `; nextCursor=${paged.page.nextCursor}`}.`,
    },
    page: paged.page,
  };
}

function pageAppBuilderRecommendationPolicyDetail(
  value: AppBuilderRecommendationPolicyDetail,
  page: SemanticRuntimePageInput | undefined,
): { readonly value: AppBuilderRecommendationPolicyDetail; readonly page: SemanticRuntimePageResult } {
  const paged = pageRows(value.rows, page);
  return {
    value: {
      ...value,
      rows: paged.rows,
      displayText: `${value.displayText}\nReturned rows: ${paged.page.returnedRows}/${paged.page.totalRows}${paged.page.nextCursor == null ? '' : `; nextCursor=${paged.page.nextCursor}`}.`,
    },
    page: paged.page,
  };
}

function appBuilderPartMenuPartKey(
  part: Pick<AppBuilderPartMenuPart, 'kind' | 'id'>,
): string {
  return `${part.kind}\0${part.id}`;
}

function pageAppBuilderPartSourceLoweringPreview(
  value: AppBuilderPartSourceLoweringPreview,
  page: SemanticRuntimePageInput | undefined,
): { readonly value: AppBuilderPartSourceLoweringPreview; readonly page: SemanticRuntimePageResult } {
  const paged = pageRows(value.rows, page);
  return {
    value: {
      ...value,
      rows: paged.rows,
      displayText: `${value.displayText}\nReturned rows: ${paged.page.returnedRows}/${paged.page.totalRows}${paged.page.nextCursor == null ? '' : `; nextCursor=${paged.page.nextCursor}`}.`,
    },
    page: paged.page,
  };
}

function appBuilderQueryFailure(
  queryKind: SemanticRuntimeAppBuilderQueryKind | `${SemanticRuntimeAppBuilderQueryKind}`,
  issues: readonly SemanticRuntimeAppBuilderQueryIssue[],
): SemanticRuntimeAppBuilderQueryFailure {
  return {
    queryKind,
    issues,
    displayText: `App-builder query '${queryKind}' could not run: ${issues.map((issue) => issue.summary).join(' ')}`,
  };
}

function canonicalQueryKey(value: unknown): string {
  if (value == null) {
    return 'null';
  }
  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalQueryKey).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalQueryKey(entryValue)}`).join(',')}}`;
}
