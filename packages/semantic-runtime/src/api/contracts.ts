import type {
  BootProjectDiscoveryMode,
  BootProjectInput,
} from '../boot/frames.js';
import type {
  AuthoringCapabilityKey,
  AuthoringConfidence,
  AuthoringEvidenceAuthority,
  AuthoringOpenReasonKind,
  AuthoringAmbiguityResolution,
  AuthoringOperationAction,
  AuthoringOperationFamilyKey,
  AuthoringOperationKind,
  AuthoringPolicyState,
  AuthoringStyleKey,
  AuthoringSupportState,
  AuthoringTargetKind,
  AuthoringTasteAxisLayer,
  AuthoringTasteAxisKey,
  AuthoringTasteValueKey,
} from '../authoring/ontology.js';
import type {
  AuthoringRepairChangeDomain,
  AuthoringRepairEvidenceKind,
  AuthoringRepairKind,
  AuthoringRepairPlanKind,
  AuthoringRepairPlanReadiness,
  AuthoringRepairRuntimeBoundaryKind,
  AuthoringRepairRuntimeIntentKind,
} from '../authoring/repair.js';
import type {
  ExpectedSemanticEffectCardinality,
  ExpectedSemanticEffectKind,
  ExpectedSemanticEffectRole,
  ExpectedSemanticEffectScope,
} from '../authoring/expected-effect.js';
import type {
  AuthoringPackageToolingPolicy,
  AuthoringSourceDomainModelPolicy,
  AuthoringSourceConflictPolicy,
  AuthoringSourceEditKind,
  AuthoringSourceFileRole,
  AuthoringSourceFormattingPolicy,
  AuthoringSourceLanguage,
  AuthoringSourcePatternParameterApplicationPolicy,
  AuthoringSourcePatternParameterApplicationState,
  AuthoringSourcePatternParameterKind,
  AuthoringSourcePatternParameterValueShape,
  AuthoringSourcePatternRole,
  AuthoringSourcePatternModuleKind,
  AuthoringSourcePatternUsePolicy,
  AuthoringSourceCodeEconomyPolicy,
  AuthoringSourceDataPolicy,
  AuthoringSourceStylePolicy,
  AuthoringSourceTextAuthority,
} from '../authoring/source-plan.js';
import type {
  AuthoringBuildToolPolicy,
  AuthoringPackageDependencyScope,
  AuthoringPackageManager,
  AuthoringProjectToolingFileKind,
  AuthoringProjectToolingLanguage,
} from '../authoring/package-tooling.js';
import type {
  SemanticProjectAnalysisKind,
  SemanticProjectAureliaDependencyOrigin,
  SemanticProjectAureliaDependencyScope,
  SemanticProjectAureliaSourceSignalKind,
  SemanticProjectShapeReasonKind,
  SemanticProjectShapeKind,
} from '../boot/project-shape.js';
import type {
  ExpressionExpectedContinuationClass,
  ExpressionFrontierKind,
} from '../expression/parse-result-algebra.js';
import type {
  TemplateCompletionCandidateKind,
  TemplateCompletionCandidateSourceKind,
  TemplateCompletionSiteKind,
} from '../inquiry/template-completion.js';
import type { SemanticAppAnalysisDepth } from '../configuration/app-analysis.js';
import type {
  QueryClaimGraphDisposalSummary,
  QueryClaimRecord,
  QueryClaimGraphSnapshot,
} from '../inquiry/query-claim-graph.js';
import type {
  SemanticQueryMaterializationPolicy,
} from '../inquiry/query-claim-policy.js';
import type {
  SemanticRuntimeCountRow,
  SemanticRuntimeDetailDensityRow,
  SemanticRuntimeKernelCountSnapshot,
  SemanticRuntimeKernelDensitySnapshot,
} from '../telemetry/kernel-density.js';
import type { SemanticRuntimeInquiryProfile } from '../telemetry/inquiry-profile.js';
import type {
  SemanticRuntimeMemoryDelta,
  SemanticRuntimeMemorySample,
} from '../telemetry/memory.js';
import type { SemanticRuntimeTelemetryOptions } from '../telemetry/options.js';
import type { CheckerExpressionTypeEvaluationCacheStats } from '../type-system/expression-type-evaluation.js';
import type { ConfigurationOptionValueKind } from '../configuration/configuration-option.js';
import type { ControllerPhase } from '../configuration/controller.js';
import type {
  StateIssueKind,
  StateIssuePhase,
  StateIssueSeverity,
} from '../state/state-issue.js';
import type {
  ValidationIssueKind,
  ValidationIssuePhase,
  ValidationIssueSeverity,
} from '../validation/validation-issue.js';
import type {
  FetchClientIssueKind,
  FetchClientIssuePhase,
  FetchClientIssueSeverity,
} from '../fetch-client/fetch-client-issue.js';
import type {
  DialogIssueKind,
  DialogIssuePhase,
  DialogIssueSeverity,
} from '../dialog/dialog-issue.js';
import type {
  ConfigurationIssueKind,
  ConfigurationIssuePhase,
} from '../configuration/configuration-issue.js';
import type {
  DiIssueKind,
  DiIssuePhase,
  DiIssueSubjectKind,
} from '../di/di-issue.js';
import type {
  EvaluationIssueKind,
  EvaluationIssuePhase,
  EvaluationIssueSubjectKind,
} from '../evaluation/evaluation-issue.js';
import type {
  StaticProjectEvaluationSourceFileStats,
} from '../evaluation/project-evaluation.js';
import type {
  EvaluationModuleSourceHostProfile,
} from '../evaluation/module-host.js';
import type { EvaluationValueKind } from '../evaluation/values.js';
import type {
  DiResolveActiveContainerExpectation,
  DiResolveEnclosingMemberKind,
  DiResolveExecutionContextKind,
} from '../di/resolve-call-recognition.js';
import type {
  AddressHandle,
  ClaimHandle,
  IdentityHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type { OpenSeam } from '../kernel/open-seam.js';
import type { OpenSeamReasonKind } from '../kernel/open-seam.js';
import type { ResourceDefinitionKind } from '../resources/resource-kind.js';
import type { ResourceDependencyReferenceKind } from '../resources/resource-reference.js';
import type {
  BindableBindingMode,
  BindableSetterKind,
} from '../resources/bindable-definition.js';
import type {
  CustomElementCaptureKind,
  CustomElementTemplateKind,
  ShadowRootMode,
} from '../resources/custom-element-definition.js';
import type { CustomAttributeContainerStrategy } from '../resources/custom-attribute-definition.js';
import type {
  WatchCallbackKind,
  WatchExpressionKind,
  WatchFlushMode,
  WatchPropertyKeyKind,
} from '../resources/watch-definition.js';
import type {
  ResourceIssueKind,
  ResourceIssuePhase,
} from '../resources/resource-issue.js';
import type { TemplateResourceVisibilityKind } from '../template/compiler-world-reference.js';
import type { TemplateInstructionKind } from '../template/instruction-ir.js';
import type {
  RuntimeBindingDataFlowDirection,
  RuntimeObservedDependencyKind,
  RuntimeBindingDataFlowSourceAssignmentKind,
  RuntimeBindingDataFlowSourceAssignmentReasonKind,
  RuntimeBindingDataFlowSourceKind,
  RuntimeBindingDataFlowTypeMismatchKind,
  RuntimeBindingPrimitiveValueKind,
  RuntimeBindingPrimitiveValue,
  RuntimeBindingValueChannelAuthority,
  RuntimeBindingValueChannelCouplingKind,
  RuntimeBindingValueChannelKind,
} from '../observation/runtime-binding-observation.js';
import type {
  ObservationIssueKind,
  ObservationIssuePhase,
} from '../observation/observation-issue.js';
import type {
  ComputedObservationDependencyMode,
  ComputedObservationMemberKind,
} from '../observation/computed-observation.js';
import type {
  ComputedObserverRuntimeKind,
  ComputedObserverSourceTriggerKind,
} from '../observation/computed-observer-source.js';
import type {
  RuntimeEffectDependencyEvaluationKind,
  RuntimeEffectKind,
} from '../observation/runtime-effect.js';
import type {
  ProxyObservableEscapeKind,
} from '../observation/proxy-observable-escape.js';
import type {
  RuntimeBindingKind,
  RuntimeBindingSourceOperationAuthority,
  RuntimeBindingSourceOperationKind,
  RuntimeBindingTargetAccessAuthority,
  RuntimeBindingTargetAccessLookup,
  RuntimeBindingTargetAccessStrategy,
  RuntimeBindingTargetKind,
  RuntimeBindingTargetTypeSource,
  RuntimeBindingTargetOperationAuthority,
  RuntimeBindingTargetOperationKind,
  RuntimeTargetOperationOwnerKind,
} from '../template/runtime-binding.js';
import type {
  RuntimeBindingBehaviorApplicationPhase,
} from '../template/runtime-binding-behavior.js';
import type {
  RuntimeControllerCreationKind,
  RuntimeControllerLifecycleStage,
  RuntimeControllerLifecycleStepKind,
  RuntimeControllerReadinessKind,
} from '../template/runtime-controller.js';
import type {
  RuntimeWatcherDependencyEvaluationKind,
  RuntimeWatcherKind,
} from '../template/runtime-watcher.js';
import type {
  CompositionActivateMethodKind,
  CompositionActivationModelHandoffKind,
  CompositionComponentResolutionKind,
  CompositionInputFulfillmentKind,
  CompositionModelResolutionKind,
} from '../template/runtime-composition.js';
import type { RuntimeRendererKind } from '../template/runtime-renderer-reference.js';
import type {
  TemplateExpressionParseState,
  TemplateValueSiteKind,
} from '../template/value-site.js';
import type {
  CheckerExpressionTypeOpenKind,
} from '../type-system/expression-type-evaluation.js';
import type {
  TypeSystemDiagnosticCategory,
  TypeSystemDiagnosticPhase,
} from '../type-system/diagnostics.js';
import type {
  CheckerTypeMemberKind,
  CheckerTypeShapeKind,
} from '../type-system/type-shape.js';
import type { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import type {
  BuiltInTemplateControllerChildViewCardinality,
  BuiltInTemplateControllerFlowKind,
} from '../template/template-controller-semantics.js';
import type {
  NavigationInstructionKind,
  RouteableComponentKind,
  RouteConfigKind,
  RouteConfigOriginKind,
  RouteConfigValueKind,
  RouteRecognizerIssueKind,
  RouteRecognizerModelKind,
  RouteRecognizerSegmentKind,
  RouteRecognizerStateKind,
  RouterIssueKind,
  RouterIssuePhase,
  RouterIssueSeverity,
  RouterModelKind,
} from '../router/model.js';
import type { SemanticSourceReference } from './source-reference.js';

export const SEMANTIC_RUNTIME_API_VERSION = '0.1' as const;

export const SEMANTIC_PROJECT_DISCOVERY_MODES = [
  'single-root',
  'package-tsconfig',
] as const;

export const enum SemanticRuntimeAnswerOutcome {
  Hit = 'hit',
  Miss = 'miss',
  Partial = 'partial',
  Unsupported = 'unsupported',
}

export const SEMANTIC_APP_RETENTION_POLICIES = [
  'profile-default',
  'retain-app',
  'dispose-app',
] as const;

export type SemanticAppRetentionPolicy = typeof SEMANTIC_APP_RETENTION_POLICIES[number];

export const SEMANTIC_TYPE_SYSTEM_DEPENDENCY_CACHE_CLEAR_POLICIES = [
  'preserve',
  'all',
  'node-modules',
  'default-libraries',
  'external-declarations',
] as const;

export type SemanticTypeSystemDependencyCacheClearPolicy =
  typeof SEMANTIC_TYPE_SYSTEM_DEPENDENCY_CACHE_CLEAR_POLICIES[number];

export type SemanticTypeSystemDependencyCacheSourceBucket =
  | 'none'
  | 'default-libraries'
  | 'node-modules'
  | 'external-declarations';

export const enum SemanticAppQueryKind {
  Summary = 'summary',
  AppOverview = 'app-overview',
  AuthoringCatalog = 'authoring-catalog',
  AuthoringOrientation = 'authoring-orientation',
  SourceFiles = 'source-files',
  UnresolvedModules = 'unresolved-modules',
  OpenSeams = 'open-seams',
  OpenSeamSummary = 'open-seam-summary',
  AppDiagnostics = 'app-diagnostics',
  AppDiagnosticSummary = 'app-diagnostic-summary',
  TypeScriptDiagnostics = 'typescript-diagnostics',
  TypeScriptDiagnosticSummary = 'typescript-diagnostic-summary',
  EvaluationIssues = 'evaluation-issues',
  ConfigurationIssues = 'configuration-issues',
  DiIssues = 'di-issues',
  ObservationIssues = 'observation-issues',
  ComputedObservationDefinitions = 'computed-observation-definitions',
  ComputedObserverSources = 'computed-observer-sources',
  ComputedObserverObservedDependencies = 'computed-observer-observed-dependencies',
  RuntimeEffects = 'runtime-effects',
  RuntimeEffectObservedDependencies = 'runtime-effect-observed-dependencies',
  ProxyObservableEscapes = 'proxy-observable-escapes',
  AppTopology = 'app-topology',
  StateStores = 'state-stores',
  StateIssues = 'state-issues',
  I18nTranslationKeys = 'i18n-translation-keys',
  I18nTranslationBindings = 'i18n-translation-bindings',
  ValidationIssues = 'validation-issues',
  FetchClientIssues = 'fetch-client-issues',
  DialogIssues = 'dialog-issues',
  RouterOverview = 'router-overview',
  RouterOptions = 'router-options',
  Routes = 'routes',
  RouteContexts = 'route-contexts',
  RouteContextParameterReads = 'route-context-parameter-reads',
  RoutePatterns = 'route-patterns',
  RouteEndpoints = 'route-endpoints',
  RouteRecognizerStates = 'route-recognizer-states',
  RouteRecognizerIssues = 'route-recognizer-issues',
  RouterIssues = 'router-issues',
  RecognizedRoutes = 'recognized-routes',
  TypedNavigationInstructions = 'typed-navigation-instructions',
  ViewportInstructions = 'viewport-instructions',
  ViewportInstructionTrees = 'viewport-instruction-trees',
  RouteTrees = 'route-trees',
  RouteNodes = 'route-nodes',
  RouterViewports = 'router-viewports',
  ViewportAgents = 'viewport-agents',
  ComponentAgents = 'component-agents',
  ResourceDefinitions = 'resource-definitions',
  ResourceIssues = 'resource-issues',
  ResourceVisibility = 'resource-visibility',
  TemplateCompilations = 'template-compilations',
  TemplateCompletions = 'template-completions',
  TemplateCursorInfo = 'template-cursor-info',
  TemplateDiagnostics = 'template-diagnostics',
  RuntimeControllers = 'runtime-controllers',
  RuntimeWatchers = 'runtime-watchers',
  RuntimeWatcherObservedDependencies = 'runtime-watcher-observed-dependencies',
  RuntimeCompositions = 'runtime-compositions',
  BindingTargetAccesses = 'binding-target-accesses',
  TargetOperations = 'target-operations',
  BindingTargetOperations = 'binding-target-operations',
  BindingSourceOperations = 'binding-source-operations',
  BindingBehaviorApplications = 'binding-behavior-applications',
  BindingValueChannels = 'binding-value-channels',
  BindingValueChannelSummary = 'binding-value-channel-summary',
  BindingDataFlows = 'binding-data-flows',
  BindingDataFlowSummary = 'binding-data-flow-summary',
  BindingObservedDependencySummary = 'binding-observed-dependency-summary',
  BindingObservedDependencies = 'binding-observed-dependencies',
}

export const SEMANTIC_APP_QUERY_KINDS = [
  SemanticAppQueryKind.Summary,
  SemanticAppQueryKind.AppOverview,
  SemanticAppQueryKind.AuthoringCatalog,
  SemanticAppQueryKind.AuthoringOrientation,
  SemanticAppQueryKind.SourceFiles,
  SemanticAppQueryKind.UnresolvedModules,
  SemanticAppQueryKind.OpenSeams,
  SemanticAppQueryKind.OpenSeamSummary,
  SemanticAppQueryKind.AppDiagnostics,
  SemanticAppQueryKind.AppDiagnosticSummary,
  SemanticAppQueryKind.TypeScriptDiagnostics,
  SemanticAppQueryKind.TypeScriptDiagnosticSummary,
  SemanticAppQueryKind.EvaluationIssues,
  SemanticAppQueryKind.ConfigurationIssues,
  SemanticAppQueryKind.DiIssues,
  SemanticAppQueryKind.ObservationIssues,
  SemanticAppQueryKind.ComputedObservationDefinitions,
  SemanticAppQueryKind.ComputedObserverSources,
  SemanticAppQueryKind.ComputedObserverObservedDependencies,
  SemanticAppQueryKind.RuntimeEffects,
  SemanticAppQueryKind.RuntimeEffectObservedDependencies,
  SemanticAppQueryKind.ProxyObservableEscapes,
  SemanticAppQueryKind.AppTopology,
  SemanticAppQueryKind.StateStores,
  SemanticAppQueryKind.StateIssues,
  SemanticAppQueryKind.I18nTranslationKeys,
  SemanticAppQueryKind.I18nTranslationBindings,
  SemanticAppQueryKind.ValidationIssues,
  SemanticAppQueryKind.FetchClientIssues,
  SemanticAppQueryKind.DialogIssues,
  SemanticAppQueryKind.RouterOverview,
  SemanticAppQueryKind.RouterOptions,
  SemanticAppQueryKind.Routes,
  SemanticAppQueryKind.RouteContexts,
  SemanticAppQueryKind.RouteContextParameterReads,
  SemanticAppQueryKind.RoutePatterns,
  SemanticAppQueryKind.RouteEndpoints,
  SemanticAppQueryKind.RouteRecognizerStates,
  SemanticAppQueryKind.RouteRecognizerIssues,
  SemanticAppQueryKind.RouterIssues,
  SemanticAppQueryKind.RecognizedRoutes,
  SemanticAppQueryKind.TypedNavigationInstructions,
  SemanticAppQueryKind.ViewportInstructions,
  SemanticAppQueryKind.ViewportInstructionTrees,
  SemanticAppQueryKind.RouteTrees,
  SemanticAppQueryKind.RouteNodes,
  SemanticAppQueryKind.RouterViewports,
  SemanticAppQueryKind.ViewportAgents,
  SemanticAppQueryKind.ComponentAgents,
  SemanticAppQueryKind.ResourceDefinitions,
  SemanticAppQueryKind.ResourceIssues,
  SemanticAppQueryKind.ResourceVisibility,
  SemanticAppQueryKind.TemplateCompilations,
  SemanticAppQueryKind.TemplateCompletions,
  SemanticAppQueryKind.TemplateCursorInfo,
  SemanticAppQueryKind.TemplateDiagnostics,
  SemanticAppQueryKind.RuntimeControllers,
  SemanticAppQueryKind.RuntimeWatchers,
  SemanticAppQueryKind.RuntimeWatcherObservedDependencies,
  SemanticAppQueryKind.RuntimeCompositions,
  SemanticAppQueryKind.BindingTargetAccesses,
  SemanticAppQueryKind.TargetOperations,
  SemanticAppQueryKind.BindingTargetOperations,
  SemanticAppQueryKind.BindingSourceOperations,
  SemanticAppQueryKind.BindingBehaviorApplications,
  SemanticAppQueryKind.BindingValueChannels,
  SemanticAppQueryKind.BindingValueChannelSummary,
  SemanticAppQueryKind.BindingDataFlows,
  SemanticAppQueryKind.BindingDataFlowSummary,
  SemanticAppQueryKind.BindingObservedDependencySummary,
  SemanticAppQueryKind.BindingObservedDependencies,
] as const;

export const enum SemanticRuntimeDetail {
  /** Default API projection: readable rows with compact navigation labels. */
  Compact = 'compact',
  /** Include opaque kernel handles for exact in-process follow-up navigation. */
  Handles = 'handles',
}

export const SEMANTIC_RUNTIME_DETAIL_VALUES = [
  'compact',
  'handles',
] as const;

export const enum SemanticDiagnosticProjectionPolicy {
  /** Use only diagnostic facts already materialized by the opened app-world. */
  AvailableProducts = 'available-products',
  /** Allow answer-time TypeChecker projection for diagnostics such as weak or missing member-owner surfaces. */
  TypeProjection = 'type-projection',
}

export const SEMANTIC_DIAGNOSTIC_PROJECTION_POLICIES = [
  'available-products',
  'type-projection',
] as const;

export interface SemanticRuntimeProjectInput {
  readonly rootDir: string;
  readonly projectKey?: string;
  readonly sourceFiles?: BootProjectInput['sourceFiles'];
  readonly sourceDiscoveryOptions?: BootProjectInput['sourceDiscoveryOptions'];
}

export interface SemanticRuntimeOptions {
  /** Workspace root used for source-address normalization and default project discovery. */
  readonly workspaceRoot: string;
  /** Store-local key. Omit to derive one from the workspace root. */
  readonly storeKey?: string;
  /** Projects to boot. Omit to use the configured project-discovery strategy. */
  readonly projects?: readonly SemanticRuntimeProjectInput[];
  /** Project discovery strategy used when projects are omitted. */
  readonly projectDiscovery?: BootProjectDiscoveryMode | `${BootProjectDiscoveryMode}`;
}

export interface SemanticRuntimeSummaryRequest {
  /** Page over project rows; defaults to 0 so counts and app candidates can serve as a low-token first read. */
  readonly projectPage?: SemanticRuntimePageInput | null;
  /** Inquiry profile that owns this summary answer outcome; defaults to the runtime's unclassified exploration lane. */
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
}

export interface OpenSemanticAppOptions {
  /** Project key selected from the booted workspace. Omit to use the default aurelia-app project. */
  readonly projectKey?: string | null;
  /** Optional source file used to select the owning project when projectKey is omitted. */
  readonly sourceFilePath?: string | null;
  /** Runtime/checker product depth requested for this app-world emission. Omit for the default runtime topology. */
  readonly analysisDepth?: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}` | null;
  /** Include standalone resource-library template analysis for authoring/LSP inquiries. */
  readonly includeAuthoringTemplates?: boolean | null;
  /** Optional source-file selection for authoring/LSP template compilation. */
  readonly authoringTemplateSourceFiles?: readonly string[] | null;
  /** Optional cap for standalone authoring templates compiled in this app open request. */
  readonly authoringTemplateLimit?: number | null;
  /** Optional profiling controls; use only for telemetry lanes, not semantic feature gating. */
  readonly telemetry?: SemanticRuntimeTelemetryOptions | null;
}

export interface SemanticAppOverviewRequest {
  readonly diagnosticPageSize?: number | null;
  readonly openSeamPageSize?: number | null;
  /** Include compact authoring-orientation fit; defaults to false for summary-first app overview answers. */
  readonly includeAuthoringOrientation?: boolean | null;
}

export interface SemanticRuntimePageInput {
  readonly size?: number;
  readonly cursor?: string | null;
}

export interface SemanticRouterOverviewRequest {
  /** Number of sample rows to include for each router-owned collection; defaults to 0 for summary-first answers. */
  readonly rowPageSize?: number | null;
  readonly detail?: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` | null;
}

export interface SemanticAppQuery {
  readonly kind: SemanticAppQueryKind | `${SemanticAppQueryKind}`;
  readonly page?: SemanticRuntimePageInput;
  readonly detail?: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`;
  /** Consumer lane behind this answer; controls query-claim retention and answer-local disposal policy. */
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
  /**
   * Diagnostic projection depth for app/template diagnostic query families.
   *
   * Overview-style callers should prefer `available-products` so compact first reads do not publish answer-time
   * TypeChecker products. Explicit diagnostic callers can request `type-projection` when weak owner/member analysis is
   * worth the CPU/memory trade-off.
   */
  readonly diagnosticProjection?: SemanticDiagnosticProjectionPolicy | `${SemanticDiagnosticProjectionPolicy}` | null;
  /** Include query-local TypeChecker value type surfaces for overview/topology rows that default to summary-first. */
  readonly includeTypeSurfaces?: boolean | null;
  /** AppOverview diagnostic-cluster page size; defaults to the compact overview budget. */
  readonly diagnosticPageSize?: number | null;
  /** AppOverview open-seam-cluster page size; defaults to the compact overview budget. */
  readonly openSeamPageSize?: number | null;
  /** AppOverview may opt into compact authoring orientation; omitted for summary-first answers. */
  readonly includeAuthoringOrientation?: boolean | null;
  /** RouterOverview samples several independent route row families; defaults to zero sample rows. */
  readonly rowPageSize?: number | null;
  /** Source cursor used by cursor-scoped authoring queries such as template completions. */
  readonly cursor?: SemanticRuntimeSourceCursorInput | null;
  /** Source file used by file-scoped authoring queries such as template diagnostics. */
  readonly sourceFile?: SemanticRuntimeSourceFileInput | null;
}

export interface SemanticRuntimeAppQueryRequest extends SemanticAppQuery {
  /** Project key selected from the booted workspace. Omit to use source-file or default app selection. */
  readonly projectKey?: string | null;
  /** Optional source file used to select the owning project when cursor/sourceFile is absent. */
  readonly sourceFilePath?: string | null;
  /** Override the app-world depth selected from the query catalog. */
  readonly analysisDepth?: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}` | null;
  /** Override authoring-template inclusion selected from cursor/file locus. */
  readonly includeAuthoringTemplates?: boolean | null;
  /** Optional source-file selection for standalone authoring template compilation. */
  readonly authoringTemplateSourceFiles?: readonly string[] | null;
  /** Optional cap for standalone authoring templates compiled for this query. */
  readonly authoringTemplateLimit?: number | null;
  /** Optional profiling controls; inquiryProfile on the query remains the product-facing consumer lane. */
  readonly telemetry?: SemanticRuntimeTelemetryOptions | null;
  /** Override profile-default app-epoch retention for this routed query. */
  readonly appRetention?: SemanticAppRetentionPolicy | null;
  /**
   * Clear the process-local TypeScript dependency SourceFile cache at this answer boundary.
   *
   * Omit to use the inquiry-profile default. Recompute-friendly one-off lanes such as `mcp-orientation` clear this
   * cache when they also dispose the app epoch; pass `preserve` when the next TypeChecker Program should stay warm.
   * The clear is recorded on the runtime-level query claim beside any app-epoch disposal.
   */
  readonly typeSystemDependencyCacheClearPolicy?: SemanticTypeSystemDependencyCacheClearPolicy | null;
}

export interface SemanticRuntimeAppQueryBatchRequest {
  /** Project key selected from the booted workspace. Omit to use source-file or default app selection. */
  readonly projectKey?: string | null;
  /** Optional source file used to select the owning project when child query loci are absent. */
  readonly sourceFilePath?: string | null;
  /** Open the smallest app-world depth satisfying every child query unless explicitly overridden. */
  readonly analysisDepth?: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}` | null;
  /** Include standalone resource-library template analysis when any child cursor/file query needs it by default. */
  readonly includeAuthoringTemplates?: boolean | null;
  /** Optional source-file selection for standalone authoring templates. Defaults to child cursor/file loci. */
  readonly authoringTemplateSourceFiles?: readonly string[] | null;
  /** Optional cap for standalone authoring templates compiled for this batch. */
  readonly authoringTemplateLimit?: number | null;
  /** Consumer lane for the batch answer boundary; child queries may still declare a narrower profile. */
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
  /** Optional profiling controls; inquiryProfile on the batch remains the product-facing consumer lane. */
  readonly telemetry?: SemanticRuntimeTelemetryOptions | null;
  /** Override profile-default app-epoch retention for this routed batch. */
  readonly appRetention?: SemanticAppRetentionPolicy | null;
  /**
   * Include the app construction profile in the public batch value.
   *
   * Omit for low-token orientation; telemetry remains available through the answer/profile and cache overview lanes.
   * Profiling scripts should opt in explicitly when they need construction phase attribution after disposal.
   */
  readonly includeAppProfile?: boolean | null;
  /**
   * Include app-owned query-claim profile snapshots in the public batch value.
   *
   * Omit for low-token orientation; cache overview remains the focused query-claim inspection surface.
   */
  readonly includeAppQueryClaimProfiles?: boolean | null;
  /**
   * Clear the process-local TypeScript dependency SourceFile cache at this answer boundary.
   *
   * Omit to use the inquiry-profile default. Recompute-friendly one-off lanes such as `mcp-orientation` clear this
   * cache when they also dispose the app epoch; pass `preserve` when the next TypeChecker Program should stay warm.
   * Prefer this over an adapter-local follow-up `clearAnalysisCache(...)` when a one-off routed batch should explain
   * both app-world and TypeScript dependency cache disposal in the same query claim.
   */
  readonly typeSystemDependencyCacheClearPolicy?: SemanticTypeSystemDependencyCacheClearPolicy | null;
  readonly queries: readonly SemanticAppQuery[];
}

export interface SemanticRuntimeAppQueryBatchAnswerRow {
  readonly index: number;
  readonly queryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`;
  readonly materializationPolicy: SemanticQueryMaterializationPolicy;
  readonly answer: SemanticRuntimeAnswer<unknown>;
}

export interface SemanticRuntimeAppQueryBatchResult {
  /** Null when every child query is runtime-static and no project selection was needed. */
  readonly projectKey: string | null;
  /** Null when every child query is runtime-static and no app-world analysis tier was selected. */
  readonly analysisDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}` | null;
  readonly displayText: string;
  readonly includeAuthoringTemplates: boolean;
  readonly authoringTemplateSourceFileCount: number;
  readonly authoringTemplateLimit: number | null;
  readonly queryCount: number;
  readonly rows: readonly SemanticRuntimeAppQueryBatchAnswerRow[];
  /** Whether answering this batch opened an app-world epoch. App-world-free batches stay false. */
  readonly appWorldOpened: boolean;
  /** App construction profile when explicitly requested and the batch had to open an app-world epoch. */
  readonly appProfile: SemanticRuntimeCachedAppProfileSummary | null;
  /** App-owned query-claim snapshots when explicitly requested after child answers and before optional app-epoch disposal. */
  readonly appQueryClaimProfiles: readonly SemanticRuntimeCachedAppQueryClaimProfileSummary[];
}

export interface SemanticAppQueryCatalogGroupRow {
  readonly group: string;
  readonly count: number;
}

export interface SemanticAppQueryCatalogRequest {
  /** Consumer lane behind this catalog answer; controls query-claim retention when read through SemanticRuntime. */
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
  readonly group?: string | null;
  readonly queryKind?: SemanticAppQueryKind | `${SemanticAppQueryKind}` | null;
}

export type SemanticAppQueryRuntimeBoundary =
  | 'runtime-static'
  | 'project-frame'
  | 'static-evaluation'
  | 'app-world';

export interface SemanticAppQueryCatalogRow {
  readonly queryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`;
  readonly group: string;
  readonly summary: string;
  readonly resultRole: 'overview' | 'row-table' | 'summary-row-table' | 'cursor-locus' | 'static-catalog';
  /**
   * Smallest semantic-runtime boundary that can answer this query.
   *
   * Keep this visible in the catalog so public transports can avoid accidental app-world construction and so new query
   * kinds must make their CPU/memory trade-off explicit.
   */
  readonly runtimeBoundary: SemanticAppQueryRuntimeBoundary;
  /**
   * Materialization behavior while answering this query.
   *
   * `projection-only` should not grow the kernel. `query-type-projection` may publish TypeChecker products while
   * answering; the active inquiry profile decides whether those query-local products are retained or disposed. This is
   * a deliberate CPU/memory trade-off and should be visible to inquiry routing.
   */
  readonly materializationPolicy: SemanticQueryMaterializationPolicy;
  readonly pagingKind: 'none' | 'offset-cursor' | 'row-sample' | 'continuation-cursor';
  readonly minimumAnalysisDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`;
  readonly supportsPaging: boolean;
  readonly supportsDetail: boolean;
  readonly supportsSourceFile: boolean;
  readonly supportsDiagnosticProjection: boolean;
  readonly requiresCursor: boolean;
  readonly routeProductKind?: string | null;
}

export interface SemanticAppQueryCatalogResult {
  readonly totalRows: number;
  readonly returnedRows: number;
  readonly displayText: string;
  readonly rows: readonly SemanticAppQueryCatalogRow[];
  readonly groups: readonly SemanticAppQueryCatalogGroupRow[];
}

export interface SemanticTemplateCursorQuery {
  /** Source cursor for template authoring queries. */
  readonly cursor: SemanticRuntimeSourceCursorInput;
  /** Project key selected from the booted workspace. Omit to select from the cursor file path. */
  readonly projectKey?: string | null;
  /** Runtime/checker product depth requested for this cursor query. */
  readonly analysisDepth?: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}` | null;
  /** Include standalone resource-library template analysis. Defaults to true for cursor-locus queries. */
  readonly includeAuthoringTemplates?: boolean | null;
  /** Optional source-file selection for authoring template compilation. Defaults to the cursor file. */
  readonly authoringTemplateSourceFiles?: readonly string[] | null;
  /** Optional cap for standalone authoring templates compiled in this cursor query. */
  readonly authoringTemplateLimit?: number | null;
  readonly page?: SemanticRuntimePageInput;
  readonly detail?: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`;
}

export interface SemanticTemplateDiagnosticsQuery {
  /** Optional source file for file-locus diagnostics. Omit to scan the opened app's compiled template basis. */
  readonly sourceFile?: SemanticRuntimeSourceFileInput | null;
  /** Project key selected from the booted workspace. Omit to select from the source file or default app project. */
  readonly projectKey?: string | null;
  /** Runtime/checker product depth requested for this diagnostic query. */
  readonly analysisDepth?: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}` | null;
  /** Include standalone resource-library template analysis. Defaults to true for file-locus diagnostics. */
  readonly includeAuthoringTemplates?: boolean | null;
  /** Optional source-file selection for authoring template compilation. Defaults to the diagnostic source file. */
  readonly authoringTemplateSourceFiles?: readonly string[] | null;
  /** Optional cap for standalone authoring templates compiled in this diagnostic query. */
  readonly authoringTemplateLimit?: number | null;
  readonly diagnosticProjection?: SemanticDiagnosticProjectionPolicy | `${SemanticDiagnosticProjectionPolicy}` | null;
  readonly page?: SemanticRuntimePageInput;
  readonly detail?: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`;
}

export interface SemanticRuntimeAnswer<TValue> {
  readonly schemaVersion: typeof SEMANTIC_RUNTIME_API_VERSION;
  readonly outcome: SemanticRuntimeAnswerOutcome;
  readonly summary: string;
  readonly value: TValue;
  readonly page?: SemanticRuntimePageResult | null;
  /** Optional answer-envelope telemetry, present only when a telemetry request asks the runtime to expose it. */
  readonly profile?: SemanticRuntimeAnswerProfile | null;
}

export interface SemanticRuntimeAnswerProfile {
  readonly appWorldFreeProfile?: SemanticRuntimeAppWorldFreeProfileSummary | null;
}

export interface SemanticRuntimeAppWorldFreeProfileSummary {
  readonly totalMilliseconds: number;
  readonly staticEvaluationPhases: readonly SemanticRuntimePhaseTimingSummary[];
  readonly staticEvaluationHost: EvaluationModuleSourceHostProfile;
  readonly staticEvaluationSources: StaticProjectEvaluationSourceFileStats;
}

export interface SemanticRuntimePageResult {
  readonly size: number;
  readonly cursor: string | null;
  readonly nextCursor: string | null;
  readonly returnedRows: number;
  readonly totalRows: number;
}

export interface SemanticRuntimeSourceCursorInput {
  /** Host-facing source path, absolute or relative to the opened project root. */
  readonly filePath: string;
  /** Zero-based source line. */
  readonly line: number;
  /** Zero-based source character. */
  readonly character: number;
  /** Optional zero-based source offset; callers with an editor document should usually supply this. */
  readonly offset?: number | null;
}

export interface SemanticRuntimeSourceFileInput {
  /** Host-facing source path, absolute or relative to the opened project root. */
  readonly filePath: string;
}

export const SEMANTIC_QUERY_CLAIM_DISPOSAL_SCOPES = [
  'all',
  'runtime',
  'cached-apps',
] as const;

export type SemanticQueryClaimDisposalScope = typeof SEMANTIC_QUERY_CLAIM_DISPOSAL_SCOPES[number];

export const SEMANTIC_QUERY_CLAIM_INVALIDATION_KINDS = [
  'manual',
  'project-epoch',
  'source-epoch',
] as const;

export type SemanticQueryClaimInvalidationKind = typeof SEMANTIC_QUERY_CLAIM_INVALIDATION_KINDS[number];

export interface SemanticRuntimeSummary {
  readonly workspaceRoot: string;
  readonly workspaceKey: string;
  readonly displayText: string;
  readonly projectShapeCounts: readonly SemanticProjectShapeCount[];
  readonly projectAnalysisCounts: readonly SemanticProjectAnalysisCount[];
  readonly defaultAppProjectKey: string | null;
  readonly appCandidates: readonly SemanticProjectCandidateSummary[];
  readonly projects: readonly SemanticProjectSummary[];
}

export interface SemanticRuntimeAnalysisCacheOverviewRequest {
  /** Include top kernel-density breakdown rows; defaults to false for low-token cache checks. */
  readonly includeKernelBreakdowns?: boolean | null;
  /** Include opt-in shallow product-detail and hot-detail density rows; requires kernel breakdowns. */
  readonly includeDetailDensity?: boolean | null;
  /** Include recent retained query-claim records for each runtime/app graph; defaults to false. */
  readonly includeQueryClaimRows?: boolean | null;
  /** Include largest retained TypeScript dependency source-file cache entries; defaults to false. */
  readonly includeTypeSystemDependencyEntries?: boolean | null;
  /** Cap high-cardinality breakdown rows; defaults to 8. */
  readonly rowLimit?: number | null;
}

export interface SemanticRuntimeAnalysisCacheOverviewResult {
  readonly displayText: string;
  readonly cachedAppCount: number;
  readonly cachedApps: readonly SemanticRuntimeCachedAppSummary[];
  readonly runtimeQueryClaimProfiles: readonly SemanticRuntimeCachedAppQueryClaimProfileSummary[];
  readonly projectCompilerOptionsCache: SemanticRuntimeProjectCompilerOptionsCacheSummary;
  readonly typeSystemDependencyCache: SemanticRuntimeTypeSystemDependencyCacheSummary;
  readonly processMemory: SemanticRuntimeMemorySample;
  readonly workspaceKernel: SemanticRuntimeKernelCountSnapshot | SemanticRuntimeKernelDensitySnapshot;
  readonly retention: SemanticRuntimeCacheRetentionSummary;
  readonly summary: string;
}

export interface SemanticRuntimeProjectCompilerOptionsCacheSummary {
  readonly entries: number;
  readonly hits: number;
  readonly misses: number;
  readonly writes: number;
  readonly clearOperations: number;
  readonly clearedEntries: number;
  readonly pathMappingCount: number;
  readonly pathMappingTargetCount: number;
  readonly configDiagnosticCount: number;
  readonly configRootFileCount: number;
  readonly cacheScope: 'process';
  readonly counterScope: 'process-lifetime';
  readonly cachedValuePolicy: 'compiler-options-by-project-root';
  readonly summary: string;
}

export interface SemanticRuntimeTypeSystemDependencyCacheSummary {
  readonly entries: number;
  readonly distinctCanonicalPaths: number;
  readonly duplicateCanonicalPathEntries: number;
  readonly sourceTextCharacters: number;
  readonly nodeModuleEntries: number;
  readonly nodeModuleSourceTextCharacters: number;
  readonly declarationEntries: number;
  readonly declarationSourceTextCharacters: number;
  readonly defaultLibraryEntries: number;
  readonly defaultLibrarySourceTextCharacters: number;
  readonly externalDeclarationEntries: number;
  readonly externalDeclarationSourceTextCharacters: number;
  readonly parseOptions: readonly SemanticRuntimeCountRow[];
  readonly duplicateParseOptionSets: readonly SemanticRuntimeCountRow[];
  readonly hits: number;
  readonly hitSourceTextCharacters: number;
  readonly misses: number;
  readonly writes: number;
  readonly writeSourceTextCharacters: number;
  readonly bypasses: number;
  readonly cacheableNodeModuleReads: number;
  readonly cacheableExternalDeclarationReads: number;
  readonly bypassFreshSourceFileReads: number;
  readonly bypassProjectSourceReads: number;
  readonly bypassExternalSourceReads: number;
  readonly clearOperations: number;
  readonly clearedEntries: number;
  readonly clearedSourceTextCharacters: number;
  readonly clearedNodeModuleEntries: number;
  readonly clearedNodeModuleSourceTextCharacters: number;
  readonly clearedDeclarationEntries: number;
  readonly clearedDeclarationSourceTextCharacters: number;
  readonly clearedDefaultLibraryEntries: number;
  readonly clearedDefaultLibrarySourceTextCharacters: number;
  readonly clearedExternalDeclarationEntries: number;
  readonly clearedExternalDeclarationSourceTextCharacters: number;
  readonly lastClearPolicy: SemanticTypeSystemDependencyCacheClearPolicy | null;
  readonly cacheScope: 'process';
  readonly counterScope: 'process-lifetime';
  readonly cachedSourcePolicy: 'dependency-and-library-files';
  readonly clearPolicies: readonly SemanticTypeSystemDependencyCacheClearPolicy[];
  readonly dominantSourceTextBucket: SemanticTypeSystemDependencyCacheSourceBucket;
  readonly suggestedClearPolicy: SemanticTypeSystemDependencyCacheClearPolicy;
  readonly suggestedClearSourceTextCharacters: number;
  readonly largestEntries: readonly SemanticRuntimeTypeSystemDependencyCacheEntrySummary[];
  readonly clearAction: 'clear-analysis-cache-type-system-dependency-cache-clear-policy';
  readonly summary: string;
}

export interface SemanticRuntimeTypeSystemDependencyCacheEntrySummary {
  readonly fileName: string;
  readonly canonicalPath: string;
  readonly bucket: Exclude<SemanticTypeSystemDependencyCacheSourceBucket, 'none'>;
  readonly parseOptionKey: string;
  readonly sourceTextCharacters: number;
  readonly isDeclarationFile: boolean;
}

export interface SemanticRuntimeAnalysisCacheClearRequest {
  /**
   * Clear part of the process-local TypeSystemProject compiler-host source-file cache for dependency/lib files.
   *
   * Leave this as `preserve` when repeated app opens are expected and memory is healthy. Use `all` after large probes
   * when memory pressure matters more than a warm TypeScript Program host, or choose a narrower policy when telemetry
   * shows which dependency bucket dominates.
   */
  readonly typeSystemDependencyCacheClearPolicy?: SemanticTypeSystemDependencyCacheClearPolicy | null;
}

export interface SemanticRuntimeAnalysisCacheClearResult {
  readonly displayText: string;
  readonly typeSystemDependencyCacheClearPolicy: SemanticTypeSystemDependencyCacheClearPolicy;
  readonly disposedCachedApps: number;
  readonly disposedQueryClaimRecords: number;
  readonly disposedKernelRecords: number;
  readonly disposedProductDetails: number;
  readonly disposedHotDetails: number;
  readonly disposedKernelHandleCharacters: number;
  readonly clearedTypeSystemDependencySourceFiles: number;
  readonly clearedTypeSystemDependencySourceTextCharacters: number;
  readonly clearedTypeSystemDependencyNodeModuleSourceFiles: number;
  readonly clearedTypeSystemDependencyNodeModuleSourceTextCharacters: number;
  readonly clearedTypeSystemDependencyDeclarationSourceFiles: number;
  readonly clearedTypeSystemDependencyDeclarationSourceTextCharacters: number;
  readonly clearedTypeSystemDependencyDefaultLibrarySourceFiles: number;
  readonly clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters: number;
  readonly clearedTypeSystemDependencyExternalDeclarationSourceFiles: number;
  readonly clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters: number;
  readonly remainingCachedApps: number;
  readonly workspaceKernel: SemanticRuntimeKernelCountSnapshot;
  readonly summary: string;
}

export interface SemanticRuntimeQueryClaimDisposeRequest {
  /**
   * Claim graph group to prune. `all` covers runtime-level routed/static answers and retained cached-app graphs.
   *
   * This does not dispose app-world kernel products; use `clearAnalysisCache()` when a source edit makes an opened app
   * epoch stale. This request only clears answer-outcome storage near the public API boundary.
   */
  readonly scope?: SemanticQueryClaimDisposalScope | null;
  /** Optional project filter; omitted means every retained query-claim graph in the selected scope. */
  readonly projectKey?: string | null;
  /** Optional source-file epoch filter, absolute or relative to the owning project root. */
  readonly sourceFilePath?: string | null;
  /** Optional source-file epoch filter using the same shape as source-scoped app queries. */
  readonly sourceFile?: SemanticRuntimeSourceFileInput | null;
  /** Optional exact query kinds to dispose, such as `template-diagnostics` or `app-query-batch`. */
  readonly queryKinds?: readonly string[] | null;
  /** Optional materialization policies to dispose. */
  readonly materializationPolicies?: readonly SemanticQueryMaterializationPolicy[] | null;
  /** Optional inquiry profile filter for graph selection. */
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
}

export interface SemanticRuntimeQueryClaimDisposeResult {
  readonly scope: SemanticQueryClaimDisposalScope;
  readonly invalidationKind: SemanticQueryClaimInvalidationKind;
  readonly projectKey: string | null;
  readonly sourceFilePath: string | null;
  readonly inquiryProfile: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
  readonly queryKinds: readonly string[];
  readonly materializationPolicies: readonly SemanticQueryMaterializationPolicy[];
  readonly epochKeys: readonly string[];
  readonly disposedRuntimeQueryClaimRecords: number;
  readonly disposedAppQueryClaimRecords: number;
  readonly disposedQueryClaimRecords: number;
  readonly profileDisposals: readonly SemanticRuntimeQueryClaimDisposeProfileSummary[];
  readonly cachedAppCount: number;
  readonly summary: string;
}

export interface SemanticRuntimeQueryClaimDisposeProfileSummary {
  readonly scope: 'runtime' | 'cached-app';
  readonly projectKey: string | null;
  readonly inquiryProfile: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}`;
  readonly disposal: QueryClaimGraphDisposalSummary;
}

export interface SemanticRuntimeCachedAppSummary {
  readonly projectKey: string;
  readonly analysisDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`;
  readonly includeAuthoringTemplates: boolean;
  readonly authoringTemplateSourceFileCount: number;
  readonly authoringTemplateLimit: number | null;
  readonly profile: SemanticRuntimeCachedAppProfileSummary;
  readonly queryClaims: QueryClaimGraphSnapshot;
  readonly queryClaimProfiles: readonly SemanticRuntimeCachedAppQueryClaimProfileSummary[];
}

export interface SemanticRuntimeCachedAppProfileSummary {
  readonly inquiryProfile: string;
  readonly totalMilliseconds: number;
  readonly phaseCount: number;
  readonly topPhases: readonly SemanticRuntimePhaseTimingSummary[];
  readonly staticEvaluationPhases: readonly SemanticRuntimePhaseTimingSummary[];
  readonly staticEvaluationHost: EvaluationModuleSourceHostProfile;
  readonly staticEvaluationSources: StaticProjectEvaluationSourceFileStats;
  readonly typeSystemPhases: readonly SemanticRuntimePhaseTimingSummary[];
  readonly resourceRecognitionPhases: readonly SemanticRuntimePhaseTimingSummary[];
  readonly templatePhases: readonly SemanticRuntimePhaseTimingSummary[];
  readonly templateRuntimePhases: readonly SemanticRuntimePhaseTimingSummary[];
  readonly templateExpressionTypeCache: CheckerExpressionTypeEvaluationCacheStats | null;
  readonly compilerOptions: SemanticRuntimeTypeSystemCompilerOptionsSummary;
  readonly hostSourceFileCache: SemanticRuntimeTypeSystemHostSourceFileCacheStats;
  readonly programRootFiles: SemanticRuntimeTypeSystemProgramSourceFileStats;
  readonly programSourceFiles: SemanticRuntimeTypeSystemProgramSourceFileStats;
  readonly programRootFileGroups: readonly SemanticRuntimeTypeSystemProgramSourceFileGroupStats[];
  readonly programSourceFileGroups: readonly SemanticRuntimeTypeSystemProgramSourceFileGroupStats[];
  readonly programNodeRemaps: SemanticRuntimeTypeSystemProgramNodeRemapStats;
}

export interface SemanticRuntimeCachedAppQueryClaimProfileSummary {
  readonly inquiryProfile: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}`;
  readonly queryClaims: QueryClaimGraphSnapshot;
  readonly queryClaimRows?: readonly QueryClaimRecord[];
}

export interface SemanticRuntimePhaseTimingSummary {
  readonly name: string;
  readonly milliseconds: number;
  readonly itemCount?: number;
  readonly memory?: SemanticRuntimeMemoryDelta;
  readonly kernel?: SemanticRuntimePhaseKernelSummary;
}

export interface SemanticRuntimePhaseKernelSummary extends SemanticRuntimeKernelCountSnapshot {
  readonly recordKinds?: readonly SemanticRuntimeCountRow[];
  readonly productKinds?: readonly SemanticRuntimeCountRow[];
  readonly productDetailKinds?: readonly SemanticRuntimeCountRow[];
  readonly hotDetailKinds?: readonly SemanticRuntimeCountRow[];
  readonly sourceSpanRoles?: readonly SemanticRuntimeCountRow[];
  readonly productDetailDensity?: readonly SemanticRuntimeDetailDensityRow[];
  readonly hotDetailDensity?: readonly SemanticRuntimeDetailDensityRow[];
}

export interface SemanticRuntimeTypeSystemCompilerOptionsSummary {
  readonly target: string | null;
  readonly module: string | null;
  readonly moduleResolution: string | null;
  readonly jsx: string | null;
  readonly allowJs: boolean | null;
  readonly checkJs: boolean | null;
  readonly skipLibCheck: boolean | null;
  readonly allowArbitraryExtensions: boolean | null;
  readonly experimentalDecorators: boolean | null;
  readonly hasBaseUrl: boolean;
  readonly pathMappingCount: number;
  readonly pathMappingTargetCount: number;
  readonly libraryFileCount: number;
}

export interface SemanticRuntimeTypeSystemProgramSourceFileStats {
  readonly total: number;
  readonly evaluatedSources: number;
  readonly ambientSources: number;
  readonly projectSources: number;
  readonly nodeModuleSources: number;
  readonly declarationSources: number;
  readonly defaultLibrarySources: number;
  readonly externalSources: number;
  readonly sourceTextCharacters: number;
  readonly evaluatedSourceTextCharacters: number;
  readonly ambientSourceTextCharacters: number;
  readonly projectSourceTextCharacters: number;
  readonly nodeModuleSourceTextCharacters: number;
  readonly declarationSourceTextCharacters: number;
  readonly defaultLibrarySourceTextCharacters: number;
  readonly externalSourceTextCharacters: number;
}

export type SemanticRuntimeTypeSystemProgramSourceFileGroupKind =
  | 'ambient-source'
  | 'project-source'
  | 'node-module-package'
  | 'default-library'
  | 'external-declaration'
  | 'external-source';

export interface SemanticRuntimeTypeSystemProgramSourceFileGroupStats {
  readonly groupKind: SemanticRuntimeTypeSystemProgramSourceFileGroupKind;
  readonly groupKey: string;
  readonly sourceFiles: number;
  readonly sourceTextCharacters: number;
  readonly declarationSources: number;
  readonly evaluatedSources: number;
}

export interface SemanticRuntimeTypeSystemHostSourceFileCacheStats {
  readonly hits: number;
  readonly hitSourceTextCharacters: number;
  readonly misses: number;
  readonly writes: number;
  readonly writeSourceTextCharacters: number;
  readonly bypasses: number;
  readonly cacheableNodeModuleReads: number;
  readonly cacheableExternalDeclarationReads: number;
  readonly bypassFreshSourceFileReads: number;
  readonly bypassProjectSourceReads: number;
  readonly bypassExternalSourceReads: number;
  readonly clearOperations: number;
  readonly clearedEntries: number;
  readonly clearedSourceTextCharacters: number;
  readonly clearedNodeModuleEntries: number;
  readonly clearedNodeModuleSourceTextCharacters: number;
  readonly clearedDeclarationEntries: number;
  readonly clearedDeclarationSourceTextCharacters: number;
  readonly clearedDefaultLibraryEntries: number;
  readonly clearedDefaultLibrarySourceTextCharacters: number;
  readonly clearedExternalDeclarationEntries: number;
  readonly clearedExternalDeclarationSourceTextCharacters: number;
}

export interface SemanticRuntimeTypeSystemProgramNodeRemapStats {
  readonly requests: number;
  readonly cacheHits: number;
  readonly cacheMisses: number;
  readonly sameSourceHits: number;
  readonly spanHits: number;
  readonly sourceFileMisses: number;
  readonly spanMisses: number;
}

export interface SemanticRuntimeCacheRetentionSummary {
  readonly runtimeCacheScope: 'semantic-runtime-session';
  readonly workspaceKernelScope: 'semantic-runtime-session';
  readonly appEpochScope: 'cached-app';
  readonly queryClaimScope: 'runtime-and-app-session-policy';
  readonly reclaimAction: 'clear-analysis-cache' | 'clear-session';
  readonly notes: readonly string[];
}

export interface SemanticAppOverviewResult {
  readonly displayText: string;
  readonly summary: SemanticRuntimeAnswer<SemanticAppSummary>;
  readonly topology: SemanticRuntimeAnswer<SemanticAppOverviewCollectionSummary>;
  readonly diagnostics: SemanticRuntimeAnswer<SemanticAppDiagnosticSummaryResult>;
  readonly openSeams: SemanticRuntimeAnswer<SemanticOpenSeamSummaryResult>;
  readonly authoringOrientation: SemanticRuntimeAnswer<SemanticAppOverviewAuthoringOrientationSummary> | null;
}

export interface SemanticAppOverviewCollectionSummary {
  readonly counts: Record<string, number>;
  readonly scalars: Record<string, unknown>;
}

export interface SemanticAppOverviewAuthoringOrientationSummary {
  readonly project: SemanticAuthoringOrientationResult['project'];
  readonly counts: SemanticAppOverviewAuthoringOrientationCounts;
  readonly capabilities: readonly SemanticAppOverviewAuthoringCapabilitySummary[];
  readonly recipes: readonly SemanticAppOverviewAuthoringRecipeSummary[];
  readonly repairClusters: readonly SemanticAppOverviewAuthoringRepairClusterSummary[];
}

export interface SemanticAppOverviewAuthoringOrientationCounts {
  readonly coverage: number;
  readonly taste: number;
  readonly capabilities: number;
  readonly operations: number;
  readonly surfaces: number;
  readonly recipes: number;
  readonly repairs: number;
  readonly repairClusters: number;
  readonly openReasons: number;
}

export interface SemanticAppOverviewAuthoringCapabilitySummary {
  readonly key: SemanticAuthoringCapabilityRow['key'];
  readonly supportState: SemanticAuthoringCapabilityRow['supportState'];
  readonly openReasonKinds: SemanticAuthoringCapabilityRow['openReasonKinds'];
}

export interface SemanticAppOverviewAuthoringRecipeSummary {
  readonly key: string;
  readonly currentFitState: SemanticAuthoringRecipeSeedRow['currentFitState'];
  readonly supportState: SemanticAuthoringRecipeSeedRow['supportState'];
  readonly failedExpectedEffectCount: number;
  readonly unsupportedExpectedEffectCount: number;
}

export interface SemanticAppOverviewAuthoringRepairClusterSummary {
  readonly repairKind: SemanticAuthoringRepairClusterRow['repairKind'];
  readonly planKind: SemanticAuthoringRepairClusterRow['planKind'];
  readonly planReadiness: SemanticAuthoringRepairClusterRow['planReadiness'];
  readonly actionTargetSourceCoverage: SemanticAuthoringRepairClusterRow['actionTargetSourceCoverage'];
  readonly runtimeBoundaryKinds: SemanticAuthoringRepairClusterRow['runtimeBoundaryKinds'];
  readonly runtimeIntentKinds: SemanticAuthoringRepairClusterRow['runtimeIntentKinds'];
  readonly count: number;
  readonly summary: string;
}

export interface SemanticRouterOverviewResult {
  readonly displayText: string;
  readonly counts: SemanticRouterOverviewCounts;
  readonly routes: SemanticRuntimeAnswer<SemanticRouteConfigsResult>;
  readonly routeContexts: SemanticRuntimeAnswer<SemanticRouteContextsResult>;
  readonly routeContextParameterReads: SemanticRuntimeAnswer<SemanticRouteContextParameterReadsResult>;
  readonly routerViewports: SemanticRuntimeAnswer<SemanticRouterViewportsResult>;
  readonly viewportAgents: SemanticRuntimeAnswer<SemanticViewportAgentsResult>;
  readonly componentAgents: SemanticRuntimeAnswer<SemanticComponentAgentsResult>;
  readonly typedNavigationInstructions: SemanticRuntimeAnswer<SemanticTypedNavigationInstructionsResult>;
  readonly viewportInstructionTrees: SemanticRuntimeAnswer<SemanticViewportInstructionTreesResult>;
  readonly recognizedRoutes: SemanticRuntimeAnswer<SemanticRecognizedRoutesResult>;
  readonly routeTrees: SemanticRuntimeAnswer<SemanticRouteTreesResult>;
  readonly routeNodes: SemanticRuntimeAnswer<SemanticRouteNodesResult>;
  readonly routerIssues: SemanticRuntimeAnswer<SemanticRouterIssuesResult>;
}

export interface SemanticRouterOverviewCounts {
  readonly routes: number;
  readonly routeContexts: number;
  readonly routeContextParameterReads: number;
  readonly routerViewports: number;
  readonly viewportAgents: number;
  readonly componentAgents: number;
  readonly typedNavigationInstructions: number;
  readonly viewportInstructionTrees: number;
  readonly recognizedRoutes: number;
  readonly routeTrees: number;
  readonly routeNodes: number;
  readonly routerIssues: number;
}

export interface SemanticProjectShapeCount {
  readonly shapeKind: SemanticProjectShapeKind | `${SemanticProjectShapeKind}`;
  readonly count: number;
}

export interface SemanticProjectAnalysisCount {
  readonly analysisKind: SemanticProjectAnalysisKind | `${SemanticProjectAnalysisKind}`;
  readonly count: number;
}

export interface SemanticProjectCandidateSummary {
  readonly projectKey: string;
  readonly rootDir: string;
  readonly sourceFiles: number;
  readonly shapeKind: SemanticProjectShapeKind | `${SemanticProjectShapeKind}`;
  readonly analysisKind: SemanticProjectAnalysisKind | `${SemanticProjectAnalysisKind}`;
}

export interface SemanticProjectSummary {
  readonly projectKey: string;
  readonly rootDir: string;
  readonly sourceFiles: number;
  readonly sourceRoles: readonly SemanticSourceRoleCount[];
  readonly hasAureliaAppEntrypointSignal: boolean;
  readonly shapeKind: SemanticProjectShapeKind | `${SemanticProjectShapeKind}`;
  readonly analysisKind: SemanticProjectAnalysisKind | `${SemanticProjectAnalysisKind}`;
  readonly aureliaDependencyScopes: readonly SemanticProjectAureliaDependencyScopeCount[];
  readonly aureliaSourceSignals: readonly SemanticProjectAureliaSourceSignalCount[];
  readonly shapeReasons: readonly SemanticProjectShapeReasonCount[];
}

export interface SemanticSourceRoleCount {
  readonly role: string;
  readonly count: number;
}

export interface SemanticProjectAureliaDependencyScopeCount {
  readonly scope: SemanticProjectAureliaDependencyScope | `${SemanticProjectAureliaDependencyScope}`;
  readonly origin: SemanticProjectAureliaDependencyOrigin | `${SemanticProjectAureliaDependencyOrigin}`;
  readonly count: number;
}

export interface SemanticProjectAureliaSourceSignalCount {
  readonly signal: SemanticProjectAureliaSourceSignalKind | `${SemanticProjectAureliaSourceSignalKind}`;
  readonly count: number;
}

export interface SemanticProjectShapeReasonCount {
  readonly reason: SemanticProjectShapeReasonKind | `${SemanticProjectShapeReasonKind}`;
  readonly count: number;
}

export type SemanticAuthoringLocusKind =
  | 'workspace'
  | 'project'
  | 'app'
  | 'source-file'
  | 'cursor'
  | 'resource'
  | 'route'
  | 'component'
  | 'template'
  | 'style'
  | 'package';

export type SemanticAuthoringSurfaceKind =
  | 'project-shape'
  | 'app-root'
  | 'source-file'
  | 'resource-definition'
  | 'resource-visibility'
  | 'route'
  | 'router-topology'
  | 'template'
  | 'runtime-controller'
  | 'runtime-composition'
  | 'component-role'
  | 'binding-target-access'
  | 'target-operation'
  | 'binding-value-channel'
  | 'binding-observed-dependency'
  | 'computed-observation-definition'
  | 'computed-observer-source'
  | 'computed-observer-observed-dependency'
  | 'binding-behavior-application'
  | 'binding-data-flow'
  | 'diagnostic'
  | 'open-seam'
  | 'plugin-api'
  | 'recipe';

export interface SemanticAuthoringEvidenceRow {
  readonly authority: AuthoringEvidenceAuthority | `${AuthoringEvidenceAuthority}`;
  readonly locus: SemanticAuthoringLocusKind;
  readonly summary: string;
  readonly source: SemanticSourceReference | null;
  readonly count: number | null;
}

export interface SemanticAuthoringProjectOrientation {
  readonly projectKey: string;
  readonly rootDir: string;
  readonly shapeKind: SemanticProjectShapeKind | `${SemanticProjectShapeKind}`;
  readonly analysisKind: SemanticProjectAnalysisKind | `${SemanticProjectAnalysisKind}`;
  readonly analysisDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`;
  readonly sourceFiles: number;
  readonly sourceRoles: readonly SemanticSourceRoleCount[];
  readonly aureliaDependencyScopes: readonly SemanticProjectAureliaDependencyScopeCount[];
  readonly aureliaSourceSignals: readonly SemanticProjectAureliaSourceSignalCount[];
  readonly shapeReasons: readonly SemanticProjectShapeReasonCount[];
}

export interface SemanticAuthoringCoverageRow {
  readonly key: string;
  readonly title: string;
  readonly surfaceKind: SemanticAuthoringSurfaceKind;
  readonly locus: SemanticAuthoringLocusKind;
  readonly supportState: AuthoringSupportState | `${AuthoringSupportState}`;
  readonly authority: AuthoringEvidenceAuthority | `${AuthoringEvidenceAuthority}`;
  readonly observedCount: number;
  readonly summary: string;
  readonly openReasonKinds: readonly (AuthoringOpenReasonKind | `${AuthoringOpenReasonKind}`)[];
  readonly evidence: readonly SemanticAuthoringEvidenceRow[];
}

export interface SemanticAuthoringOperationFamilyCatalogRow {
  readonly familyKey: AuthoringOperationFamilyKey | `${AuthoringOperationFamilyKey}`;
  readonly title: string;
  readonly summary: string;
}

export interface SemanticAuthoringTasteAxisCatalogRow {
  readonly axisKey: AuthoringTasteAxisKey | `${AuthoringTasteAxisKey}`;
  readonly title: string;
  readonly layer: AuthoringTasteAxisLayer | `${AuthoringTasteAxisLayer}`;
  readonly summary: string;
  readonly commonValueKeys: readonly (AuthoringTasteValueKey | `${AuthoringTasteValueKey}`)[];
  /** Common values grouped by their own authority layer so callers do not infer policy from observed-shape values. */
  readonly primitivePolicyValueKeys: readonly (AuthoringTasteValueKey | `${AuthoringTasteValueKey}`)[];
  readonly observedShapeValueKeys: readonly (AuthoringTasteValueKey | `${AuthoringTasteValueKey}`)[];
  readonly derivedReadingValueKeys: readonly (AuthoringTasteValueKey | `${AuthoringTasteValueKey}`)[];
  /** Compact layer/count summary for this axis' common values. */
  readonly valueLayerCounts: readonly SemanticAuthoringTasteAxisValueLayerCount[];
}

export interface SemanticAuthoringTasteValueCatalogRow {
  readonly valueKey: AuthoringTasteValueKey | `${AuthoringTasteValueKey}`;
  readonly axisKey: AuthoringTasteAxisKey | `${AuthoringTasteAxisKey}`;
  readonly layer: AuthoringTasteAxisLayer | `${AuthoringTasteAxisLayer}`;
  readonly summary: string;
}

export interface SemanticAuthoringTasteAxisValueLayerCount {
  readonly layer: AuthoringTasteAxisLayer | `${AuthoringTasteAxisLayer}`;
  readonly count: number;
}

export interface SemanticAuthoringProfileCatalogRow {
  readonly profileKey: AuthoringStyleKey | `${AuthoringStyleKey}`;
  readonly title: string;
  readonly summary: string;
  readonly ambiguitySummary: string | null;
  readonly preferences: readonly SemanticAuthoringPreferenceCatalogRow[];
}

export interface SemanticAuthoringPreferenceCatalogRow {
  readonly axisKey: AuthoringTasteAxisKey | `${AuthoringTasteAxisKey}`;
  readonly valueKey: AuthoringTasteValueKey | `${AuthoringTasteValueKey}`;
  readonly valueLayer: AuthoringTasteAxisLayer | `${AuthoringTasteAxisLayer}`;
  readonly valueOntologySummary: string;
}

export interface SemanticAuthoringCapabilityCatalogRow {
  readonly capabilityKey: AuthoringCapabilityKey | `${AuthoringCapabilityKey}`;
  readonly title: string;
  readonly summary: string;
  /** Product-level gaps that are known before inspecting a specific app. */
  readonly productOpenReasonKinds: readonly (AuthoringOpenReasonKind | `${AuthoringOpenReasonKind}`)[];
}

export interface SemanticAuthoringAmbiguityCatalogRow {
  readonly key: string;
  readonly summary: string;
  readonly resolution: AuthoringAmbiguityResolution | `${AuthoringAmbiguityResolution}`;
  readonly options: readonly string[];
}

export interface SemanticAuthoringOperationCatalogRow {
  readonly operationKind: AuthoringOperationKind | `${AuthoringOperationKind}`;
  readonly familyKey: AuthoringOperationFamilyKey | `${AuthoringOperationFamilyKey}`;
  readonly action: AuthoringOperationAction | `${AuthoringOperationAction}`;
  readonly targetKind: AuthoringTargetKind | `${AuthoringTargetKind}`;
  readonly summary: string;
  readonly requiredCapabilityKeys: readonly (AuthoringCapabilityKey | `${AuthoringCapabilityKey}`)[];
  /** Product-level gaps inherited from required capability descriptors. */
  readonly productOpenReasonKinds: readonly (AuthoringOpenReasonKind | `${AuthoringOpenReasonKind}`)[];
  readonly commonAmbiguities: readonly SemanticAuthoringAmbiguityCatalogRow[];
}

export interface SemanticAuthoringTasteValueRow {
  readonly valueKey: AuthoringTasteValueKey | `${AuthoringTasteValueKey}`;
  readonly axisKey: AuthoringTasteAxisKey | `${AuthoringTasteAxisKey}`;
  readonly layer: AuthoringTasteAxisLayer | `${AuthoringTasteAxisLayer}`;
  readonly confidence: AuthoringConfidence | `${AuthoringConfidence}`;
  /** Compact display summary for the current app-specific reading. */
  readonly summary: string;
  /** Durable ontology meaning for the value key, independent of the current app. */
  readonly ontologySummary: string;
  /** Current app-specific reading that caused this value to appear. */
  readonly observedSummary: string;
  readonly evidence: readonly SemanticAuthoringEvidenceRow[];
}

export interface SemanticAuthoringTasteAxisRow {
  readonly axisKey: AuthoringTasteAxisKey | `${AuthoringTasteAxisKey}`;
  readonly title: string;
  readonly layer: AuthoringTasteAxisLayer | `${AuthoringTasteAxisLayer}`;
  /** Policy availability for this opened app; observed-shape values alone do not imply policy. */
  readonly policyState: AuthoringPolicyState | `${AuthoringPolicyState}`;
  readonly confidence: AuthoringConfidence | `${AuthoringConfidence}`;
  readonly primitivePolicyValueCount: number;
  readonly observedShapeValueCount: number;
  readonly derivedReadingValueCount: number;
  readonly values: readonly SemanticAuthoringTasteValueRow[];
  readonly summary: string;
  readonly openReasonKinds: readonly (AuthoringOpenReasonKind | `${AuthoringOpenReasonKind}`)[];
}

export interface SemanticAuthoringCapabilityRow {
  readonly key: AuthoringCapabilityKey | `${AuthoringCapabilityKey}`;
  readonly title: string;
  readonly familyKeys: readonly (AuthoringOperationFamilyKey | `${AuthoringOperationFamilyKey}`)[];
  readonly operationKinds: readonly (AuthoringOperationKind | `${AuthoringOperationKind}`)[];
  readonly supportState: AuthoringSupportState | `${AuthoringSupportState}`;
  readonly summary: string;
  readonly openReasonKinds: readonly (AuthoringOpenReasonKind | `${AuthoringOpenReasonKind}`)[];
  readonly evidence: readonly SemanticAuthoringEvidenceRow[];
}

export interface SemanticAuthoringOperationRow {
  readonly operationKind: AuthoringOperationKind | `${AuthoringOperationKind}`;
  readonly familyKey: AuthoringOperationFamilyKey | `${AuthoringOperationFamilyKey}`;
  readonly action: AuthoringOperationAction | `${AuthoringOperationAction}`;
  readonly targetKind: AuthoringTargetKind | `${AuthoringTargetKind}`;
  readonly requiredCapabilityKeys: readonly (AuthoringCapabilityKey | `${AuthoringCapabilityKey}`)[];
  readonly supportState: AuthoringSupportState | `${AuthoringSupportState}`;
  readonly summary: string;
  readonly openReasonKinds: readonly (AuthoringOpenReasonKind | `${AuthoringOpenReasonKind}`)[];
}

export interface SemanticAuthoringAvailableSurfaceRow {
  readonly key: string;
  readonly surfaceKind: SemanticAuthoringSurfaceKind;
  readonly locus: SemanticAuthoringLocusKind;
  readonly title: string;
  readonly count: number;
  readonly supportState: AuthoringSupportState | `${AuthoringSupportState}`;
  readonly authority: AuthoringEvidenceAuthority | `${AuthoringEvidenceAuthority}`;
  readonly summary: string;
  readonly evidence: readonly SemanticAuthoringEvidenceRow[];
}

export interface SemanticAuthoringExpectedEffectContractRow {
  readonly effectKind: ExpectedSemanticEffectKind | `${ExpectedSemanticEffectKind}`;
  readonly scope: ExpectedSemanticEffectScope | `${ExpectedSemanticEffectScope}`;
  readonly role: ExpectedSemanticEffectRole | `${ExpectedSemanticEffectRole}`;
  readonly topologyNodeKind: AuthoringTargetKind | `${AuthoringTargetKind}` | null;
  readonly cardinality: ExpectedSemanticEffectCardinality | `${ExpectedSemanticEffectCardinality}`;
  readonly count: number | null;
  /** Compact stable key for grouping this expected target across catalog, orientation, and pressure reports. */
  readonly semanticTargetKey: string;
  readonly filterCount: number;
  readonly filterFields: readonly string[];
  readonly filters: readonly SemanticAuthoringExpectedEffectFilterRow[];
  readonly capabilityKey: (AuthoringCapabilityKey | `${AuthoringCapabilityKey}`) | null;
  readonly minimumSupportState: (AuthoringSupportState | `${AuthoringSupportState}`) | null;
  readonly tasteAxisKey: (AuthoringTasteAxisKey | `${AuthoringTasteAxisKey}`) | null;
  readonly tasteValueKey: (AuthoringTasteValueKey | `${AuthoringTasteValueKey}`) | null;
  /** Layer of the target taste value for `authoring-taste` effects. */
  readonly tasteValueLayer: (AuthoringTasteAxisLayer | `${AuthoringTasteAxisLayer}`) | null;
  /** Durable ontology meaning of the target taste value for `authoring-taste` effects. */
  readonly tasteValueOntologySummary: string | null;
  readonly summary: string;
}

export interface SemanticAuthoringExpectedEffectRow extends SemanticAuthoringExpectedEffectContractRow {
  /** Matching fact count in the currently opened app, using the same verifier semantics as closed-loop verification. */
  readonly currentObservedCount: number | null;
  /** Whether the currently opened app satisfies this effect expectation. */
  readonly currentOutcome: 'satisfied' | 'failed' | 'unsupported';
}

export interface SemanticAuthoringExpectedEffectHighlightRow {
  readonly effectKind: ExpectedSemanticEffectKind | `${ExpectedSemanticEffectKind}`;
  readonly scope: ExpectedSemanticEffectScope | `${ExpectedSemanticEffectScope}`;
  readonly role: ExpectedSemanticEffectRole | `${ExpectedSemanticEffectRole}`;
  readonly semanticTargetKey: string;
  readonly filterFields: readonly string[];
  readonly summary: string;
}

export interface SemanticAuthoringExpectedEffectFilterRow {
  readonly field: string;
  readonly value: string | number | boolean | null;
}

export interface SemanticAuthoringRecipeCatalogRow {
  readonly key: string;
  readonly title: string;
  readonly operationKinds: readonly (AuthoringOperationKind | `${AuthoringOperationKind}`)[];
  /** Direct recipe bases whose source/effect shape this recipe intentionally contains. */
  readonly baseRecipeKeys: readonly string[];
  /** Transitive base recipes ordered from broadest base to nearest base. */
  readonly lineageRecipeKeys: readonly string[];
  /** Transitive recipe depth; higher values are more specific when several satisfied recipes overlap. */
  readonly specificityRank: number;
  readonly supportState: AuthoringSupportState | `${AuthoringSupportState}`;
  readonly summary: string;
  readonly openReasonKinds: readonly (AuthoringOpenReasonKind | `${AuthoringOpenReasonKind}`)[];
  readonly preferences: readonly SemanticAuthoringPreferenceCatalogRow[];
  readonly sourcePlan: SemanticAuthoringSourcePlanCatalogRow | null;
  readonly expectedEffectKinds: readonly (ExpectedSemanticEffectKind | `${ExpectedSemanticEffectKind}`)[];
  readonly expectedEffects: readonly SemanticAuthoringExpectedEffectContractRow[];
  readonly expectedEffectCount: number;
}

export interface SemanticAuthoringSourcePlanCatalogRow {
  readonly conflictPolicy: AuthoringSourceConflictPolicy | `${AuthoringSourceConflictPolicy}`;
  readonly formattingPolicy: AuthoringSourceFormattingPolicy | `${AuthoringSourceFormattingPolicy}`;
  readonly packageToolingPolicy: AuthoringPackageToolingPolicy | `${AuthoringPackageToolingPolicy}`;
  readonly pattern: SemanticAuthoringSourcePatternRow | null;
  readonly projectTooling: SemanticAuthoringProjectToolingCatalogRow | null;
  readonly hasCompleteFileText: boolean;
  readonly fileCount: number;
  readonly fileRoles: readonly (AuthoringSourceFileRole | `${AuthoringSourceFileRole}`)[];
  readonly languages: readonly (AuthoringSourceLanguage | `${AuthoringSourceLanguage}`)[];
  readonly editKinds: readonly (AuthoringSourceEditKind | `${AuthoringSourceEditKind}`)[];
  readonly textAuthorities: readonly (AuthoringSourceTextAuthority | `${AuthoringSourceTextAuthority}`)[];
  readonly files: readonly SemanticAuthoringSourceFileCatalogRow[];
}

export interface SemanticAuthoringSourcePatternRow {
  readonly key: string;
  readonly title: string;
  readonly summary: string;
  readonly role: AuthoringSourcePatternRole | `${AuthoringSourcePatternRole}`;
  /** Derived public-client action for concrete source text carried by this pattern. */
  readonly usePolicy: AuthoringSourcePatternUsePolicy | `${AuthoringSourcePatternUsePolicy}`;
  readonly useSummary: string;
  readonly domainModelPolicy: AuthoringSourceDomainModelPolicy | `${AuthoringSourceDomainModelPolicy}`;
  readonly stylePolicy: AuthoringSourceStylePolicy | `${AuthoringSourceStylePolicy}`;
  readonly dataPolicy: AuthoringSourceDataPolicy | `${AuthoringSourceDataPolicy}`;
  readonly codeEconomyPolicy: AuthoringSourceCodeEconomyPolicy | `${AuthoringSourceCodeEconomyPolicy}`;
  readonly adaptationNotes: readonly string[];
  readonly moduleCount: number;
  readonly modules: readonly SemanticAuthoringSourcePatternModuleRow[];
  readonly parameterCount: number;
  readonly parameters: readonly SemanticAuthoringSourcePatternParameterRow[];
  readonly adaptationGroupCount: number;
  readonly adaptationGroups: readonly SemanticAuthoringSourcePatternAdaptationGroupRow[];
}

export interface SemanticAuthoringSourcePatternModuleRow {
  readonly key: string;
  readonly kind: AuthoringSourcePatternModuleKind | `${AuthoringSourcePatternModuleKind}`;
  readonly title: string;
  readonly summary: string;
}

export interface SemanticAuthoringSourcePatternParameterRow {
  readonly key: string;
  readonly kind: AuthoringSourcePatternParameterKind | `${AuthoringSourcePatternParameterKind}`;
  readonly applicationPolicy: AuthoringSourcePatternParameterApplicationPolicy | `${AuthoringSourcePatternParameterApplicationPolicy}`;
  readonly valueShape: AuthoringSourcePatternParameterValueShape | `${AuthoringSourcePatternParameterValueShape}`;
  readonly title: string;
  readonly defaultValue: string | null;
  readonly summary: string;
}

export type SemanticAuthoringSourcePatternAdaptationGroupApplicationPolicy =
  | 'source-text-input'
  | 'advisory-only'
  | 'mixed';

export interface SemanticAuthoringSourcePatternAdaptationGroupRow {
  readonly key: string;
  readonly title: string;
  readonly summary: string;
  readonly parameterKeys: readonly string[];
  readonly applicationPolicy: SemanticAuthoringSourcePatternAdaptationGroupApplicationPolicy;
}

export interface SemanticAuthoringSourceFileCatalogRow {
  readonly path: string;
  readonly role: AuthoringSourceFileRole | `${AuthoringSourceFileRole}`;
  readonly language: AuthoringSourceLanguage | `${AuthoringSourceLanguage}`;
  readonly editKind: AuthoringSourceEditKind | `${AuthoringSourceEditKind}`;
  readonly operationKind: (AuthoringOperationKind | `${AuthoringOperationKind}`) | null;
  readonly textAuthority: (AuthoringSourceTextAuthority | `${AuthoringSourceTextAuthority}`) | null;
}

export interface SemanticAuthoringProjectToolingCatalogRow {
  readonly packageManager: AuthoringPackageManager | `${AuthoringPackageManager}`;
  readonly buildToolPolicy: AuthoringBuildToolPolicy | `${AuthoringBuildToolPolicy}`;
  readonly hasCompleteFileText: boolean;
  readonly dependencyCount: number;
  readonly dependencySpecifiers: readonly string[];
  readonly dependencyScopes: readonly (AuthoringPackageDependencyScope | `${AuthoringPackageDependencyScope}`)[];
  readonly dependencies: readonly SemanticAuthoringPackageDependencyCatalogRow[];
  readonly scriptCount: number;
  readonly scriptNames: readonly string[];
  readonly scripts: readonly SemanticAuthoringPackageScriptCatalogRow[];
  readonly fileCount: number;
  readonly fileKinds: readonly (AuthoringProjectToolingFileKind | `${AuthoringProjectToolingFileKind}`)[];
  readonly fileLanguages: readonly (AuthoringProjectToolingLanguage | `${AuthoringProjectToolingLanguage}`)[];
  readonly textAuthorities: readonly (AuthoringSourceTextAuthority | `${AuthoringSourceTextAuthority}`)[];
  readonly files: readonly SemanticAuthoringProjectToolingFileCatalogRow[];
}

export interface SemanticAuthoringPackageDependencyCatalogRow {
  readonly specifier: string;
  readonly versionRange: string;
  readonly scope: AuthoringPackageDependencyScope | `${AuthoringPackageDependencyScope}`;
}

export interface SemanticAuthoringPackageScriptCatalogRow {
  readonly name: string;
  readonly command: string;
}

export interface SemanticAuthoringProjectToolingFileCatalogRow {
  readonly path: string;
  readonly fileKind: AuthoringProjectToolingFileKind | `${AuthoringProjectToolingFileKind}`;
  readonly language: AuthoringProjectToolingLanguage | `${AuthoringProjectToolingLanguage}`;
  readonly textAuthority: AuthoringSourceTextAuthority | `${AuthoringSourceTextAuthority}`;
}

export interface SemanticAuthoringRecipeSeedRow {
  readonly key: string;
  readonly title: string;
  readonly operationKinds: readonly (AuthoringOperationKind | `${AuthoringOperationKind}`)[];
  /** Direct recipe bases whose source/effect shape this recipe intentionally contains. */
  readonly baseRecipeKeys: readonly string[];
  /** Transitive base recipes ordered from broadest base to nearest base. */
  readonly lineageRecipeKeys: readonly string[];
  /** Transitive recipe depth; higher values are more specific when several satisfied recipes overlap. */
  readonly specificityRank: number;
  readonly expectedEffectKinds: readonly (ExpectedSemanticEffectKind | `${ExpectedSemanticEffectKind}`)[];
  readonly expectedEffects: readonly SemanticAuthoringExpectedEffectRow[];
  readonly expectedEffectCount: number;
  readonly satisfiedExpectedEffectCount: number;
  readonly failedExpectedEffectCount: number;
  readonly unsupportedExpectedEffectCount: number;
  readonly signatureExpectedEffectCount: number;
  readonly satisfiedSignatureExpectedEffectCount: number;
  readonly failedSignatureExpectedEffectCount: number;
  readonly unsupportedSignatureExpectedEffectCount: number;
  readonly discriminatorExpectedEffectCount: number;
  readonly satisfiedDiscriminatorExpectedEffectCount: number;
  readonly failedDiscriminatorExpectedEffectCount: number;
  readonly unsupportedDiscriminatorExpectedEffectCount: number;
  readonly currentFitState: 'satisfied' | 'partial' | 'not-applicable' | 'unsupported';
  readonly supportState: AuthoringSupportState | `${AuthoringSupportState}`;
  readonly summary: string;
  readonly openReasonKinds: readonly (AuthoringOpenReasonKind | `${AuthoringOpenReasonKind}`)[];
}

export interface SemanticAuthoringCatalogResult {
  readonly operationFamilies: readonly SemanticAuthoringOperationFamilyCatalogRow[];
  readonly tasteAxes: readonly SemanticAuthoringTasteAxisCatalogRow[];
  readonly tasteValues: readonly SemanticAuthoringTasteValueCatalogRow[];
  readonly profiles: readonly SemanticAuthoringProfileCatalogRow[];
  readonly capabilities: readonly SemanticAuthoringCapabilityCatalogRow[];
  readonly operations: readonly SemanticAuthoringOperationCatalogRow[];
  readonly recipes: readonly SemanticAuthoringRecipeCatalogRow[];
}

export type SemanticAuthoringCatalogViewKind = 'overview' | 'operations' | 'recipes' | 'full';

export const SEMANTIC_AUTHORING_CATALOG_VIEWS = [
  'overview',
  'operations',
  'recipes',
  'full',
] as const satisfies readonly SemanticAuthoringCatalogViewKind[];

export const SEMANTIC_AUTHORING_GUIDANCE_FOCI = [
  'app-shell',
  'forms',
  'state',
  'routing',
  'plugins',
  'composition',
  'diagnostics',
  'app-building',
] as const;

export type SemanticAuthoringGuidanceFocus = typeof SEMANTIC_AUTHORING_GUIDANCE_FOCI[number];

export const SEMANTIC_AUTHORING_GUIDANCE_DETAILS = [
  'compact',
  'recipes',
] as const;

export type SemanticAuthoringGuidanceDetail = typeof SEMANTIC_AUTHORING_GUIDANCE_DETAILS[number];

export interface SemanticAuthoringCatalogViewRequest {
  /** Defaults to a compact overview. Use `full` only for local debugging or export. */
  readonly view?: SemanticAuthoringCatalogViewKind | null;
  /** Consumer lane behind this catalog answer; controls query-claim retention when read through SemanticRuntime. */
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
}

export interface SemanticAuthoringCatalogViewCounts {
  readonly operationFamilies: number;
  readonly tasteAxes: number;
  readonly tasteValues: number;
  readonly profiles: number;
  readonly capabilities: number;
  readonly operations: number;
  readonly recipes: number;
}

export interface SemanticAuthoringCatalogViewResult {
  readonly view: Exclude<SemanticAuthoringCatalogViewKind, 'full'>;
  readonly counts: SemanticAuthoringCatalogViewCounts;
  readonly displayText: string;
  readonly operationFamilies: readonly SemanticAuthoringOperationFamilyCatalogRow[];
  readonly tasteAxes: readonly SemanticAuthoringCatalogTasteAxisSummaryRow[];
  readonly capabilities: readonly SemanticAuthoringCatalogCapabilitySummaryRow[];
  readonly recipes: readonly SemanticAuthoringCatalogRecipeSummaryRow[];
  readonly operations?: readonly SemanticAuthoringCatalogOperationSummaryRow[];
}

export interface SemanticAuthoringCatalogTasteAxisSummaryRow {
  readonly axisKey: SemanticAuthoringTasteAxisCatalogRow['axisKey'];
  readonly title: string;
  readonly layer: SemanticAuthoringTasteAxisCatalogRow['layer'];
  readonly summary: string;
  readonly commonValueKeys: SemanticAuthoringTasteAxisCatalogRow['commonValueKeys'];
  readonly valueLayerCounts: SemanticAuthoringTasteAxisCatalogRow['valueLayerCounts'];
}

export interface SemanticAuthoringCatalogCapabilitySummaryRow {
  readonly capabilityKey: SemanticAuthoringCapabilityCatalogRow['capabilityKey'];
  readonly title: string;
  readonly summary: string;
  readonly productOpenReasonKinds: SemanticAuthoringCapabilityCatalogRow['productOpenReasonKinds'];
}

export interface SemanticAuthoringCatalogRecipeSummaryRow {
  readonly key: string;
  readonly title: string;
  readonly operationKindCount: number;
  readonly operationKinds?: SemanticAuthoringRecipeCatalogRow['operationKinds'];
  readonly baseRecipeCount: number;
  readonly baseRecipeKeys?: readonly string[];
  readonly lineageRecipeCount: number;
  readonly lineageRecipeKeys?: readonly string[];
  readonly specificityRank: number;
  readonly supportState: SemanticAuthoringRecipeCatalogRow['supportState'];
  readonly summary: string;
  readonly openReasonKinds: SemanticAuthoringRecipeCatalogRow['openReasonKinds'];
  readonly preferenceCount: number;
  readonly tasteValueKeys?: readonly (AuthoringTasteValueKey | `${AuthoringTasteValueKey}`)[];
  readonly expectedEffectKinds?: SemanticAuthoringRecipeCatalogRow['expectedEffectKinds'];
  readonly expectedEffectCount: number;
  readonly sourceFileCount: number;
  readonly projectToolingFileCount: number;
  readonly sourcePlan?: SemanticAuthoringCatalogSourcePlanSummaryRow | null;
  /** Omitted from compact public catalog views; use the full catalog when ontology summaries are needed inline. */
  readonly preferences?: readonly SemanticAuthoringPreferenceCatalogRow[];
  /** Omitted from compact public catalog views; use the full catalog or authoringRecipePlan effectDetail=contracts. */
  readonly expectedEffects?: readonly SemanticAuthoringCatalogExpectedEffectSummaryRow[];
}

export interface SemanticAuthoringCatalogSourcePlanSummaryRow {
  readonly conflictPolicy: SemanticAuthoringSourcePlanCatalogRow['conflictPolicy'];
  readonly formattingPolicy: SemanticAuthoringSourcePlanCatalogRow['formattingPolicy'];
  readonly packageToolingPolicy: SemanticAuthoringSourcePlanCatalogRow['packageToolingPolicy'];
  readonly pattern: SemanticAuthoringSourcePatternRow | null;
  readonly hasCompleteFileText: boolean;
  readonly fileCount: number;
  readonly fileRoles: SemanticAuthoringSourcePlanCatalogRow['fileRoles'];
  readonly languages: SemanticAuthoringSourcePlanCatalogRow['languages'];
  readonly editKinds: SemanticAuthoringSourcePlanCatalogRow['editKinds'];
  readonly textAuthorities: SemanticAuthoringSourcePlanCatalogRow['textAuthorities'];
  readonly projectTooling: SemanticAuthoringCatalogProjectToolingSummaryRow | null;
}

export interface SemanticAuthoringCatalogProjectToolingSummaryRow {
  readonly packageManager: SemanticAuthoringProjectToolingCatalogRow['packageManager'];
  readonly buildToolPolicy: SemanticAuthoringProjectToolingCatalogRow['buildToolPolicy'];
  readonly dependencyCount: number;
  readonly scriptCount: number;
  readonly fileCount: number;
}

export interface SemanticAuthoringCatalogExpectedEffectSummaryRow {
  readonly effectKind: SemanticAuthoringExpectedEffectContractRow['effectKind'];
  readonly scope: SemanticAuthoringExpectedEffectContractRow['scope'];
  readonly role: SemanticAuthoringExpectedEffectContractRow['role'];
  readonly topologyNodeKind: SemanticAuthoringExpectedEffectContractRow['topologyNodeKind'];
  readonly cardinality: SemanticAuthoringExpectedEffectContractRow['cardinality'];
  readonly count: SemanticAuthoringExpectedEffectContractRow['count'];
  readonly semanticTargetKey: string;
  readonly filterCount: number;
  readonly filterFields: readonly string[];
  readonly capabilityKey: SemanticAuthoringExpectedEffectContractRow['capabilityKey'];
  readonly minimumSupportState: SemanticAuthoringExpectedEffectContractRow['minimumSupportState'];
  readonly tasteAxisKey: SemanticAuthoringExpectedEffectContractRow['tasteAxisKey'];
  readonly tasteValueKey: SemanticAuthoringExpectedEffectContractRow['tasteValueKey'];
  readonly summary: string;
}

export interface SemanticAuthoringCatalogOperationSummaryRow {
  readonly operationKind: SemanticAuthoringOperationCatalogRow['operationKind'];
  readonly familyKey: SemanticAuthoringOperationCatalogRow['familyKey'];
  readonly action: SemanticAuthoringOperationCatalogRow['action'];
  readonly targetKind: SemanticAuthoringOperationCatalogRow['targetKind'];
  readonly requiredCapabilityKeys: SemanticAuthoringOperationCatalogRow['requiredCapabilityKeys'];
  readonly productOpenReasonKinds: SemanticAuthoringOperationCatalogRow['productOpenReasonKinds'];
  readonly summary: string;
}

export interface SemanticAuthoringRecipePlanRequest {
  /** Consumer lane behind this authoring answer; controls query-claim retention when read through SemanticRuntime. */
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
  /** Recipe to build as a read-only semantic plan. */
  readonly recipeKey: string;
  /** Whether this recipe is the source-plan baseline or a companion pattern read. Defaults to `source-plan-start`. */
  readonly usage?: SemanticAuthoringRecipePlanUsage | `${SemanticAuthoringRecipePlanUsage}` | null;
  /** Root directory written into the source edit plan. Defaults to `.`. */
  readonly rootDir?: string | null;
  /** Display app name used by recipe-owned package/tooling text. */
  readonly appName?: string | null;
  /** Include concrete source and project-tooling text. Defaults to false for token economy. */
  readonly includeText?: boolean | null;
  /** Optional relative source/tooling paths; implies selected text unless `includeText` is explicitly false. */
  readonly sourceFilePaths?: readonly string[] | null;
  /** Optional role-driven source text clusters from `sourcePlan.textRequestHints`; implies selected text unless `includeText` is explicitly false. */
  readonly sourceTextRequestHintKeys?: readonly string[] | null;
  /** Optional source-pattern values. Only parameters whose row says `source-text-input` are applied to emitted text today. */
  readonly sourceParameterValues?: readonly SemanticAuthoringSourceParameterValueInput[] | null;
  /** Include row-level expected-effect contracts. Defaults to compact for public app-building token economy. */
  readonly effectDetail?: SemanticAuthoringRecipePlanEffectDetail | `${SemanticAuthoringRecipePlanEffectDetail}` | null;
}

export interface SemanticAuthoringSourceParameterValueInput {
  readonly key: string;
  readonly value: string;
}

export const SEMANTIC_AUTHORING_RECIPE_PLAN_EFFECT_DETAILS = [
  'compact',
  'contracts',
] as const;

export type SemanticAuthoringRecipePlanEffectDetail =
  (typeof SEMANTIC_AUTHORING_RECIPE_PLAN_EFFECT_DETAILS)[number];

export const SEMANTIC_AUTHORING_RECIPE_PLAN_USAGES = [
  'source-plan-start',
  'pattern-reference',
] as const;

export type SemanticAuthoringRecipePlanUsage =
  (typeof SEMANTIC_AUTHORING_RECIPE_PLAN_USAGES)[number];

export interface SemanticAuthoringGuidanceRequest {
  /** Consumer lane behind this authoring answer; controls query-claim retention when read through SemanticRuntime. */
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
  /** Optional public app-building area to narrow the recipe and principle rows. Defaults to `app-building`. */
  readonly focus?: SemanticAuthoringGuidanceFocus | null;
  /** Optional user-facing feature goal used to apply explicit recipe signal ordering, not fuzzy search. */
  readonly featureGoal?: string | null;
  /** Defaults to `compact`; use `recipes` when callers need recipe preference rows inline. */
  readonly detail?: SemanticAuthoringGuidanceDetail | `${SemanticAuthoringGuidanceDetail}` | null;
  /** Optional exact recipe key when a caller already selected one from the authoring catalog. */
  readonly recipeKey?: string | null;
  /** Optional cap for returned recipe rows. Broad app-building guidance defaults to a small first-screen set. */
  readonly recipeLimit?: number | null;
  /** Optional cap for returned principle rows. Compact guidance defaults to the prose-highlight count. */
  readonly principleLimit?: number | null;
  /** Optional cap for returned decision rows. Compact guidance defaults to the prose-highlight count. */
  readonly decisionLimit?: number | null;
}

export interface SemanticAuthoringGuidanceResult {
  readonly focus: SemanticAuthoringGuidanceFocus;
  readonly detail: SemanticAuthoringGuidanceDetail;
  readonly featureGoal: string | null;
  readonly featureGoalSignals: readonly SemanticAuthoringGuidanceFeatureSignalRow[];
  readonly selectedRecipeKey: string | null;
  readonly candidateRecipeCount: number;
  readonly returnedRecipeCount: number;
  readonly candidatePrincipleCount: number;
  readonly returnedPrincipleCount: number;
  readonly candidateDecisionCount: number;
  readonly returnedDecisionCount: number;
  readonly profile: SemanticAuthoringGuidanceProfileRow;
  /** Short transport-friendly text that MCP shells can forward without composing product guidance locally. */
  readonly displayText: string;
  readonly principles: readonly SemanticAuthoringGuidancePrincipleRow[];
  readonly decisions: readonly SemanticAuthoringGuidanceDecisionRow[];
  readonly recipePlanSequence: readonly SemanticAuthoringGuidanceRecipePlanRow[];
  readonly recipes: readonly SemanticAuthoringGuidanceRecipeRow[];
  readonly followUps: readonly SemanticAuthoringGuidanceFollowUpRow[];
}

export interface SemanticAuthoringGuidanceProfileRow {
  readonly key: string;
  readonly title: string;
  readonly summary: string;
  readonly priority: readonly string[];
  readonly nonGoals: readonly string[];
}

export type SemanticAuthoringGuidancePlanningLayer =
  | 'architecture-choice'
  | 'feature-surface'
  | 'navigation-frame'
  | 'framework-capability'
  | 'integration-boundary'
  | 'app-shell';

export interface SemanticAuthoringGuidanceFeatureSignalRow {
  readonly key: string;
  readonly planningLayer: SemanticAuthoringGuidancePlanningLayer;
  /** Exact matched phrase or explicit token-conjunction label, e.g. editable+fields. */
  readonly matchedTerms: readonly string[];
  readonly primaryWeight: number;
  readonly recipeKeys: readonly string[];
}

export interface SemanticAuthoringGuidancePrincipleRow {
  readonly key: string;
  readonly title: string;
  readonly summary: string;
  readonly prefer: readonly string[];
  readonly avoid: readonly string[];
  readonly tasteValueKeys: readonly (AuthoringTasteValueKey | `${AuthoringTasteValueKey}`)[];
  /** Empty in compact mode; pass `detail: "recipes"` when recipe membership is needed inline. */
  readonly recipeKeys: readonly string[];
}

export interface SemanticAuthoringGuidanceDecisionRow {
  readonly key: string;
  readonly title: string;
  readonly question: string;
  readonly recommendation: string;
  readonly chooseWhen: readonly string[];
  readonly avoidWhen: readonly string[];
  readonly tasteValueKeys: readonly (AuthoringTasteValueKey | `${AuthoringTasteValueKey}`)[];
  /** Empty in compact mode; pass `detail: "recipes"` when recipe membership is needed inline. */
  readonly recipeKeys: readonly string[];
  readonly followUpSurfaces: readonly string[];
}

export interface SemanticAuthoringGuidanceRecipeRow {
  readonly recipeKey: string;
  readonly title: string;
  readonly supportState: AuthoringSupportState | `${AuthoringSupportState}`;
  readonly whenToUse: string;
  readonly codeShape: string;
  readonly prefer: readonly string[];
  readonly avoid: readonly string[];
  /** Empty in compact mode; pass `detail: "recipes"` when inline operation families are needed. */
  readonly operationKinds: readonly (AuthoringOperationKind | `${AuthoringOperationKind}`)[];
  readonly tasteValueKeys: readonly (AuthoringTasteValueKey | `${AuthoringTasteValueKey}`)[];
  /** Empty in compact mode; pass `detail: "recipes"` when inline taste preference rows are needed. */
  readonly tasteValues: readonly SemanticAuthoringPreferenceCatalogRow[];
  /** Empty in compact mode; pass `detail: "recipes"` when inline expected-effect kind rows are needed. */
  readonly expectedEffectKinds: readonly (ExpectedSemanticEffectKind | `${ExpectedSemanticEffectKind}`)[];
  readonly expectedEffectCount: number;
  readonly sourceFileCount: number;
  readonly sourcePattern: SemanticAuthoringSourcePatternRow | null;
  /** Empty in compact mode; pass `detail: "recipes"` when inline source role rows are needed. */
  readonly sourceFileRoles: readonly (AuthoringSourceFileRole | `${AuthoringSourceFileRole}`)[];
  readonly projectToolingPolicy: (AuthoringPackageToolingPolicy | `${AuthoringPackageToolingPolicy}`) | null;
  readonly followUpSurfaces: readonly string[];
}

export interface SemanticAuthoringGuidanceRecipePlanRow {
  readonly recipeKey: string;
  readonly role: 'primary' | 'companion';
  /** Optional label when a feature goal needs more than one instance of the same recipe shape. */
  readonly instanceLabel?: string | null;
  readonly usage: SemanticAuthoringRecipePlanUsage;
  /** Deterministic feature-goal suggestions to pass as `sourceParameterValues`; callers should still review them. */
  readonly suggestedSourceParameterValues: readonly SemanticAuthoringSourceParameterValueInput[];
  /** Structured contract metadata for suggested values; clients should use this instead of parsing display text. */
  readonly suggestedSourceParameterContracts: readonly SemanticAuthoringGuidanceSourceParameterContractRow[];
  readonly newFeatureSignals: readonly string[];
  readonly coveredFeatureSignals: readonly string[];
  readonly uncoveredFeatureSignals: readonly string[];
  readonly reason: string;
  readonly followUpSurface: 'authoring-recipe-plan';
}

export interface SemanticAuthoringGuidanceSourceParameterContractRow {
  readonly key: string;
  readonly value: string;
  readonly parameterKind: (AuthoringSourcePatternParameterKind | `${AuthoringSourcePatternParameterKind}`) | null;
  readonly applicationPolicy: (AuthoringSourcePatternParameterApplicationPolicy | `${AuthoringSourcePatternParameterApplicationPolicy}`) | null;
  readonly valueShape: (AuthoringSourcePatternParameterValueShape | `${AuthoringSourcePatternParameterValueShape}`) | null;
  readonly summary: string;
}

export interface SemanticAuthoringGuidanceFollowUpRow {
  readonly surface: string;
  readonly purpose: string;
  readonly whenToUse: string;
}

export interface SemanticAuthoringRecipePlanResult {
  readonly recipe: SemanticAuthoringRecipePlanRecipeRow;
  readonly usage: SemanticAuthoringRecipePlanUsage;
  readonly intent: SemanticAuthoringRecipePlanIntentRow;
  /** Short transport-friendly text that MCP shells can forward without composing recipe guidance locally. */
  readonly displayText: string;
  readonly preconditions: readonly SemanticAuthoringRecipePlanPreconditionRow[];
  readonly steps: readonly SemanticAuthoringRecipePlanStepRow[];
  readonly expectedEffectDetail: SemanticAuthoringRecipePlanEffectDetail;
  readonly expectedEffectKinds: readonly (ExpectedSemanticEffectKind | `${ExpectedSemanticEffectKind}`)[];
  readonly expectedEffectCount: number;
  /** Compact semantic promises sampled from signature/discriminator effects so clients need not request all contracts. */
  readonly expectedEffectHighlights: readonly SemanticAuthoringExpectedEffectHighlightRow[];
  /** Empty in compact mode; pass `effectDetail: "contracts"` when row-level verification contracts are needed. */
  readonly expectedEffects: readonly SemanticAuthoringExpectedEffectContractRow[];
  readonly sourcePlan: SemanticAuthoringRecipeSourcePlanRow | null;
}

export interface SemanticAuthoringRecipePlanRecipeRow {
  readonly key: string;
  readonly title: string;
  readonly operationKinds: readonly (AuthoringOperationKind | `${AuthoringOperationKind}`)[];
  readonly baseRecipeKeys: readonly string[];
  readonly lineageRecipeKeys: readonly string[];
  readonly specificityRank: number;
  readonly supportState: AuthoringSupportState | `${AuthoringSupportState}`;
  readonly summary: string;
  readonly openReasonKinds: readonly (AuthoringOpenReasonKind | `${AuthoringOpenReasonKind}`)[];
  readonly preferenceCount: number;
  readonly expectedEffectCount: number;
  readonly sourceFileCount: number;
  readonly packageToolingPolicy: (AuthoringPackageToolingPolicy | `${AuthoringPackageToolingPolicy}`) | null;
}

export interface SemanticAuthoringRecipePlanIntentRow {
  readonly summary: string;
  readonly profileKey: string | null;
  readonly preferenceCount: number;
  readonly tasteValueKeys: readonly (AuthoringTasteValueKey | `${AuthoringTasteValueKey}`)[];
  /** Empty in compact mode; use contract detail when inline recipe preference rows are needed beside plan steps. */
  readonly preferences: readonly SemanticAuthoringPreferenceCatalogRow[];
}

export interface SemanticAuthoringRecipePlanPreconditionRow {
  readonly summary: string;
  readonly required: boolean;
}

export interface SemanticAuthoringRecipePlanStepRow {
  readonly operationKind: AuthoringOperationKind | `${AuthoringOperationKind}`;
  readonly operationSummary: string;
  readonly action: AuthoringOperationAction | `${AuthoringOperationAction}`;
  readonly targetKind: AuthoringTargetKind | `${AuthoringTargetKind}`;
  readonly expectedEffectKinds: readonly (ExpectedSemanticEffectKind | `${ExpectedSemanticEffectKind}`)[];
  readonly expectedEffectCount: number;
  /** Empty in compact mode; top-level highlights carry the public semantic promises. */
  readonly expectedEffectHighlights: readonly SemanticAuthoringExpectedEffectHighlightRow[];
  /** Empty in compact mode; pass `effectDetail: "contracts"` when row-level verification contracts are needed. */
  readonly expectedEffects: readonly SemanticAuthoringExpectedEffectContractRow[];
}

export interface SemanticAuthoringRecipeSourcePlanRow {
  readonly rootDir: string;
  readonly conflictPolicy: AuthoringSourceConflictPolicy | `${AuthoringSourceConflictPolicy}`;
  readonly formattingPolicy: AuthoringSourceFormattingPolicy | `${AuthoringSourceFormattingPolicy}`;
  readonly packageToolingPolicy: AuthoringPackageToolingPolicy | `${AuthoringPackageToolingPolicy}`;
  readonly pattern: SemanticAuthoringSourcePatternRow | null;
  readonly sourceParameterApplications: readonly SemanticAuthoringSourceParameterApplicationRow[];
  readonly hasCompleteFileText: boolean;
  readonly fileCount: number;
  readonly textRequestHints: readonly SemanticAuthoringRecipeSourceTextRequestHintRow[];
  readonly textSelection: SemanticAuthoringRecipeSourceTextSelectionRow;
  readonly files: readonly SemanticAuthoringRecipeSourceFilePlanRow[];
  readonly projectTooling: SemanticAuthoringRecipeProjectToolingPlanRow | null;
}

export interface SemanticAuthoringSourceParameterApplicationRow {
  readonly key: string;
  readonly requestedValue: string;
  readonly defaultValue: string | null;
  readonly applicationPolicy: AuthoringSourcePatternParameterApplicationPolicy | `${AuthoringSourcePatternParameterApplicationPolicy}` | null;
  readonly valueShape: AuthoringSourcePatternParameterValueShape | `${AuthoringSourcePatternParameterValueShape}` | null;
  readonly applicationState: AuthoringSourcePatternParameterApplicationState | `${AuthoringSourcePatternParameterApplicationState}`;
  readonly summary: string;
}

export interface SemanticAuthoringRecipeSourceTextSelectionRow {
  /** Normalized requested hint keys from `sourceTextRequestHintKeys`; empty when no hint selection was requested. */
  readonly requestedHintKeys: readonly string[];
  /** Requested hint keys that matched a generated `sourcePlan.textRequestHints` row. */
  readonly matchedHintKeys: readonly string[];
  /** Requested hint keys that did not match a generated `sourcePlan.textRequestHints` row. */
  readonly unmatchedHintKeys: readonly string[];
  /** Normalized requested paths from `sourceFilePaths`; empty when no path selection was requested. */
  readonly requestedPaths: readonly string[];
  /** Requested paths that matched generated source or project-tooling artifacts. */
  readonly matchedPaths: readonly string[];
  /** Requested paths that did not match a generated artifact. */
  readonly unmatchedPaths: readonly string[];
  /** Matched artifact paths whose concrete text is present in this response. */
  readonly includedPaths: readonly string[];
}

export interface SemanticAuthoringRecipeSourceTextRequestHintRow {
  readonly key: string;
  readonly title: string;
  readonly summary: string;
  /** Paths to pass through `sourceFilePaths` when this source-file cluster is needed. */
  readonly sourceFilePaths: readonly string[];
  /** Project-tooling artifact paths to pass through `sourceFilePaths` when package/build setup is needed. */
  readonly projectToolingPaths: readonly string[];
}

export interface SemanticAuthoringRecipeSourceFilePlanRow extends SemanticAuthoringSourceFileCatalogRow {
  readonly textLength: number | null;
  readonly text: string | null;
}

export interface SemanticAuthoringRecipeProjectToolingPlanRow extends SemanticAuthoringProjectToolingCatalogRow {
  readonly files: readonly SemanticAuthoringRecipeProjectToolingFilePlanRow[];
}

export interface SemanticAuthoringRecipeProjectToolingFilePlanRow extends SemanticAuthoringProjectToolingFileCatalogRow {
  readonly textLength: number;
  readonly text: string | null;
}

export interface SemanticAuthoringOpenReasonRow {
  readonly reasonKind: AuthoringOpenReasonKind | `${AuthoringOpenReasonKind}`;
  readonly locus: SemanticAuthoringLocusKind;
  readonly summary: string;
  readonly blockingCapabilityKeys: readonly (AuthoringCapabilityKey | `${AuthoringCapabilityKey}`)[];
}

export interface SemanticAuthoringRepairRow {
  readonly key: string;
  readonly repairKind: AuthoringRepairKind | `${AuthoringRepairKind}`;
  readonly evidenceKind: AuthoringRepairEvidenceKind | `${AuthoringRepairEvidenceKind}`;
  readonly operationKind: AuthoringOperationKind | `${AuthoringOperationKind}`;
  readonly supportState: AuthoringSupportState | `${AuthoringSupportState}`;
  readonly authority: AuthoringEvidenceAuthority | `${AuthoringEvidenceAuthority}`;
  readonly locus: SemanticAuthoringLocusKind;
  readonly source: SemanticSourceReference | null;
  readonly diagnosticKind: SemanticTemplateCursorDiagnosticKind | null;
  readonly siteKind: TemplateCompletionSiteKind | `${TemplateCompletionSiteKind}` | null;
  readonly valueSiteKind: TemplateValueSiteKind | `${TemplateValueSiteKind}` | null;
  readonly seamKindKey: OpenSeam['seamKindKey'] | null;
  readonly missingInputs: readonly string[];
  readonly openSeamReasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
  readonly runtimeBoundaryKinds: readonly (AuthoringRepairRuntimeBoundaryKind | `${AuthoringRepairRuntimeBoundaryKind}`)[];
  readonly runtimeIntentKinds: readonly (AuthoringRepairRuntimeIntentKind | `${AuthoringRepairRuntimeIntentKind}`)[];
  readonly suggestion: SemanticTemplateCursorSuggestionRow | null;
  readonly summary: string;
  readonly openReasonKinds: readonly (AuthoringOpenReasonKind | `${AuthoringOpenReasonKind}`)[];
}

export interface SemanticAuthoringRepairMemberHintRow {
  readonly memberName: string;
  readonly evidenceCount: number;
  readonly ownerTypeDisplays: readonly string[];
  readonly valueTypeDisplays: readonly string[];
  readonly valueTypeSources: readonly SemanticTemplateCursorSuggestionValueTypeSource[];
  readonly valueTypeCoverage: 'all' | 'some' | 'none';
}

export interface SemanticAuthoringRepairActionTargetRow {
  readonly targetKind: SemanticTemplateCursorSuggestionActionTargetKind;
  readonly source: SemanticSourceReference | null;
  readonly typeDisplay: string | null;
  readonly memberNames: readonly string[];
  readonly evidenceCount: number;
}

export interface SemanticAuthoringRepairClusterRow {
  readonly key: string;
  readonly repairKind: AuthoringRepairKind | `${AuthoringRepairKind}`;
  readonly planKind: AuthoringRepairPlanKind | `${AuthoringRepairPlanKind}`;
  readonly changeDomain: AuthoringRepairChangeDomain | `${AuthoringRepairChangeDomain}`;
  readonly planReadiness: AuthoringRepairPlanReadiness | `${AuthoringRepairPlanReadiness}`;
  readonly evidenceKind: AuthoringRepairEvidenceKind | `${AuthoringRepairEvidenceKind}`;
  readonly operationKind: AuthoringOperationKind | `${AuthoringOperationKind}`;
  readonly supportState: AuthoringSupportState | `${AuthoringSupportState}`;
  readonly authority: AuthoringEvidenceAuthority | `${AuthoringEvidenceAuthority}`;
  readonly locus: SemanticAuthoringLocusKind;
  readonly diagnosticKind: SemanticTemplateCursorDiagnosticKind | null;
  readonly siteKinds: readonly (TemplateCompletionSiteKind | `${TemplateCompletionSiteKind}`)[];
  readonly valueSiteKinds: readonly (TemplateValueSiteKind | `${TemplateValueSiteKind}`)[];
  readonly seamKindKey: OpenSeam['seamKindKey'] | null;
  readonly suggestionKind: SemanticTemplateCursorSuggestionKind | null;
  readonly actionKind: SemanticTemplateCursorSuggestionActionKind | null;
  readonly actionTargetKind: SemanticTemplateCursorSuggestionActionTargetKind | null;
  readonly actionTargetSourceCoverage: 'all' | 'some' | 'none' | 'not-applicable';
  readonly actionTargetCount: number;
  readonly actionTargets: readonly SemanticAuthoringRepairActionTargetRow[];
  readonly count: number;
  readonly targetMemberCount: number;
  readonly targetMemberNames: readonly string[];
  readonly memberHints: readonly SemanticAuthoringRepairMemberHintRow[];
  readonly ownerTypeCount: number;
  readonly ownerTypeDisplays: readonly string[];
  readonly valueTypeCount: number;
  readonly valueTypeDisplays: readonly string[];
  readonly missingInputs: readonly string[];
  readonly openSeamReasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
  readonly runtimeBoundaryKinds: readonly (AuthoringRepairRuntimeBoundaryKind | `${AuthoringRepairRuntimeBoundaryKind}`)[];
  readonly runtimeIntentKinds: readonly (AuthoringRepairRuntimeIntentKind | `${AuthoringRepairRuntimeIntentKind}`)[];
  readonly openReasonKinds: readonly (AuthoringOpenReasonKind | `${AuthoringOpenReasonKind}`)[];
  readonly summary: string;
}

export interface SemanticAuthoringOrientationResult {
  readonly project: SemanticAuthoringProjectOrientation;
  /** Short transport-friendly text that MCP shells can forward without interpreting authoring ontology rows locally. */
  readonly displayText: string;
  readonly coverage: readonly SemanticAuthoringCoverageRow[];
  readonly taste: readonly SemanticAuthoringTasteAxisRow[];
  readonly capabilities: readonly SemanticAuthoringCapabilityRow[];
  readonly operations: readonly SemanticAuthoringOperationRow[];
  readonly surfaces: readonly SemanticAuthoringAvailableSurfaceRow[];
  readonly recipes: readonly SemanticAuthoringRecipeSeedRow[];
  readonly repairs: readonly SemanticAuthoringRepairRow[];
  readonly repairClusters: readonly SemanticAuthoringRepairClusterRow[];
  readonly openReasons: readonly SemanticAuthoringOpenReasonRow[];
}

export interface SemanticAppSummary {
  readonly analysisDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`;
  readonly projectKey: string;
  readonly rootDir: string;
  readonly sourceFiles: number;
  readonly evaluatedSources: number;
  readonly unresolvedModuleEdges: number;
  readonly evaluationIssues: number;
  readonly resourceDefinitions: number;
  readonly routerOptions: number;
  readonly routeConfigs: number;
  readonly routeConfigContexts: number;
  readonly routeContexts: number;
  readonly routeRecognizers: number;
  readonly routePatterns: number;
  readonly routeEndpoints: number;
  readonly routeRecognizerStates: number;
  readonly routeRecognizerIssues: number;
  readonly routerIssues: number;
  readonly recognizedRoutes: number;
  readonly typedNavigationInstructions: number;
  readonly viewportInstructions: number;
  readonly viewportInstructionTrees: number;
  readonly routeTrees: number;
  readonly routeNodes: number;
  readonly routerViewports: number;
  readonly viewportAgents: number;
  readonly componentAgents: number;
  readonly configurationSequences: number;
  readonly configurationSteps: number;
  readonly appTasks: number;
  readonly appRoots: number;
  readonly registrationAdmissions: number;
  readonly configurationIssues: number;
  readonly stateStores: number;
  readonly stateIssues: number;
  readonly i18nTranslationKeys: number;
  readonly i18nTranslationBindings: number;
  readonly containers: number;
  readonly runtimeChildContainers: number;
  readonly resolverSlots: number;
  readonly diResolveCallSites: number;
  readonly runtimeChildContextResolverSlots: number;
  readonly runtimeControllers: number;
  readonly resourceSlots: number;
  readonly diIssues: number;
  readonly diOpenSeams: number;
  readonly compilerWorlds: number;
  readonly visibleResources: number;
  readonly visibleSyntaxResources: number;
  readonly runtimeRenderers: number;
  readonly compiledResources: number;
  readonly compiledInstructions: number;
  readonly runtimeBindings: number;
  readonly runtimeWatchers: number;
  readonly runtimeWatcherObservedDependencies: number;
  readonly runtimeTargetOperations: number;
  readonly runtimeRendererTargetOperations: number;
  readonly runtimeBindingTargetAccesses: number;
  readonly runtimeBindingTargetOperations: number;
  readonly runtimeBindingSourceOperations: number;
  readonly runtimeBindingBehaviorApplications: number;
  readonly runtimeBindingValueChannels: number;
  readonly runtimeBindingDataFlows: number;
  readonly runtimeBindingObservedDependencies: number;
  readonly computedObservationDefinitions: number;
  readonly computedObserverSources: number;
  readonly computedObserverObservedDependencies: number;
  readonly runtimeEffects: number;
  readonly runtimeEffectObservedDependencies: number;
  readonly proxyObservableEscapes: number;
  readonly runtimeBindingDataFlowSourceTypeGaps: number;
  readonly runtimeBindingDataFlowSourceAssignmentPressures: number;
  readonly bindingScopes: number;
  readonly kernelProducts: number;
  readonly kernelClaims: number;
  readonly kernelOpenSeams: number;
}

export interface SemanticSourceFileRow {
  readonly projectKey: string;
  readonly path: string;
  readonly language: string;
  readonly role: string;
  readonly handles?: {
    readonly addressHandle: AddressHandle;
  };
}

export interface SemanticSourceFilesResult {
  readonly rows: readonly SemanticSourceFileRow[];
}

export interface SemanticUnresolvedModuleRow {
  readonly fromModuleKey: string;
  readonly moduleSpecifier: string;
  readonly source: SemanticSourceReference;
}

export interface SemanticUnresolvedModulesResult {
  readonly rows: readonly SemanticUnresolvedModuleRow[];
}

export interface SemanticOpenSeamRow {
  readonly seamKindKey: OpenSeam['seamKindKey'];
  readonly summary: string;
  readonly reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly handle: OpenSeam['handle'];
    readonly addressHandle: AddressHandle | null;
  };
}

export interface SemanticOpenSeamsResult {
  readonly displayText: string;
  readonly rows: readonly SemanticOpenSeamRow[];
}

export interface SemanticOpenSeamSummaryRow {
  readonly seamKindKey: OpenSeam['seamKindKey'];
  readonly reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
  readonly count: number;
  readonly sourceFileCount: number;
  readonly sampleSummary: string;
  readonly sampleSources: readonly SemanticSourceReference[];
}

export interface SemanticOpenSeamSummaryResult {
  readonly totalOpenSeamRows: number;
  readonly displayText: string;
  readonly rows: readonly SemanticOpenSeamSummaryRow[];
}

export interface SemanticEvaluationIssueRow {
  readonly projectKey: string;
  readonly phase: EvaluationIssuePhase | `${EvaluationIssuePhase}`;
  readonly issueKind: EvaluationIssueKind | `${EvaluationIssueKind}`;
  readonly subjectKind: EvaluationIssueSubjectKind | `${EvaluationIssueSubjectKind}`;
  readonly diagnosticAuthority: SemanticTemplateCursorDiagnosticAuthority | 'semantic-runtime-product';
  readonly frameworkErrorCode: string | null;
  readonly frameworkRawErrorAuthority: string | null;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly message: string;
  readonly actualValueKind: EvaluationValueKind | `${EvaluationValueKind}` | null;
  readonly inputExpressionText: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticEvaluationIssuesResult {
  readonly rows: readonly SemanticEvaluationIssueRow[];
}

export interface SemanticResourceDefinitionBindableRow {
  readonly name: string;
  readonly attribute: string;
  readonly callback: string;
  readonly mode: BindableBindingMode | `${BindableBindingMode}`;
  readonly setterKind: BindableSetterKind | `${BindableSetterKind}`;
  readonly valueType: string | null;
  readonly valueTypeShapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}` | null;
  readonly effectiveValueTypeShapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}` | null;
  readonly valueTypeHasCallSignature: boolean | null;
  readonly valueTypeHasMembers: boolean | null;
  readonly valueTypeIsWeak: boolean | null;
  readonly source: SemanticSourceReference | null;
}

export interface SemanticResourceDefinitionWatchRow {
  readonly expressionKind: WatchExpressionKind | `${WatchExpressionKind}`;
  readonly expressionPropertyKeyKind: WatchPropertyKeyKind | `${WatchPropertyKeyKind}` | null;
  readonly expressionPropertyKeyText: string | null;
  readonly expressionSource: SemanticSourceReference | null;
  readonly callbackKind: WatchCallbackKind | `${WatchCallbackKind}`;
  readonly callbackPropertyKeyKind: WatchPropertyKeyKind | `${WatchPropertyKeyKind}` | null;
  readonly callbackPropertyKeyText: string | null;
  readonly callbackSource: SemanticSourceReference | null;
  readonly flush: WatchFlushMode | `${WatchFlushMode}`;
}

export interface SemanticResourceIssueRow {
  readonly projectKey: string;
  readonly phase: ResourceIssuePhase | `${ResourceIssuePhase}`;
  readonly issueKind: ResourceIssueKind | `${ResourceIssueKind}`;
  readonly diagnosticAuthority: 'framework-error-code' | 'semantic-runtime-product';
  readonly frameworkErrorCode: string | null;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly message: string;
  readonly source: SemanticSourceReference | null;
  readonly resource: {
    readonly resourceKind: ResourceDefinitionKind | `${ResourceDefinitionKind}` | null;
    readonly name: string | null;
    readonly key: string | null;
    readonly source: SemanticSourceReference | null;
  };
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly ownerDefinitionIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticResourceDefinitionDependencyRow {
  readonly dependencyKind: ResourceDependencyReferenceKind | `${ResourceDependencyReferenceKind}`;
  readonly keyName: string | null;
  readonly localName: string | null;
  readonly registryKind: string | null;
  readonly hasIdentity: boolean;
}

export interface SemanticResourceDefinitionTemplateRow {
  readonly kind: CustomElementTemplateKind | `${CustomElementTemplateKind}`;
  readonly hasMarkup: boolean;
  readonly source: SemanticSourceReference | null;
}

export interface SemanticResourceDefinitionPatternRow {
  readonly pattern: string;
  readonly symbols: string;
  readonly source: SemanticSourceReference | null;
}

export type SemanticResourceDeclarationMode =
  /** Resource metadata came from an Aurelia decorator. */
  | 'decorator'
  /** Resource metadata came from static class-side metadata such as `$au`. */
  | 'static-property'
  /** Resource metadata came from an explicit definition object or define call. */
  | 'definition-object'
  /** Resource metadata came from a resource factory/create call. */
  | 'factory-call'
  /** Resource metadata came from the currently modeled conventions plugin rules. */
  | 'convention'
  /** Resource metadata came from a generic header whose more precise carrier is not preserved. */
  | 'header';

export interface SemanticResourceDefinitionRow {
  readonly projectKey: string;
  readonly resourceKind: ResourceDefinitionKind;
  readonly declarationModes: readonly SemanticResourceDeclarationMode[];
  readonly name: string | null;
  readonly aliases: readonly string[];
  readonly key: string | null;
  readonly targetName: string | null;
  readonly captureKind: CustomElementCaptureKind | `${CustomElementCaptureKind}` | null;
  readonly template: SemanticResourceDefinitionTemplateRow | null;
  readonly bindables: readonly SemanticResourceDefinitionBindableRow[];
  readonly watches: readonly SemanticResourceDefinitionWatchRow[];
  readonly issues: readonly SemanticResourceIssueRow[];
  readonly dependencies: readonly SemanticResourceDefinitionDependencyRow[];
  readonly isTemplateController: boolean | null;
  readonly containerStrategy: CustomAttributeContainerStrategy | `${CustomAttributeContainerStrategy}` | null;
  readonly defaultProperty: string | null;
  readonly containerless: boolean | null;
  readonly shadowMode: ShadowRootMode | `${ShadowRootMode}` | null;
  readonly hasSlots: boolean | null;
  readonly needsCompile: boolean | null;
  readonly patterns: readonly SemanticResourceDefinitionPatternRow[];
  readonly source: SemanticSourceReference | null;
  readonly targetSource: SemanticSourceReference | null;
  readonly handles?: {
    readonly definitionProductHandle: ProductHandle | null;
    readonly identityHandle: IdentityHandle | null;
    readonly targetIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly targetAddressHandle: AddressHandle | null;
  };
}

export interface SemanticResourceDefinitionsResult {
  readonly rows: readonly SemanticResourceDefinitionRow[];
}

export interface SemanticResourceIssuesResult {
  readonly rows: readonly SemanticResourceIssueRow[];
}

export interface SemanticConfigurationIssueRow {
  readonly projectKey: string;
  readonly phase: ConfigurationIssuePhase | `${ConfigurationIssuePhase}`;
  readonly issueKind: ConfigurationIssueKind | `${ConfigurationIssueKind}`;
  readonly diagnosticAuthority: 'framework-error-code' | 'semantic-runtime-product';
  readonly frameworkErrorCode: string | null;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly message: string;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticConfigurationIssuesResult {
  readonly rows: readonly SemanticConfigurationIssueRow[];
}

export interface SemanticDiIssueRow {
  readonly projectKey: string;
  readonly phase: DiIssuePhase | `${DiIssuePhase}`;
  readonly issueKind: DiIssueKind | `${DiIssueKind}`;
  readonly diagnosticAuthority: 'framework-error-code' | 'semantic-runtime-product';
  readonly frameworkErrorCode: string | null;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly message: string;
  readonly subjectKind: DiIssueSubjectKind | `${DiIssueSubjectKind}`;
  readonly resourceKey: string | null;
  readonly resolveCall: {
    readonly keyExpressionText: string | null;
    readonly argumentCount: number;
    readonly nullishKeyArguments: readonly {
      readonly index: number;
      readonly kind: string;
      readonly text: string;
    }[];
    readonly enclosingClassName: string | null;
    readonly enclosingMemberName: string | null;
    readonly enclosingMemberKind: DiResolveEnclosingMemberKind;
    readonly enclosingMemberStatic: boolean;
    readonly executionContextKind: DiResolveExecutionContextKind;
    readonly activeContainerExpectation: DiResolveActiveContainerExpectation;
  } | null;
  readonly injectDecorator: {
    readonly decoratorName: string;
    readonly targetKind: string;
    readonly targetName: string | null;
  } | null;
  readonly containerApiCall: {
    readonly methodKind: string;
    readonly keyExpressionText: string | null;
    readonly keyWrapperKind: string | null;
    readonly wrappedKeyName: string | null;
    readonly keyKind: string;
    readonly keyIdentityKind: string;
    readonly autoRegister: boolean | null;
    readonly receiverDefaultResolverPolicy: string | null;
    readonly receiverFreshCreateContainer: boolean;
    readonly nullishKeyArguments: readonly {
      readonly index: number;
      readonly kind: string;
      readonly text: string;
    }[];
    readonly receiverText: string;
  } | null;
  readonly dependencyCycle: {
    readonly entryKeyExpressionText: string | null;
    readonly entryKeyName: string;
    readonly cycle: readonly {
      readonly keyName: string;
      readonly implementationName: string;
      readonly dependencyKeyName: string;
      readonly sourcePath: string | null;
    }[];
  } | null;
  readonly registrationCascade: {
    readonly stepKind: string;
    readonly admissionKind: string;
    readonly strategy: string;
  } | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly containerIdentityHandle: IdentityHandle | null;
    readonly containerProductHandle: ProductHandle | null;
    readonly existingResourceSlotProductHandle: ProductHandle | null;
    readonly incomingResourceProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticDiIssuesResult {
  readonly rows: readonly SemanticDiIssueRow[];
}

export interface SemanticObservationIssueRow {
  readonly projectKey: string;
  readonly phase: ObservationIssuePhase | `${ObservationIssuePhase}`;
  readonly issueKind: ObservationIssueKind | `${ObservationIssueKind}`;
  readonly diagnosticAuthority: SemanticTemplateCursorDiagnosticAuthority | 'semantic-runtime-product';
  readonly frameworkErrorCode: string | null;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly message: string;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticObservationIssuesResult {
  readonly rows: readonly SemanticObservationIssueRow[];
}

export interface SemanticComputedObservationDefinitionRow {
  readonly projectKey: string;
  readonly memberKind: ComputedObservationMemberKind | `${ComputedObservationMemberKind}`;
  readonly memberName: string | null;
  readonly dependencyMode: ComputedObservationDependencyMode | `${ComputedObservationDependencyMode}`;
  readonly dependencyKeys: readonly string[];
  readonly dependencyFunctionCount: number;
  readonly flush: 'sync' | 'async';
  readonly deep: boolean | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticComputedObservationDefinitionsResult {
  readonly rows: readonly SemanticComputedObservationDefinitionRow[];
}

export interface SemanticComputedObserverSourceRow {
  readonly projectKey: string;
  readonly observerKind: ComputedObserverRuntimeKind | `${ComputedObserverRuntimeKind}`;
  readonly triggerKind: ComputedObserverSourceTriggerKind | `${ComputedObserverSourceTriggerKind}`;
  readonly className: string | null;
  readonly memberName: string | null;
  readonly dependencyMode: ComputedObservationDependencyMode | `${ComputedObservationDependencyMode}`;
  readonly dependencyKeys: readonly string[];
  readonly dependencyFunctionCount: number;
  readonly flush: 'sync' | 'async';
  readonly deep: boolean | null;
  readonly observedDependencies: number;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticComputedObserverSourcesResult {
  readonly rows: readonly SemanticComputedObserverSourceRow[];
}

export interface SemanticComputedObserverObservedDependencyRow {
  readonly projectKey: string;
  readonly observerKind: ComputedObserverRuntimeKind | `${ComputedObserverRuntimeKind}`;
  readonly className: string | null;
  readonly memberName: string | null;
  readonly dependencyKind: RuntimeObservedDependencyKind | `${RuntimeObservedDependencyKind}`;
  readonly expressionKind: string;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  readonly dependencyMemberName: string | null;
  readonly keyExpression: string | null;
  readonly methodName: string | null;
  readonly spanStart: number | null;
  readonly spanEnd: number | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly computedObserverProductHandle: ProductHandle | null;
    readonly observedDependencyProductHandle: ProductHandle;
    readonly observedDependencyIdentityHandle: IdentityHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticComputedObserverObservedDependenciesResult {
  readonly rows: readonly SemanticComputedObserverObservedDependencyRow[];
}

export interface SemanticRuntimeEffectRow {
  readonly projectKey: string;
  readonly effectKind: RuntimeEffectKind | `${RuntimeEffectKind}`;
  readonly dependencyEvaluationKind: RuntimeEffectDependencyEvaluationKind | `${RuntimeEffectDependencyEvaluationKind}`;
  readonly immediate: boolean | null;
  readonly observedDependencies: number;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly effectProductHandle: ProductHandle | null;
    readonly effectIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRuntimeEffectResult {
  readonly rows: readonly SemanticRuntimeEffectRow[];
}

export interface SemanticRuntimeEffectObservedDependencyRow {
  readonly projectKey: string;
  readonly effectKind: RuntimeEffectKind | `${RuntimeEffectKind}`;
  readonly dependencyEvaluationKind: RuntimeEffectDependencyEvaluationKind | `${RuntimeEffectDependencyEvaluationKind}`;
  readonly immediate: boolean | null;
  readonly dependencyKind: RuntimeObservedDependencyKind | `${RuntimeObservedDependencyKind}`;
  readonly expressionKind: string;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  readonly memberName: string | null;
  readonly keyExpression: string | null;
  readonly methodName: string | null;
  readonly observedMemberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null;
  readonly observedMemberSource: SemanticSourceReference | null;
  readonly spanStart: number | null;
  readonly spanEnd: number | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly effectProductHandle: ProductHandle | null;
    readonly observedDependencyProductHandle: ProductHandle;
    readonly observedDependencyIdentityHandle: IdentityHandle;
    readonly observedMemberSourceAddressHandle: AddressHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRuntimeEffectObservedDependenciesResult {
  readonly rows: readonly SemanticRuntimeEffectObservedDependencyRow[];
}

export interface SemanticProxyObservableEscapeRow {
  readonly projectKey: string;
  readonly escapeKind: ProxyObservableEscapeKind | `${ProxyObservableEscapeKind}`;
  readonly argumentSourceName: string | null;
  readonly argumentRootName: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly escapeProductHandle: ProductHandle | null;
    readonly escapeIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticProxyObservableEscapesResult {
  readonly rows: readonly SemanticProxyObservableEscapeRow[];
}

export type SemanticAppDiagnosticDomain =
  | 'typescript'
  | 'evaluation'
  | 'configuration'
  | 'di'
  | 'observation'
  | 'template'
  | 'resource'
  | 'state'
  | 'validation'
  | 'fetch-client'
  | 'dialog'
  | 'router'
  | 'route-recognizer';

export interface SemanticAppDiagnosticRow {
  readonly projectKey: string;
  readonly diagnosticDomain: SemanticAppDiagnosticDomain;
  readonly diagnosticKind: string;
  readonly diagnosticAuthority: SemanticTemplateCursorDiagnosticAuthority | 'semantic-runtime-product' | 'typescript';
  readonly frameworkErrorCode: string | null;
  readonly frameworkRawErrorAuthority?: string | null;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly summary: string;
  readonly source: SemanticSourceReference | null;
  readonly relatedQueryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`;
}

export interface SemanticAppDiagnosticsResult {
  readonly displayText: string;
  readonly rows: readonly SemanticAppDiagnosticRow[];
}

export interface SemanticAppDiagnosticSummaryRow {
  readonly diagnosticDomain: SemanticAppDiagnosticDomain;
  readonly diagnosticKind: string;
  readonly diagnosticAuthority: SemanticAppDiagnosticRow['diagnosticAuthority'];
  readonly frameworkErrorCode: string | null;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly relatedQueryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`;
  readonly count: number;
  readonly sourceFileCount: number;
  readonly sampleSummary: string;
  readonly sampleSources: readonly SemanticSourceReference[];
}

export interface SemanticAppDiagnosticSummaryResult {
  readonly totalDiagnosticRows: number;
  readonly displayText: string;
  readonly rows: readonly SemanticAppDiagnosticSummaryRow[];
}

export interface SemanticTypeScriptDiagnosticRelatedInformationRow {
  readonly category: TypeSystemDiagnosticCategory;
  readonly code: number;
  readonly message: string;
  readonly typescriptSource: string | null;
  readonly source: SemanticSourceReference | null;
}

export interface SemanticTypeScriptDiagnosticRow {
  readonly projectKey: string;
  readonly phase: TypeSystemDiagnosticPhase;
  readonly category: TypeSystemDiagnosticCategory;
  readonly code: number;
  readonly diagnosticKind: string;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly message: string;
  readonly typescriptSource: string | null;
  readonly source: SemanticSourceReference | null;
  readonly relatedInformation: readonly SemanticTypeScriptDiagnosticRelatedInformationRow[];
}

export interface SemanticTypeScriptDiagnosticsResult {
  readonly displayText: string;
  readonly rows: readonly SemanticTypeScriptDiagnosticRow[];
}

export interface SemanticTypeScriptDiagnosticSummaryRow {
  readonly phase: TypeSystemDiagnosticPhase;
  readonly category: TypeSystemDiagnosticCategory;
  readonly code: number;
  readonly diagnosticKind: string;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly typescriptSource: string | null;
  readonly count: number;
  readonly sourceFileCount: number;
  readonly sampleMessage: string;
  readonly sampleSources: readonly SemanticSourceReference[];
}

export interface SemanticTypeScriptDiagnosticSummaryResult {
  readonly totalDiagnosticRows: number;
  readonly displayText: string;
  readonly rows: readonly SemanticTypeScriptDiagnosticSummaryRow[];
}

export type SemanticStateStoreOptionsOrHandlerKind =
  | 'absent'
  | 'options-object'
  | 'action-handler'
  | 'ambiguous';

export interface SemanticStateStoreRow {
  readonly projectKey: string;
  readonly name: string | null;
  readonly isDefault: boolean;
  readonly initialStateKind: ConfigurationOptionValueKind | `${ConfigurationOptionValueKind}` | null;
  readonly optionsOrHandlerKind: SemanticStateStoreOptionsOrHandlerKind;
  readonly actionHandlerCount: number;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly nameSourceAddressHandle: AddressHandle | null;
    readonly initialStateSourceAddressHandle: AddressHandle | null;
    readonly optionsOrHandlerSourceAddressHandle: AddressHandle | null;
    readonly actionHandlerSourceAddressHandles: readonly AddressHandle[];
  };
}

export interface SemanticStateStoresResult {
  readonly rows: readonly SemanticStateStoreRow[];
}

export interface SemanticStateIssueRow {
  readonly projectKey: string;
  readonly phase: StateIssuePhase | `${StateIssuePhase}`;
  readonly issueKind: StateIssueKind | `${StateIssueKind}`;
  readonly diagnosticAuthority: 'framework-runtime-behavior';
  readonly frameworkErrorCode: null;
  readonly frameworkRawErrorAuthority: string | null;
  readonly severity: StateIssueSeverity;
  readonly message: string;
  readonly storeName: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticStateIssuesResult {
  readonly rows: readonly SemanticStateIssueRow[];
}

export interface SemanticI18nTranslationKeyRow {
  readonly projectKey: string;
  readonly key: string;
  readonly locale: string | null;
  readonly namespace: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticI18nTranslationKeysResult {
  readonly rows: readonly SemanticI18nTranslationKeyRow[];
}

export type SemanticI18nTranslationBindingKeyExpressionKind =
  | 'static'
  | 'binding-expression'
  | 'missing-expression'
  | 'none';

export type SemanticI18nTranslationTargetKind =
  | 'attribute-or-property'
  | 'text-content'
  | 'html-content'
  | 'prepend-content'
  | 'append-content';

export interface SemanticI18nTranslationBindingTargetRow {
  readonly key: string;
  readonly attributes: readonly string[];
  readonly targetProperties: readonly string[];
  readonly targetKinds: readonly SemanticI18nTranslationTargetKind[];
}

export interface SemanticI18nTranslationBindingRow {
  readonly projectKey: string;
  readonly definitionName: string;
  readonly bindingCount: number;
  readonly keyBindingCount: number;
  readonly parameterBindingCount: number;
  readonly targetProperty: string;
  readonly targetProperties: readonly string[];
  readonly targetKinds: readonly SemanticI18nTranslationTargetKind[];
  readonly targetElementTagName: string | null;
  readonly keyExpressionKind: SemanticI18nTranslationBindingKeyExpressionKind;
  readonly staticKeyExpression: string | null;
  readonly staticKey: string | null;
  readonly staticKeys: readonly string[];
  readonly staticTargets: readonly SemanticI18nTranslationBindingTargetRow[];
  readonly hasParameterBinding: boolean;
  /** Distinct connectable source expression names read by `t-params.bind` parameter bindings. */
  readonly parameterSourceNames: readonly string[];
  /** Distinct root scope names for `t-params.bind` parameter binding source expressions. */
  readonly parameterSourceRootNames: readonly string[];
  /** Distinct member names reached by `t-params.bind` parameter binding source expressions. */
  readonly parameterMemberNames: readonly string[];
  readonly issueCount: number;
  readonly frameworkErrorCodes: readonly string[];
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly bindingProductHandles: readonly ProductHandle[];
    readonly firstBindingProductHandle: ProductHandle;
    readonly firstBindingIdentityHandle: IdentityHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticI18nTranslationBindingsResult {
  readonly rows: readonly SemanticI18nTranslationBindingRow[];
}

export interface SemanticValidationIssueRow {
  readonly projectKey: string;
  readonly phase: ValidationIssuePhase | `${ValidationIssuePhase}`;
  readonly issueKind: ValidationIssueKind | `${ValidationIssueKind}`;
  readonly diagnosticAuthority: 'framework-runtime-behavior';
  readonly frameworkErrorCode: string;
  readonly severity: ValidationIssueSeverity;
  readonly message: string;
  readonly localName: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticValidationIssuesResult {
  readonly rows: readonly SemanticValidationIssueRow[];
}

export interface SemanticFetchClientIssueRow {
  readonly projectKey: string;
  readonly phase: FetchClientIssuePhase | `${FetchClientIssuePhase}`;
  readonly issueKind: FetchClientIssueKind | `${FetchClientIssueKind}`;
  readonly diagnosticAuthority: 'framework-runtime-behavior';
  readonly frameworkErrorCode: string;
  readonly severity: FetchClientIssueSeverity;
  readonly message: string;
  readonly localName: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticFetchClientIssuesResult {
  readonly rows: readonly SemanticFetchClientIssueRow[];
}

export interface SemanticDialogIssueRow {
  readonly projectKey: string;
  readonly phase: DialogIssuePhase | `${DialogIssuePhase}`;
  readonly issueKind: DialogIssueKind | `${DialogIssueKind}`;
  readonly diagnosticAuthority: 'framework-runtime-behavior';
  readonly frameworkErrorCode: string;
  readonly severity: DialogIssueSeverity;
  readonly message: string;
  readonly localName: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticDialogIssuesResult {
  readonly rows: readonly SemanticDialogIssueRow[];
}

export interface SemanticRouteConfigComponentRow {
  readonly componentKind: RouteableComponentKind | `${RouteableComponentKind}`;
  readonly name: string | null;
  readonly resolved: boolean;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle | null;
    readonly identityHandle: IdentityHandle | null;
    readonly resolvedProductHandle: ProductHandle | null;
    readonly resolvedIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRouterOptionsRow {
  readonly projectKey: string;
  readonly basePath: string | null;
  readonly useUrlFragmentHash: boolean | null;
  readonly useHref: boolean | null;
  readonly historyStrategy: string | null;
  readonly useNavigationModel: boolean | null;
  readonly activeClass: string | null;
  readonly restorePreviousRouteTreeOnError: boolean | null;
  readonly treatQueryAsParameters: boolean | null;
  readonly useEagerLoading: boolean | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRouterOptionsResult {
  readonly rows: readonly SemanticRouterOptionsRow[];
}

export interface SemanticRouteConfigRow {
  readonly projectKey: string;
  readonly routeKind: RouteConfigKind | `${RouteConfigKind}`;
  readonly originKind: RouteConfigOriginKind | `${RouteConfigOriginKind}`;
  readonly valueKind: RouteConfigValueKind | `${RouteConfigValueKind}`;
  readonly id: string | null;
  readonly paths: readonly string[];
  readonly title: string | null;
  readonly component: SemanticRouteConfigComponentRow | null;
  readonly redirectTo: string | null;
  readonly caseSensitive: boolean | null;
  readonly transitionPlan: string | null;
  readonly viewport: string | null;
  readonly hasData: boolean | null;
  readonly childRouteCount: number;
  readonly fallback: SemanticRouteConfigComponentRow | null;
  readonly nav: boolean | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRouteConfigsResult {
  readonly rows: readonly SemanticRouteConfigRow[];
}

export interface SemanticRouteContextRow {
  readonly projectKey: string;
  readonly label: string | null;
  readonly parentLabel: string | null;
  readonly rootLabel: string | null;
  readonly routeConfigContext: {
    readonly label: string | null;
    readonly source: SemanticSourceReference | null;
  };
  readonly hasContainer: boolean;
  readonly hasViewportAgent: boolean;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly parentIdentityHandle: IdentityHandle | null;
    readonly rootIdentityHandle: IdentityHandle | null;
    readonly routeConfigContextProductHandle: ProductHandle | null;
    readonly routeConfigContextIdentityHandle: IdentityHandle | null;
    readonly containerProductHandle: ProductHandle | null;
    readonly containerIdentityHandle: IdentityHandle | null;
    readonly viewportAgentProductHandle: ProductHandle | null;
    readonly viewportAgentIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRouteContextsResult {
  readonly rows: readonly SemanticRouteContextRow[];
}

export interface SemanticRouteContextParameterReadRow {
  readonly projectKey: string;
  readonly componentClassName: string | null;
  readonly routeConfigCount: number;
  readonly routeConfigIds: readonly string[];
  readonly routeConfigPaths: readonly string[];
  readonly mergeStrategy: string;
  readonly includeQueryParams: boolean | null;
  readonly declaredParameterNames: readonly string[];
  readonly declaredOptionalParameterNames: readonly string[];
  readonly declaredOpenKeySpace: boolean;
  readonly routePathParameterNames: readonly string[];
  readonly missingRoutePathParameterNames: readonly string[];
  readonly declaredNonPathParameterNames: readonly string[];
  readonly alignment: string;
  readonly component: SemanticRouteConfigComponentRow | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly componentProductHandle: ProductHandle | null;
    readonly componentIdentityHandle: IdentityHandle | null;
    readonly componentResolvedProductHandle: ProductHandle | null;
    readonly componentResolvedIdentityHandle: IdentityHandle | null;
    readonly routeConfigProductHandles: readonly ProductHandle[];
    readonly routeConfigIdentityHandles: readonly IdentityHandle[];
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRouteContextParameterReadsResult {
  readonly rows: readonly SemanticRouteContextParameterReadRow[];
}

export interface SemanticRouterViewportRow {
  readonly projectKey: string;
  readonly name: string;
  readonly routeContext: {
    readonly label: string | null;
    readonly source: SemanticSourceReference | null;
  } | null;
  readonly usedBy: readonly string[];
  readonly defaultComponent: string | null;
  readonly fallback: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly routeContextProductHandle: ProductHandle | null;
    readonly routeContextIdentityHandle: IdentityHandle | null;
    readonly controllerProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRouterViewportsResult {
  readonly rows: readonly SemanticRouterViewportRow[];
}

export interface SemanticViewportAgentRow {
  readonly projectKey: string;
  readonly viewport: {
    readonly name: string | null;
    readonly source: SemanticSourceReference | null;
  };
  readonly routeContext: {
    readonly label: string | null;
    readonly source: SemanticSourceReference | null;
  } | null;
  readonly hasHostController: boolean;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly viewportProductHandle: ProductHandle | null;
    readonly viewportIdentityHandle: IdentityHandle | null;
    readonly routeContextProductHandle: ProductHandle | null;
    readonly routeContextIdentityHandle: IdentityHandle | null;
    readonly hostControllerProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticViewportAgentsResult {
  readonly rows: readonly SemanticViewportAgentRow[];
}

export interface SemanticComponentAgentRow {
  readonly projectKey: string;
  readonly routeContext: {
    readonly label: string | null;
    readonly source: SemanticSourceReference | null;
  };
  readonly routeNode: SemanticRouterProductReferenceRow;
  readonly viewportAgent: SemanticRouterProductReferenceRow | null;
  readonly hasController: boolean;
  readonly component: SemanticRouteConfigComponentRow | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly routeContextProductHandle: ProductHandle | null;
    readonly routeContextIdentityHandle: IdentityHandle | null;
    readonly routeNodeProductHandle: ProductHandle | null;
    readonly routeNodeIdentityHandle: IdentityHandle | null;
    readonly viewportAgentProductHandle: ProductHandle | null;
    readonly viewportAgentIdentityHandle: IdentityHandle | null;
    readonly controllerProductHandle: ProductHandle | null;
    readonly componentProductHandle: ProductHandle | null;
    readonly componentIdentityHandle: IdentityHandle | null;
    readonly componentResolvedProductHandle: ProductHandle | null;
    readonly componentResolvedIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticComponentAgentsResult {
  readonly rows: readonly SemanticComponentAgentRow[];
}

export interface SemanticRouterProductReferenceRow {
  readonly routerKind: RouterModelKind | `${RouterModelKind}`;
  readonly label: string | null;
  readonly source: SemanticSourceReference | null;
}

export interface SemanticRouteRecognizerReferenceRow {
  readonly recognizerKind: RouteRecognizerModelKind | `${RouteRecognizerModelKind}`;
  readonly label: string | null;
  readonly source: SemanticSourceReference | null;
}

export interface SemanticRouteConfigReferenceRow {
  readonly routeKind: RouteConfigKind | `${RouteConfigKind}`;
  readonly label: string | null;
  readonly source: SemanticSourceReference | null;
}

export interface SemanticTypedNavigationInstructionRow {
  readonly projectKey: string;
  readonly instructionKind: NavigationInstructionKind | `${NavigationInstructionKind}`;
  readonly value: string | null;
  readonly component: SemanticRouterProductReferenceRow | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly componentProductHandle: ProductHandle | null;
    readonly componentIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTypedNavigationInstructionsResult {
  readonly rows: readonly SemanticTypedNavigationInstructionRow[];
}

export interface SemanticViewportInstructionComponentRow extends SemanticRouterProductReferenceRow {
  readonly instructionKind: NavigationInstructionKind | `${NavigationInstructionKind}` | null;
  readonly value: string | null;
}

export interface SemanticViewportInstructionRow {
  readonly projectKey: string;
  readonly component: SemanticViewportInstructionComponentRow | null;
  readonly viewport: string | null;
  readonly childCount: number;
  readonly hasParameters: boolean;
  readonly parameterCount: number;
  readonly open: number;
  readonly close: number;
  readonly recognizedRoute: SemanticRouteRecognizerReferenceRow | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly componentProductHandle: ProductHandle | null;
    readonly componentIdentityHandle: IdentityHandle | null;
    readonly parametersProductHandle: ProductHandle | null;
    readonly recognizedRouteProductHandle: ProductHandle | null;
    readonly recognizedRouteIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticViewportInstructionsResult {
  readonly rows: readonly SemanticViewportInstructionRow[];
}

export interface SemanticViewportInstructionTreeRow {
  readonly projectKey: string;
  readonly routeContext: {
    readonly label: string | null;
    readonly source: SemanticSourceReference | null;
  } | null;
  readonly instructionCount: number;
  readonly hasOptions: boolean;
  readonly isAbsolute: boolean;
  readonly queryParamCount: number;
  readonly queryParamNames: readonly string[];
  readonly queryParamPairs: readonly string[];
  readonly queryParams: readonly SemanticRouteQueryParameterValueRow[];
  readonly fragment: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly routeContextProductHandle: ProductHandle | null;
    readonly routeContextIdentityHandle: IdentityHandle | null;
    readonly instructionProductHandles: readonly ProductHandle[];
    readonly instructionIdentityHandles: readonly IdentityHandle[];
    readonly optionsProductHandle: ProductHandle | null;
    readonly optionsIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticViewportInstructionTreesResult {
  readonly rows: readonly SemanticViewportInstructionTreeRow[];
}

export interface SemanticRouteTreeRow {
  readonly projectKey: string;
  readonly rootNodeLabel: string | null;
  readonly instructionTree: SemanticRouterProductReferenceRow | null;
  readonly hasOptions: boolean;
  readonly nodeCount: number;
  readonly queryParamCount: number;
  readonly queryParamNames: readonly string[];
  readonly queryParamPairs: readonly string[];
  readonly queryParams: readonly SemanticRouteQueryParameterValueRow[];
  readonly fragment: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly rootNodeProductHandle: ProductHandle | null;
    readonly rootNodeIdentityHandle: IdentityHandle | null;
    readonly instructionTreeProductHandle: ProductHandle | null;
    readonly instructionTreeIdentityHandle: IdentityHandle | null;
    readonly optionsProductHandle: ProductHandle | null;
    readonly optionsIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRouteTreesResult {
  readonly rows: readonly SemanticRouteTreeRow[];
}

export interface SemanticRouteNodeRow {
  readonly projectKey: string;
  readonly path: string;
  readonly finalPath: string;
  readonly childCount: number;
  readonly instruction: SemanticRouterProductReferenceRow | null;
  readonly originalInstruction: SemanticRouterProductReferenceRow | null;
  readonly recognizedRoute: SemanticRouteRecognizerReferenceRow | null;
  readonly parameterCount: number;
  readonly parameterValueNames: readonly string[];
  readonly fulfilledParameterNames: readonly string[];
  readonly parameterValuePairs: readonly string[];
  readonly parameterValues: readonly SemanticRouteParameterValueRow[];
  readonly childFirstParameterNames: readonly string[];
  readonly childFirstParameterValuePairs: readonly string[];
  readonly parentFirstParameterNames: readonly string[];
  readonly parentFirstParameterValuePairs: readonly string[];
  readonly appendParameterValuePairs: readonly string[];
  readonly appendParameterValues: readonly SemanticRouteParameterAppendValueRow[];
  readonly byRouteParameterValuePairs: readonly string[];
  readonly byRouteParameterValues: readonly SemanticRouteParameterByRouteValueRow[];
  readonly queryParamCount: number;
  readonly queryParamNames: readonly string[];
  readonly queryParamPairs: readonly string[];
  readonly queryParams: readonly SemanticRouteQueryParameterValueRow[];
  readonly childFirstParameterAndQueryNames: readonly string[];
  readonly childFirstParameterAndQueryValuePairs: readonly string[];
  readonly childFirstParameterAndQueryValues: readonly SemanticRouteParameterAggregateValueRow[];
  readonly parentFirstParameterAndQueryNames: readonly string[];
  readonly parentFirstParameterAndQueryValuePairs: readonly string[];
  readonly parentFirstParameterAndQueryValues: readonly SemanticRouteParameterAggregateValueRow[];
  readonly appendParameterAndQueryValuePairs: readonly string[];
  readonly appendParameterAndQueryValues: readonly SemanticRouteParameterAppendValueRow[];
  readonly byRouteParameterAndQueryValuePairs: readonly string[];
  readonly byRouteParameterAndQueryValues: readonly SemanticRouteParameterByRouteValueRow[];
  readonly fragment: string | null;
  readonly hasData: boolean | null;
  readonly viewport: string | null;
  readonly residueInstructionCount: number;
  readonly routeContext: {
    readonly label: string | null;
    readonly source: SemanticSourceReference | null;
  };
  readonly routeConfig: {
    readonly routeKind: RouteConfigKind | `${RouteConfigKind}`;
    readonly id: string | null;
    readonly source: SemanticSourceReference | null;
  } | null;
  readonly parentLabel: string | null;
  readonly componentName: string | null;
  readonly title: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly routeContextProductHandle: ProductHandle | null;
    readonly routeContextIdentityHandle: IdentityHandle | null;
    readonly routeConfigProductHandle: ProductHandle | null;
    readonly routeConfigIdentityHandle: IdentityHandle | null;
    readonly parentProductHandle: ProductHandle | null;
    readonly parentIdentityHandle: IdentityHandle | null;
    readonly instructionProductHandle: ProductHandle | null;
    readonly instructionIdentityHandle: IdentityHandle | null;
    readonly originalInstructionProductHandle: ProductHandle | null;
    readonly originalInstructionIdentityHandle: IdentityHandle | null;
    readonly recognizedRouteProductHandle: ProductHandle | null;
    readonly recognizedRouteIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRouteNodesResult {
  readonly rows: readonly SemanticRouteNodeRow[];
}

export interface SemanticRoutePatternSegmentRow {
  readonly segmentKind: RouteRecognizerSegmentKind | `${RouteRecognizerSegmentKind}`;
  readonly raw: string;
  readonly value: string | null;
  readonly name: string | null;
  readonly optional: boolean | null;
  readonly pattern: string | null;
  readonly caseSensitive: boolean | null;
}

export interface SemanticRoutePatternParameterRow {
  readonly name: string;
  readonly isOptional: boolean;
  readonly isStar: boolean;
  readonly pattern: string | null;
}

export interface SemanticRoutePatternRow {
  readonly projectKey: string;
  readonly parentPath: string | null;
  readonly path: string;
  readonly recognizerPath: string;
  readonly caseSensitive: boolean;
  readonly segmentCount: number;
  readonly parameterCount: number;
  readonly parameterNames: readonly string[];
  readonly requiredParameterNames: readonly string[];
  readonly optionalParameterNames: readonly string[];
  readonly starParameterNames: readonly string[];
  readonly segments: readonly SemanticRoutePatternSegmentRow[];
  readonly parameters: readonly SemanticRoutePatternParameterRow[];
  readonly routeConfig: {
    readonly routeKind: RouteConfigKind | `${RouteConfigKind}`;
    readonly id: string | null;
    readonly source: SemanticSourceReference | null;
  };
  readonly routeConfigContext: {
    readonly label: string | null;
    readonly source: SemanticSourceReference | null;
  };
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly routeConfigContextProductHandle: ProductHandle | null;
    readonly routeConfigContextIdentityHandle: IdentityHandle | null;
    readonly recognizerProductHandle: ProductHandle | null;
    readonly recognizerIdentityHandle: IdentityHandle | null;
    readonly routeConfigProductHandle: ProductHandle | null;
    readonly routeConfigIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRoutePatternsResult {
  readonly rows: readonly SemanticRoutePatternRow[];
}

export interface SemanticRouteEndpointRow {
  readonly projectKey: string;
  readonly path: string;
  readonly isResidual: boolean;
  readonly parameterCount: number;
  readonly parameterNames: readonly string[];
  readonly requiredParameterNames: readonly string[];
  readonly optionalParameterNames: readonly string[];
  readonly starParameterNames: readonly string[];
  readonly parameters: readonly SemanticRoutePatternParameterRow[];
  readonly configurableRoute: {
    readonly path: string;
    readonly source: SemanticSourceReference | null;
  };
  readonly routeConfigContext: {
    readonly label: string | null;
    readonly source: SemanticSourceReference | null;
  };
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly configurableRouteProductHandle: ProductHandle | null;
    readonly configurableRouteIdentityHandle: IdentityHandle | null;
    readonly routeConfigContextProductHandle: ProductHandle | null;
    readonly routeConfigContextIdentityHandle: IdentityHandle | null;
    readonly recognizerProductHandle: ProductHandle | null;
    readonly recognizerIdentityHandle: IdentityHandle | null;
    readonly primaryEndpointProductHandle: ProductHandle | null;
    readonly primaryEndpointIdentityHandle: IdentityHandle | null;
    readonly residualEndpointProductHandle: ProductHandle | null;
    readonly residualEndpointIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRouteEndpointsResult {
  readonly rows: readonly SemanticRouteEndpointRow[];
}

export interface SemanticRouteRecognizerStateRow {
  readonly projectKey: string;
  readonly stateKind: RouteRecognizerStateKind | `${RouteRecognizerStateKind}`;
  readonly value: string;
  readonly length: number;
  readonly segmentName: string | null;
  readonly hasPattern: boolean;
  readonly isSeparator: boolean;
  readonly isDynamic: boolean;
  readonly isOptional: boolean;
  readonly isConstrained: boolean;
  readonly previousLabel: string | null;
  readonly nextCount: number;
  readonly endpoint: {
    readonly path: string;
    readonly isResidual: boolean;
    readonly source: SemanticSourceReference | null;
  } | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly previousStateProductHandle: ProductHandle | null;
    readonly previousStateIdentityHandle: IdentityHandle | null;
    readonly nextStateProductHandles: readonly ProductHandle[];
    readonly nextStateIdentityHandles: readonly IdentityHandle[];
    readonly endpointProductHandle: ProductHandle | null;
    readonly endpointIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRouteRecognizerStatesResult {
  readonly rows: readonly SemanticRouteRecognizerStateRow[];
}

export interface SemanticRouteRecognizerIssueRow {
  readonly projectKey: string;
  readonly issueKind: RouteRecognizerIssueKind | `${RouteRecognizerIssueKind}`;
  readonly diagnosticAuthority: 'framework-runtime-behavior';
  readonly frameworkErrorCode: null;
  readonly frameworkRawErrorAuthority: string | null;
  readonly message: string;
  readonly path: string | null;
  readonly recognizer: SemanticRouteRecognizerReferenceRow;
  readonly existingEndpoint: SemanticRouteRecognizerReferenceRow | null;
  readonly conflictingEndpoint: SemanticRouteRecognizerReferenceRow | null;
  readonly state: SemanticRouteRecognizerReferenceRow | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly recognizerProductHandle: ProductHandle | null;
    readonly recognizerIdentityHandle: IdentityHandle | null;
    readonly existingEndpointProductHandle: ProductHandle | null;
    readonly existingEndpointIdentityHandle: IdentityHandle | null;
    readonly conflictingEndpointProductHandle: ProductHandle | null;
    readonly conflictingEndpointIdentityHandle: IdentityHandle | null;
    readonly stateProductHandle: ProductHandle | null;
    readonly stateIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRouteRecognizerIssuesResult {
  readonly rows: readonly SemanticRouteRecognizerIssueRow[];
}

export interface SemanticRouterIssueRow {
  readonly projectKey: string;
  readonly phase: RouterIssuePhase | `${RouterIssuePhase}`;
  readonly issueKind: RouterIssueKind | `${RouterIssueKind}`;
  readonly diagnosticAuthority: 'framework-error-code' | 'semantic-runtime-product';
  readonly frameworkErrorCode: string | null;
  readonly severity: RouterIssueSeverity;
  readonly message: string;
  readonly property: string | null;
  readonly expected: string | null;
  readonly actual: string | null;
  readonly component: string | null;
  readonly path: string | null;
  readonly redirectTo: string | null;
  readonly unexpectedExpressionKind: string | null;
  readonly routeConfig: SemanticRouteConfigReferenceRow | null;
  readonly recognizedRoute: SemanticRouteRecognizerReferenceRow | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly routeConfigProductHandle: ProductHandle | null;
    readonly routeConfigIdentityHandle: IdentityHandle | null;
    readonly recognizedRouteProductHandle: ProductHandle | null;
    readonly recognizedRouteIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRouterIssuesResult {
  readonly rows: readonly SemanticRouterIssueRow[];
}

export interface SemanticRecognizedRouteRow {
  readonly projectKey: string;
  readonly path: string;
  readonly residue: string | null;
  readonly hasResidue: boolean;
  readonly parameterCount: number;
  readonly parameterNames: readonly string[];
  readonly requiredParameterNames: readonly string[];
  readonly optionalParameterNames: readonly string[];
  readonly starParameterNames: readonly string[];
  readonly parameterValueNames: readonly string[];
  readonly fulfilledParameterNames: readonly string[];
  readonly parameterValuePairs: readonly string[];
  readonly parameterValues: readonly SemanticRouteParameterValueRow[];
  readonly redirectDepth: number;
  readonly redirectSourceRouteConfig: SemanticRouteConfigReferenceRow | null;
  readonly recognizer: SemanticRouteRecognizerReferenceRow;
  readonly viewportInstruction: SemanticRouterProductReferenceRow;
  readonly viewportInstructionTree: SemanticRouterProductReferenceRow;
  readonly routeContext: {
    readonly label: string | null;
    readonly source: SemanticSourceReference | null;
  } | null;
  readonly endpoint: {
    readonly path: string | null;
    readonly isResidual: boolean | null;
    readonly source: SemanticSourceReference | null;
  };
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly recognizerProductHandle: ProductHandle | null;
    readonly recognizerIdentityHandle: IdentityHandle | null;
    readonly viewportInstructionProductHandle: ProductHandle | null;
    readonly viewportInstructionIdentityHandle: IdentityHandle | null;
    readonly viewportInstructionTreeProductHandle: ProductHandle | null;
    readonly viewportInstructionTreeIdentityHandle: IdentityHandle | null;
    readonly routeContextProductHandle: ProductHandle | null;
    readonly routeContextIdentityHandle: IdentityHandle | null;
    readonly endpointProductHandle: ProductHandle | null;
    readonly endpointIdentityHandle: IdentityHandle | null;
    readonly redirectSourceRouteConfigProductHandle: ProductHandle | null;
    readonly redirectSourceRouteConfigIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRouteQueryParameterValueRow {
  readonly name: string;
  readonly value: string;
}

export type SemanticRouteParameterAggregateValueSourceKind =
  | 'path'
  | 'query';

export interface SemanticRouteParameterAggregateValueRow {
  readonly name: string;
  readonly value: string | null;
  readonly values: readonly string[];
  readonly isMultiValue: boolean;
  readonly sourceKind: SemanticRouteParameterAggregateValueSourceKind;
}

export interface SemanticRouteParameterAppendValueRow {
  readonly name: string;
  readonly valueDisplays: readonly string[];
  readonly values: readonly SemanticRouteParameterAggregateValueRow[];
}

export interface SemanticRouteParameterByRouteValueRow {
  readonly name: string;
  readonly routeValues: readonly SemanticRouteParameterRouteValueRow[];
}

export interface SemanticRouteParameterRouteValueRow {
  readonly routeId: string;
  readonly routeContextLabel: string | null;
  readonly value: SemanticRouteParameterAggregateValueRow;
}

export interface SemanticRouteParameterValueRow {
  readonly name: string;
  readonly value: string | null;
  readonly isFulfilled: boolean;
  readonly isResidue: boolean;
}

export interface SemanticRecognizedRoutesResult {
  readonly rows: readonly SemanticRecognizedRouteRow[];
}

export interface SemanticResourceVisibilityRow {
  readonly compilerWorld: string;
  readonly resourceKind: ResourceDefinitionKind;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly visibilityKind: TemplateResourceVisibilityKind;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly compilerWorldProductHandle: ProductHandle;
    readonly resourceProductHandle: ProductHandle | null;
    readonly definitionProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticResourceVisibilityResult {
  readonly rows: readonly SemanticResourceVisibilityRow[];
}

export interface SemanticTemplateCompilationRow {
  readonly compilationLane: 'app-runtime' | 'authoring';
  readonly analysisDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`;
  readonly definitionName: string;
  readonly compilerWorld: string;
  readonly templateSourceKind: string;
  readonly htmlNodes: number;
  readonly htmlAttributes: number;
  readonly recoveries: number;
  readonly attributeSyntaxes: number;
  readonly classifications: number;
  readonly valueSites: number;
  readonly expressionParses: number;
  readonly bindingCommandLowerings: number;
  readonly instructions: number;
  readonly renderTargets: number;
  readonly runtimeControllers: number;
  readonly runtimeChildContainers: number;
  readonly runtimeChildContextResolverSlots: number;
  readonly runtimeBindings: number;
  readonly runtimeTargetOperations: number;
  readonly runtimeRendererTargetOperations: number;
  readonly runtimeBindingTargetAccesses: number;
  readonly runtimeBindingTargetOperations: number;
  readonly runtimeBindingSourceOperations: number;
  readonly runtimeBindingValueChannels: number;
  readonly runtimeBindingDataFlows: number;
  readonly runtimeBindingObservedDependencies: number;
  readonly bindingScopes: number;
  readonly openSeams: number;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly definitionProductHandle: ProductHandle | null;
    readonly compilerWorldProductHandle: ProductHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTemplateCompilationResult {
  readonly rows: readonly SemanticTemplateCompilationRow[];
}

export interface SemanticTemplateCompletionCandidateRow {
  readonly candidateKind: TemplateCompletionCandidateKind | `${TemplateCompletionCandidateKind}`;
  readonly name: string;
  readonly sourceKind: TemplateCompletionCandidateSourceKind | `${TemplateCompletionCandidateSourceKind}`;
  readonly summary: string | null;
  readonly typeDisplay: string | null;
  readonly handles?: {
    readonly productHandle: ProductHandle | null;
    readonly identityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTemplateCompletionFrontierRow {
  readonly frontierKind: ExpressionFrontierKind | `${ExpressionFrontierKind}` | null;
  readonly expectedContinuationClasses: readonly (ExpressionExpectedContinuationClass | `${ExpressionExpectedContinuationClass}`)[];
}

export interface SemanticTemplateCompletionResult {
  readonly displayText: string;
  readonly siteKind: TemplateCompletionSiteKind | `${TemplateCompletionSiteKind}`;
  readonly candidates: readonly SemanticTemplateCompletionCandidateRow[];
  readonly expressionFrontier: SemanticTemplateCompletionFrontierRow | null;
  readonly missingInputs: readonly string[];
  readonly template: {
    readonly compilationLane: SemanticTemplateCompilationRow['compilationLane'] | null;
    readonly source: SemanticSourceReference | null;
  };
}

export interface SemanticTemplateCursorHtmlRow {
  readonly nodeKind: string | null;
  readonly tagName: string | null;
  readonly attributeName: string | null;
  readonly attributeValue: string | null;
  readonly source: SemanticSourceReference | null;
  readonly attributeSource: SemanticSourceReference | null;
  readonly handles?: {
    readonly nodeProductHandle: ProductHandle | null;
    readonly attributeProductHandle: ProductHandle | null;
    readonly nodeSourceAddressHandle: AddressHandle | null;
    readonly attributeSourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTemplateCursorValueSiteRow {
  readonly siteKind: TemplateValueSiteKind | `${TemplateValueSiteKind}`;
  readonly rawValue: string;
  readonly entryFamily: string | null;
  readonly bindingCommandName: string | null;
  readonly bindableName: string | null;
  readonly bindableAttribute: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle | null;
    readonly identityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTemplateCursorDefinitionRow {
  readonly resourceKind: ResourceDefinitionKind | `${ResourceDefinitionKind}`;
  readonly name: string | null;
  readonly targetName: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly definitionProductHandle: ProductHandle | null;
    readonly identityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTemplateCursorBindableRow {
  readonly name: string;
  readonly attribute: string;
  readonly mode: BindableBindingMode | `${BindableBindingMode}`;
  readonly ownerDefinitionProductHandle: ProductHandle | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly ownerDefinitionProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTemplateCursorMemberRow {
  readonly name: string;
  readonly memberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}`;
  readonly typeDisplay: string | null;
  readonly isOptional: boolean;
  readonly isReadonly: boolean;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly declarationIdentityHandle: IdentityHandle | null;
    readonly ownerTypeIdentityHandle: IdentityHandle | null;
    readonly reachableIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export type SemanticTemplateCursorDiagnosticSeverity =
  | 'information'
  | 'warning'
  | 'error';

export type SemanticTemplateCursorDiagnosticKind =
  | 'weak-expression-member-owner'
  | 'missing-expression-member'
  | 'expression-runtime-evaluation-error'
  | 'expression-parse-error'
  | 'template-compiler-error'
  | 'runtime-controller-framework-error'
  | 'runtime-renderer-framework-error'
  | 'runtime-binding-framework-error'
  | 'runtime-binding-behavior-framework-error'
  | 'runtime-value-converter-framework-error'
  | 'runtime-binding-scope-framework-error'
  | 'router-framework-error'
  | 'binding-target-access-framework-error'
  | 'binding-source-assignment-strictness'
  | 'binding-source-assignment-runtime-noop';

export type SemanticTemplateCursorDiagnosticAuthority =
  | 'semantic-authoring-policy'
  | 'framework-runtime-behavior'
  | 'framework-error-code';

export type SemanticTemplateCursorSuggestionKind =
  | 'use-callable-expression'
  | 'register-resource'
  | 'register-di-service'
  | 'remove-duplicate-binding-behavior'
  | 'guard-nullish-expression'
  | 'avoid-observed-increment'
  | 'resolve-runtime-boundary'
  | 'use-repeatable-source'
  | 'use-safe-destructuring-source'
  | 'fix-expression-syntax'
  | 'fix-template-syntax'
  | 'fix-router-instruction'
  | 'declare-explicit-member'
  | 'declare-assignable-member'
  | 'declare-scope-slot-type'
  | 'replace-any-owner'
  | 'align-assignment-type'
  | 'make-source-writable'
  | 'use-assignable-expression'
  | 'configure-node-observer'
  | 'inspect-owner-type';

export type SemanticTemplateCursorSuggestionActionKind =
  | 'register-resource'
  | 'register-service'
  | 'declare-runtime-boundary'
  | 'declare-member'
  | 'declare-scope-slot'
  | 'replace-owner-type'
  | 'change-member-type'
  | 'change-member-mutability'
  | 'configure-observer'
  | 'rewrite-expression'
  | 'rewrite-template-syntax'
  | 'inspect-owner-type';

export type SemanticTemplateCursorSuggestionValueTypeSource =
  | 'selected-member'
  | 'binding-target'
  | 'assignment-target';

export type SemanticTemplateCursorSuggestionActionTargetKind =
  | 'resource'
  | 'service'
  | 'runtime-boundary'
  | 'observer-config'
  | 'owner-type'
  | 'scope-slot'
  | 'expression'
  | 'template-syntax';

export interface SemanticTemplateCursorSuggestionActionTargetRow {
  readonly targetKind: SemanticTemplateCursorSuggestionActionTargetKind;
  readonly source: SemanticSourceReference | null;
  readonly memberName: string | null;
  readonly typeDisplay: string | null;
}

export interface SemanticTemplateCursorSuggestionRow {
  readonly suggestionKind: SemanticTemplateCursorSuggestionKind;
  readonly actionKind: SemanticTemplateCursorSuggestionActionKind;
  readonly actionTarget: SemanticTemplateCursorSuggestionActionTargetRow | null;
  readonly summary: string;
  readonly targetMemberName: string | null;
  readonly ownerTypeDisplay: string | null;
  readonly valueTypeDisplay: string | null;
  readonly valueTypeSource: SemanticTemplateCursorSuggestionValueTypeSource | null;
}

export interface SemanticTemplateCursorDiagnosticRow {
  readonly diagnosticKind: SemanticTemplateCursorDiagnosticKind;
  readonly diagnosticAuthority: SemanticTemplateCursorDiagnosticAuthority;
  readonly frameworkErrorCode: string | null;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly summary: string;
  readonly missingInput: string | null;
  readonly missingInputs: readonly string[];
  readonly source: SemanticSourceReference | null;
  readonly selectedMemberName: string | null;
  readonly ownerTypeDisplay: string | null;
  readonly ownerTypeShapeKind: string | null;
  readonly ownerTypeOrigin: string | null;
  readonly suggestion: SemanticTemplateCursorSuggestionRow | null;
}

export interface SemanticTemplateDiagnosticRow extends SemanticTemplateCursorDiagnosticRow {
  readonly siteKind: TemplateCompletionSiteKind | `${TemplateCompletionSiteKind}`;
  readonly valueSiteKind: TemplateValueSiteKind | `${TemplateValueSiteKind}` | null;
  readonly template: {
    readonly compilationLane: SemanticTemplateCompilationRow['compilationLane'] | null;
    readonly source: SemanticSourceReference | null;
  };
}

export interface SemanticTemplateDiagnosticsResult {
  readonly displayText: string;
  readonly rows: readonly SemanticTemplateDiagnosticRow[];
}

export interface SemanticTemplateCursorInfoResult {
  readonly displayText: string;
  readonly siteKind: TemplateCompletionSiteKind | `${TemplateCompletionSiteKind}`;
  readonly expressionFrontier: SemanticTemplateCompletionFrontierRow | null;
  readonly missingInputs: readonly string[];
  readonly template: {
    readonly compilationLane: SemanticTemplateCompilationRow['compilationLane'] | null;
    readonly source: SemanticSourceReference | null;
  };
  readonly html: SemanticTemplateCursorHtmlRow;
  readonly valueSite: SemanticTemplateCursorValueSiteRow | null;
  readonly selectedDefinition: SemanticTemplateCursorDefinitionRow | null;
  readonly selectedBindable: SemanticTemplateCursorBindableRow | null;
  readonly selectedMemberName: string | null;
  readonly selectedMember: SemanticTemplateCursorMemberRow | null;
  readonly memberOwnerType: {
    readonly display: string | null;
    readonly shapeKind: string | null;
    readonly origin: string | null;
    /** Source site that caused the owner type projection, usually the template expression locus. */
    readonly source: SemanticSourceReference | null;
    /** Best TypeScript declaration source for the projected owner type, when checker declarations can name one. */
    readonly declarationSource: SemanticSourceReference | null;
    readonly handles?: {
      readonly productHandle: ProductHandle | null;
      readonly identityHandle: IdentityHandle | null;
      readonly sourceAddressHandle: AddressHandle | null;
      readonly declarationSourceAddressHandle: AddressHandle | null;
    };
  } | null;
  readonly diagnostics: readonly SemanticTemplateCursorDiagnosticRow[];
}

export type SemanticRuntimeControllerHydrationHandoffKind =
  | 'compiled-template'
  | 'instruction-sequence'
  | 'synthetic-view'
  | 'none';

export type SemanticRuntimeControllerChildViewRenderingState =
  | 'none'
  | 'handoff-only'
  | 'expanded-aggregate'
  | 'recursive-boundary';

export type SemanticRuntimeTemplateControllerLinkKind =
  | 'else-to-if'
  | 'promise-branch-to-promise'
  | 'switch-case-to-switch';

export interface SemanticRuntimeControllerLifecycleStepRow {
  readonly order: number;
  readonly count: number;
  readonly stage: RuntimeControllerLifecycleStage | `${RuntimeControllerLifecycleStage}`;
  readonly stepKind: RuntimeControllerLifecycleStepKind | `${RuntimeControllerLifecycleStepKind}`;
  readonly summary: string;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly relatedProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRuntimeControllerRow {
  readonly renderingDefinitionName: string;
  readonly controllerName: string | null;
  readonly controllerPhase: ControllerPhase | `${ControllerPhase}`;
  readonly creationKind: RuntimeControllerCreationKind | `${RuntimeControllerCreationKind}`;
  readonly controllerReadiness: RuntimeControllerReadinessKind | `${RuntimeControllerReadinessKind}`;
  readonly definitionKind: ResourceDefinitionKind | `${ResourceDefinitionKind}` | null;
  readonly definitionName: string | null;
  readonly definitionClassName: string | null;
  readonly instructionKind: TemplateInstructionKind | `${TemplateInstructionKind}` | null;
  readonly parentControllerName: string | null;
  readonly childControllers: number;
  readonly runtimeBindings: number;
  readonly runtimeWatchers: number;
  readonly hasScope: boolean;
  readonly hasViewFactory: boolean;
  readonly viewFactoryDefinitionName: string | null;
  readonly viewFactoryDefinitionClassName: string | null;
  readonly templateControllerLinkKind: SemanticRuntimeTemplateControllerLinkKind | null;
  readonly linkedTemplateControllerName: string | null;
  readonly templateControllerFlowKind: BuiltInTemplateControllerFlowKind | `${BuiltInTemplateControllerFlowKind}` | null;
  readonly childViewCardinality: BuiltInTemplateControllerChildViewCardinality | `${BuiltInTemplateControllerChildViewCardinality}` | null;
  readonly childViewRenderingState: SemanticRuntimeControllerChildViewRenderingState;
  readonly hydrationHandoffKind: SemanticRuntimeControllerHydrationHandoffKind;
  readonly compiledTemplateDefinitionName: string | null;
  readonly lifecycleSteps: readonly SemanticRuntimeControllerLifecycleStepRow[];
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly controllerProductHandle: ProductHandle;
    readonly controllerIdentityHandle: IdentityHandle;
    readonly parentControllerProductHandle: ProductHandle | null;
    readonly definitionProductHandle: ProductHandle | null;
    readonly instructionProductHandle: ProductHandle | null;
    readonly instructionIdentityHandle: IdentityHandle | null;
    readonly bindingScopeProductHandle: ProductHandle | null;
    readonly compiledTemplateProductHandle: ProductHandle | null;
    readonly compiledTemplateClaimHandle: ClaimHandle | null;
    readonly viewFactoryProductHandle: ProductHandle | null;
    readonly viewFactoryClaimHandle: ClaimHandle | null;
    readonly viewFactoryDefinitionProductHandle: ProductHandle | null;
    readonly viewFactoryDefinitionClaimHandle: ClaimHandle | null;
    readonly linkedTemplateControllerProductHandle: ProductHandle | null;
    readonly templateControllerLinkClaimHandle: ClaimHandle | null;
    readonly instructionSequenceProductHandle: ProductHandle | null;
    readonly instructionSequenceClaimHandle: ClaimHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRuntimeControllerResult {
  readonly rows: readonly SemanticRuntimeControllerRow[];
}

export interface SemanticRuntimeWatcherRow {
  readonly renderingDefinitionName: string;
  readonly controllerName: string | null;
  readonly definitionName: string | null;
  readonly definitionClassName: string | null;
  readonly watcherKind: RuntimeWatcherKind | `${RuntimeWatcherKind}`;
  readonly dependencyEvaluationKind: RuntimeWatcherDependencyEvaluationKind | `${RuntimeWatcherDependencyEvaluationKind}`;
  readonly watchIndex: number;
  readonly expressionKind: WatchExpressionKind | `${WatchExpressionKind}`;
  readonly expressionPropertyKeyKind: WatchPropertyKeyKind | `${WatchPropertyKeyKind}` | null;
  readonly expressionPropertyKey: string | null;
  readonly callbackKind: WatchCallbackKind | `${WatchCallbackKind}`;
  readonly callbackMethodNameKind: WatchPropertyKeyKind | `${WatchPropertyKeyKind}` | null;
  readonly callbackMethodName: string | null;
  readonly flush: WatchFlushMode | `${WatchFlushMode}`;
  readonly observedDependencies: number;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly watcherProductHandle: ProductHandle;
    readonly watcherIdentityHandle: IdentityHandle;
    readonly controllerProductHandle: ProductHandle;
    readonly controllerIdentityHandle: IdentityHandle;
    readonly definitionProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRuntimeWatcherResult {
  readonly rows: readonly SemanticRuntimeWatcherRow[];
}

export interface SemanticRuntimeWatcherObservedDependencyRow {
  readonly renderingDefinitionName: string;
  readonly controllerName: string | null;
  readonly definitionName: string | null;
  readonly definitionClassName: string | null;
  readonly watcherKind: RuntimeWatcherKind | `${RuntimeWatcherKind}`;
  readonly watchIndex: number;
  readonly dependencyKind: RuntimeObservedDependencyKind | `${RuntimeObservedDependencyKind}`;
  readonly expressionKind: string;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  readonly memberName: string | null;
  readonly keyExpression: string | null;
  readonly methodName: string | null;
  readonly observedMemberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null;
  readonly observedMemberSource: SemanticSourceReference | null;
  readonly spanStart: number | null;
  readonly spanEnd: number | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly watcherProductHandle: ProductHandle | null;
    readonly observedDependencyProductHandle: ProductHandle;
    readonly observedDependencyIdentityHandle: IdentityHandle;
    readonly observedMemberSourceAddressHandle: AddressHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRuntimeWatcherObservedDependencyResult {
  readonly rows: readonly SemanticRuntimeWatcherObservedDependencyRow[];
}

export interface SemanticRuntimeCompositionRow {
  readonly renderingDefinitionName: string;
  /**
   * Whether this row came from analyzing a resource's own template, or from a recursive rendering pass where a parent
   * controller supplied child bindable values.
   */
  readonly renderingContextKind: SemanticRuntimeCompositionRenderingContextKind;
  readonly hostControllerName: string | null;
  readonly parentControllerName: string | null;
  /** Effective au-compose scope behavior when static/defaulted; null means dynamic or unresolved. */
  readonly scopeBehavior: 'auto' | 'scoped' | null;
  /** Effective au-compose flush mode when static/defaulted; null means dynamic or unresolved. */
  readonly flushMode: 'sync' | 'async' | null;
  /** Effective au-compose host tag for non-custom-element composition when static. */
  readonly tag: string | null;
  readonly hasTemplateInput: boolean;
  readonly hasComponentInput: boolean;
  readonly staticComponentName: string | null;
  readonly templateInputFulfillmentKind: CompositionInputFulfillmentKind | `${CompositionInputFulfillmentKind}`;
  readonly componentInputFulfillmentKind: CompositionInputFulfillmentKind | `${CompositionInputFulfillmentKind}`;
  readonly modelInputFulfillmentKind: CompositionInputFulfillmentKind | `${CompositionInputFulfillmentKind}`;
  readonly hasTemplateBinding: boolean;
  readonly hasCompositionBinding: boolean;
  readonly hasComposingBinding: boolean;
  readonly componentResolutionKind: CompositionComponentResolutionKind | `${CompositionComponentResolutionKind}`;
  readonly modelResolutionKind: CompositionModelResolutionKind | `${CompositionModelResolutionKind}`;
  readonly resolvedComponentCount: number;
  readonly resolvedComponentNames: readonly string[];
  readonly resolvedComponentClassNames: readonly string[];
  readonly compiledTemplateCount: number;
  /** Project-level resource analysis coverage for resolved candidate component templates; this is not composed-child hydration. */
  readonly candidateResourceAnalysisState: SemanticRuntimeCompositionCandidateAnalysisState;
  readonly candidateResourceAnalysisCount: number;
  readonly candidateResourceAnalyzedComponentNames: readonly string[];
  readonly candidateResourceControllerCount: number;
  readonly candidateResourceControllerCreationKinds: readonly (RuntimeControllerCreationKind | `${RuntimeControllerCreationKind}`)[];
  /** Aggregate runtime controllers materialized for closed AuCompose custom-element branches. */
  readonly composedChildControllerCount: number;
  readonly composedChildControllerNames: readonly string[];
  readonly composedChildControllerCreationKinds: readonly (RuntimeControllerCreationKind | `${RuntimeControllerCreationKind}`)[];
  /** Activation handoffs for resolved custom-element candidates and object-view-model branches. */
  readonly activationHandoffs: readonly SemanticRuntimeCompositionActivationHandoffRow[];
  readonly activationHandoffKinds: readonly (CompositionActivationModelHandoffKind | `${CompositionActivationModelHandoffKind}`)[];
  readonly activationParameterTypes: readonly string[];
  readonly modelAssignableToActivationParameterCount: number;
  readonly modelUnassignableToActivationParameterCount: number;
  readonly activationOpenReasonCount: number;
  readonly openReason: string | null;
  readonly reasonKinds: readonly OpenSeamReasonKind[];
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly compositionControllerProductHandle: ProductHandle;
    readonly compositionContextProductHandle: ProductHandle;
    readonly hostControllerProductHandle: ProductHandle;
    readonly parentControllerProductHandle: ProductHandle | null;
    readonly instructionProductHandle: ProductHandle | null;
    readonly templateBindingProductHandle: ProductHandle | null;
    readonly componentBindingProductHandle: ProductHandle | null;
    readonly modelBindingProductHandle: ProductHandle | null;
    readonly scopeBehaviorBindingProductHandle: ProductHandle | null;
    readonly tagBindingProductHandle: ProductHandle | null;
    readonly flushModeBindingProductHandle: ProductHandle | null;
    readonly composingBindingProductHandle: ProductHandle | null;
    readonly compositionBindingProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export type SemanticRuntimeCompositionRenderingContextKind =
  | 'definition-resource'
  | 'recursive-resource-instance';

export type SemanticRuntimeCompositionCandidateAnalysisState =
  | 'none'
  | 'partial'
  | 'complete';

export interface SemanticRuntimeCompositionActivationHandoffRow {
  readonly componentName: string;
  readonly componentClassName: string | null;
  readonly methodKind: CompositionActivateMethodKind | `${CompositionActivateMethodKind}`;
  readonly handoffKind: CompositionActivationModelHandoffKind | `${CompositionActivationModelHandoffKind}`;
  readonly activationParameterType: string | null;
  readonly modelType: string | null;
  readonly modelAssignableToParameter: boolean | null;
  readonly openReason: string | null;
  readonly handles?: {
    readonly componentDefinitionProductHandle: ProductHandle | null;
    readonly activationParameterTypeProductHandle: ProductHandle | null;
    readonly modelTypeProductHandle: ProductHandle | null;
  };
}

export interface SemanticRuntimeCompositionResult {
  readonly rows: readonly SemanticRuntimeCompositionRow[];
}

export interface SemanticBindingTargetAccessRow {
  readonly definitionName: string;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
  readonly lookup: RuntimeBindingTargetAccessLookup | `${RuntimeBindingTargetAccessLookup}`;
  readonly targetKind: RuntimeBindingTargetKind | `${RuntimeBindingTargetKind}`;
  readonly targetProperty: string;
  readonly strategy: RuntimeBindingTargetAccessStrategy | `${RuntimeBindingTargetAccessStrategy}`;
  readonly eventNames: readonly string[];
  readonly targetType: string | null;
  readonly targetTypeSource: RuntimeBindingTargetTypeSource | `${RuntimeBindingTargetTypeSource}` | null;
  readonly propertyType: string | null;
  readonly propertyExists: boolean | null;
  readonly isWritable: boolean | null;
  readonly isObservable: boolean;
  readonly authority: RuntimeBindingTargetAccessAuthority | `${RuntimeBindingTargetAccessAuthority}`;
  readonly openReason: string | null;
  readonly frameworkErrorCode: string | null;
  readonly diagnosticReason: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly bindingProductHandle: ProductHandle | null;
    readonly targetAccessProductHandle: ProductHandle;
    readonly targetTypeProductHandle: ProductHandle | null;
    readonly propertyTypeProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticBindingTargetAccessResult {
  readonly rows: readonly SemanticBindingTargetAccessRow[];
}

export interface SemanticTargetOperationRow {
  readonly definitionName: string;
  readonly ownerKind: RuntimeTargetOperationOwnerKind | `${RuntimeTargetOperationOwnerKind}`;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}` | null;
  readonly rendererKind: RuntimeRendererKind | `${RuntimeRendererKind}` | null;
  readonly targetKind: RuntimeBindingTargetKind | `${RuntimeBindingTargetKind}`;
  readonly targetAttribute: string;
  readonly targetProperty: string;
  readonly staticValue: string | null;
  readonly operationKind: RuntimeBindingTargetOperationKind | `${RuntimeBindingTargetOperationKind}`;
  readonly affectedNames: readonly string[];
  readonly authority: RuntimeBindingTargetOperationAuthority | `${RuntimeBindingTargetOperationAuthority}`;
  readonly openReason: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly bindingProductHandle: ProductHandle | null;
    readonly rendererProductHandle: ProductHandle | null;
    readonly instructionProductHandle: ProductHandle | null;
    readonly targetOperationProductHandle: ProductHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export type SemanticBindingTargetOperationRow = SemanticTargetOperationRow;

export interface SemanticTargetOperationResult {
  readonly rows: readonly SemanticTargetOperationRow[];
}

export type SemanticBindingTargetOperationResult = SemanticTargetOperationResult;

export interface SemanticBindingSourceOperationRow {
  readonly definitionName: string;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
  readonly targetKind: RuntimeBindingTargetKind | `${RuntimeBindingTargetKind}`;
  readonly targetName: string;
  readonly targetType: string | null;
  readonly operationKind: RuntimeBindingSourceOperationKind | `${RuntimeBindingSourceOperationKind}`;
  readonly authority: RuntimeBindingSourceOperationAuthority | `${RuntimeBindingSourceOperationAuthority}`;
  readonly openReason: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly bindingProductHandle: ProductHandle | null;
    readonly instructionProductHandle: ProductHandle | null;
    readonly sourceOperationProductHandle: ProductHandle;
    readonly targetTypeProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticBindingSourceOperationResult {
  readonly rows: readonly SemanticBindingSourceOperationRow[];
}

export interface SemanticBindingBehaviorApplicationRow {
  readonly definitionName: string;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
  readonly behaviorName: string;
  readonly phase: RuntimeBindingBehaviorApplicationPhase | `${RuntimeBindingBehaviorApplicationPhase}`;
  readonly argumentCount: number;
  readonly staticArgumentValues: readonly string[];
  readonly targetKind: RuntimeBindingTargetKind | `${RuntimeBindingTargetKind}` | null;
  readonly targetProperty: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly bindingProductHandle: ProductHandle | null;
    readonly bindingBehaviorApplicationProductHandle: ProductHandle;
    readonly targetAccessProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticBindingBehaviorApplicationResult {
  readonly rows: readonly SemanticBindingBehaviorApplicationRow[];
}

export interface SemanticBindingValueChannelRow {
  readonly definitionName: string;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
  readonly targetKind: RuntimeBindingTargetKind | `${RuntimeBindingTargetKind}` | null;
  readonly targetProperty: string | null;
  readonly targetOperationKind: RuntimeBindingTargetOperationKind | `${RuntimeBindingTargetOperationKind}` | null;
  readonly sourceOperationKind: RuntimeBindingSourceOperationKind | `${RuntimeBindingSourceOperationKind}` | null;
  readonly channelKind: RuntimeBindingValueChannelKind | `${RuntimeBindingValueChannelKind}`;
  readonly authority: RuntimeBindingValueChannelAuthority | `${RuntimeBindingValueChannelAuthority}`;
  readonly rawTargetPropertyType: string | null;
  readonly runtimeValueType: string | null;
  readonly valueDomain: readonly string[];
  readonly primitiveValueDomain: readonly RuntimeBindingPrimitiveValue[];
  readonly primitiveValueDomainKinds: readonly (RuntimeBindingPrimitiveValueKind | `${RuntimeBindingPrimitiveValueKind}`)[];
  readonly primitiveValueDomainDisplays: readonly string[];
  readonly isCollection: boolean | null;
  readonly usesCustomMatcher: boolean;
  readonly observerCouplings: readonly (RuntimeBindingValueChannelCouplingKind | `${RuntimeBindingValueChannelCouplingKind}`)[];
  readonly openReason: string | null;
  readonly openReasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly bindingProductHandle: ProductHandle | null;
    readonly valueChannelProductHandle: ProductHandle;
    readonly targetAccessProductHandle: ProductHandle | null;
    readonly targetOperationProductHandle: ProductHandle | null;
    readonly sourceOperationProductHandle: ProductHandle | null;
    readonly rawTargetPropertyTypeProductHandle: ProductHandle | null;
    readonly runtimeValueTypeProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticBindingValueChannelResult {
  readonly rows: readonly SemanticBindingValueChannelRow[];
}

export interface SemanticBindingValueChannelSummaryRow {
  readonly channelKind: RuntimeBindingValueChannelKind | `${RuntimeBindingValueChannelKind}`;
  readonly targetKind: RuntimeBindingTargetKind | `${RuntimeBindingTargetKind}` | null;
  readonly targetProperty: string | null;
  readonly count: number;
  readonly bindingKinds: readonly (RuntimeBindingKind | `${RuntimeBindingKind}`)[];
  readonly authorities: readonly (RuntimeBindingValueChannelAuthority | `${RuntimeBindingValueChannelAuthority}`)[];
  readonly observerCouplings: readonly (RuntimeBindingValueChannelCouplingKind | `${RuntimeBindingValueChannelCouplingKind}`)[];
  readonly runtimeValueTypes: readonly string[];
  readonly runtimeValueTypeCount: number;
  readonly primitiveValueDomainKinds: readonly (RuntimeBindingPrimitiveValueKind | `${RuntimeBindingPrimitiveValueKind}`)[];
  readonly definitionNames: readonly string[];
  readonly definitionCount: number;
  readonly collectionCount: number;
  readonly customMatcherCount: number;
  readonly openCount: number;
  readonly openReasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
}

export interface SemanticBindingValueChannelCouplingSummaryRow {
  readonly observerCoupling: RuntimeBindingValueChannelCouplingKind | `${RuntimeBindingValueChannelCouplingKind}`;
  readonly count: number;
  readonly channelKinds: readonly (RuntimeBindingValueChannelKind | `${RuntimeBindingValueChannelKind}`)[];
  readonly targetProperties: readonly (string | null)[];
  readonly targetPropertyCount: number;
  readonly definitionNames: readonly string[];
  readonly definitionCount: number;
}

export interface SemanticBindingValueChannelSummaryResult {
  readonly displayText: string;
  readonly totalRows: number;
  readonly summaryRows: number;
  readonly observerCouplingRows: number;
  readonly channelsWithoutObserverCouplings: number;
  readonly rows: readonly SemanticBindingValueChannelSummaryRow[];
  readonly observerCouplings: readonly SemanticBindingValueChannelCouplingSummaryRow[];
}

export interface SemanticBindingDataFlowRow {
  readonly definitionName: string;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
  readonly direction: RuntimeBindingDataFlowDirection | `${RuntimeBindingDataFlowDirection}`;
  readonly strictBinding: boolean | null;
  readonly expressionParseState: TemplateExpressionParseState | `${TemplateExpressionParseState}` | null;
  readonly expressionParseResultKind: ExpressionParseResultKind | `${ExpressionParseResultKind}` | null;
  readonly valueSiteKind: TemplateValueSiteKind | `${TemplateValueSiteKind}` | null;
  readonly sourceKind: RuntimeBindingDataFlowSourceKind | `${RuntimeBindingDataFlowSourceKind}`;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  readonly sourceType: string | null;
  readonly sourceTypeOpenReason: string | null;
  readonly sourceTypeOpenKind: CheckerExpressionTypeOpenKind | `${CheckerExpressionTypeOpenKind}` | null;
  readonly sourceAssignmentTargetType: string | null;
  readonly sourceAssignmentTargetSource: SemanticSourceReference | null;
  readonly targetKind: RuntimeBindingTargetKind | `${RuntimeBindingTargetKind}` | null;
  readonly targetProperty: string | null;
  readonly targetOperationKind: RuntimeBindingTargetOperationKind | `${RuntimeBindingTargetOperationKind}` | null;
  readonly sourceOperationKind: RuntimeBindingSourceOperationKind | `${RuntimeBindingSourceOperationKind}` | null;
  readonly targetPropertyType: string | null;
  readonly targetValueType: string | null;
  readonly valueChannelKind: RuntimeBindingValueChannelKind | `${RuntimeBindingValueChannelKind}` | null;
  readonly sourceWritable: boolean | null;
  readonly sourceAssignmentKind: RuntimeBindingDataFlowSourceAssignmentKind | `${RuntimeBindingDataFlowSourceAssignmentKind}` | null;
  readonly sourceAssignmentReason: string | null;
  readonly sourceAssignmentReasonKinds: readonly (RuntimeBindingDataFlowSourceAssignmentReasonKind | `${RuntimeBindingDataFlowSourceAssignmentReasonKind}`)[];
  readonly sourceToTargetAssignable: boolean | null;
  readonly targetToSourceAssignable: boolean | null;
  readonly sourceToTargetTypeMismatchKinds: readonly (RuntimeBindingDataFlowTypeMismatchKind | `${RuntimeBindingDataFlowTypeMismatchKind}`)[];
  readonly targetToSourceTypeMismatchKinds: readonly (RuntimeBindingDataFlowTypeMismatchKind | `${RuntimeBindingDataFlowTypeMismatchKind}`)[];
  readonly frameworkErrorCode: string | null;
  readonly openReason: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly bindingProductHandle: ProductHandle | null;
    readonly dataFlowProductHandle: ProductHandle;
    readonly targetAccessProductHandle: ProductHandle | null;
    readonly targetOperationProductHandle: ProductHandle | null;
    readonly sourceOperationProductHandle: ProductHandle | null;
    readonly valueChannelProductHandle: ProductHandle | null;
    readonly expressionProductHandle: ProductHandle | null;
    readonly bindingScopeProductHandle: ProductHandle | null;
    readonly sourceTypeProductHandle: ProductHandle | null;
    readonly sourceAssignmentTargetTypeProductHandle: ProductHandle | null;
    readonly sourceAssignmentTargetSourceAddressHandle: AddressHandle | null;
    readonly targetPropertyTypeProductHandle: ProductHandle | null;
    readonly targetValueTypeProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticBindingDataFlowResult {
  readonly rows: readonly SemanticBindingDataFlowRow[];
}

export interface SemanticNullableBooleanCountRow {
  readonly yes: number;
  readonly no: number;
  readonly unknown: number;
}

export interface SemanticBindingDataFlowSummaryRow {
  readonly direction: RuntimeBindingDataFlowDirection | `${RuntimeBindingDataFlowDirection}`;
  readonly targetKind: RuntimeBindingTargetKind | `${RuntimeBindingTargetKind}` | null;
  readonly targetProperty: string | null;
  readonly valueChannelKind: RuntimeBindingValueChannelKind | `${RuntimeBindingValueChannelKind}` | null;
  readonly sourceKind: RuntimeBindingDataFlowSourceKind | `${RuntimeBindingDataFlowSourceKind}`;
  readonly count: number;
  readonly bindingKinds: readonly (RuntimeBindingKind | `${RuntimeBindingKind}`)[];
  readonly valueSiteKinds: readonly (TemplateValueSiteKind | `${TemplateValueSiteKind}`)[];
  readonly sourceRootNames: readonly string[];
  readonly sourceRootNameCount: number;
  readonly sampleSourceNames: readonly string[];
  readonly sourceNameCount: number;
  readonly sourceTypes: readonly string[];
  readonly sourceTypeCount: number;
  readonly sourceTypeOpenKinds: readonly (CheckerExpressionTypeOpenKind | `${CheckerExpressionTypeOpenKind}`)[];
  readonly sourceTypeOpenCount: number;
  readonly targetValueTypes: readonly string[];
  readonly targetValueTypeCount: number;
  readonly sourceWritable: SemanticNullableBooleanCountRow;
  readonly sourceToTargetAssignable: SemanticNullableBooleanCountRow;
  readonly targetToSourceAssignable: SemanticNullableBooleanCountRow;
  readonly sourceAssignmentKinds: readonly (RuntimeBindingDataFlowSourceAssignmentKind | `${RuntimeBindingDataFlowSourceAssignmentKind}`)[];
  readonly sourceAssignmentReasonKinds: readonly (RuntimeBindingDataFlowSourceAssignmentReasonKind | `${RuntimeBindingDataFlowSourceAssignmentReasonKind}`)[];
  readonly sourceToTargetTypeMismatchKinds: readonly (RuntimeBindingDataFlowTypeMismatchKind | `${RuntimeBindingDataFlowTypeMismatchKind}`)[];
  readonly targetToSourceTypeMismatchKinds: readonly (RuntimeBindingDataFlowTypeMismatchKind | `${RuntimeBindingDataFlowTypeMismatchKind}`)[];
  readonly frameworkErrorCodes: readonly string[];
  readonly openCount: number;
  readonly definitionNames: readonly string[];
  readonly definitionCount: number;
}

export type SemanticBindingDataFlowIssueKind =
  | 'source-type-unresolved'
  | 'source-nullish-to-required-target'
  | 'source-to-target-unassignable'
  | 'source-to-target-unknown'
  | 'target-empty-array-inferred'
  | 'target-nullish-to-required-source'
  | 'target-to-source-unassignable'
  | 'target-to-source-unknown'
  | 'source-not-writable'
  | 'source-writable-unknown'
  | 'framework-error'
  | 'open-data-flow';

export interface SemanticBindingDataFlowIssueSummaryRow {
  readonly issueKind: SemanticBindingDataFlowIssueKind;
  readonly count: number;
  readonly directions: readonly (RuntimeBindingDataFlowDirection | `${RuntimeBindingDataFlowDirection}`)[];
  readonly targetKinds: readonly (RuntimeBindingTargetKind | `${RuntimeBindingTargetKind}` | null)[];
  readonly targetProperties: readonly (string | null)[];
  readonly targetPropertyCount: number;
  readonly valueChannelKinds: readonly (RuntimeBindingValueChannelKind | `${RuntimeBindingValueChannelKind}` | null)[];
  readonly sourceKinds: readonly (RuntimeBindingDataFlowSourceKind | `${RuntimeBindingDataFlowSourceKind}`)[];
  readonly sourceRootNames: readonly string[];
  readonly sourceRootNameCount: number;
  readonly sampleSourceNames: readonly string[];
  readonly sourceNameCount: number;
  readonly sourceTypes: readonly string[];
  readonly sourceTypeCount: number;
  readonly sourceTypeOpenKinds: readonly (CheckerExpressionTypeOpenKind | `${CheckerExpressionTypeOpenKind}`)[];
  readonly sourceTypeOpenCount: number;
  readonly targetValueTypes: readonly string[];
  readonly targetValueTypeCount: number;
  readonly sourceToTargetTypeMismatchKinds: readonly (RuntimeBindingDataFlowTypeMismatchKind | `${RuntimeBindingDataFlowTypeMismatchKind}`)[];
  readonly targetToSourceTypeMismatchKinds: readonly (RuntimeBindingDataFlowTypeMismatchKind | `${RuntimeBindingDataFlowTypeMismatchKind}`)[];
  readonly frameworkErrorCodes: readonly string[];
  readonly definitionNames: readonly string[];
  readonly definitionCount: number;
}

export interface SemanticBindingDataFlowSummaryResult {
  readonly displayText: string;
  readonly totalRows: number;
  readonly summaryRows: number;
  readonly issueRows: readonly SemanticBindingDataFlowIssueSummaryRow[];
  readonly rows: readonly SemanticBindingDataFlowSummaryRow[];
}

export type SemanticObservedMemberSourceState =
  | 'source'
  | 'temporary-value'
  | 'runtime-scope-name'
  | 'scope-open'
  | 'open';

export interface SemanticBindingObservedDependencyRow {
  readonly definitionName: string;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
  readonly dependencyKind: RuntimeObservedDependencyKind | `${RuntimeObservedDependencyKind}`;
  readonly expressionKind: string;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  readonly memberName: string | null;
  readonly keyExpression: string | null;
  readonly methodName: string | null;
  readonly observedMemberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null;
  readonly observedMemberSource: SemanticSourceReference | null;
  readonly observedMemberSourceState: SemanticObservedMemberSourceState;
  readonly spanStart: number | null;
  readonly spanEnd: number | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly bindingProductHandle: ProductHandle | null;
    readonly dataFlowProductHandle: ProductHandle;
    readonly observedDependencyProductHandle: ProductHandle;
    readonly expressionProductHandle: ProductHandle | null;
    readonly bindingScopeProductHandle: ProductHandle | null;
    readonly observedMemberSourceAddressHandle: AddressHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticBindingObservedDependencyResult {
  readonly rows: readonly SemanticBindingObservedDependencyRow[];
}

export interface SemanticBindingObservedDependencySummaryRow {
  readonly dependencyKind: RuntimeObservedDependencyKind | `${RuntimeObservedDependencyKind}`;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
  readonly observedMemberSourceState: SemanticObservedMemberSourceState;
  readonly observedMemberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null;
  readonly sourceRootName: string | null;
  readonly count: number;
  readonly expressionKinds: readonly string[];
  readonly sourceRootNames: readonly string[];
  readonly sourceRootNameCount: number;
  readonly sampleSourceNames: readonly string[];
  readonly sourceNameCount: number;
  readonly memberNames: readonly string[];
  readonly memberNameCount: number;
  readonly methodNames: readonly string[];
  readonly methodNameCount: number;
  readonly keyExpressions: readonly string[];
  readonly keyExpressionCount: number;
  readonly definitionNames: readonly string[];
  readonly definitionCount: number;
  readonly sourceBackedCount: number;
}

export interface SemanticBindingObservedDependencyMemberSourceStateSummaryRow {
  readonly observedMemberSourceState: SemanticObservedMemberSourceState;
  readonly count: number;
  readonly dependencyKinds: readonly (RuntimeObservedDependencyKind | `${RuntimeObservedDependencyKind}`)[];
  readonly bindingKinds: readonly (RuntimeBindingKind | `${RuntimeBindingKind}`)[];
  readonly observedMemberKinds: readonly (CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null)[];
  readonly sourceRootNames: readonly string[];
  readonly sourceRootNameCount: number;
  readonly definitionNames: readonly string[];
  readonly definitionCount: number;
  readonly sourceBackedCount: number;
}

export interface SemanticBindingObservedDependencySummaryResult {
  readonly displayText: string;
  readonly totalRows: number;
  readonly summaryRows: number;
  readonly memberSourceStateRows: readonly SemanticBindingObservedDependencyMemberSourceStateSummaryRow[];
  readonly rows: readonly SemanticBindingObservedDependencySummaryRow[];
}
