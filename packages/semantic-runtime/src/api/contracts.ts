import type { SemanticSupportState } from '../support-state.js';
import type { BootProjectDiscoveryMode, BootProjectInput } from '../boot/frames.js';
import type { ProjectRootAdmissionOrigin } from '../boot/project-root-admission.js';
import type {
  AureliaProjectConfigurationVersion,
  SemanticExistingProjectConfigurationApplicationState,
  SemanticProjectConfigurationDiagnostic,
} from '../boot/project-configuration.js';
import type { ApplicationFileRole } from '../application/topology.js';
import type { SourceFileRole } from '../kernel/address.js';
import type { SemanticRuntimeProjectInputAuthority } from '../kernel/project-input.js';
import type {
  DiagnosticRepairAffordance,
  DiagnosticSuggestion,
  DiagnosticSuggestionActionKind,
  DiagnosticSuggestionActionTarget,
  DiagnosticSuggestionActionTargetKind,
  DiagnosticSuggestionKind,
  DiagnosticSuggestionValueTypeSource,
} from '../diagnostic-action/action.js';
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
import {
  InquiryAnswerCoverage,
  InquiryAnswerResult,
  InquiryAnswerSelection,
} from '../inquiry/answer.js';
import type {
  TemplateCompletionCandidateKind,
  TemplateCompletionCandidateSourceKind,
  TemplateCompletionDomainKind,
  TemplateCompletionScopeRole,
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
  InquiryContinuationEpochDependencyValue,
  InquiryContinuationCostValue,
  InquiryContinuationIntentValue,
  InquirySourceRequirementValue,
} from '../inquiry/continuation-intent.js';
import type {
  InquiryContinuationKindValue,
} from '../inquiry/answer.js';
import type {
  SemanticRuntimeMemoryDelta,
  SemanticRuntimeMemorySample,
} from '../telemetry/memory.js';
import type { SemanticRuntimeTelemetryOptions } from '../telemetry/options.js';
import type { CheckerExpressionTypeEvaluationCacheStats } from '../type-system/expression-type-evaluation.js';
import type { TypeSystemProjectAcquisitionKind } from '../type-system/project-computation.js';
import type { TypeSystemTypeScriptVersionRelation } from '../type-system/typescript-environment.js';
import type { ConfigurationOptionValueKind } from '../configuration/configuration-option.js';
import type { AppTaskSlot } from '../configuration/app-task.js';
import type {
  StateIssueKind,
  StateIssuePhase,
  StateIssueSeverity,
} from '../state/state-issue.js';
import type {
  StateGetterBindingStoreResolutionKind,
} from '../state/model.js';
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
  FrameworkCapabilityAdmissionState,
  FrameworkCapabilityAvailabilityState,
  FrameworkCapabilityDemandKind,
  FrameworkCapabilityDemandSiteKind,
  FrameworkCapabilityPackageEvidenceKind,
  FrameworkCapabilityPackageEvidenceScope,
} from '../framework/capability-demand.js';
import type {
  FrameworkRegistrationCapability,
} from '../registration/framework-registration-manifest.js';
import type {
  FrameworkRegistrationKind,
} from '../registration/registration-reference.js';
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
  StaticProjectEvaluationAcquisitionKind,
  StaticProjectEvaluationSourceOriginKind,
  StaticProjectEvaluationSourceFileStats,
} from '../evaluation/project-evaluation.js';
import type {
  EvaluationModuleSourceHostProfile,
} from '../evaluation/module-host.js';
import type {
  EvaluationPromiseSettlementKind,
  EvaluationValueKind,
} from '../evaluation/values.js';
import type {
  DiResolveActiveContainerExpectation,
  DiResolveEnclosingMemberKind,
  DiResolveExecutionContextKind,
} from '../di/resolve-call-recognition.js';
import type {
  AddressHandle,
  ClaimHandle,
  HotDetailHandle,
  IdentityHandle,
  OpenSeamHandle,
  ProductHandle,
} from '../kernel/handles.js';
import type {
  OpenSeam,
  OpenSeamBoundaryKind,
  OpenSeamReasonKind,
} from '../kernel/open-seam.js';
import type {
  SemanticProjectFindingEffectivePolicy,
  SemanticProjectFindingRuleId,
} from '../findings/analysis-limitation-policy.js';
import type {
  MaterializationRecord,
  MaterializedProduct,
} from '../kernel/materialization.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';
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
import type {
  AttributeClassificationKind,
  AttributeSyntaxKind,
} from '../template/attribute-syntax.js';
import type { HtmlNamespaceKind } from '../template/html-ir.js';
import type { BindingCommandLoweringState } from '../template/binding-command-execution.js';
import type {
  TemplateBindingMode,
  TemplateInstructionKind,
  TemplateListenerStrategy,
} from '../template/instruction-ir.js';
import type {
  RuntimeBindingDataFlowDirection,
  RuntimeBindingSourceEvaluationKind,
  RuntimeBindingDataFlowSourceAssignmentKind,
  RuntimeBindingDataFlowSourceAssignmentReasonKind,
  RuntimeBindingDataFlowSourceKind,
  RuntimeBindingDataFlowTypeMismatchKind,
  RuntimeBindingPrimitiveValueKind,
  RuntimeBindingPrimitiveValue,
  RuntimeBindingValueChannelAuthority,
  RuntimeBindingValueChannelCouplingKind,
  RuntimeBindingValueChannelKind,
  RuntimeBindingValueChannelTargetMutationKind,
} from '../observation/runtime-binding-observation.js';
import type {
  RuntimeObservedDependencyKind,
  RuntimeObservedMemberSourceRoute,
  RuntimeObservedMemberSourceState,
} from '../observation/runtime-observed-dependency.js';
import type {
  RuntimeOperationRealization,
  RuntimeOperationReachability,
} from '../runtime-expression/runtime-operation.js';
import type {
  RuntimeExpressionAccessCoverage,
  RuntimeExpressionAccessForm,
  RuntimeExpressionAccessOrigin,
  RuntimeExpressionAccessOwnerKind,
  RuntimeExpressionAccessPhase,
  RuntimeExpressionAccessRole,
  RuntimeExpressionAccessTargetResolution,
  RuntimeExpressionAccessTracking,
  RuntimeExpressionExecutionMaximum,
  RuntimeExpressionExecutionMinimum,
  RuntimeExpressionExecutionQualifierKind,
  RuntimeExpressionOperationKind,
} from '../runtime-expression/runtime-expression-access-use.js';
import type {
  ObservationIssueKind,
  ObservationIssuePhase,
  ObservationIssueRelatedSourceKind,
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
  RuntimeBindingTargetObserverCacheDisposition,
  RuntimeControllerObserverSetupOutcome,
  RuntimeBindingTargetKind,
  RuntimeBindingTargetTypeSource,
  RuntimeNodeObserverConfigFieldState,
  RuntimeNodeObserverKind,
  RuntimeBindingTargetOperationAuthority,
  RuntimeBindingTargetOperationKind,
  RuntimeTargetOperationOwnerKind,
} from '../template/runtime-binding.js';
import type {
  RuntimeBindingBehaviorApplicationPhase,
  RuntimeBindingBehaviorIssuePhase,
} from '../template/runtime-binding-behavior.js';
import type {
  RuntimeValueConverterApplicationPhase,
  RuntimeValueConverterIssuePhase,
} from '../template/runtime-value-converter.js';
import type { RuntimeValueConverterWritebackStageState } from '../type-system/value-converter-writeback.js';
import type {
  RuntimeExpressionResourceApplicationOrigin,
  RuntimeExpressionResourceLifecycleEffectKind,
  RuntimeExpressionResourceValueState,
} from '../template/runtime-expression-resource.js';
import type { RuntimeBindingIssuePhase } from '../template/runtime-binding-issue.js';
import type { RuntimeBindingScopeIssuePhase } from '../template/runtime-binding-scope-issue.js';
import type { RuntimeControllerIssuePhase } from '../template/runtime-controller-issue.js';
import type { RuntimeRendererIssuePhase } from '../template/runtime-renderer-issue.js';
import type {
  TemplateCompilerIssueKind,
  TemplateCompilerIssuePhase,
  TemplateCompilerIssueSeverity,
} from '../template/compiler-issue.js';
import type {
  CompiledNativeSlotNameKind,
  CompiledTemplateContextRole,
  CompiledTemplateState,
} from '../template/compiled-template.js';
import type {
  RuntimeControllerCreationKind,
  RuntimeControllerAssemblyStage,
  RuntimeControllerAssemblyStepKind,
  RuntimeControllerReadinessKind,
  RuntimeControllerObserverSetupState,
} from '../template/runtime-controller.js';
import type {
  RuntimeWatcherDependencyEvaluationKind,
  RuntimeWatcherKind,
} from '../template/runtime-watcher.js';
import type {
  CompositionActivateMethodKind,
  CompositionActivationModelHandoffKind,
  CompositionComponentCandidateCoverageKind,
  CompositionComponentResolutionKind,
  CompositionInputConsumptionKind,
  CompositionInputValueStateKind,
  CompositionModelResolutionKind,
  CompositionRenderingContextKind,
} from '../template/runtime-composition.js';
import type {
  RuntimeContentProjectionClosureKind,
  RuntimeContentProjectionSelectionKind,
} from '../template/runtime-content-projection.js';
import type { AuSlotsInfoSourceKind } from '../configuration/controller.js';
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
  CheckerTypeMemberVisibilityKind,
  CheckerTypeProjectionOrigin,
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
  RouterClosureKind,
  RouteConfigContributionEffectKind,
  RouteConfigExecutionKind,
  RouteConfigFieldStateKind,
  RouteConfigKind,
  RouteConfigOriginKind,
  RouteConfigStageKind,
  RouteConfigValueField,
  RouteConfigValueKind,
  RouteContextParameterReadOwnershipKind,
  RouteRecognizerIssueKind,
  RouteRecognizerModelKind,
  RouteRecognizerSegmentKind,
  RouteRecognizerStateKind,
  RouterIssueKind,
  RouterIssuePhase,
  RouterIssueSeverity,
  RouterModelKind,
  RouterNavigationTargetKind,
  RouterRealizationStageKind,
  ViewportAgentCandidateResolutionKind,
  ViewportFieldStateKind,
} from '../router/model.js';
import type {
  SemanticContinuationSourceFact,
  SemanticSourceReference,
} from './source-reference.js';
import type {
  SemanticRuntimeAppBuilderQueryKind,
  SemanticRuntimeAppBuilderQueryRequest,
} from './app-builder.js';
import type {
  AppBuilderControlId,
  AppBuilderControlSemanticValueKind,
  AppBuilderControlTransportKind,
} from '../app-builder/control-catalog.js';
import type {
  AppBuilderControlPatternId,
  AppBuilderControlRealizationPolicyId,
} from '../app-builder/ontology/control.js';
import type {
  AppBuilderControlUseActionChannelKind,
} from '../app-builder/ontology/control-use-inventory.js';

export const SEMANTIC_RUNTIME_API_VERSION = '0.2' as const;
export const SEMANTIC_RUNTIME_ANALYSIS_BASIS_SCHEMA_VERSION = 'semantic-analysis-basis/1' as const;

export const SEMANTIC_PROJECT_DISCOVERY_MODES = [
  'single-root',
  'project-markers',
] as const;

export {
  InquiryAnswerCoverage as SemanticRuntimeAnswerCoverage,
  InquiryAnswerResult as SemanticRuntimeAnswerResult,
  InquiryAnswerSelection as SemanticRuntimeAnswerSelection,
};

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
  SourceFiles = 'source-files',
  UnresolvedModules = 'unresolved-modules',
  OpenSeams = 'open-seams',
  OpenSeamSummary = 'open-seam-summary',
  OpenSeamSites = 'open-seam-sites',
  AnalysisLimitations = 'analysis-limitations',
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
  TemplateDocumentOwnership = 'template-document-ownership',
  StateStores = 'state-stores',
  StateGetterBindings = 'state-getter-bindings',
  StateIssues = 'state-issues',
  I18nTranslationKeys = 'i18n-translation-keys',
  I18nTranslationBindings = 'i18n-translation-bindings',
  ValidationIssues = 'validation-issues',
  FetchClientIssues = 'fetch-client-issues',
  DialogIssues = 'dialog-issues',
  FrameworkCapabilityDemands = 'framework-capability-demands',
  FrameworkCapabilityExplanation = 'framework-capability-explanation',
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
  ResourceInventory = 'resource-inventory',
  ResourceDefinitions = 'resource-definitions',
  ResourceIssues = 'resource-issues',
  ResourceVisibility = 'resource-visibility',
  TemplateResourceAvailability = 'template-resource-availability',
  ResourceAvailabilityExplanation = 'resource-availability-explanation',
  TemplateCompilations = 'template-compilations',
  AttributeInterpretationExplanation = 'attribute-interpretation-explanation',
  TemplateCompletions = 'template-completions',
  TemplateCursorInfo = 'template-cursor-info',
  TemplateReferences = 'template-references',
  TemplateRename = 'template-rename',
  TemplateRenameFromTypeScript = 'template-rename-from-typescript',
  TemplateCodeActions = 'template-code-actions',
  TemplateSemanticTokens = 'template-semantic-tokens',
  TemplateFoldingRanges = 'template-folding-ranges',
  TemplateInlayHints = 'template-inlay-hints',
  TemplateDiagnostics = 'template-diagnostics',
  RuntimeControllers = 'runtime-controllers',
  RuntimeWatchers = 'runtime-watchers',
  RuntimeWatcherObservedDependencies = 'runtime-watcher-observed-dependencies',
  RuntimeCompositions = 'runtime-compositions',
  TemplateContentProjections = 'template-content-projections',
  BindingTargetAccesses = 'binding-target-accesses',
  TargetOperations = 'target-operations',
  BindingTargetOperations = 'binding-target-operations',
  BindingSourceOperations = 'binding-source-operations',
  BindingBehaviorApplications = 'binding-behavior-applications',
  ValueConverterApplications = 'value-converter-applications',
  BindingValueChannels = 'binding-value-channels',
  BindingValueChannelSummary = 'binding-value-channel-summary',
  RuntimeExpressionAccessUses = 'runtime-expression-access-uses',
  BindingDataFlows = 'binding-data-flows',
  BindingUncertaintyExplanation = 'binding-uncertainty-explanation',
  BindingDataFlowSummary = 'binding-data-flow-summary',
  ControlUseInventory = 'control-use-inventory',
  BindingObservedDependencySummary = 'binding-observed-dependency-summary',
  BindingObservedDependencies = 'binding-observed-dependencies',
}

export const SEMANTIC_APP_QUERY_KINDS = [
  SemanticAppQueryKind.Summary,
  SemanticAppQueryKind.AppOverview,
  SemanticAppQueryKind.SourceFiles,
  SemanticAppQueryKind.UnresolvedModules,
  SemanticAppQueryKind.OpenSeams,
  SemanticAppQueryKind.OpenSeamSummary,
  SemanticAppQueryKind.OpenSeamSites,
  SemanticAppQueryKind.AnalysisLimitations,
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
  SemanticAppQueryKind.TemplateDocumentOwnership,
  SemanticAppQueryKind.StateStores,
  SemanticAppQueryKind.StateGetterBindings,
  SemanticAppQueryKind.StateIssues,
  SemanticAppQueryKind.I18nTranslationKeys,
  SemanticAppQueryKind.I18nTranslationBindings,
  SemanticAppQueryKind.ValidationIssues,
  SemanticAppQueryKind.FetchClientIssues,
  SemanticAppQueryKind.DialogIssues,
  SemanticAppQueryKind.FrameworkCapabilityDemands,
  SemanticAppQueryKind.FrameworkCapabilityExplanation,
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
  SemanticAppQueryKind.ResourceInventory,
  SemanticAppQueryKind.ResourceDefinitions,
  SemanticAppQueryKind.ResourceIssues,
  SemanticAppQueryKind.ResourceVisibility,
  SemanticAppQueryKind.TemplateResourceAvailability,
  SemanticAppQueryKind.ResourceAvailabilityExplanation,
  SemanticAppQueryKind.TemplateCompilations,
  SemanticAppQueryKind.AttributeInterpretationExplanation,
  SemanticAppQueryKind.TemplateCompletions,
  SemanticAppQueryKind.TemplateCursorInfo,
  SemanticAppQueryKind.TemplateReferences,
  SemanticAppQueryKind.TemplateRename,
  SemanticAppQueryKind.TemplateRenameFromTypeScript,
  SemanticAppQueryKind.TemplateCodeActions,
  SemanticAppQueryKind.TemplateSemanticTokens,
  SemanticAppQueryKind.TemplateFoldingRanges,
  SemanticAppQueryKind.TemplateInlayHints,
  SemanticAppQueryKind.TemplateDiagnostics,
  SemanticAppQueryKind.RuntimeControllers,
  SemanticAppQueryKind.RuntimeWatchers,
  SemanticAppQueryKind.RuntimeWatcherObservedDependencies,
  SemanticAppQueryKind.RuntimeCompositions,
  SemanticAppQueryKind.TemplateContentProjections,
  SemanticAppQueryKind.BindingTargetAccesses,
  SemanticAppQueryKind.TargetOperations,
  SemanticAppQueryKind.BindingTargetOperations,
  SemanticAppQueryKind.BindingSourceOperations,
  SemanticAppQueryKind.BindingBehaviorApplications,
  SemanticAppQueryKind.ValueConverterApplications,
  SemanticAppQueryKind.BindingValueChannels,
  SemanticAppQueryKind.BindingValueChannelSummary,
  SemanticAppQueryKind.RuntimeExpressionAccessUses,
  SemanticAppQueryKind.BindingDataFlows,
  SemanticAppQueryKind.BindingUncertaintyExplanation,
  SemanticAppQueryKind.BindingDataFlowSummary,
  SemanticAppQueryKind.ControlUseInventory,
  SemanticAppQueryKind.BindingObservedDependencySummary,
  SemanticAppQueryKind.BindingObservedDependencies,
] as const;

export const enum SemanticRuntimeDetail {
  /** Default API projection: readable rows with compact navigation labels. */
  Compact = 'compact',
  /** Include opaque handles and retain their owning app generation for exact in-process follow-up navigation. */
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
  readonly excludedSourceRoots?: BootProjectInput['excludedSourceRoots'];
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
  /**
   * Workspace-relative or absolute existing project roots known by the host.
   * When projects are omitted, semantic-runtime merges these roots into automatic discovery.
   */
  readonly projectRootHints?: readonly string[];
  /** Workspace-relative or absolute descendant roots excluded from authored project/source membership. */
  readonly excludedWorkspaceRoots?: readonly string[];
  /** Sole authority for captured project source/config generations. */
  readonly projectInputAuthority?: SemanticRuntimeProjectInputAuthority;
}

/** Exact host source whose boot-authored ownership should be projected without opening an app world. */
export interface SemanticAuthoredSourceOwnershipRequest {
  readonly sourceFilePath: string;
  /** Inquiry profile that owns this runtime-static answer claim. */
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
}

export interface SemanticAuthoredSourceOwner {
  readonly projectKey: string;
  readonly projectRootDir: string;
  readonly projectPath: string;
  readonly role: SourceFileRole | `${SourceFileRole}`;
}

export interface SemanticAuthoredSourceOwnershipResult {
  readonly sourceFilePath: string;
  /** True when at least one exact owner admits this source through the template-edit boundary. */
  readonly templateOwned: boolean;
  readonly owners: readonly SemanticAuthoredSourceOwner[];
}

/** Select native project-configuration diagnostics without requiring an Aurelia app candidate. */
export interface SemanticProjectConfigurationDiagnosticsRequest {
  readonly projectKey?: string | null;
  /** Exact host paths, absolute or workspace-relative. Omit for all configurations; an empty list selects none. */
  readonly sourceFilePaths?: readonly string[] | null;
  readonly page?: SemanticRuntimePageInput | null;
  /** Optional transport-owned row-page ceilings; excluded from semantic query identity. */
  readonly pagePolicy?: SemanticRuntimePagePolicy | null;
  /** Inquiry profile that owns this runtime-static answer claim. */
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
}

export interface SemanticProjectConfigurationDiagnosticsResult {
  readonly rows: readonly SemanticProjectConfigurationDiagnostic[];
}

/** Select exact native project-configuration products without opening an Aurelia app world. */
export interface SemanticNativeProjectConfigurationsRequest {
  readonly projectKey?: string | null;
  /** Exact host paths, absolute or workspace-relative. Omit for all existing configurations; an empty list selects none. */
  readonly sourceFilePaths?: readonly string[] | null;
  readonly page?: SemanticRuntimePageInput | null;
  /** Optional transport-owned row-page ceilings; excluded from semantic query identity. */
  readonly pagePolicy?: SemanticRuntimePagePolicy | null;
  /** Inquiry profile that owns this runtime-static answer claim. */
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
}

export interface SemanticNativeProjectConfigurationRow {
  readonly projectKey: string;
  readonly projectRootDir: string;
  readonly filePath: string;
  /** Accepted native format version; null when the existing file's version is missing, ambiguous, or unsupported. */
  readonly acceptedVersion: AureliaProjectConfigurationVersion | null;
  readonly applicationState: SemanticExistingProjectConfigurationApplicationState;
  /** Complete normalized native exclusions that survived validation and currently contribute to authored-source membership. */
  readonly appliedExcludedSourceRootDirs: readonly string[];
  /** Complete known finding policy after configured overrides and deterministic defaults are composed. */
  readonly effectiveFindingPolicies: readonly SemanticProjectFindingEffectivePolicy[];
  readonly diagnosticCount: number;
}

export interface SemanticNativeProjectConfigurationsResult {
  readonly displayText: string;
  readonly rows: readonly SemanticNativeProjectConfigurationRow[];
}

export interface SemanticRuntimeSummaryRequest {
  /** Page over project rows; defaults to 0 so counts and app candidates can serve as a low-token first read. */
  readonly projectPage?: SemanticRuntimePageInput | null;
  /** Optional transport-owned row-page ceilings; excluded from semantic query identity. */
  readonly pagePolicy?: SemanticRuntimePagePolicy | null;
  /** Inquiry profile that owns this summary answer claim; defaults to the runtime's unclassified exploration lane. */
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
  /** Retain raw whole-source compiler precedents used by browser-occurrence/AOT compilation. */
  readonly includeCompilerOccurrencePrecedents?: boolean | null;
  /** Optional source-file selection for authoring/LSP template compilation. */
  readonly authoringTemplateSourceFiles?: readonly string[] | null;
  /** Optional cap for standalone authoring templates compiled in this app open request. */
  readonly authoringTemplateLimit?: number | null;
  /** Optional profiling controls; use only for telemetry lanes, not semantic feature gating. */
  readonly telemetry?: SemanticRuntimeTelemetryOptions | null;
}

export interface SemanticAppOverviewRequest {
  readonly diagnosticPageSize?: number | null;
  readonly analysisLimitationPageSize?: number | null;
  readonly openSeamPageSize?: number | null;
}

export interface SemanticRuntimePageInput {
  /** Non-negative safe integer. Zero requests rollup/page metadata without selecting rows. */
  readonly size?: number;
  /** Opaque cursor returned by the same query shape and row-universe generation. */
  readonly cursor?: string | null;
}

/**
 * Transport-owned bounds applied while semantic-runtime selects one deterministic row page.
 *
 * Semantic-runtime itself does not impose MCP-sized ceilings. IDE, MCP, and future AOT callers may choose different
 * response budgets without changing semantic answer meaning.
 */
export interface SemanticRuntimePagePolicy {
  /** Positive safe-integer row ceiling; null leaves the caller's requested size unbounded. */
  readonly maxSize?: number | null;
  /**
   * Positive safe-integer estimated row-JSON target; null disables byte-budget clamping.
   * The first selected row is returned even when it alone exceeds this target so a continuation can make progress.
   */
  readonly maxRowsJsonBytes?: number | null;
}

export interface SemanticRouterOverviewRequest {
  /** Number of sample rows to include for each router-owned collection; defaults to 0 for summary-first answers. */
  readonly rowPageSize?: number | null;
  readonly detail?: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` | null;
}

/** Public DTO for facts and source obligations known before following a suggested continuation. */
export interface SemanticContinuationEvidenceGate {
  /** Source evidence required by the intended move; the followed answer reports its own semantic coverage. */
  readonly sourceRequirement: InquirySourceRequirementValue;
  /** Relevant source facts already carried by the current answer, preserving mixed facets independently. */
  readonly sourceFacts: readonly SemanticContinuationSourceFact[];
  /** Generation authorities whose change can invalidate or reshape the continuation target. */
  readonly epochDependencies: readonly InquiryContinuationEpochDependencyValue[];
}

/** Public continuation row for MCP/IDE callers that need typed next moves instead of prose hints. */
export interface SemanticRuntimeContinuationRow {
  /** Continuation action; target query and intent carry the concrete follow-up lane. */
  readonly kind: InquiryContinuationKindValue;
  /** Short explanation of why this continuation is useful from the current answer. */
  readonly rationale: string;
  /** Public app-query kind this continuation would ask, if it maps to one query family. */
  readonly targetQueryKind?: SemanticAppQueryKind | `${SemanticAppQueryKind}` | null;
  /** Fully shaped app query the caller can follow without adapter-local guessing. */
  readonly targetQuery?: SemanticAppQuery | null;
  /** Public app-builder query kind this continuation would ask, if it maps to the app-builder surface. */
  readonly targetAppBuilderQueryKind?: SemanticRuntimeAppBuilderQueryKind | `${SemanticRuntimeAppBuilderQueryKind}` | null;
  /** Fully shaped app-builder query the caller can follow without adapter-local guessing. */
  readonly targetAppBuilderQuery?: SemanticRuntimeAppBuilderQueryRequest | null;
  /** Next-move intents this continuation is intended to serve; empty means intent-neutral. */
  readonly intents: readonly InquiryContinuationIntentValue[];
  /** Coarse cost boundary for following the continuation. */
  readonly cost: InquiryContinuationCostValue | null;
  /** Evidence gate a caller should inspect before treating the continuation as actionable. */
  readonly evidence: SemanticContinuationEvidenceGate | null;
  /** Explicit reasons the continuation is informative but not currently followable/actionable. */
  readonly blockers: readonly string[];
}

export const enum SemanticObservedDependencyLocusKind {
  /** Keep every dependency occurrence in the selected project. */
  Project = 'project',
  /** Keep occurrences whose authored source or anchor belongs to one source file. */
  SourceFile = 'source-file',
  /** Keep occurrences owned by one owner key returned from a dependency row. */
  Owner = 'owner',
  /** Select one dependency row key returned from a dependency row. */
  Row = 'row',
  /** Select one summary cluster key returned from a binding dependency summary row. */
  Cluster = 'cluster',
}

export type SemanticObservedDependencyLocus =
  | {
    readonly kind: SemanticObservedDependencyLocusKind.Project;
  }
  | {
    readonly kind: SemanticObservedDependencyLocusKind.SourceFile;
    readonly sourceFile: SemanticRuntimeSourceFileInput;
  }
  | {
    readonly kind: SemanticObservedDependencyLocusKind.Owner;
    readonly ownerKey: string;
  }
  | {
    readonly kind: SemanticObservedDependencyLocusKind.Row;
    readonly rowKey: string;
  }
  | {
    readonly kind: SemanticObservedDependencyLocusKind.Cluster;
    readonly clusterKey: string;
  };

export interface SemanticAppQuery {
  readonly kind: SemanticAppQueryKind | `${SemanticAppQueryKind}`;
  readonly page?: SemanticRuntimePageInput;
  readonly detail?: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`;
  /** Consumer lane behind this answer; controls query-claim retention and answer-local disposal policy. */
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
  /** Response-envelope filter for typed continuations; it does not change query materialization identity. */
  readonly continuationIntents?: readonly InquiryContinuationIntentValue[] | null;
  /**
   * Diagnostic projection depth for app/template diagnostic query families.
   *
   * Overview-style callers should prefer `available-products` so compact first reads do not publish answer-time
   * TypeChecker products. Explicit diagnostic callers can request `type-projection` when weak owner/member analysis is
   * worth the CPU/memory trade-off.
   */
  readonly diagnosticProjection?: SemanticDiagnosticProjectionPolicy | `${SemanticDiagnosticProjectionPolicy}` | null;
  /** Include query-local TypeChecker value type surfaces for query kinds that advertise `supportsTypeSurfaces`. */
  readonly includeTypeSurfaces?: boolean | null;
  /** AppOverview diagnostic-cluster page size; defaults to the compact overview budget. */
  readonly diagnosticPageSize?: number | null;
  /** AppOverview configured analysis-limitation page size; defaults to the compact overview budget. */
  readonly analysisLimitationPageSize?: number | null;
  /** AppOverview raw open-seam audit page size; defaults to zero. */
  readonly openSeamPageSize?: number | null;
  /** Open-seam query filter by exact seam kind key, such as `evaluation.unresolved-identifier`. */
  readonly openSeamKindKey?: OpenSeam['seamKindKey'] | string | null;
  /** Open-seam query filter by reason kind, such as `missing-static-value`. */
  readonly openSeamReasonKind?: OpenSeamReasonKind | `${OpenSeamReasonKind}` | string | null;
  /** Open-seam query filter by source admission role, such as `app-source` or `tooling-script`. */
  readonly sourceRole?: SourceFileRole | `${SourceFileRole}` | string | null;
  /** Exact cluster key returned by an open-seam summary row. */
  readonly openSeamClusterKey?: string | null;
  /** Exact authored-site key returned by an open-seam raw/site row. */
  readonly openSeamSiteKey?: string | null;
  /** RouterOverview samples several independent route row families; defaults to zero sample rows. */
  readonly rowPageSize?: number | null;
  /** Source cursor used by cursor-scoped authoring queries such as template completions. */
  readonly cursor?: SemanticRuntimeSourceCursorInput | null;
  /** Exact compiler-resource scope selected from a prior template-resource-availability answer. */
  readonly templateResourceScopeIdentityKey?: string | null;
  /** Exact top-level resource identity selected from a prior resource-inventory answer. */
  readonly resourceIdentityKey?: string | null;
  /** Exact framework capability selected at a cursor when more than one demand shares the authored locus. */
  readonly frameworkCapability?: FrameworkRegistrationCapability | `${FrameworkRegistrationCapability}` | null;
  /** Source file used by file-scoped authoring queries such as template diagnostics. */
  readonly sourceFile?: SemanticRuntimeSourceFileInput | null;
  /** Include the declaration/source target when a cursor-scoped references query supports it. */
  readonly includeDeclaration?: boolean | null;
  /** New member/resource name for edit-planning queries; omitted when a caller only wants prepare/preflight data. */
  readonly newName?: string | null;
  /** Family-owned locus for observed-dependency row and summary queries. */
  readonly observedDependencyLocus?: SemanticObservedDependencyLocus | null;
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
  /** Override profile-default app-epoch retention; `dispose-app` is incompatible with app-world handle detail. */
  readonly appRetention?: SemanticAppRetentionPolicy | null;
  /**
   * Clear the process-local TypeScript dependency SourceFile cache at this answer boundary.
   *
   * Omit to use the inquiry-profile default. Recompute-friendly one-off lanes such as `mcp-orientation` clear this
   * cache when they also dispose the app epoch; pass `preserve` when the next TypeChecker Program should stay warm.
   * The clear is recorded on the runtime-level query claim beside any app-epoch disposal.
   */
  readonly typeSystemDependencyCacheClearPolicy?: SemanticTypeSystemDependencyCacheClearPolicy | null;
  /** Optional transport-owned row-page ceilings; excluded from semantic query identity. */
  readonly pagePolicy?: SemanticRuntimePagePolicy | null;
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
  /** Override profile-default app-epoch retention; `dispose-app` is incompatible with app-world handle detail. */
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
  /** Optional transport-owned row-page ceilings applied to every child query. */
  readonly pagePolicy?: SemanticRuntimePagePolicy | null;
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
  /** Accepted observed-dependency loci; empty when this query does not own that selector family. */
  readonly observedDependencyLocusKinds: readonly (
    SemanticObservedDependencyLocusKind | `${SemanticObservedDependencyLocusKind}`
  )[];
  /** Whether open-seam queries accept seam kind, reason kind, and source-role filters. */
  readonly supportsOpenSeamFilters: boolean;
  readonly supportsDiagnosticProjection: boolean;
  /** Whether `includeTypeSurfaces` can opt this query into answer-time TypeChecker surface projection. */
  readonly supportsTypeSurfaces: boolean;
  /** Whether `continuationIntents` can narrow returned continuation rows without changing query identity. */
  readonly supportsContinuationIntentFilter: boolean;
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
  /** Controls whether cursor diagnostics may run TypeChecker-backed template overlay projection. */
  readonly diagnosticProjection?: SemanticDiagnosticProjectionPolicy | `${SemanticDiagnosticProjectionPolicy}` | null;
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
  /** Whether execution produced an answer, independently from selection, coverage, and paging. */
  readonly result: InquiryAnswerResult;
  /** Cursor/locus selection state, independent of semantic coverage and transport paging. */
  readonly selection: InquiryAnswerSelection;
  /** Completeness of the semantic basis, independent of whether the row payload is paged. */
  readonly coverage: InquiryAnswerCoverage;
  readonly summary: string;
  readonly value: TValue;
  /**
   * Portable semantic basis for this exact answer. Executable currentness witnesses remain process-private.
   * Static catalog answers that consume no workspace authority may omit it.
   */
  readonly analysisBasis?: SemanticRuntimeAnalysisBasis;
  readonly page?: SemanticRuntimePageResult | null;
  /** App-world depth that actually answered this query; absent for runtime-static/project-frame answers. */
  readonly analysisDepth?: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}` | null;
  /** Optional typed follow-up moves. Most current answers omit this until their continuation surface is explicit. */
  readonly continuations?: readonly SemanticRuntimeContinuationRow[];
  /** Optional answer-envelope telemetry, present only when a telemetry request asks the runtime to expose it. */
  readonly profile?: SemanticRuntimeAnswerProfile | null;
}

/** Portable identity of the source world and exact semantic inputs consumed by one completed answer. */
export interface SemanticRuntimeAnalysisBasis {
  readonly schemaVersion: typeof SEMANTIC_RUNTIME_ANALYSIS_BASIS_SCHEMA_VERSION;
  readonly runtimeApiVersion: typeof SEMANTIC_RUNTIME_API_VERSION;
  /** Descriptor-derived logical workspace identity; never a kernel-store or runtime-incarnation key. */
  readonly semanticWorkspaceKey: string;
  /** Portable resolved project/source-admission plan revision. */
  readonly sourceWorldRevision: string;
  /** Portable digest of exact project-input leaves and immutable semantic environment facts. */
  readonly semanticModelRevision: string;
  /** Portable digest joining the source-world and semantic-model revisions. */
  readonly revision: string;
}

export interface SemanticRuntimeAnswerProfile {
  readonly appWorldFreeProfile?: SemanticRuntimeAppWorldFreeProfileSummary | null;
  /**
   * Retrospective synchronous routed-answer boundary timings, emitted only when the routed request explicitly enables
   * telemetry and returns an answer successfully. Thrown cancellation, currentness, and failure paths expose no profile.
   *
   * The preflight-complete marker identifies the only current candidate location for a future observation/abort check;
   * profiling does not perform that check or yield. A future yielding implementation must rerun or freshly validate
   * preflight before opening the answer transaction. Planning may already populate the immutable project-shape cache,
   * so aborting at this location is not a promise that no internal cache was warmed.
   */
  readonly routedAnswer?: SemanticRuntimeRoutedAnswerProfile | null;
}

export type SemanticRuntimeRoutedAnswerCheckpointName =
  | 'entry'
  | 'preflight-complete'
  | 'answer-transaction-complete';

export interface SemanticRuntimeRoutedAnswerCheckpoint {
  readonly name: SemanticRuntimeRoutedAnswerCheckpointName;
  /** Monotonic elapsed time from routed-answer entry; portable answers never expose a process clock origin. */
  readonly elapsedMilliseconds: number;
}

export interface SemanticRuntimeRoutedAnswerProfile {
  readonly checkpoints: readonly SemanticRuntimeRoutedAnswerCheckpoint[];
  readonly preflightMilliseconds: number;
  /** Includes retained-claim validation or materialization plus the synchronous answer transaction commit. */
  readonly answerTransactionMilliseconds: number;
  readonly totalMilliseconds: number;
  /** Largest span between the profiled candidate boundaries; the current call remains synchronous end to end. */
  readonly longestUninterruptedMilliseconds: number;
}

export interface SemanticRuntimeAppWorldFreeProfileSummary {
  /** Whether this query constructed the project/profile evaluator generation or reused its incumbent. */
  readonly acquisitionKind: StaticProjectEvaluationAcquisitionKind;
  /** Time spent acquiring the reusable evaluation generation for this answer. */
  readonly acquisitionMilliseconds: number;
  /** Original construction cost of the admitted evaluation generation, not current query latency. */
  readonly totalMilliseconds: number;
  readonly staticEvaluationPhases: readonly SemanticRuntimePhaseTimingSummary[];
  readonly staticEvaluationHost: EvaluationModuleSourceHostProfile;
  readonly staticEvaluationSources: StaticProjectEvaluationSourceFileStats;
}

export interface SemanticRuntimePageResult {
  /** Applied page size after caller/transport policy. */
  readonly size: number;
  /** Caller-supplied cursor, if any. */
  readonly cursor: string | null;
  /** Opaque cursor for the next page; callers should pass it back without interpreting it. */
  readonly nextCursor: string | null;
  readonly returnedRows: number;
  readonly totalRows: number;
  /** True when this page reaches the end of the deterministic ordered row set. */
  readonly exhausted: boolean;
  /** Typed rejection when the supplied cursor does not belong to this query, epoch, or ordering contract. */
  readonly cursorProblem?: SemanticRuntimePageCursorProblem;
  /** Caller-requested size when transport policy had to clamp it. */
  readonly requestedSize?: number;
  /** Maximum page size supplied by transport policy. */
  readonly maxSize?: number;
  /** True when size is smaller than the caller-requested page size. */
  readonly clamped?: boolean;
  /** Estimated UTF-8 JSON bytes for the returned row array. */
  readonly estimatedRowsJsonBytes?: number;
  /** Target estimated row JSON bytes supplied by transport policy; one first oversized row may exceed it. */
  readonly maxRowsJsonBytes?: number;
  /** True when row selection stopped before `size` because the transport row payload target was reached. */
  readonly byteClamped?: boolean;
}

export const enum SemanticRuntimePageCursorProblemKind {
  Malformed = 'malformed',
  QueryMismatch = 'query-mismatch',
  Stale = 'stale',
  OrderingMismatch = 'ordering-mismatch',
  OffsetOutOfRange = 'offset-out-of-range',
}

export interface SemanticRuntimePageCursorProblem {
  readonly kind: SemanticRuntimePageCursorProblemKind;
  readonly message: string;
}

export interface SemanticRuntimeSourceCursorInput {
  /** Host-facing source path: absolute, workspace-relative, or project-relative; ambiguous relative aliases are refused. */
  readonly filePath: string;
  /** Zero-based source line. */
  readonly line: number;
  /** Zero-based source character. */
  readonly character: number;
  /** Optional zero-based source offset; queries resolve it from line/character when omitted. */
  readonly offset?: number | null;
}

export interface SemanticRuntimeSourceFileInput {
  /** Host-facing source path: absolute, workspace-relative, or project-relative; ambiguous relative aliases are refused. */
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
  /** Descriptor-derived semantic workspace identity; never a store namespace or runtime incarnation. */
  readonly workspaceKey: string;
  readonly displayText: string;
  /** Existing native configuration files read at exact discovered project roots. */
  readonly nativeProjectConfigurationCount: number;
  readonly nativeProjectConfigurationDiagnosticCount: number;
  readonly projectShapeCounts: readonly SemanticProjectShapeCount[];
  readonly projectAnalysisCounts: readonly SemanticProjectAnalysisCount[];
  readonly defaultAppProjectKey: string | null;
  readonly appCandidates: readonly SemanticProjectCandidateSummary[];
  readonly projects: readonly SemanticProjectSummary[];
}

/** Retention controls that are meaningful for one runtime/session overview. */
export interface SemanticRuntimeSessionAnalysisCacheOverviewRequest {
  /** Include top kernel-density breakdown rows; defaults to false for low-token cache checks. */
  readonly includeKernelBreakdowns?: boolean | null;
  /** Include opt-in shallow product-detail and hot-detail density rows; requires kernel breakdowns. */
  readonly includeDetailDensity?: boolean | null;
  /** Include recent retained query-claim records for each runtime/app graph; defaults to false. */
  readonly includeQueryClaimRows?: boolean | null;
  /** Cap high-cardinality breakdown rows; defaults to 8. */
  readonly rowLimit?: number | null;
}

/** Legacy combined session and process overview request. */
export interface SemanticRuntimeAnalysisCacheOverviewRequest
  extends SemanticRuntimeSessionAnalysisCacheOverviewRequest {
  /** Include largest retained TypeScript dependency source-file cache entries; defaults to false. */
  readonly includeTypeSystemDependencyEntries?: boolean | null;
}

/** Retention owned by one runtime/session, excluding process-owned caches and process memory. */
export interface SemanticRuntimeSessionAnalysisCacheOverviewResult {
  readonly displayText: string;
  readonly cachedAppCount: number;
  readonly typeSystemProjectCount: number;
  readonly cachedApps: readonly SemanticRuntimeCachedAppSummary[];
  readonly runtimeQueryClaimProfiles: readonly SemanticRuntimeCachedAppQueryClaimProfileSummary[];
  readonly workspaceKernel: SemanticRuntimeKernelCountSnapshot | SemanticRuntimeKernelDensitySnapshot;
  readonly retention: SemanticRuntimeCacheRetentionSummary;
  readonly summary: string;
}

/** Legacy combined view of one runtime/session plus process-owned retention and memory. */
export interface SemanticRuntimeAnalysisCacheOverviewResult
  extends SemanticRuntimeSessionAnalysisCacheOverviewResult {
  readonly typeSystemDependencyCache: SemanticRuntimeTypeSystemDependencyCacheSummary;
  readonly processMemory: SemanticRuntimeMemorySample;
}

export interface SemanticRuntimeTypeSystemDependencyCacheSummary {
  readonly entries: number;
  readonly entryLimit: number;
  readonly sourceTextCharacterLimit: number;
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
  readonly supersededRevisionEvictions: number;
  readonly supersededRevisionEvictedSourceTextCharacters: number;
  readonly capacityEvictions: number;
  readonly capacityEvictedSourceTextCharacters: number;
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

/** Process-owned TypeScript dependency SourceFile cache overview, independent of any workspace session. */
export interface SemanticRuntimeProcessTypeSystemCacheOverviewRequest {
  readonly includeTypeSystemDependencyEntries?: boolean | null;
  readonly rowLimit?: number | null;
}

/** Process-owned TypeScript dependency SourceFile cache clear, independent of any workspace session. */
export interface SemanticRuntimeProcessTypeSystemCacheClearRequest {
  readonly typeSystemDependencyCacheClearPolicy?: SemanticTypeSystemDependencyCacheClearPolicy | null;
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

/** Session-local clear currently has no policy knobs; pass `{}` to keep projection positional and explicit. */
export type SemanticRuntimeSessionAnalysisCacheClearRequest = Readonly<Record<string, never>>;

/** Cache state reclaimed from one runtime/session, excluding process-owned caches. */
export interface SemanticRuntimeSessionAnalysisCacheClearResult {
  readonly displayText: string;
  readonly disposedCachedApps: number;
  readonly disposedStaticProjectEvaluations: number;
  readonly disposedTypeSystemProjects: number;
  readonly disposedQueryClaimRecords: number;
  readonly disposedKernelRecords: number;
  readonly disposedProductDetails: number;
  readonly disposedHotDetails: number;
  readonly disposedKernelHandleCharacters: number;
  readonly remainingCachedApps: number;
  readonly remainingStaticProjectEvaluations: number;
  readonly remainingTypeSystemProjects: number;
  readonly workspaceKernel: SemanticRuntimeKernelCountSnapshot;
  readonly summary: string;
}

/** Legacy combined clear result for one runtime/session plus the process-owned dependency cache. */
export interface SemanticRuntimeAnalysisCacheClearResult
  extends SemanticRuntimeSessionAnalysisCacheClearResult {
  readonly typeSystemDependencyCacheClearPolicy: SemanticTypeSystemDependencyCacheClearPolicy;
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
}

/** Process-owned TypeScript dependency SourceFile cache clear, independent of any workspace session. */
export interface SemanticRuntimeProcessTypeSystemCacheClearResult {
  readonly displayText: string;
  readonly typeSystemDependencyCacheClearPolicy: SemanticTypeSystemDependencyCacheClearPolicy;
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
  readonly remainingTypeSystemDependencySourceFiles: number;
  readonly summary: string;
}

export interface SemanticRuntimeQueryClaimDisposeRequest {
  /**
   * Claim graph group to prune. `all` covers runtime-level routed/static answers and retained cached-app graphs.
   *
   * This does not dispose app-world kernel products; use `clearAnalysisCache()` when a source edit makes an opened app
   * epoch stale. This request only clears retained answer storage near the public API boundary.
   */
  readonly scope?: SemanticQueryClaimDisposalScope | null;
  /** Optional project filter; omitted means every retained query-claim graph in the selected scope. */
  readonly projectKey?: string | null;
  /** Optional source-file epoch filter using exact absolute, workspace-relative, or project-relative identity. */
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
  readonly includeCompilerOccurrencePrecedents: boolean;
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
  readonly staticEvaluationAcquisitions: readonly SemanticRuntimeStaticProjectEvaluationAcquisitionSummary[];
  readonly typeSystemAcquisition: SemanticRuntimeTypeSystemProjectAcquisitionSummary;
  readonly staticEvaluationPhases: readonly SemanticRuntimePhaseTimingSummary[];
  readonly staticEvaluationHost: EvaluationModuleSourceHostProfile;
  readonly staticEvaluationSources: StaticProjectEvaluationSourceFileStats;
  readonly typeSystemPhases: readonly SemanticRuntimePhaseTimingSummary[];
  readonly resourceRecognitionPhases: readonly SemanticRuntimePhaseTimingSummary[];
  readonly templatePhases: readonly SemanticRuntimePhaseTimingSummary[];
  readonly templateRuntimePhases: readonly SemanticRuntimePhaseTimingSummary[];
  readonly templateExpressionTypeCache: CheckerExpressionTypeEvaluationCacheStats | null;
  readonly typeScript: SemanticRuntimeTypeSystemTypeScriptEnvironmentSummary;
  readonly compilerOptions: SemanticRuntimeTypeSystemCompilerOptionsSummary;
  readonly hostSourceFileCache: SemanticRuntimeTypeSystemHostSourceFileCacheStats;
  readonly programRootFiles: SemanticRuntimeTypeSystemProgramSourceFileStats;
  readonly programSourceFiles: SemanticRuntimeTypeSystemProgramSourceFileStats;
  readonly programRootFileGroups: readonly SemanticRuntimeTypeSystemProgramSourceFileGroupStats[];
  readonly programSourceFileGroups: readonly SemanticRuntimeTypeSystemProgramSourceFileGroupStats[];
  readonly programNodeRemaps: SemanticRuntimeTypeSystemProgramNodeRemapStats;
}

export interface SemanticRuntimeStaticProjectEvaluationAcquisitionSummary {
  readonly profileKey: string;
  readonly acquisitionKind: StaticProjectEvaluationAcquisitionKind;
  readonly acquisitionMilliseconds: number;
  readonly constructionMilliseconds: number;
}

export interface SemanticRuntimeTypeSystemProjectAcquisitionSummary {
  readonly acquisitionKind: TypeSystemProjectAcquisitionKind;
  readonly acquisitionMilliseconds: number;
  readonly constructionMilliseconds: number;
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

export interface SemanticRuntimeTypeSystemTypeScriptPackageSummary {
  readonly version: string;
  readonly packageJsonPath: string | null;
}

export interface SemanticRuntimeTypeSystemTypeScriptEnvironmentSummary {
  readonly analyzer: SemanticRuntimeTypeSystemTypeScriptPackageSummary;
  readonly workspace: SemanticRuntimeTypeSystemTypeScriptPackageSummary | null;
  readonly versionRelation: TypeSystemTypeScriptVersionRelation | `${TypeSystemTypeScriptVersionRelation}`;
}

export interface SemanticRuntimeTypeSystemProgramSourceFileStats {
  readonly total: number;
  readonly evaluatedSources: number;
  readonly overlaySources: number;
  readonly projectSources: number;
  readonly nodeModuleSources: number;
  readonly declarationSources: number;
  readonly defaultLibrarySources: number;
  readonly externalSources: number;
  readonly sourceTextCharacters: number;
  readonly evaluatedSourceTextCharacters: number;
  readonly overlaySourceTextCharacters: number;
  readonly projectSourceTextCharacters: number;
  readonly nodeModuleSourceTextCharacters: number;
  readonly declarationSourceTextCharacters: number;
  readonly defaultLibrarySourceTextCharacters: number;
  readonly externalSourceTextCharacters: number;
}

export type SemanticRuntimeTypeSystemProgramSourceFileGroupKind =
  | 'overlay-source'
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
  readonly supersededRevisionEvictions: number;
  readonly supersededRevisionEvictedSourceTextCharacters: number;
  readonly capacityEvictions: number;
  readonly capacityEvictedSourceTextCharacters: number;
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
  readonly typeScript: SemanticRuntimeTypeSystemTypeScriptEnvironmentSummary;
  readonly summary: SemanticRuntimeAnswer<SemanticAppSummary>;
  readonly topology: SemanticRuntimeAnswer<SemanticAppOverviewCollectionSummary>;
  readonly diagnostics: SemanticRuntimeAnswer<SemanticAppDiagnosticSummaryResult>;
  /** Configured, adjudicated authored limitations used by normal product orientation. */
  readonly analysisLimitations: SemanticRuntimeAnswer<SemanticAnalysisLimitationsResult>;
  /** Conserved raw seam audit data; normal overview text does not promote its counts or samples. */
  readonly openSeams: SemanticRuntimeAnswer<SemanticOpenSeamSitesResult>;
}

export interface SemanticAppOverviewCollectionSummary {
  readonly counts: Record<string, number>;
  readonly scalars: Record<string, unknown>;
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
  /** Complete boot-owned cause set for why this project frame exists. */
  readonly admissionOrigins: readonly ProjectRootAdmissionOrigin[];
  readonly sourceFiles: number;
  readonly sourceRoles: readonly SemanticSourceRoleCount[];
  readonly nativeProjectConfiguration: SemanticProjectNativeConfigurationSummary | null;
  readonly hasAureliaAppEntrypointSignal: boolean;
  readonly shapeKind: SemanticProjectShapeKind | `${SemanticProjectShapeKind}`;
  readonly analysisKind: SemanticProjectAnalysisKind | `${SemanticProjectAnalysisKind}`;
  readonly aureliaDependencyScopes: readonly SemanticProjectAureliaDependencyScopeCount[];
  readonly aureliaSourceSignals: readonly SemanticProjectAureliaSourceSignalCount[];
  readonly shapeReasons: readonly SemanticProjectShapeReasonCount[];
}

export interface SemanticProjectNativeConfigurationSummary {
  readonly filePath: string;
  readonly diagnosticCount: number;
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

export interface SemanticAppSummary {
  readonly analysisDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`;
  readonly projectKey: string;
  readonly rootDir: string;
  readonly sourceFiles: number;
  readonly evaluatedSources: number;
  readonly unresolvedModuleEdges: number;
  readonly evaluationIssues: number;
  readonly observationIssues: number;
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
  /** Opaque answer-local seam identity; raw kernel handles remain detail-only. */
  readonly seamKey: string;
  /** Stable authored-location key when exact source exists; otherwise stable only within this answer. */
  readonly siteKey: string;
  readonly seamKindKey: OpenSeam['seamKindKey'];
  readonly summary: string;
  readonly boundaryKinds: readonly (OpenSeamBoundaryKind | `${OpenSeamBoundaryKind}`)[];
  readonly reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
  readonly reasonSources: readonly SemanticOpenSeamReasonSource[];
  readonly pressureKind: SemanticOpenSeamPressureKind | `${SemanticOpenSeamPressureKind}`;
  readonly affectedMaterializationCount: number;
  readonly affectedProductCount: number;
  readonly impacts: readonly SemanticOpenSeamMaterializationImpactRow[];
  readonly source: SemanticSourceReference | null;
  readonly sourceRange: SemanticSourceRange | null;
  readonly sourceRole: SourceFileRole | `${SourceFileRole}` | string | null;
  readonly handles?: {
    readonly handle: OpenSeam['handle'];
    readonly addressHandle: AddressHandle | null;
  };
}

export const enum SemanticOpenSeamPressureKind {
  /** The seam is retained as unresolved evidence but no product materialization cites it. */
  EvidenceOnly = 'evidence-only',
  /** One or more materializations explicitly cite the seam as unresolved product pressure. */
  ProductPressure = 'product-pressure',
}

export const enum SemanticOpenSeamMaterializationOutcome {
  /** The constrained materialization produced no product. */
  OpenWithoutProduct = 'open-without-product',
  /** The constrained materialization retained one or more partial products. */
  OpenWithProduct = 'open-with-product',
}

export interface SemanticOpenSeamMaterializedProductRow {
  /** Answer-local product key used to conserve impact counts without exposing kernel handles. */
  readonly productKey: string;
  readonly productKindKey: MaterializedProduct['productKindKey'];
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: MaterializedProduct['handle'];
    readonly identityHandle: MaterializedProduct['identityHandle'];
    readonly addressHandle: MaterializedProduct['addressHandle'];
  };
}

export interface SemanticOpenSeamMaterializationOwnerRow {
  /** Opaque answer-local identity shared by impacts with the same materialization owner. */
  readonly ownerKey: string;
  /** Kernel record discriminator retained without exposing the underlying handle. */
  readonly recordKind: string;
  /** Compact semantic label derived from the owning address or identity record. */
  readonly label: string;
  /** Best authored source or identity reference available for the owner. */
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly ownerHandle: MaterializationRecord['ownerHandle'];
  };
}

export interface SemanticOpenSeamMaterializationImpactRow {
  /** Answer-local materialization key used to conserve impact counts without exposing kernel handles. */
  readonly impactKey: string;
  readonly outcome: SemanticOpenSeamMaterializationOutcome | `${SemanticOpenSeamMaterializationOutcome}`;
  readonly owner: SemanticOpenSeamMaterializationOwnerRow;
  readonly products: readonly SemanticOpenSeamMaterializedProductRow[];
  readonly handles?: {
    readonly materializationHandle: MaterializationRecord['handle'];
    readonly ownerHandle: MaterializationRecord['ownerHandle'];
  };
}

export interface SemanticOpenSeamReasonSource {
  readonly reasonKind: OpenSeamReasonKind | `${OpenSeamReasonKind}`;
  readonly summary: string;
  readonly source: SemanticSourceReference | null;
  readonly sourceRange: SemanticSourceRange | null;
  readonly handles?: {
    readonly addressHandle: AddressHandle | null;
    readonly evidenceHandle: OpenSeam['evidenceHandle'];
  };
}

export interface SemanticOpenSeamsResult {
  readonly displayText: string;
  readonly rows: readonly SemanticOpenSeamRow[];
}

export interface SemanticOpenSeamSummaryRow {
  /** Stable causal cluster identity formed from seam kind and typed reason signature. */
  readonly clusterKey: string;
  readonly seamKindKey: OpenSeam['seamKindKey'];
  readonly boundaryKinds: readonly (OpenSeamBoundaryKind | `${OpenSeamBoundaryKind}`)[];
  readonly boundaryCounts: readonly SemanticRuntimeCountRow[];
  readonly pressureKinds: readonly (SemanticOpenSeamPressureKind | `${SemanticOpenSeamPressureKind}`)[];
  readonly pressureCounts: readonly SemanticRuntimeCountRow[];
  readonly reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
  readonly reasonCounts: readonly SemanticRuntimeCountRow[];
  readonly count: number;
  readonly evidenceOnlyRowCount: number;
  readonly productPressureRowCount: number;
  readonly uniqueSiteCount: number;
  readonly affectedMaterializationCount: number;
  readonly affectedProductCount: number;
  readonly sourceFileCount: number;
  readonly sourceRoles: readonly SemanticSourceRoleCount[];
  readonly sampleSummary: string;
  readonly sampleSources: readonly SemanticSourceReference[];
  readonly sampleSourceSites: readonly SemanticOpenSeamSummarySampleSourceRow[];
}

export interface SemanticOpenSeamSummarySampleSourceRow {
  readonly source: SemanticSourceReference;
  readonly sourceRange: SemanticSourceRange | null;
}

export interface SemanticOpenSeamSummaryResult {
  readonly totalOpenSeamRows: number;
  readonly totalOpenSeamSites: number;
  readonly displayText: string;
  readonly rows: readonly SemanticOpenSeamSummaryRow[];
}

export interface SemanticSourcePosition {
  /** Zero-based authored source line, matching TypeScript and semantic-runtime cursor coordinates. */
  readonly line: number;
  /** Zero-based authored source character, matching TypeScript and semantic-runtime cursor coordinates. */
  readonly character: number;
}

export interface SemanticSourceRange {
  /** Zero-based start position for an exact authored span. */
  readonly start: SemanticSourcePosition;
  /** Zero-based end position for an exact authored span. */
  readonly end: SemanticSourcePosition;
}

export interface SemanticOpenSeamSiteVariantRow {
  readonly seamKindKey: OpenSeam['seamKindKey'];
  readonly boundaryKinds: readonly (OpenSeamBoundaryKind | `${OpenSeamBoundaryKind}`)[];
  readonly pressureKinds: readonly (SemanticOpenSeamPressureKind | `${SemanticOpenSeamPressureKind}`)[];
  readonly reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
  readonly rawRowCount: number;
  readonly evidenceOnlyRowCount: number;
  readonly productPressureRowCount: number;
  readonly affectedMaterializationCount: number;
  readonly affectedProductCount: number;
  readonly sampleSummary: string;
}

export interface SemanticOpenSeamStaticEvaluationOriginRow {
  /** Why static project evaluation included the source that owns this seam site. */
  readonly kind: StaticProjectEvaluationSourceOriginKind | `${StaticProjectEvaluationSourceOriginKind}`;
  /** Module key for the entry source that contributed this origin. */
  readonly entryModuleKey: string;
  /** Project-relative entry source path when it belongs to the booted project frame. */
  readonly entrySourcePath: string | null;
}

export interface SemanticOpenSeamSiteRow {
  /** Stable answer-local key for one authored seam site; not a durable kernel identity. */
  readonly siteKey: string;
  readonly seamKindKeys: readonly OpenSeam['seamKindKey'][];
  readonly source: SemanticSourceReference | null;
  readonly sourceRole: SourceFileRole | `${SourceFileRole}` | string | null;
  readonly applicationFileRoles: readonly (ApplicationFileRole | `${ApplicationFileRole}`)[];
  readonly staticEvaluationOrigins: readonly SemanticOpenSeamStaticEvaluationOriginRow[];
  readonly sourceRange: SemanticSourceRange | null;
  readonly rawRowCount: number;
  readonly variantCount: number;
  readonly boundaryKinds: readonly (OpenSeamBoundaryKind | `${OpenSeamBoundaryKind}`)[];
  readonly boundaryCounts: readonly SemanticRuntimeCountRow[];
  readonly pressureKinds: readonly (SemanticOpenSeamPressureKind | `${SemanticOpenSeamPressureKind}`)[];
  readonly pressureCounts: readonly SemanticRuntimeCountRow[];
  readonly reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
  readonly reasonCounts: readonly SemanticRuntimeCountRow[];
  readonly affectedMaterializationCount: number;
  readonly affectedProductCount: number;
  readonly sampleSummary: string;
  readonly variantSamples: readonly SemanticOpenSeamSiteVariantRow[];
}

export interface SemanticOpenSeamSitesResult {
  readonly totalOpenSeamRows: number;
  readonly totalOpenSeamSites: number;
  readonly displayText: string;
  readonly rows: readonly SemanticOpenSeamSiteRow[];
}

/** Public authority for an adjudicated limitation rule, independent from configured presentation. */
export const enum SemanticAnalysisLimitationAuthority {
  SemanticRuntimeRule = 'semantic-runtime-rule',
}

/** Typed reason that made one otherwise useful semantic product remain incomplete. */
export interface SemanticAnalysisLimitationReason {
  readonly summary: string;
  readonly seamKindKeys: readonly OpenSeam['seamKindKey'][];
  readonly boundaryKinds: readonly (OpenSeamBoundaryKind | `${OpenSeamBoundaryKind}`)[];
  readonly reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
}

/** One materialization edge retained for exact seam drill-down without exposing kernel handles. */
export interface SemanticAnalysisLimitationMaterializationEvidence {
  readonly impactKey: string;
  readonly outcome: SemanticOpenSeamMaterializationOutcome | `${SemanticOpenSeamMaterializationOutcome}`;
  readonly ownerKey: string;
  readonly productKeys: readonly string[];
  readonly productKindKeys: readonly MaterializedProduct['productKindKey'][];
}

/** One affected product named by kind so consumers can explain what knowledge is incomplete. */
export interface SemanticAnalysisLimitationProductEvidence {
  readonly productKey: string;
  readonly productKindKey: MaterializedProduct['productKindKey'];
  readonly source: SemanticSourceReference | null;
}

/** Exact causal evidence conserved behind one unique authored limitation site. */
export interface SemanticAnalysisLimitationEvidence {
  readonly openSeamSiteKey: string;
  readonly seamKeys: readonly string[];
  readonly materializations: readonly SemanticAnalysisLimitationMaterializationEvidence[];
  readonly products: readonly SemanticAnalysisLimitationProductEvidence[];
}

/** Neutral analysis-limitation finding; configured disposition is presentation policy, not semantic severity. */
export interface SemanticAnalysisLimitationRow {
  /** Stable rule plus exact authored-source identity; independent from answer paging and row order. */
  readonly findingKey: string;
  readonly ruleId: SemanticProjectFindingRuleId;
  readonly authority: SemanticAnalysisLimitationAuthority | `${SemanticAnalysisLimitationAuthority}`;
  readonly title: string;
  readonly explanation: string;
  readonly action: string;
  readonly reason: SemanticAnalysisLimitationReason;
  readonly source: SemanticSourceReference;
  readonly sourceRange: SemanticSourceRange;
  /** The affected semantic knowledge is open even though this collection query enumerated its basis completely. */
  readonly currentCoverage: InquiryAnswerCoverage.Open;
  readonly evidence: SemanticAnalysisLimitationEvidence;
  readonly effectivePolicy: SemanticProjectFindingEffectivePolicy;
}

export interface SemanticAnalysisLimitationsResult {
  readonly projectKey: string;
  /** Exact native policy input, including the conventional path when the file does not exist yet. */
  readonly policyFile: {
    readonly filePath: string;
    readonly exists: boolean;
  };
  /** Effective trace for every admitted rule, including rules with no candidates or disposition=off. */
  readonly effectivePolicies: readonly SemanticProjectFindingEffectivePolicy[];
  /** Unique rule-plus-authored-site candidates before configured off suppression. */
  readonly candidateCount: number;
  readonly suppressedCandidateCount: number;
  readonly displayText: string;
  readonly rows: readonly SemanticAnalysisLimitationRow[];
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

export interface SemanticBindableDefinitionRow {
  readonly name: string;
  readonly attribute: string;
  readonly callback: string;
  readonly mode: BindableBindingMode | `${BindableBindingMode}`;
  readonly setterKind: BindableSetterKind | `${BindableSetterKind}`;
  readonly setterTargetName: string | null;
  /** Explicit nullish-coercion policy; null means absent or inapplicable. */
  readonly nullable: boolean | null;
  readonly valueType: string | null;
  readonly valueTypeShapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}` | null;
  readonly effectiveValueTypeShapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}` | null;
  readonly valueTypeHasCallSignature: boolean | null;
  readonly valueTypeHasMembers: boolean | null;
  readonly valueTypeIsWeak: boolean | null;
  readonly source: SemanticSourceReference | null;
  readonly nameSource: SemanticSourceReference | null;
  readonly attributeSource: SemanticSourceReference | null;
  readonly propertySource: SemanticSourceReference | null;
  readonly callbackSource: SemanticSourceReference | null;
  readonly callbackTargetSource: SemanticSourceReference | null;
  readonly modeSource: SemanticSourceReference | null;
  readonly setSource: SemanticSourceReference | null;
  readonly setterTargetSource: SemanticSourceReference | null;
  readonly typeSource: SemanticSourceReference | null;
  readonly nullableSource: SemanticSourceReference | null;
}

export type SemanticResourceDefinitionBindableRow = SemanticBindableDefinitionRow;

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
  readonly relatedInformation: readonly SemanticDiagnosticRelatedInformation[];
  readonly resource: {
    /** Author-facing resource taxonomy; use `registrationResourceKindFor` for framework registration-key joins. */
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
    readonly relatedSourceAddressHandles: readonly AddressHandle[];
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

export interface SemanticResourceDefinitionAliasRow {
  readonly name: string;
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
  /** Resource metadata came from a compiler-local `<template as-custom-element>`. */
  | 'local-template'
  /** Resource metadata came from a generic header whose more precise carrier is not preserved. */
  | 'header';

export interface SemanticResourceDefinitionRow {
  readonly projectKey: string;
  /** Author-facing resource taxonomy; use `registrationResourceKindFor` for framework registration-key joins. */
  readonly resourceKind: ResourceDefinitionKind;
  readonly declarationModes: readonly SemanticResourceDeclarationMode[];
  readonly name: string | null;
  readonly aliases: readonly SemanticResourceDefinitionAliasRow[];
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
  readonly noMultiBindings: boolean | null;
  readonly containerless: boolean | null;
  readonly shadowMode: ShadowRootMode | `${ShadowRootMode}` | null;
  readonly hasSlots: boolean | null;
  readonly needsCompile: boolean | null;
  readonly patterns: readonly SemanticResourceDefinitionPatternRow[];
  readonly source: SemanticSourceReference | null;
  readonly nameSource: SemanticSourceReference | null;
  /** Exact target/name token used for navigation and edits. */
  readonly targetSource: SemanticSourceReference | null;
  /** Full authored target declaration used by hierarchy and outline consumers. */
  readonly targetDeclarationSource: SemanticSourceReference | null;
  readonly handles?: {
    readonly definitionProductHandle: ProductHandle | null;
    readonly identityHandle: IdentityHandle | null;
    readonly targetIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly nameSourceAddressHandle: AddressHandle | null;
    readonly targetAddressHandle: AddressHandle | null;
    readonly targetDeclarationSourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticResourceDefinitionsResult {
  readonly rows: readonly SemanticResourceDefinitionRow[];
}

/** Runtime/template resource kinds presented through resource discovery. Compiler syntax has a separate ownership lane. */
export const SEMANTIC_RESOURCE_INVENTORY_KINDS = [
  ResourceDefinitionKind.CustomElement,
  ResourceDefinitionKind.CustomAttribute,
  ResourceDefinitionKind.TemplateController,
  ResourceDefinitionKind.ValueConverter,
  ResourceDefinitionKind.BindingBehavior,
] as const;

export type SemanticResourceInventoryKind = typeof SEMANTIC_RESOURCE_INVENTORY_KINDS[number];

export const enum SemanticResourceInventoryMetadataState {
  /** A converged definition with authored/runtime metadata is available. */
  FullDefinition = 'full-definition',
  /** A named resource header is known, but no full definition was materialized. */
  HeaderOnly = 'header-only',
  /** Only an effective compiler/DI visibility row is known. */
  VisibilityOnly = 'visibility-only',
}

export const enum SemanticResourceInventoryOriginKind {
  /** Resource declaration belongs to the selected authored project boundary. */
  Project = 'project',
  /** Resource declaration belongs to another package with authoritative package ownership. */
  Package = 'package',
  /** Resource is supplied by a modeled Aurelia framework/plugin catalog. */
  Framework = 'framework',
  /** Resource declaration is outside the authored project without authoritative package ownership. */
  External = 'external',
  /** No declaration ownership could be proved. */
  Unknown = 'unknown',
}

/** Closed provenance for modeled Aurelia resource catalogs. Null for resources outside a modeled catalog. */
export const enum SemanticResourceInventoryCatalogOwnerKind {
  /** Resources owned by Aurelia's core runtime-html catalog. */
  CoreFramework = 'core-framework',
  /** Resources owned by an officially modeled Aurelia plugin catalog. */
  OfficialPlugin = 'official-plugin',
}

export const enum SemanticResourceInventoryLocalityKind {
  /** Ordinary project/package/framework resource definition. */
  Project = 'project',
  /** Compiler-local `<template as-custom-element>` definition. */
  LocalTemplate = 'local-template',
}

export const enum SemanticResourceNavigationUnavailableReason {
  /** No exact authored public-name or implementation token is retained. */
  NoAuthoredSource = 'no-authored-source',
  /** The retained source is external/catalog metadata without a host-navigable path. */
  ExternalCatalog = 'external-catalog',
}

export const enum SemanticResourceInventoryNavigationRole {
  /** Exact authored public resource-name token. */
  PublicName = 'public-name',
  /** Exact implementation token used when no authored public name exists. */
  Implementation = 'implementation',
  /** Exact authored bindable property name. */
  BindableName = 'bindable-name',
  /** Exact authored bindable attribute name used when the property name is unavailable. */
  BindableAttribute = 'bindable-attribute',
  /** Exact implementation property token used when authored bindable metadata is unavailable. */
  BindableProperty = 'bindable-property',
  /** Broader bindable declaration source used only as the final authored fallback. */
  BindableDeclaration = 'bindable-declaration',
}

export interface SemanticResourceInventoryOrigin {
  readonly kind: SemanticResourceInventoryOriginKind | `${SemanticResourceInventoryOriginKind}`;
  readonly projectKey: string | null;
  readonly packageName: string | null;
  readonly moduleKey: string | null;
  readonly catalogGroup: string | null;
  /** Core/plugin ownership for modeled Aurelia catalogs; null exactly when `kind` is not `framework`. */
  readonly catalogOwnerKind:
    | SemanticResourceInventoryCatalogOwnerKind
    | `${SemanticResourceInventoryCatalogOwnerKind}`
    | null;
}

export interface SemanticResourceInventorySources {
  /** Exact authored public resource-name token, when one exists. */
  readonly publicName: SemanticSourceReference | null;
  /** Full declaration/carrier source for outline and explanation. */
  readonly declaration: SemanticSourceReference | null;
  /** Exact implementation/target token when distinct from the public name. */
  readonly implementation: SemanticSourceReference | null;
  /** Authoritative default navigation target: public name first, otherwise the exact implementation token. */
  readonly navigation: SemanticSourceReference | null;
  /** Semantic role of the selected navigation source; null exactly when navigation is unavailable. */
  readonly navigationRole:
    | SemanticResourceInventoryNavigationRole
    | `${SemanticResourceInventoryNavigationRole}`
    | null;
  readonly navigationUnavailableReason:
    | SemanticResourceNavigationUnavailableReason
    | `${SemanticResourceNavigationUnavailableReason}`
    | null;
}

export interface SemanticResourceInventoryAliasRow extends SemanticResourceDefinitionAliasRow {
  readonly identityKey: string;
  readonly registrationKey: string | null;
}

export interface SemanticResourceInventoryBindableRow extends SemanticResourceDefinitionBindableRow {
  readonly identityKey: string;
  readonly primary: boolean;
  /** Authoritative authored token for the bindable child in discovery presentations. */
  readonly navigationSource: SemanticSourceReference | null;
  /** Semantic role of the selected bindable navigation source. */
  readonly navigationRole:
    | SemanticResourceInventoryNavigationRole
    | `${SemanticResourceInventoryNavigationRole}`
    | null;
}

export interface SemanticResourceInventoryLocality {
  readonly kind: SemanticResourceInventoryLocalityKind | `${SemanticResourceInventoryLocalityKind}`;
  readonly ownerIdentityKey: string | null;
  readonly ownerName: string | null;
  readonly ownerSource: SemanticSourceReference | null;
}

export interface SemanticResourceInventoryRow {
  /**
   * Opaque deterministic projection of semantic owner identity; never a store-local kernel handle.
   * A unique TypeScript declaration owner keeps its name-insensitive base identity. Lower-authority rows sharing that
   * owner and registration kind receive deterministic variants; competing full definitions are invalid.
   */
  readonly identityKey: string;
  readonly projectKey: string;
  readonly resourceKind: SemanticResourceInventoryKind;
  readonly name: string;
  readonly registrationKey: string | null;
  readonly aliases: readonly SemanticResourceInventoryAliasRow[];
  readonly bindables: readonly SemanticResourceInventoryBindableRow[];
  readonly declarationModes: readonly SemanticResourceDeclarationMode[];
  readonly metadataState: SemanticResourceInventoryMetadataState | `${SemanticResourceInventoryMetadataState}`;
  readonly origin: SemanticResourceInventoryOrigin;
  readonly locality: SemanticResourceInventoryLocality;
  readonly sources: SemanticResourceInventorySources;
}

export interface SemanticResourceInventoryCompleteness {
  readonly fullDefinitions: number;
  readonly headerOnly: number;
  readonly visibilityOnly: number;
  readonly localTemplates: number;
  readonly excludedCompilerSyntax: number;
  readonly unnamedDefinitions: number;
  readonly unresolvedModules: number;
  readonly openVisibility: number;
}

export interface SemanticResourceInventoryResult {
  readonly displayText: string;
  readonly projectKey: string;
  readonly projectRoot: string;
  /** Whether bindable rows include the opt-in TypeChecker value-type projection. */
  readonly typeSurfacesIncluded: boolean;
  readonly rows: readonly SemanticResourceInventoryRow[];
  readonly completeness: SemanticResourceInventoryCompleteness;
}

export const enum SemanticTemplateResourceAvailabilityState {
  /** The selected compiler scope proves this resource is effective. */
  Available = 'available',
  /** Visibility was requested but its container/admission path remains open. */
  Open = 'open',
}

export interface SemanticTemplateResourceScopeCandidate {
  readonly templateIdentityKey: string;
  readonly scopeIdentityKey: string;
  readonly definitionName: string;
  readonly compilationLane: 'app-runtime' | 'authoring';
  readonly source: SemanticSourceReference | null;
}

export interface SemanticTemplateResourceAvailabilityRow {
  readonly resource: SemanticResourceInventoryRow;
  readonly state: SemanticTemplateResourceAvailabilityState | `${SemanticTemplateResourceAvailabilityState}`;
  readonly visibilityKind: TemplateResourceVisibilityKind | `${TemplateResourceVisibilityKind}`;
  /** Registration/configuration/dependency source that made this resource visible in the selected scope. */
  readonly availabilitySource: SemanticSourceReference | null;
}

export interface SemanticTemplateResourceAvailabilityResult {
  readonly displayText: string;
  readonly projectKey: string;
  readonly projectRoot: string;
  /** Whether resource bindable rows include the opt-in TypeChecker value-type projection. */
  readonly typeSurfacesIncluded: boolean;
  readonly selectedTemplate: SemanticTemplateResourceScopeCandidate | null;
  readonly candidates: readonly SemanticTemplateResourceScopeCandidate[];
  readonly rows: readonly SemanticTemplateResourceAvailabilityRow[];
  readonly completeness: SemanticResourceInventoryCompleteness;
}

export type SemanticResourceAvailabilityExplanationConclusionKind =
  | 'available'
  | 'shadowed'
  | 'configured-out'
  | 'not-admitted'
  | 'admission-unknown';

/** One exact top-level resource interpreted through its canonical runtime lookup key in one compiler scope. */
export interface SemanticResourceAvailabilityExplanationSubject {
  /** Structural identity used to reprove that a fresh answer still describes the same resource/template pair. */
  readonly subjectKey: string;
  readonly projectKey: string;
  readonly resourceIdentityKey: string;
  readonly resourceKind: SemanticResourceInventoryKind;
  readonly name: string;
  /** V1 deliberately explains only the canonical resource name, never an alias child from inventory metadata. */
  readonly lookupKind: 'canonical-name';
  readonly registrationKey: string;
  readonly resource: SemanticResourceInventoryRow;
  readonly template: SemanticTemplateResourceScopeCandidate;
}

export interface SemanticResourceAvailabilityExplanationConclusion {
  readonly kind: SemanticResourceAvailabilityExplanationConclusionKind;
  readonly title: string;
  readonly explanation: string;
  readonly action: string;
}

export interface SemanticResourceAvailabilityExplanationExclusionEvidence {
  readonly reason: 'duplicate-product' | 'lookup-key-conflict';
  readonly lookupKeys: readonly string[];
  readonly contenderLane: 'local' | 'parent';
  readonly contenderSource: SemanticSourceReference | null;
  readonly winnerSource: SemanticSourceReference | null;
}

export interface SemanticResourceAvailabilityExplanationConfigurationEvidence {
  readonly state: 'excluded' | 'open' | 'not-indicated';
  readonly requiredCapability: FrameworkRegistrationCapability | `${FrameworkRegistrationCapability}` | null;
  readonly sources: readonly SemanticSourceReference[];
}

export interface SemanticResourceAvailabilityExplanationBlocker {
  readonly kind: 'open-seam';
  readonly seamKindKey: string;
  readonly summary: string;
  readonly reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
  readonly boundaryKinds: readonly (OpenSeamBoundaryKind | `${OpenSeamBoundaryKind}`)[];
  readonly sources: readonly SemanticSourceReference[];
}

export interface SemanticResourceAvailabilityExplanationEvidence {
  /** Effective canonical-key winner; equal to the subject resource when the requested resource is available. */
  readonly effectiveResource: SemanticResourceInventoryRow | null;
  readonly availabilitySource: SemanticSourceReference | null;
  readonly exclusion: SemanticResourceAvailabilityExplanationExclusionEvidence | null;
  readonly configuration: SemanticResourceAvailabilityExplanationConfigurationEvidence;
  readonly blockers: readonly SemanticResourceAvailabilityExplanationBlocker[];
}

export type SemanticResourceAvailabilityExplanationUncertaintyReason =
  | 'registration-admission-open'
  | 'configuration-membership-open'
  | 'component-scope-lineage-open'
  | 'blocking-open-seam'
  | 'unresolved-modules'
  | 'source-discovery-truncated';

export interface SemanticResourceAvailabilityExplanationUncertainty {
  readonly state: 'closed' | 'open' | 'truncated';
  readonly reasons: readonly SemanticResourceAvailabilityExplanationUncertaintyReason[];
  readonly explanation: string;
}

export interface SemanticResourceAvailabilityExplanationCurrentness {
  readonly authority: 'answer-analysis-basis';
  readonly explanation: string;
}

export interface SemanticResourceAvailabilityExplanationNextStep {
  readonly kind: 'inspect-source' | 'inspect-query' | 'requery';
  readonly label: string;
  readonly source: SemanticSourceReference | null;
  readonly relatedQueryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}` | null;
  readonly targetQuery: SemanticAppQuery | null;
}

export interface SemanticResourceAvailabilityExplanation {
  readonly subject: SemanticResourceAvailabilityExplanationSubject;
  readonly conclusion: SemanticResourceAvailabilityExplanationConclusion;
  readonly evidence: SemanticResourceAvailabilityExplanationEvidence;
  readonly uncertainty: SemanticResourceAvailabilityExplanationUncertainty;
  readonly currentness: SemanticResourceAvailabilityExplanationCurrentness;
  readonly nextSteps: readonly SemanticResourceAvailabilityExplanationNextStep[];
}

export interface SemanticResourceAvailabilityExplanationContender {
  readonly subject: SemanticResourceAvailabilityExplanationSubject;
  readonly conclusionKind: SemanticResourceAvailabilityExplanationConclusionKind;
}

export interface SemanticResourceAvailabilityExplanationResult {
  readonly displayText: string;
  readonly projectKey: string;
  readonly explanation: SemanticResourceAvailabilityExplanation | null;
  readonly contenders: readonly SemanticResourceAvailabilityExplanationContender[];
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
    readonly failureKind: import('../di/di-issue.js').DiRegistryApplicationFailureKind | null;
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
  readonly subjectName: string | null;
  readonly source: SemanticSourceReference | null;
  readonly relatedInformation: readonly SemanticDiagnosticRelatedInformation[];
  readonly suggestion: SemanticTemplateCursorSuggestionRow | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly relatedSourceAddressHandles: readonly AddressHandle[];
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

/** Compact owner reference shared by every observed-dependency family. */
export interface SemanticObservedDependencyOwnerRow {
  /** Answer-local owner key suitable for focused follow-up queries in the same app epoch. */
  readonly ownerKey: string;
  readonly kind: RuntimeExpressionAccessOwnerKind | `${RuntimeExpressionAccessOwnerKind}`;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle | null;
    readonly identityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

/** Lossless public projection of one owner-qualified observed read occurrence. */
export interface SemanticObservedDependencyOccurrenceRow {
  readonly dependencyKind: RuntimeObservedDependencyKind | `${RuntimeObservedDependencyKind}`;
  readonly expressionKind: string;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  readonly memberName: string | null;
  readonly keyExpression: string | null;
  readonly methodName: string | null;
  readonly accessUse: SemanticRuntimeExpressionAccessUseOccurrenceRow;
  readonly observedMemberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null;
  readonly observedMemberSource: SemanticSourceReference | null;
  readonly observedMemberSourceState: SemanticObservedMemberSourceState;
  readonly observedMemberSourceRoute: SemanticObservedMemberSourceRoute | null;
  readonly scopeLookupAncestor: number | null;
  readonly spanStart: number | null;
  readonly spanEnd: number | null;
  /** Authored token for the observed value carrier; it can differ from the inducing operation token. */
  readonly memberTokenSource: SemanticSourceReference | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly accessUseProductHandle: ProductHandle;
    readonly observedMemberSourceAddressHandle: AddressHandle | null;
    readonly sourceFileAddressHandle: AddressHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticComputedObserverObservedDependencyRow {
  readonly projectKey: string;
  readonly observerKind: ComputedObserverRuntimeKind | `${ComputedObserverRuntimeKind}`;
  readonly className: string | null;
  readonly memberName: string | null;
  readonly rowKey: string;
  readonly owner: SemanticObservedDependencyOwnerRow;
  readonly occurrence: SemanticObservedDependencyOccurrenceRow;
  readonly handles?: {
    readonly computedObserverProductHandle: ProductHandle | null;
    readonly observedDependencyProductHandle: ProductHandle;
    readonly observedDependencyIdentityHandle: IdentityHandle;
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
  readonly rowKey: string;
  readonly owner: SemanticObservedDependencyOwnerRow;
  readonly occurrence: SemanticObservedDependencyOccurrenceRow;
  readonly handles?: {
    readonly effectProductHandle: ProductHandle | null;
    readonly observedDependencyProductHandle: ProductHandle;
    readonly observedDependencyIdentityHandle: IdentityHandle;
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
  | 'analysis'
  | 'typescript'
  | 'evaluation'
  | 'configuration'
  | 'di'
  | 'observation'
  | 'template'
  | 'resource'
  | 'state'
  | 'framework'
  | 'validation'
  | 'fetch-client'
  | 'dialog'
  | 'router'
  | 'route-recognizer';

/** Closed lifecycle phases projected through template diagnostics. */
export type SemanticTemplateDiagnosticPhase =
  | TypeSystemDiagnosticPhase
  | TemplateCompilerIssuePhase
  | `${TemplateCompilerIssuePhase}`
  | RuntimeControllerIssuePhase
  | `${RuntimeControllerIssuePhase}`
  | RuntimeRendererIssuePhase
  | `${RuntimeRendererIssuePhase}`
  | RuntimeBindingIssuePhase
  | `${RuntimeBindingIssuePhase}`
  | RuntimeBindingBehaviorIssuePhase
  | `${RuntimeBindingBehaviorIssuePhase}`
  | RuntimeValueConverterIssuePhase
  | `${RuntimeValueConverterIssuePhase}`
  | RuntimeBindingScopeIssuePhase
  | `${RuntimeBindingScopeIssuePhase}`
  | RouterIssuePhase
  | `${RouterIssuePhase}`;

/** Domain-local diagnostic lifecycle phase; interpret together with `diagnosticDomain`. */
export type SemanticAppDiagnosticPhase =
  | SemanticTemplateDiagnosticPhase
  | EvaluationIssuePhase
  | `${EvaluationIssuePhase}`
  | ConfigurationIssuePhase
  | `${ConfigurationIssuePhase}`
  | DiIssuePhase
  | `${DiIssuePhase}`
  | ObservationIssuePhase
  | `${ObservationIssuePhase}`
  | ResourceIssuePhase
  | `${ResourceIssuePhase}`
  | StateIssuePhase
  | `${StateIssuePhase}`
  | ValidationIssuePhase
  | `${ValidationIssuePhase}`
  | FetchClientIssuePhase
  | `${FetchClientIssuePhase}`
  | DialogIssuePhase
  | `${DialogIssuePhase}`;

/** Closed subject vocabulary projected by normalized diagnostics; interpret domain-local members with `diagnosticDomain`. */
export type SemanticDiagnosticSubjectKind =
  | 'template-syntax'
  | 'template-member-access'
  | 'template-member-call'
  | 'template-expression'
  | 'observation-member'
  | EvaluationIssueSubjectKind
  | `${EvaluationIssueSubjectKind}`
  | DiIssueSubjectKind
  | `${DiIssueSubjectKind}`
  | ResourceDefinitionKind
  | `${ResourceDefinitionKind}`;

export interface SemanticDiagnosticSubject {
  readonly subjectKind: SemanticDiagnosticSubjectKind;
  readonly subjectName: string | null;
  readonly source: SemanticSourceReference | null;
}

/** TypeScript's extensible numeric diagnostic namespace, serialized in the same form as `tsc`. */
export type SemanticTypeScriptDiagnosticKind = `TS${number}`;

/** Closed semantic-runtime diagnostic kinds plus TypeScript's explicitly patterned namespace. */
export type SemanticAppDiagnosticKind =
  | SemanticProjectFindingRuleId
  | `${SemanticProjectFindingRuleId}`
  | SemanticTypeScriptDiagnosticKind
  | SemanticTemplateCursorDiagnosticKind
  | EvaluationIssueKind
  | `${EvaluationIssueKind}`
  | ConfigurationIssueKind
  | `${ConfigurationIssueKind}`
  | DiIssueKind
  | `${DiIssueKind}`
  | ObservationIssueKind
  | `${ObservationIssueKind}`
  | ResourceIssueKind
  | `${ResourceIssueKind}`
  | StateIssueKind
  | `${StateIssueKind}`
  | ValidationIssueKind
  | `${ValidationIssueKind}`
  | FetchClientIssueKind
  | `${FetchClientIssueKind}`
  | DialogIssueKind
  | `${DialogIssueKind}`
  | RouterIssueKind
  | `${RouterIssueKind}`
  | RouteRecognizerIssueKind
  | `${RouteRecognizerIssueKind}`;

/** Product-grounded relationship from one diagnostic fact to another. */
export const enum SemanticDiagnosticRelationKind {
  /** Both diagnostics describe the same modeled operation through different authorities. */
  SameOperationEvidence = 'same-operation-evidence',
  /** This diagnostic is an analysis consequence of the related diagnostic fact. */
  DerivedConsequence = 'derived-consequence',
}

/** Exact semantic edge retained independently from any user-facing presentation policy. */
export interface SemanticDiagnosticRelation {
  readonly relationKind: SemanticDiagnosticRelationKind | `${SemanticDiagnosticRelationKind}`;
  /** Identity of the diagnostic fact to which this row is related. */
  readonly relatedDiagnosticIdentityHandle: IdentityHandle;
}

export interface SemanticDiagnosticRelatedInformation {
  readonly message: string;
  readonly source: SemanticSourceReference | null;
  /** Semantic relationship to the owning diagnostic when the producer has a typed relation vocabulary. */
  readonly relationKind?: ObservationIssueRelatedSourceKind | `${ObservationIssueRelatedSourceKind}` | null;
  /** Diagnostic code carried by a related diagnostic, distinct from `relationKind`. */
  readonly code?: string | null;
  readonly sourceRole?: SourceFileRole | `${SourceFileRole}` | null;
}

export interface SemanticAppDiagnosticRow {
  readonly projectKey: string;
  readonly diagnosticDomain: SemanticAppDiagnosticDomain;
  /** Null only when the owning diagnostic product does not currently publish a phase. */
  readonly phase: SemanticAppDiagnosticPhase | null;
  readonly diagnosticKind: SemanticAppDiagnosticKind;
  readonly diagnosticAuthority: SemanticTemplateCursorDiagnosticAuthority | 'semantic-runtime-product' | 'semantic-authoring-policy' | 'typescript';
  /** TypeScript checker code retained structurally for direct and template-overlay diagnostics. */
  readonly typeScriptDiagnosticCode?: number;
  readonly frameworkErrorCode: string | null;
  readonly frameworkRawErrorAuthority: string | null;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly summary: string;
  readonly missingInput: string | null;
  readonly missingInputs: readonly string[];
  readonly source: SemanticSourceReference | null;
  readonly subject: SemanticDiagnosticSubject | null;
  /**
   * Always-on answer-local semantic identity used by diagnostic relations, independent from optional detail handles.
   * Null when the row is not backed by one uniquely identified semantic product; not durable across app generations.
   */
  readonly diagnosticIdentityHandle: IdentityHandle | null;
  readonly diagnosticRelations?: readonly SemanticDiagnosticRelation[];
  readonly relatedInformation: readonly SemanticDiagnosticRelatedInformation[];
  readonly suggestion: SemanticTemplateCursorSuggestionRow | null;
  /** Boot-admitted source role when the diagnostic can be tied back to an authored project file. */
  readonly sourceRole: SourceFileRole | `${SourceFileRole}` | null;
  readonly relatedQueryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`;
  readonly handles?: {
    readonly productHandle: ProductHandle | null;
    readonly identityHandle: IdentityHandle | null;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly relatedSourceAddressHandles: readonly AddressHandle[];
    readonly templateSourceAddressHandle: AddressHandle | null;
    readonly resourceDefinitionProductHandle: ProductHandle | null;
    /** Generated-overlay origin facts; null together for diagnostics produced directly from authored products. */
    readonly overlayOriginKey: string | null;
    readonly overlayFileName: string | null;
    readonly overlaySegmentLabel: string | null;
  };
}

export type SemanticDiagnosticPresentationRole =
  | 'primary'
  | 'contextual';

export type SemanticDiagnosticPresentationRelation =
  | 'same-subject'
  | 'semantic-explanation'
  | 'checker-evidence'
  | 'derived-consequence'
  | 'runtime-consequence';

export interface SemanticDiagnosticPresentationRow {
  readonly rowId: string;
  readonly rowIndex: number;
  readonly role: SemanticDiagnosticPresentationRole;
  readonly relation: SemanticDiagnosticPresentationRelation | null;
}

export interface SemanticDiagnosticPresentationGroup {
  readonly groupKey: string;
  readonly subject: SemanticDiagnosticSubject | null;
  readonly primary: SemanticDiagnosticPresentationRow;
  readonly related: readonly SemanticDiagnosticPresentationRow[];
  readonly rawRowCount: number;
  readonly primarySeverity: SemanticTemplateCursorDiagnosticSeverity;
  readonly maxRawSeverity: SemanticTemplateCursorDiagnosticSeverity;
}

export type SemanticDiagnosticPresentationWithheldReason =
  | 'context-only-weak-owner';

/** Answer-local reference to a raw diagnostic fact intentionally withheld from user-facing primary groups. */
export interface SemanticDiagnosticPresentationWithheldRow {
  readonly rowId: string;
  readonly rowIndex: number;
  readonly reason: SemanticDiagnosticPresentationWithheldReason;
}

export interface SemanticDiagnosticPresentationResult {
  readonly rawRowCount: number;
  readonly primaryCount: number;
  readonly contextualCount: number;
  readonly withheldCount: number;
  readonly complete: boolean;
  readonly groups: readonly SemanticDiagnosticPresentationGroup[];
  readonly withheld: readonly SemanticDiagnosticPresentationWithheldRow[];
}

export interface SemanticAppDiagnosticsResult {
  readonly displayText: string;
  readonly typeScript: SemanticRuntimeTypeSystemTypeScriptEnvironmentSummary | null;
  readonly rows: readonly SemanticAppDiagnosticRow[];
  readonly presentation?: SemanticDiagnosticPresentationResult;
}

export interface SemanticAppDiagnosticSummaryRow {
  readonly diagnosticDomain: SemanticAppDiagnosticDomain;
  readonly diagnosticKind: SemanticAppDiagnosticKind;
  readonly diagnosticAuthority: SemanticAppDiagnosticRow['diagnosticAuthority'];
  readonly frameworkErrorCode: string | null;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly relatedQueryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`;
  readonly count: number;
  readonly sourceFileCount: number;
  readonly sourceRoles: readonly SemanticSourceRoleCount[];
  readonly sampleSummary: string;
  readonly sampleSources: readonly SemanticSourceReference[];
}

export interface SemanticAppDiagnosticSummaryResult {
  readonly totalDiagnosticRows: number;
  readonly displayText: string;
  readonly typeScript: SemanticRuntimeTypeSystemTypeScriptEnvironmentSummary | null;
  readonly rows: readonly SemanticAppDiagnosticSummaryRow[];
}

export interface SemanticTypeScriptDiagnosticRelatedInformationRow {
  readonly category: TypeSystemDiagnosticCategory;
  readonly code: number;
  readonly message: string;
  readonly typescriptSource: string | null;
  readonly source: SemanticSourceReference | null;
  /** Boot-admitted source role when TypeScript related information points at an authored project file. */
  readonly sourceRole: SourceFileRole | `${SourceFileRole}` | null;
}

export interface SemanticTypeScriptDiagnosticRow {
  readonly projectKey: string;
  readonly phase: TypeSystemDiagnosticPhase;
  readonly category: TypeSystemDiagnosticCategory;
  readonly code: number;
  readonly diagnosticKind: SemanticTypeScriptDiagnosticKind;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly message: string;
  readonly typescriptSource: string | null;
  readonly source: SemanticSourceReference | null;
  /** Boot-admitted source role; this is distinct from TypeScript's own optional diagnostic `source` label. */
  readonly sourceRole: SourceFileRole | `${SourceFileRole}` | null;
  readonly relatedInformation: readonly SemanticTypeScriptDiagnosticRelatedInformationRow[];
}

export interface SemanticTypeScriptDiagnosticsResult {
  readonly displayText: string;
  readonly typeScript: SemanticRuntimeTypeSystemTypeScriptEnvironmentSummary;
  readonly rows: readonly SemanticTypeScriptDiagnosticRow[];
}

export interface SemanticTypeScriptDiagnosticSummaryRow {
  readonly phase: TypeSystemDiagnosticPhase;
  readonly category: TypeSystemDiagnosticCategory;
  readonly code: number;
  readonly diagnosticKind: SemanticTypeScriptDiagnosticKind;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly typescriptSource: string | null;
  readonly count: number;
  readonly sourceFileCount: number;
  readonly sourceRoles: readonly SemanticSourceRoleCount[];
  readonly sampleMessage: string;
  readonly sampleSources: readonly SemanticSourceReference[];
}

export interface SemanticTypeScriptDiagnosticSummaryResult {
  readonly totalDiagnosticRows: number;
  readonly displayText: string;
  readonly typeScript: SemanticRuntimeTypeSystemTypeScriptEnvironmentSummary;
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
  readonly containerSource: SemanticSourceReference | null;
  readonly registrationSource: SemanticSourceReference | null;
  readonly configurationValueSource: SemanticSourceReference | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly containerProductHandle: ProductHandle | null;
    readonly containerIdentityHandle: IdentityHandle | null;
    readonly registrationProductHandle: ProductHandle;
    readonly registrationAdmissionProductHandle: ProductHandle;
    readonly registrationSourceAddressHandle: AddressHandle | null;
    readonly configurationStepProductHandle: ProductHandle;
    readonly configurationStepIdentityHandle: IdentityHandle;
    readonly configurationValueSourceAddressHandle: AddressHandle | null;
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

export interface SemanticStateGetterBindingRow {
  /** Source-level decorator projection; applied controller ownership is not represented by this row yet. */
  readonly projectKey: string;
  readonly targetKind: string;
  readonly targetName: string | null;
  readonly storeName: string | null;
  readonly usesDynamicStoreName: boolean;
  readonly storeResolutionKind: StateGetterBindingStoreResolutionKind | `${StateGetterBindingStoreResolutionKind}`;
  readonly selectorText: string;
  readonly selectorReturnType: string | null;
  readonly targetMemberType: string | null;
  readonly openReason: string | null;
  readonly source: SemanticSourceReference | null;
  readonly selectorSource: SemanticSourceReference | null;
  readonly targetSource: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly sourceAddressHandle: AddressHandle;
    readonly selectorSourceAddressHandle: AddressHandle;
    readonly targetSourceAddressHandle: AddressHandle | null;
    readonly storeProductHandle: ProductHandle | null;
    readonly storeIdentityHandle: IdentityHandle | null;
    readonly selectorReturnTypeProductHandle: ProductHandle | null;
    readonly targetMemberTypeProductHandle: ProductHandle | null;
  };
}

export interface SemanticStateGetterBindingsResult {
  readonly rows: readonly SemanticStateGetterBindingRow[];
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

export type SemanticFrameworkCapabilityDemandActionability =
  | 'registered'
  | 'missing-registration'
  | 'configuration-excludes-surface'
  | 'registration-status-unknown'
  | 'provider-visible-chain-unproven';

export interface SemanticFrameworkCapabilityPackageEvidenceRow {
  readonly evidenceKind: FrameworkCapabilityPackageEvidenceKind | `${FrameworkCapabilityPackageEvidenceKind}`;
  readonly packageName: string;
  readonly moduleName: string;
  readonly scope: FrameworkCapabilityPackageEvidenceScope;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticFrameworkCapabilityDemandRow {
  readonly projectKey: string;
  readonly siteKind: FrameworkCapabilityDemandSiteKind | `${FrameworkCapabilityDemandSiteKind}`;
  readonly demandKind: FrameworkCapabilityDemandKind | `${FrameworkCapabilityDemandKind}`;
  readonly requiredCapability: FrameworkRegistrationCapability | `${FrameworkRegistrationCapability}`;
  readonly requiredRegistrationKinds: readonly (FrameworkRegistrationKind | `${FrameworkRegistrationKind}`)[];
  readonly candidateModuleNames: readonly string[];
  readonly admissionState: FrameworkCapabilityAdmissionState | `${FrameworkCapabilityAdmissionState}`;
  readonly availabilityState: FrameworkCapabilityAvailabilityState | `${FrameworkCapabilityAvailabilityState}`;
  readonly actionability: SemanticFrameworkCapabilityDemandActionability;
  readonly packageEvidence: readonly SemanticFrameworkCapabilityPackageEvidenceRow[];
  readonly recommendedModuleName: string | null;
  readonly authoredName: string;
  readonly source: SemanticSourceReference | null;
  readonly templateSource: SemanticSourceReference | null;
  readonly admissionSources: readonly SemanticSourceReference[];
  readonly configurationSources: readonly SemanticSourceReference[];
  readonly blockingOpenSeamSources: readonly SemanticSourceReference[];
  readonly blockingOpenSeamCount: number;
  readonly relatedQueryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`;
  readonly summary: string;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly ownerIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly templateSourceAddressHandle: AddressHandle | null;
    readonly resourceDefinitionProductHandle: ProductHandle | null;
    readonly analysisContextProductHandle: ProductHandle | null;
    readonly admissionSourceAddressHandles: readonly AddressHandle[];
    readonly configurationSourceAddressHandles: readonly AddressHandle[];
    readonly blockingOpenSeamHandles: readonly OpenSeamHandle[];
  };
}

export interface SemanticFrameworkCapabilityDemandsResult {
  readonly displayText: string;
  readonly rows: readonly SemanticFrameworkCapabilityDemandRow[];
}

export type SemanticFrameworkCapabilityExplanationConclusionKind =
  | 'available'
  | 'configured-out'
  | 'not-admitted'
  | 'admission-unknown'
  | 'provider-chain-unproven';

export interface SemanticFrameworkCapabilityExplanationSubject {
  readonly projectKey: string;
  readonly authoredName: string;
  readonly siteKind: FrameworkCapabilityDemandSiteKind | `${FrameworkCapabilityDemandSiteKind}`;
  readonly demandKind: FrameworkCapabilityDemandKind | `${FrameworkCapabilityDemandKind}`;
  readonly requiredCapability: FrameworkRegistrationCapability | `${FrameworkRegistrationCapability}`;
  readonly source: SemanticSourceReference;
  readonly templateSource: SemanticSourceReference | null;
}

export interface SemanticFrameworkCapabilityExplanationConclusion {
  readonly kind: SemanticFrameworkCapabilityExplanationConclusionKind;
  readonly title: string;
  readonly explanation: string;
  readonly action: string;
}

export interface SemanticFrameworkCapabilityExplanationAdmissionEvidence {
  readonly state: FrameworkCapabilityAdmissionState | `${FrameworkCapabilityAdmissionState}`;
  readonly requiredRegistrationKinds: readonly (FrameworkRegistrationKind | `${FrameworkRegistrationKind}`)[];
  readonly sources: readonly SemanticSourceReference[];
}

export interface SemanticFrameworkCapabilityExplanationConfigurationEvidence {
  readonly state: 'excluded' | 'open' | 'not-indicated';
  readonly sources: readonly SemanticSourceReference[];
}

export interface SemanticFrameworkCapabilityExplanationPackageEvidence {
  readonly availabilityState: FrameworkCapabilityAvailabilityState | `${FrameworkCapabilityAvailabilityState}`;
  readonly candidateModuleNames: readonly string[];
  readonly recommendedModuleName: string | null;
  readonly evidence: readonly SemanticFrameworkCapabilityPackageEvidenceRow[];
}

export interface SemanticFrameworkCapabilityExplanationBlocker {
  readonly kind: 'open-seam';
  readonly seamKindKey: string;
  readonly summary: string;
  readonly reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
  readonly boundaryKinds: readonly (OpenSeamBoundaryKind | `${OpenSeamBoundaryKind}`)[];
  readonly sources: readonly SemanticSourceReference[];
}

export interface SemanticFrameworkCapabilityExplanationEvidence {
  readonly admission: SemanticFrameworkCapabilityExplanationAdmissionEvidence;
  readonly configuration: SemanticFrameworkCapabilityExplanationConfigurationEvidence;
  readonly package: SemanticFrameworkCapabilityExplanationPackageEvidence;
  readonly blockers: readonly SemanticFrameworkCapabilityExplanationBlocker[];
}

export type SemanticFrameworkCapabilityExplanationUncertaintyReason =
  | 'admission-status-unknown'
  | 'provider-chain-unproven'
  | 'blocking-open-seam'
  | 'source-discovery-truncated'
  | 'configuration-source-unavailable';

export interface SemanticFrameworkCapabilityExplanationUncertainty {
  readonly state: 'closed' | 'open' | 'truncated';
  readonly reasons: readonly SemanticFrameworkCapabilityExplanationUncertaintyReason[];
  readonly explanation: string;
}

export interface SemanticFrameworkCapabilityExplanationCurrentness {
  readonly authority: 'answer-analysis-basis';
  readonly explanation: string;
}

export interface SemanticFrameworkCapabilityExplanationNextStep {
  readonly kind: 'inspect-source' | 'inspect-query' | 'requery';
  readonly label: string;
  readonly source: SemanticSourceReference | null;
  readonly relatedQueryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}` | null;
  readonly targetQuery: SemanticAppQuery | null;
}

export interface SemanticFrameworkCapabilityExplanation {
  readonly subject: SemanticFrameworkCapabilityExplanationSubject;
  readonly conclusion: SemanticFrameworkCapabilityExplanationConclusion;
  readonly evidence: SemanticFrameworkCapabilityExplanationEvidence;
  readonly uncertainty: SemanticFrameworkCapabilityExplanationUncertainty;
  readonly currentness: SemanticFrameworkCapabilityExplanationCurrentness;
  readonly nextSteps: readonly SemanticFrameworkCapabilityExplanationNextStep[];
}

export interface SemanticFrameworkCapabilityExplanationContender {
  readonly subject: SemanticFrameworkCapabilityExplanationSubject;
  readonly conclusionKind: SemanticFrameworkCapabilityExplanationConclusionKind;
}

export interface SemanticFrameworkCapabilityExplanationResult {
  readonly displayText: string;
  readonly projectKey: string;
  readonly explanation: SemanticFrameworkCapabilityExplanation | null;
  readonly contenders: readonly SemanticFrameworkCapabilityExplanationContender[];
}

export interface SemanticRouteConfigComponentRow {
  readonly componentKind: RouteableComponentKind | `${RouteableComponentKind}`;
  /** Authored class, alias, or resource spelling. */
  readonly name: string | null;
  /** Custom-element registration name after routeable resolution. */
  readonly resolvedName: string | null;
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
  readonly appRootComponentName: string | null;
  readonly appRootSource: SemanticSourceReference | null;
  readonly registrationSource: SemanticSourceReference | null;
  readonly configurationValueSource: SemanticSourceReference | null;
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
    readonly appRootProductHandle: ProductHandle | null;
    readonly appRootIdentityHandle: IdentityHandle | null;
    readonly containerProductHandle: ProductHandle | null;
    readonly containerIdentityHandle: IdentityHandle | null;
    readonly registrationProductHandle: ProductHandle;
    readonly registrationSourceAddressHandle: AddressHandle | null;
    readonly configurationValueSourceAddressHandle: AddressHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRouterOptionsResult {
  readonly rows: readonly SemanticRouterOptionsRow[];
}

export interface SemanticRouteConfigRow {
  readonly projectKey: string;
  /** Contribution/source-form facts for this one authored route-config input. */
  readonly routeKind: RouteConfigKind | `${RouteConfigKind}`;
  readonly originKind: RouteConfigOriginKind | `${RouteConfigOriginKind}`;
  readonly valueKind: RouteConfigValueKind | `${RouteConfigValueKind}`;
  readonly executionKind: RouteConfigExecutionKind | `${RouteConfigExecutionKind}`;
  readonly effectKind: RouteConfigContributionEffectKind | `${RouteConfigContributionEffectKind}`;
  /** Framework-shaped facts joined from the associated definition or per-use applied RouteConfig. */
  readonly stage: RouteConfigStageKind | `${RouteConfigStageKind}`;
  readonly closure: RouterClosureKind | `${RouterClosureKind}`;
  readonly id: string | null;
  /** Exact authored id token, or the path token from which the framework derives the id. */
  readonly idSource: SemanticSourceReference | null;
  readonly paths: readonly string[];
  /** Exact authored path tokens in `paths` order. */
  readonly pathSources: readonly (SemanticSourceReference | null)[];
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
  readonly fieldStates: Readonly<Record<RouteConfigValueField, RouteConfigFieldStateKind | `${RouteConfigFieldStateKind}`>>;
  readonly openFields: readonly RouteConfigValueField[];
  readonly openFieldCount: number;
  /** Cardinality and stability of the contribution-to-effective join; the source row itself is never duplicated per use. */
  readonly effectiveUseCount: number;
  readonly effectiveVariantCount: number;
  readonly effectiveFieldsStable: boolean;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly contributionProductHandle: ProductHandle;
    readonly contributionIdentityHandle: IdentityHandle;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly idSourceAddressHandle: AddressHandle | null;
    readonly pathSourceAddressHandles: readonly (AddressHandle | null)[];
  };
}

export interface SemanticRouteConfigsResult {
  readonly rows: readonly SemanticRouteConfigRow[];
}

export interface SemanticRouteContextRow {
  readonly projectKey: string;
  readonly realizationStage: RouterRealizationStageKind | `${RouterRealizationStageKind}`;
  readonly appRootComponentName: string | null;
  readonly activeClass: string | null;
  readonly useEagerLoading: boolean | null;
  readonly label: string | null;
  readonly parentLabel: string | null;
  readonly rootLabel: string | null;
  readonly routeConfigContext: {
    readonly label: string | null;
    readonly source: SemanticSourceReference | null;
  };
  readonly hasContainer: boolean;
  readonly hasHostingViewportAgentCandidate: boolean;
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
    readonly routerOptionsProductHandle: ProductHandle | null;
    readonly routerOptionsIdentityHandle: IdentityHandle | null;
    readonly hostingViewportAgentCandidateProductHandle: ProductHandle | null;
    readonly hostingViewportAgentCandidateIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRouteContextsResult {
  readonly rows: readonly SemanticRouteContextRow[];
}

export interface SemanticRouteContextParameterReadRow {
  readonly projectKey: string;
  readonly componentClassName: string | null;
  readonly ownershipKind: RouteContextParameterReadOwnershipKind | `${RouteContextParameterReadOwnershipKind}`;
  readonly knownOwnerCount: number;
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
  readonly realizationStage: RouterRealizationStageKind | `${RouterRealizationStageKind}`;
  readonly presenceCardinality: BuiltInTemplateControllerChildViewCardinality | `${BuiltInTemplateControllerChildViewCardinality}`;
  readonly name: string | null;
  readonly routeContext: {
    readonly label: string | null;
    readonly source: SemanticSourceReference | null;
  } | null;
  readonly usedBy: readonly string[] | null;
  readonly defaultComponent: string | null;
  readonly fallback: string | null;
  readonly fieldStates: {
    readonly name: ViewportFieldStateKind | `${ViewportFieldStateKind}`;
    readonly usedBy: ViewportFieldStateKind | `${ViewportFieldStateKind}`;
    readonly default: ViewportFieldStateKind | `${ViewportFieldStateKind}`;
    readonly fallback: ViewportFieldStateKind | `${ViewportFieldStateKind}`;
  };
  readonly fieldSources: {
    readonly name: SemanticSourceReference | null;
    readonly usedBy: SemanticSourceReference | null;
    readonly default: SemanticSourceReference | null;
    readonly fallback: SemanticSourceReference | null;
  };
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
  readonly realizationStage: RouterRealizationStageKind | `${RouterRealizationStageKind}`;
  readonly presenceCardinality: BuiltInTemplateControllerChildViewCardinality | `${BuiltInTemplateControllerChildViewCardinality}`;
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
  readonly realizationStage: RouterRealizationStageKind | `${RouterRealizationStageKind}`;
  readonly routeContext: {
    readonly label: string | null;
    readonly source: SemanticSourceReference | null;
  };
  readonly routeNode: SemanticRouterProductReferenceRow;
  readonly viewportAgentCandidate: SemanticRouterProductReferenceRow | null;
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
    readonly viewportAgentCandidateProductHandle: ProductHandle | null;
    readonly viewportAgentCandidateIdentityHandle: IdentityHandle | null;
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
  readonly closure: RouterClosureKind | `${RouterClosureKind}`;
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
  readonly closure: RouterClosureKind | `${RouterClosureKind}`;
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
  readonly closure: RouterClosureKind | `${RouterClosureKind}`;
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
  readonly realizationStage: RouterRealizationStageKind | `${RouterRealizationStageKind}`;
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
  readonly realizationStage: RouterRealizationStageKind | `${RouterRealizationStageKind}`;
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
  readonly viewportAgentCandidate: SemanticRouterProductReferenceRow | null;
  readonly viewportCandidateResolution: ViewportAgentCandidateResolutionKind | `${ViewportAgentCandidateResolutionKind}` | null;
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
    readonly viewportAgentCandidateProductHandle: ProductHandle | null;
    readonly viewportAgentCandidateIdentityHandle: IdentityHandle | null;
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
  readonly diagnosticAuthority: 'framework-error-code' | 'framework-runtime-behavior' | 'semantic-runtime-product' | 'semantic-authoring-policy';
  readonly frameworkErrorCode: string | null;
  readonly severity: RouterIssueSeverity;
  readonly message: string;
  readonly missingInput: string | null;
  readonly missingInputs: readonly string[];
  readonly suggestion: SemanticTemplateCursorSuggestionRow | null;
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
  readonly relatedInformation: readonly SemanticDiagnosticRelatedInformation[];
  readonly handles?: {
    readonly productHandle: ProductHandle;
    readonly identityHandle: IdentityHandle;
    readonly routeConfigProductHandle: ProductHandle | null;
    readonly routeConfigIdentityHandle: IdentityHandle | null;
    readonly recognizedRouteProductHandle: ProductHandle | null;
    readonly recognizedRouteIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly relatedSourceAddressHandles: readonly AddressHandle[];
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
  /** Author-facing resource taxonomy; use `registrationResourceKindFor` for framework registration-key joins. */
  readonly resourceKind: ResourceDefinitionKind;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly visibilityKind: TemplateResourceVisibilityKind;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly compilerWorldProductHandle: ProductHandle;
    readonly resourceProductHandle: ProductHandle | null;
    readonly resourceIdentityHandle: IdentityHandle | null;
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
  readonly compiledTemplates: number;
  readonly generatedCompiledTemplates: number;
  readonly rootRenderTargets: number;
  readonly allRenderTargets: number;
  readonly compiledTemplateState: CompiledTemplateState | `${CompiledTemplateState}`;
  readonly compiledTemplateHasSlots: boolean;
  readonly compiledTemplateNeedsCompile: false | null;
  readonly contentProjectionDefinitions: number;
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
    readonly rootCompiledTemplateProductHandle: ProductHandle;
    readonly compiledTemplateProductHandles: readonly ProductHandle[];
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTemplateCompilationResult {
  readonly rows: readonly SemanticTemplateCompilationRow[];
}

export type SemanticAttributeInterpretationExplanationConclusionKind =
  | 'instruction-backed'
  | 'captured'
  | 'compiler-control'
  | 'plain-attribute'
  | 'invalid'
  | 'open';

/** One cursor-selected top-level authored HTML attribute, independent from store-local handles. */
export interface SemanticAttributeInterpretationExplanationSubject {
  /** Structural identity used to reprove that a fresh answer still describes the same authored attribute. */
  readonly subjectKey: string;
  readonly projectKey: string;
  readonly definitionName: string;
  readonly compilationLane: SemanticTemplateCompilationRow['compilationLane'];
  readonly rawName: string;
  /** Full authored HTML attribute carrier. */
  readonly source: SemanticSourceReference;
  /** Exact top-level authored attribute-name span; this is the cursor and consumer reproof authority. */
  readonly nameSource: SemanticSourceReference;
  readonly valueSource: SemanticSourceReference | null;
  readonly templateSource: SemanticSourceReference | null;
}

export interface SemanticAttributeInterpretationExplanationConclusion {
  readonly kind: SemanticAttributeInterpretationExplanationConclusionKind;
  readonly title: string;
  readonly explanation: string;
  readonly action: string;
}

export interface SemanticAttributeInterpretationExplanationSyntaxEvidence {
  readonly syntaxKind: AttributeSyntaxKind | `${AttributeSyntaxKind}`;
  readonly target: string;
  readonly command: string | null;
  readonly parts: readonly string[];
  readonly pattern: string | null;
  readonly nameSource: SemanticSourceReference;
  readonly targetSource: SemanticSourceReference | null;
  readonly commandSource: SemanticSourceReference | null;
}

export interface SemanticAttributeInterpretationExplanationClassificationEvidence {
  readonly classificationKind: AttributeClassificationKind | `${AttributeClassificationKind}`;
  readonly resourceKind: ResourceDefinitionKind | `${ResourceDefinitionKind}` | null;
  readonly resourceName: string | null;
  readonly bindableName: string | null;
  readonly bindableAttribute: string | null;
  readonly bindingCommandName: string | null;
  readonly openReason: string | null;
}

export interface SemanticAttributeInterpretationExplanationValueSiteEvidence {
  readonly siteKind: TemplateValueSiteKind | `${TemplateValueSiteKind}`;
  readonly rawValue: string;
  readonly entryFamily: string | null;
  readonly parseState: TemplateExpressionParseState | `${TemplateExpressionParseState}` | null;
  readonly resultKind: ExpressionParseResultKind | `${ExpressionParseResultKind}` | null;
  readonly source: SemanticSourceReference | null;
}

export type SemanticAttributeInterpretationExplanationEffectKind =
  | 'hydrate-element'
  | 'hydrate-attribute'
  | 'control-view'
  | 'bind-property'
  | 'interpolate'
  | 'listen'
  | 'iterate'
  | 'assign-reference'
  | 'bind-let'
  | 'set-property'
  | 'set-attribute'
  | 'set-class'
  | 'set-style'
  | 'bind-style'
  | 'bind-attribute'
  | 'spread-bindings'
  | 'spread-value'
  | 'translate'
  | 'bind-state'
  | 'dispatch-state';

export interface SemanticAttributeInterpretationExplanationEffect {
  readonly kind: SemanticAttributeInterpretationExplanationEffectKind;
  readonly instructionKind: TemplateInstructionKind | `${TemplateInstructionKind}`;
  readonly summary: string;
  readonly source: SemanticSourceReference | null;
}

export interface SemanticAttributeInterpretationExplanationLoweringEvidence {
  readonly commandName: string;
  readonly state: BindingCommandLoweringState | `${BindingCommandLoweringState}`;
  readonly message: string | null;
  readonly frameworkErrorCode: string | null;
  /** Indexes into `evidence.effects`. */
  readonly effectIndexes: readonly number[];
  readonly source: SemanticSourceReference | null;
}

export interface SemanticAttributeInterpretationExplanationIssueEvidence {
  readonly phase: TemplateCompilerIssuePhase | `${TemplateCompilerIssuePhase}`;
  readonly issueKind: TemplateCompilerIssueKind | `${TemplateCompilerIssueKind}`;
  readonly severity: TemplateCompilerIssueSeverity;
  readonly message: string;
  readonly frameworkErrorCode: string | null;
  readonly source: SemanticSourceReference | null;
  readonly relatedSources: readonly SemanticSourceReference[];
}

export interface SemanticAttributeInterpretationExplanationBlocker {
  readonly kind: 'open-classification' | 'open-lowering' | 'open-seam';
  readonly summary: string;
  readonly reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
  readonly boundaryKinds: readonly (OpenSeamBoundaryKind | `${OpenSeamBoundaryKind}`)[];
  readonly sources: readonly SemanticSourceReference[];
}

export interface SemanticAttributeInterpretationExplanationEvidence {
  readonly syntax: SemanticAttributeInterpretationExplanationSyntaxEvidence;
  readonly classification: SemanticAttributeInterpretationExplanationClassificationEvidence | null;
  readonly valueSites: readonly SemanticAttributeInterpretationExplanationValueSiteEvidence[];
  readonly lowerings: readonly SemanticAttributeInterpretationExplanationLoweringEvidence[];
  readonly effects: readonly SemanticAttributeInterpretationExplanationEffect[];
  readonly issues: readonly SemanticAttributeInterpretationExplanationIssueEvidence[];
  readonly blockers: readonly SemanticAttributeInterpretationExplanationBlocker[];
}

export type SemanticAttributeInterpretationExplanationUncertaintyReason =
  | 'attribute-syntax-open'
  | 'attribute-classification-open'
  | 'binding-command-lowering-open'
  | 'compiler-open-seam'
  | 'source-discovery-truncated';

export interface SemanticAttributeInterpretationExplanationUncertainty {
  readonly state: 'closed' | 'open' | 'truncated';
  readonly reasons: readonly SemanticAttributeInterpretationExplanationUncertaintyReason[];
  readonly explanation: string;
}

export interface SemanticAttributeInterpretationExplanationCurrentness {
  readonly authority: 'answer-analysis-basis';
  readonly explanation: string;
}

export interface SemanticAttributeInterpretationExplanationNextStep {
  readonly kind: 'inspect-source' | 'inspect-query' | 'requery';
  readonly label: string;
  readonly source: SemanticSourceReference | null;
  readonly relatedQueryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}` | null;
  readonly targetQuery: SemanticAppQuery | null;
}

export interface SemanticAttributeInterpretationExplanation {
  readonly subject: SemanticAttributeInterpretationExplanationSubject;
  readonly conclusion: SemanticAttributeInterpretationExplanationConclusion;
  readonly evidence: SemanticAttributeInterpretationExplanationEvidence;
  readonly uncertainty: SemanticAttributeInterpretationExplanationUncertainty;
  readonly currentness: SemanticAttributeInterpretationExplanationCurrentness;
  readonly nextSteps: readonly SemanticAttributeInterpretationExplanationNextStep[];
}

export interface SemanticAttributeInterpretationExplanationContender {
  readonly subject: SemanticAttributeInterpretationExplanationSubject;
  readonly conclusionKind: SemanticAttributeInterpretationExplanationConclusionKind;
}

export interface SemanticAttributeInterpretationExplanationResult {
  readonly displayText: string;
  readonly projectKey: string;
  readonly explanation: SemanticAttributeInterpretationExplanation | null;
  readonly contenders: readonly SemanticAttributeInterpretationExplanationContender[];
}

export interface SemanticTemplateCompletionCandidateRow {
  readonly candidateKind: TemplateCompletionCandidateKind | `${TemplateCompletionCandidateKind}`;
  readonly name: string;
  readonly sourceKind: TemplateCompletionCandidateSourceKind | `${TemplateCompletionCandidateSourceKind}`;
  readonly summary: string | null;
  readonly typeDisplay: string | null;
  readonly memberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null;
  readonly memberVisibility: CheckerTypeMemberVisibilityKind | `${CheckerTypeMemberVisibilityKind}` | null;
  readonly memberIsOptional: boolean | null;
  readonly memberIsReadonly: boolean | null;
  /** True only when every current checker declaration marks the member deprecated. */
  readonly memberIsDeprecated: boolean | null;
  readonly aureliaHookKind: SemanticTemplateCompletionAureliaHookKind | `${SemanticTemplateCompletionAureliaHookKind}` | null;
  /** Complete authored edit plan; consumers must not substitute label insertion when this cannot be mapped. */
  readonly edit: SemanticTemplateCompletionEditRow;
  readonly handles?: {
    readonly productHandle: ProductHandle | null;
    readonly identityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTemplateCompletionEditRow {
  /** Exact authored token to replace, or a zero-width authored cursor for insertion. */
  readonly source: SemanticSourceReference;
  /** Candidate-specific text to insert; it may intentionally differ from the display name. */
  readonly newText: string;
}

export const enum SemanticTemplateCompletionAureliaHookKind {
  /** Callable custom-element view-model member discovered by Controller as a component lifecycle hook. */
  ComponentLifecycle = 'component-lifecycle',
  /** Callable member on a proven routed view model discovered during router transition lifecycle. */
  RouterLifecycle = 'router-lifecycle',
  /** Member is the routed component's dynamic route-configuration hook. */
  RouterConfiguration = 'router-configuration',
}

export interface SemanticTemplateCompletionFrontierRow {
  readonly frontierKind: ExpressionFrontierKind | `${ExpressionFrontierKind}` | null;
  readonly expectedContinuationClasses: readonly (ExpressionExpectedContinuationClass | `${ExpressionExpectedContinuationClass}`)[];
}

export interface SemanticTemplateCompletionResult {
  readonly displayText: string;
  readonly siteKind: TemplateCompletionSiteKind | `${TemplateCompletionSiteKind}`;
  readonly domainKind: TemplateCompletionDomainKind | `${TemplateCompletionDomainKind}` | null;
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
  /** Browser/runtime namespace for the authored element under the cursor. */
  readonly namespace: HtmlNamespaceKind | `${HtmlNamespaceKind}` | null;
  readonly attributeName: string | null;
  readonly attributeValue: string | null;
  readonly source: SemanticSourceReference | null;
  /** Exact authored opening-tag name source, distinct from the full element carrier. */
  readonly tagNameSource: SemanticSourceReference | null;
  /** Exact authored closing-tag name source when a matching close tag exists. */
  readonly closingTagNameSource: SemanticSourceReference | null;
  readonly attributeSource: SemanticSourceReference | null;
  /** Exact authored attribute value span; null for genuinely valueless syntax. */
  readonly attributeValueSource: SemanticSourceReference | null;
  readonly handles?: {
    readonly nodeProductHandle: ProductHandle | null;
    readonly attributeProductHandle: ProductHandle | null;
    readonly nodeSourceAddressHandle: AddressHandle | null;
    readonly tagNameSourceAddressHandle: AddressHandle | null;
    readonly closingTagNameSourceAddressHandle: AddressHandle | null;
    readonly attributeSourceAddressHandle: AddressHandle | null;
    readonly attributeValueSourceAddressHandle: AddressHandle | null;
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
  /** Author-facing resource taxonomy; use `registrationResourceKindFor` for framework registration-key joins. */
  readonly resourceKind: ResourceDefinitionKind | `${ResourceDefinitionKind}`;
  readonly name: string | null;
  /** Public name selected at the cursor; differs from `name` when an alias was authored. */
  readonly matchedName: string | null;
  /** Exact authored spelling selected at this cursor when it can be recovered from the owning HTML/expression carrier. */
  readonly authoredMatchedName: string | null;
  /** Browser/compiler-normalized lookup spelling for the selected authored use. */
  readonly runtimeMatchedName: string | null;
  readonly targetName: string | null;
  readonly source: SemanticSourceReference | null;
  readonly nameSource: SemanticSourceReference | null;
  readonly matchedNameSource: SemanticSourceReference | null;
  readonly targetSource: SemanticSourceReference | null;
  readonly handles?: {
    readonly definitionProductHandle: ProductHandle | null;
    readonly identityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly nameSourceAddressHandle: AddressHandle | null;
    readonly matchedNameSourceAddressHandle: AddressHandle | null;
    readonly targetAddressHandle: AddressHandle | null;
  };
}

export type SemanticTemplateUsageEffectiveBindingMode =
  | 'oneTime'
  | 'toView'
  | 'fromView'
  | 'twoWay';

/** Authority that proved how one exact bindable usage behaves after runtime binding-mode planning. */
export enum SemanticTemplateBindableUsageModeAuthority {
  ExplicitCommand = 'explicit-command',
  BindingBehavior = 'binding-behavior',
  BindableDefault = 'bindable-default',
  FrameworkFallback = 'framework-fallback',
  Interpolation = 'interpolation',
  PlainLiteral = 'plain-literal',
  Open = 'open',
}

export interface SemanticTemplateCursorBindableRow extends SemanticBindableDefinitionRow {
  readonly ownerDefinitionProductHandle: ProductHandle | null;
  /** Mode this exact usage has when its binding activates after modeled mode behaviors; not proof evaluation occurred. */
  readonly usageEffectiveMode: SemanticTemplateUsageEffectiveBindingMode | null;
  /** Exact authority for the usage mode; null when the cursor selects only bindable declaration metadata. */
  readonly usageModeAuthority: SemanticTemplateBindableUsageModeAuthority | `${SemanticTemplateBindableUsageModeAuthority}` | null;
  /** Runtime-normalized binding-command name; authored spelling remains available through HTML/source carriers. */
  readonly usageModeCommand: string | null;
  /** Exact compiler grammar lane that owns this usage. */
  readonly usageModeLocus: 'attribute' | 'attribute-pattern' | 'multi-binding' | null;
  /** Compact presentation lane proved from exact resource/bindable ownership. */
  readonly usagePresentationKind: 'bindable-attribute' | 'resource-primary' | null;
  /** Exact binding-command executable kind selected by the compiler world. */
  readonly usageModeCommandKind: 'built-in' | 'custom' | 'opaque' | 'open' | null;
  /** Exact authored syntax evidence selecting the runtime command, including `:` for shorthand pattern syntax. */
  readonly usageModeCommandSource: SemanticSourceReference | null;
  /** Exact authored target token selecting the bindable directly or through a custom-attribute primary value. */
  readonly usageModeTargetSource: SemanticSourceReference | null;
  /** Exact source that selected or explains the usage mode authority. */
  readonly usageModeSource: SemanticSourceReference | null;
  /** Honest reason a usage mode could not be closed; non-null only with `usageModeAuthority: 'open'`. */
  readonly usageModeOpenReason: string | null;
  readonly handles?: {
    readonly ownerDefinitionProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly nameSourceAddressHandle: AddressHandle | null;
    readonly attributeSourceAddressHandle: AddressHandle | null;
    readonly propertyTargetIdentityHandle: IdentityHandle | null;
    readonly propertyTargetAddressHandle: AddressHandle | null;
    readonly callbackSourceAddressHandle: AddressHandle | null;
    readonly callbackTargetIdentityHandle: IdentityHandle | null;
    readonly callbackTargetAddressHandle: AddressHandle | null;
    readonly modeSourceAddressHandle: AddressHandle | null;
    readonly setSourceAddressHandle: AddressHandle | null;
    readonly setterTargetIdentityHandle: IdentityHandle | null;
    readonly setterTargetAddressHandle: AddressHandle | null;
    readonly typeSourceAddressHandle: AddressHandle | null;
    readonly nullableSourceAddressHandle: AddressHandle | null;
  };
}

export type SemanticTemplateCursorScopeRole =
  TemplateCompletionScopeRole | `${TemplateCompletionScopeRole}`;

/** Bounded source-authored plaintext carried by one exact checker member. */
export interface SemanticTemplateCursorMemberTextRow {
  readonly format: 'plaintext';
  readonly text: string;
  readonly isTruncated: boolean;
  /** Total contributing JSDoc nodes before the bounded exact-source list. */
  readonly sourceCount: number;
  /** Exact available source ranges, capped upstream independently from text clipping. */
  readonly sources: readonly SemanticSourceReference[];
}

export interface SemanticTemplateCursorMemberRow {
  readonly name: string;
  readonly memberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}`;
  readonly typeDisplay: string | null;
  readonly isOptional: boolean;
  readonly isReadonly: boolean;
  /** TypeScript accessibility for an ordinary checker member; null for template locals and synthetic fallbacks. */
  readonly visibilityKind: CheckerTypeMemberVisibilityKind | `${CheckerTypeMemberVisibilityKind}` | null;
  /** All-declarations deprecation result for an ordinary checker member; null when no checker member owns the row. */
  readonly isDeprecated: boolean | null;
  /** Unambiguous symbol main-comment prose; overload/accessor declaration groups deliberately remain null. */
  readonly documentation: SemanticTemplateCursorMemberTextRow | null;
  /** Shared nonempty `@deprecated` reason only when every current declaration agrees exactly. */
  readonly deprecationReason: SemanticTemplateCursorMemberTextRow | null;
  /** Author-facing role proved for this exact scope slot; null for ordinary members and unproved cases. */
  readonly scopeRole: SemanticTemplateCursorScopeRole | null;
  /** Authored source that introduced this name into the active template scope. */
  readonly source: SemanticSourceReference | null;
  /** TypeScript member declaration reached by the slot identity, when distinct from its scope source. */
  readonly declarationSource: SemanticSourceReference | null;
  readonly handles?: {
    /** Durable type-shape, binding-scope, or expression-parse product that owns this member surface. */
    readonly ownerProductHandle: ProductHandle | null;
    /** Lightweight member-detail handle used for exact in-process follow-up reads. */
    readonly detailHandle: HotDetailHandle | null;
    readonly declarationIdentityHandle: IdentityHandle | null;
    readonly ownerTypeIdentityHandle: IdentityHandle | null;
    readonly reachableIdentityHandle: IdentityHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly declarationSourceAddressHandle: AddressHandle | null;
  };
}

/** Exact or explicitly open checker signature selection for one authored named call occurrence. */
export interface SemanticTemplateCursorCallRow {
  readonly status: 'exact' | 'open';
  readonly callKind: 'scope' | 'member' | 'global' | 'function' | 'construct';
  readonly optionalChain: boolean;
  /** Whether the callee is a method member or a callable property/accessor value. */
  readonly presentationKind: 'method' | 'callable-value' | null;
  /** Runtime/member name kept separate so presenters never parse the checker signature tail. */
  readonly signatureName: string;
  /** Instantiated checker signature beginning with generic/parameter syntax; null when selection stays open. */
  readonly signatureTail: string | null;
  /** True when the exact checker signature exceeded the bounded transport surface. */
  readonly signatureIsTruncated: boolean;
  readonly candidateCount: number;
  /** Zero-based selected checker candidate; null when selection remains open. */
  readonly selectedCandidateIndex: number | null;
  readonly genericParameterCount: number | null;
  readonly signatureProvenance: 'declaration' | 'synthesized' | null;
  /** Exact authored callee name token, not the whole call. */
  readonly source: SemanticSourceReference;
  /** Exact authored full call expression. */
  readonly callSource: SemanticSourceReference;
  /** Exact resolved signature declaration name/source when closed. */
  readonly declarationSource: SemanticSourceReference | null;
  readonly documentation: SemanticTemplateCursorMemberTextRow | null;
  readonly isDeprecated: boolean | null;
  readonly deprecationReason: SemanticTemplateCursorMemberTextRow | null;
  readonly openReason: string | null;
}

/** Exact authored `$this` / `$parent` qualifier selected by the cursor and its best checker projection. */
export interface SemanticTemplateCursorExpressionRow {
  readonly expressionKind: 'AccessThis';
  /** Authored `$parent` count through the selected qualifier, with zero for `$this`. */
  readonly authoredScopeAncestor: number;
  /** Runtime Scope lookup depth for this exact qualifier prefix after parser lowering. */
  readonly scopeLookupAncestor: number;
  readonly typeDisplay: string | null;
  readonly typeShapeKind: CheckerTypeShapeKind | `${CheckerTypeShapeKind}` | null;
  readonly typeOrigin: CheckerTypeProjectionOrigin | `${CheckerTypeProjectionOrigin}` | null;
  readonly openKind: CheckerExpressionTypeOpenKind | `${CheckerExpressionTypeOpenKind}` | null;
  readonly openReason: string | null;
  /** Exact authored token selected by the cursor. */
  readonly source: SemanticSourceReference;
  /** Source route that produced the type, when narrower than the reusable type product. */
  readonly typeSource: SemanticSourceReference | null;
  /** Best TypeScript declaration source for the projected type. */
  readonly typeDeclarationSource: SemanticSourceReference | null;
  readonly handles?: {
    readonly typeProductHandle: ProductHandle | null;
    readonly typeIdentityHandle: IdentityHandle | null;
    readonly typeSourceAddressHandle: AddressHandle | null;
    readonly typeDeclarationSourceAddressHandle: AddressHandle | null;
  };
}

export type SemanticTemplateCursorDiagnosticSeverity =
  | 'information'
  | 'warning'
  | 'error';

export type SemanticTemplateCursorDiagnosticKind =
  | 'weak-expression-member-owner'
  | 'missing-expression-member'
  | 'unsupported-expression-global'
  | 'template-expression-typescript-diagnostic'
  | 'expression-runtime-evaluation-error'
  | 'expression-parse-error'
  | 'html-syntax-recovery'
  | 'template-compiler-error'
  | 'framework-capability-not-registered'
  | 'framework-capability-configured-out'
  | 'runtime-controller-framework-error'
  | 'runtime-renderer-framework-error'
  | 'runtime-binding-framework-error'
  | 'runtime-binding-behavior-framework-error'
  | 'runtime-value-converter-framework-error'
  | 'runtime-binding-scope-framework-error'
  | 'unsupported-repeat-declaration'
  | 'template-controller-null-binding-context'
  | 'router-framework-error'
  | 'binding-target-access-framework-error'
  | 'binding-source-assignment-strictness'
  | 'binding-source-assignment-framework-managed'
  | 'binding-source-assignment-runtime-noop'
  | 'binding-target-assignment-strictness'
  | 'binding-source-runtime-branch-open';

export type SemanticTemplateCursorDiagnosticAuthority =
  | 'semantic-authoring-policy'
  | 'semantic-runtime-product'
  | 'typescript'
  | 'framework-runtime-behavior'
  | 'framework-error-code';

export type SemanticTemplateCursorSuggestionKind =
  DiagnosticSuggestionKind | `${DiagnosticSuggestionKind}`;

export type SemanticTemplateCursorSuggestionActionKind =
  DiagnosticSuggestionActionKind | `${DiagnosticSuggestionActionKind}`;

export type SemanticTemplateCursorSuggestionValueTypeSource =
  DiagnosticSuggestionValueTypeSource | `${DiagnosticSuggestionValueTypeSource}`;

export type SemanticTemplateCursorSuggestionActionTargetKind =
  DiagnosticSuggestionActionTargetKind | `${DiagnosticSuggestionActionTargetKind}`;

export type SemanticTemplateCursorSuggestionActionTargetRow =
  DiagnosticSuggestionActionTarget<SemanticSourceReference>;

export type SemanticTemplateCursorSuggestionRow =
  DiagnosticSuggestion<SemanticSourceReference>;

export interface SemanticTemplateCursorDiagnosticRow {
  readonly diagnosticKind: SemanticTemplateCursorDiagnosticKind;
  readonly diagnosticAuthority: SemanticTemplateCursorDiagnosticAuthority;
  /** TypeScript checker code when this diagnostic was projected from a generated template overlay. */
  readonly typeScriptDiagnosticCode?: number;
  readonly frameworkErrorCode: string | null;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly summary: string;
  readonly missingInput: string | null;
  readonly missingInputs: readonly string[];
  readonly source: SemanticSourceReference | null;
  readonly relatedInformation?: readonly SemanticDiagnosticRelatedInformation[];
  readonly selectedMemberName: string | null;
  readonly ownerTypeDisplay: string | null;
  readonly ownerTypeShapeKind: string | null;
  readonly ownerTypeOrigin: string | null;
  readonly suggestion: SemanticTemplateCursorSuggestionRow | null;
}

export interface SemanticTemplateDiagnosticRow extends SemanticTemplateCursorDiagnosticRow {
  readonly phase: SemanticTemplateDiagnosticPhase | null;
  readonly siteKind: TemplateCompletionSiteKind | `${TemplateCompletionSiteKind}`;
  readonly valueSiteKind: TemplateValueSiteKind | `${TemplateValueSiteKind}` | null;
  readonly subject?: SemanticDiagnosticSubject | null;
  readonly diagnosticIdentityHandle: IdentityHandle | null;
  readonly diagnosticRelations?: readonly SemanticDiagnosticRelation[];
  readonly template: {
    readonly compilationLane: SemanticTemplateCompilationRow['compilationLane'] | null;
    readonly source: SemanticSourceReference | null;
  };
  readonly handles?: {
    readonly sourceAddressHandle: AddressHandle | null;
    readonly semanticProductHandle: ProductHandle | null;
    readonly semanticIdentityHandle: IdentityHandle | null;
    /** Generated-overlay origin facts; null together for diagnostics produced directly from authored products. */
    readonly overlayOriginKey: string | null;
    readonly overlayFileName: string | null;
    readonly overlaySegmentLabel: string | null;
  };
}

export interface SemanticTemplateDiagnosticsResult {
  readonly displayText: string;
  readonly rows: readonly SemanticTemplateDiagnosticRow[];
}

export enum SemanticTemplateInlayHintKind {
  BindingModeResolution = 'binding-mode-resolution',
}

export interface SemanticTemplateInlayHintRow {
  readonly hintKind: SemanticTemplateInlayHintKind | `${SemanticTemplateInlayHintKind}`;
  readonly definitionName: string;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
  readonly targetProperty: string;
  readonly authoredMode: TemplateBindingMode | `${TemplateBindingMode}`;
  readonly effectiveMode: TemplateBindingMode | `${TemplateBindingMode}`;
  readonly effectiveModeLabel: string;
  /** Exact authored insertion anchor, normally the binding attribute name span. */
  readonly source: SemanticSourceReference | null;
  /** Broader authored attribute span when different from the insertion anchor. */
  readonly attributeSource: SemanticSourceReference | null;
  /** Runtime binding source span used for explanation and lower-level follow-up queries. */
  readonly bindingSource: SemanticSourceReference | null;
  readonly handles?: {
    readonly bindingProductHandle: ProductHandle | null;
    readonly instructionProductHandle: ProductHandle | null;
    readonly attributeProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly attributeSourceAddressHandle: AddressHandle | null;
    readonly bindingSourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTemplateInlayHintsResult {
  readonly displayText: string;
  readonly rows: readonly SemanticTemplateInlayHintRow[];
}

export enum SemanticTemplateReferenceKind {
  Declaration = 'declaration',
  TemplateUsage = 'template-usage',
  /** Authored resource-use token such as a custom-element tag or custom-attribute name. */
  ResourceUsage = 'resource-usage',
  /** Authored bindable attribute-name token such as `item` in `item.bind`. */
  BindableAttribute = 'bindable-attribute',
  /** Non-declaration TypeScript identifier usage of the selected symbol. */
  TypeScriptUsage = 'typescript-usage',
}

export enum SemanticTemplateResourceUsageKind {
  ElementTag = 'element-tag',
  AttributeTarget = 'attribute-target',
  AsElementValue = 'as-element-value',
  ExpressionName = 'expression-name',
  BindingCommandName = 'binding-command-name',
  AttributePatternLiteral = 'attribute-pattern-literal',
  /** Named `.ref` target resolved to a same-node custom element or custom attribute controller. */
  RefTarget = 'ref-target',
}

export enum SemanticTemplateResourceDeclarationKind {
  PrimaryName = 'primary-name',
  AliasName = 'alias-name',
  PatternName = 'pattern-name',
}

export enum SemanticTemplateBindableAttributeSourceKind {
  /** Usage follows the framework default mapping from property name to attribute name. */
  DefaultDerived = 'default-derived',
  /** Usage targets an explicitly authored bindable `attribute` alias. */
  ExplicitAlias = 'explicit-alias',
  /** Usage targets a runtime-synthesized default custom-attribute bindable. */
  ImplicitDefault = 'implicit-default',
}

export enum SemanticTemplateBindableDeclarationKind {
  /** Authored metadata that names the TypeScript property exposed as a bindable. */
  PropertyName = 'property-name',
  /** Authored public attribute alias, distinct from the backing property name. */
  AttributeAlias = 'attribute-alias',
}

/** Why a same-spelled authored occurrence cannot yet join a proven reference/rename family. */
export enum SemanticTemplateReferenceCandidateReason {
  /** Available scope/type facts do not close the occurrence target. */
  TargetOpen = 'target-open',
  /** The occurrence is governed only by an index signature, not one property identity. */
  IndexSignatureTarget = 'index-signature-target',
}

export interface SemanticTemplateReferenceRow {
  readonly referenceKind: SemanticTemplateReferenceKind | `${SemanticTemplateReferenceKind}`;
  readonly name: string;
  readonly definitionName: string | null;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}` | null;
  /** Distinct runtime observation kinds spending this authored occurrence; empty when no operation observes it. */
  readonly dependencyKinds: readonly (RuntimeObservedDependencyKind | `${RuntimeObservedDependencyKind}`)[];
  /** Authored resource syntax form, present on resource-usage rows. */
  readonly resourceUsageKind?: SemanticTemplateResourceUsageKind | `${SemanticTemplateResourceUsageKind}` | null;
  /** Public-name declaration form, present on resource declaration rows. */
  readonly resourceDeclarationKind?: SemanticTemplateResourceDeclarationKind | `${SemanticTemplateResourceDeclarationKind}` | null;
  /** Bindable metadata form, present when a declaration row is not the TypeScript property itself. */
  readonly bindableDeclarationKind?: SemanticTemplateBindableDeclarationKind | `${SemanticTemplateBindableDeclarationKind}` | null;
  readonly bindableAttributeSourceKind?: SemanticTemplateBindableAttributeSourceKind | `${SemanticTemplateBindableAttributeSourceKind}` | null;
  /** Present only for an unproven same-name candidate row. */
  readonly candidateReason?: SemanticTemplateReferenceCandidateReason | `${SemanticTemplateReferenceCandidateReason}` | null;
  /** Exact source span for the returned reference/declaration. */
  readonly source: SemanticSourceReference | null;
  /** Declaration/member source that all returned template usages resolve to. */
  readonly targetSource: SemanticSourceReference | null;
  readonly handles?: {
    /** Every runtime operation spending this binding-context resolution. */
    readonly accessUseProductHandles: readonly ProductHandle[];
    /** Parse-owned authored token retained even when Aurelia executes no runtime operation. */
    readonly accessOccurrenceHandle: HotDetailHandle | null;
    /** Binding-context target interpretation shared by zero or more runtime operations. */
    readonly accessResolutionHandle: HotDetailHandle | null;
    /** Every observation edge derived from the runtime operations above. */
    readonly observedDependencyProductHandles: readonly ProductHandle[];
    readonly expressionProductHandle: ProductHandle | null;
    readonly bindingProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly targetSourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTemplateReferencesResult {
  readonly displayText: string;
  readonly selectedMemberName: string | null;
  readonly targetSource: SemanticSourceReference | null;
  readonly rows: readonly SemanticTemplateReferenceRow[];
  /**
   * Same-name template usages whose relationship to the selected symbol could not be proven
   * (weak/dynamic/keyed owners). They are never mixed into `rows`; a non-empty list makes the
   * answer closure `open` so clients know the enumeration is honest but not exhaustive.
   */
  readonly candidateRows: readonly SemanticTemplateReferenceRow[];
}

export enum SemanticTemplateRenameStatus {
  Available = 'available',
  NotAvailable = 'not-available',
  InvalidName = 'invalid-name',
}

export enum SemanticTemplateRenameUnavailableReason {
  NoSourceBackedMember = 'no-source-backed-member',
  NoAureliaReferences = 'no-aurelia-references',
  CursorNotOnRenameableReference = 'cursor-not-on-renameable-reference',
  TypeScriptSymbolUnavailable = 'typescript-symbol-unavailable',
  TypeScriptRenameNotAllowed = 'typescript-rename-not-allowed',
  TypeScriptRelatedSourceNotEditable = 'typescript-related-source-not-editable',
  SourceNotEditable = 'source-not-editable',
  InvalidNewName = 'invalid-new-name',
  ResourceNameHasNoAuthoredSource = 'resource-name-has-no-authored-source',
  UnsupportedResourceKind = 'unsupported-resource-kind',
  /** Exact same-name authored locations remain, but their target identity cannot be proven. */
  UnresolvedCandidates = 'unresolved-candidates',
}

export enum SemanticTemplateRenameEditKind {
  TypeScriptReference = 'typescript-reference',
  TemplateUsage = 'template-usage',
  TemplateLocalDeclaration = 'template-local-declaration',
  TemplateLocalUsage = 'template-local-usage',
  /** Authored bindable metadata that names a distinct TypeScript property target. */
  BindablePropertyDeclaration = 'bindable-property-declaration',
  BindableAttribute = 'bindable-attribute',
  BindableAttributeAliasDeclaration = 'bindable-attribute-alias-declaration',
  ResourceNameDeclaration = 'resource-name-declaration',
  ResourceAliasDeclaration = 'resource-alias-declaration',
  ResourceElementTag = 'resource-element-tag',
  ResourceAttributeTarget = 'resource-attribute-target',
  ResourceAsElementValue = 'resource-as-element-value',
  ResourceExpressionName = 'resource-expression-name',
  ResourceRefTarget = 'resource-ref-target',
}

export interface SemanticTemplateRenameEditRow {
  readonly editKind: SemanticTemplateRenameEditKind | `${SemanticTemplateRenameEditKind}`;
  readonly source: SemanticSourceReference | null;
  readonly oldText: string | null;
  readonly newText: string;
}

export interface SemanticTemplateRenameResult {
  readonly displayText: string;
  readonly status: SemanticTemplateRenameStatus | `${SemanticTemplateRenameStatus}`;
  readonly reason: SemanticTemplateRenameUnavailableReason | `${SemanticTemplateRenameUnavailableReason}` | null;
  readonly selectedMemberName: string | null;
  readonly placeholder: string | null;
  readonly targetSource: SemanticSourceReference | null;
  /** Exact source token under the initiating cursor, used by LSP prepareRename. */
  readonly activeSource: SemanticSourceReference | null;
  readonly edits: readonly SemanticTemplateRenameEditRow[];
  /**
   * Same-name template usages that could not be proven to reference the renamed symbol. A non-empty
   * list makes rename unavailable with `unresolved-candidates`; no partial edit plan is returned.
   * Every row retains its exact authored location and semantic refusal reason.
   */
  readonly candidateRows: readonly SemanticTemplateReferenceRow[];
  readonly templateReferenceCount: number;
  readonly typeScriptReferenceCount: number;
}

export enum SemanticTemplateCodeActionEditKind {
  DeclareViewModelMember = 'declare-view-model-member',
  RegisterFrameworkCapability = 'register-framework-capability',
}

export interface SemanticTemplateCodeActionEditRow {
  readonly editKind: SemanticTemplateCodeActionEditKind | `${SemanticTemplateCodeActionEditKind}`;
  readonly source: SemanticSourceReference;
  readonly oldText: string;
  readonly newText: string;
}

export type SemanticTemplateCodeActionEdits = readonly [
  SemanticTemplateCodeActionEditRow,
  ...SemanticTemplateCodeActionEditRow[],
];

export type SemanticTemplateCodeActionDiagnostics = readonly [
  SemanticTemplateDiagnosticRow,
  ...SemanticTemplateDiagnosticRow[],
];

export interface SemanticTemplateCodeActionRow {
  readonly title: string;
  readonly kind: 'quickfix';
  /** Source diagnostic facts this plan addresses; equivalent-plan dedupe merges rather than discards this evidence. */
  readonly diagnostics: SemanticTemplateCodeActionDiagnostics;
  /** Diagnostic-stage repair classification. Plan availability is proven by the non-empty `edits` tuple below. */
  readonly repair: DiagnosticRepairAffordance;
  readonly edits: SemanticTemplateCodeActionEdits;
  readonly isPreferred: boolean;
}

export interface SemanticTemplateCodeActionsResult {
  readonly displayText: string;
  readonly rows: readonly SemanticTemplateCodeActionRow[];
}

export const SEMANTIC_TEMPLATE_SEMANTIC_TOKEN_TYPES = [
  'aureliaElement',
  'aureliaAttribute',
  'aureliaBindable',
  'aureliaController',
  'aureliaCommand',
  'aureliaConverter',
  'aureliaBehavior',
  'aureliaMetaElement',
  'aureliaEvent',
  'aureliaModifier',
  'aureliaExpression',
  'variable',
  'property',
  'function',
  'keyword',
] as const;

export type SemanticTemplateSemanticTokenType = typeof SEMANTIC_TEMPLATE_SEMANTIC_TOKEN_TYPES[number];

export const SEMANTIC_TEMPLATE_SEMANTIC_TOKEN_MODIFIERS = [
  'declaration',
  'definition',
  'defaultLibrary',
  'deprecated',
] as const;

export type SemanticTemplateSemanticTokenModifier =
  typeof SEMANTIC_TEMPLATE_SEMANTIC_TOKEN_MODIFIERS[number];

export interface SemanticTemplateSemanticTokenRow {
  readonly tokenType: SemanticTemplateSemanticTokenType;
  readonly tokenModifiers: readonly SemanticTemplateSemanticTokenModifier[];
  readonly definitionName: string | null;
  /** Exact source span for the token. */
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly semanticProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTemplateSemanticTokensResult {
  readonly displayText: string;
  readonly rows: readonly SemanticTemplateSemanticTokenRow[];
}

export enum SemanticTemplateFoldingRangeKind {
  Element = 'element',
}

export interface SemanticTemplateFoldingRangeRow {
  readonly foldKind: SemanticTemplateFoldingRangeKind | `${SemanticTemplateFoldingRangeKind}`;
  readonly definitionName: string;
  readonly tagName: string;
  readonly childCount: number;
  readonly selfClosing: boolean;
  /** Exact authored source span for the foldable template region. */
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly elementProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTemplateFoldingRangesResult {
  readonly displayText: string;
  readonly rows: readonly SemanticTemplateFoldingRangeRow[];
}

export interface SemanticTemplateCursorRouteTargetRow {
  readonly targetKind: RouterNavigationTargetKind | `${RouterNavigationTargetKind}`;
  /** Authored route id or configured path selected by the navigation syntax. */
  readonly matchedName: string;
  readonly routeConfigId: string | null;
  /** Enclosing RouteConfig declaration carrier. */
  readonly source: SemanticSourceReference | null;
  /** Exact authored route id/path token selected by go-to-definition. */
  readonly targetSource: SemanticSourceReference | null;
  readonly handles?: {
    readonly routeConfigProductHandle: ProductHandle;
    readonly routeConfigIdentityHandle: IdentityHandle;
    readonly configurableRouteProductHandle: ProductHandle | null;
    readonly endpointProductHandle: ProductHandle | null;
    readonly recognizedRouteProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly targetSourceAddressHandle: AddressHandle;
  };
}

export type SemanticTemplateCursorDiagnosticPresentation =
  | {
    readonly kind: 'presented';
    /** Number of compact raw rows retained in `SemanticTemplateCursorInfoResult.diagnostics`. */
    readonly rawRowCount: number;
    /** One presenter-selected group with every row index rebased into the compact raw rows. */
    readonly group: SemanticDiagnosticPresentationGroup;
  }
  | {
    readonly kind: 'withheld';
    /** Number of compact raw rows retained in `SemanticTemplateCursorInfoResult.diagnostics`. */
    readonly rawRowCount: number;
    /** One presenter-withheld row with its index rebased into the compact raw rows. */
    readonly withheld: SemanticDiagnosticPresentationWithheldRow;
  };

export type SemanticTemplateCursorUncertaintyCategory =
  | 'type-information-incomplete'
  | 'resource-availability-incomplete'
  | 'dynamic-route-target'
  | 'route-configuration-ambiguous'
  | 'route-information-incomplete';

export type SemanticTemplateCursorUncertaintyAffectedDomain =
  | 'member'
  | 'binding-context'
  | 'bindable'
  | 'resource'
  | 'route';

export type SemanticTemplateCursorUncertaintyAffectedLocus =
  | 'selected-member'
  | 'selected-expression'
  | 'selected-bindable'
  | 'selected-resource'
  | 'route-target';

/** Stable author-facing uncertainty translated from exact semantic pressure at the displayed cursor locus. */
export interface SemanticTemplateCursorUncertainty {
  readonly category: SemanticTemplateCursorUncertaintyCategory;
  readonly affectedDomain: SemanticTemplateCursorUncertaintyAffectedDomain;
  readonly affectedLocus: SemanticTemplateCursorUncertaintyAffectedLocus;
}

export interface SemanticTemplateCursorInfoResult {
  readonly displayText: string;
  readonly siteKind: TemplateCompletionSiteKind | `${TemplateCompletionSiteKind}`;
  /** Exact authored token selected by the cursor, or null when the cursor is between semantic tokens. */
  readonly activeSource: SemanticSourceReference | null;
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
  readonly selectedRouteTarget: SemanticTemplateCursorRouteTargetRow | null;
  readonly selectedMemberName: string | null;
  readonly selectedMember: SemanticTemplateCursorMemberRow | null;
  /** Exact selected call signature; null for member-value/property hovers and unnamed call targets. */
  readonly selectedCall: SemanticTemplateCursorCallRow | null;
  /** Typed presentation for one exact authored `$this` / `$parent` binding-context qualifier. */
  readonly selectedExpression: SemanticTemplateCursorExpressionRow | null;
  /** Stable uncertainty only when exact semantic pressure materially affects a displayed cursor answer. */
  readonly uncertainty: SemanticTemplateCursorUncertainty | null;
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
  /** Stage 6A admission/presentation outcome for the selected compact cursor diagnostic rows. */
  readonly diagnosticPresentation: SemanticTemplateCursorDiagnosticPresentation | null;
  readonly handles?: {
    /** Null for parser-span expression tokens, which intentionally avoid one kernel address per token. */
    readonly activeSourceAddressHandle: AddressHandle | null;
  };
}

export type SemanticRuntimeControllerHydrationHandoffKind =
  | 'compiled-template'
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

export interface SemanticRuntimeControllerAssemblyStepRow {
  readonly order: number;
  readonly stage: RuntimeControllerAssemblyStage | `${RuntimeControllerAssemblyStage}`;
  readonly stepKind: RuntimeControllerAssemblyStepKind | `${RuntimeControllerAssemblyStepKind}`;
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
  readonly creationKind: RuntimeControllerCreationKind | `${RuntimeControllerCreationKind}`;
  /** Furthest phase explored by counterfactual controller assembly, even when runtime reachability is open. */
  readonly assemblyProgress: RuntimeControllerReadinessKind | `${RuntimeControllerReadinessKind}`;
  /** Furthest phase whose runtime reachability is causally closed, or null when activation remains open/blocked. */
  readonly realizedReadiness: RuntimeControllerReadinessKind | `${RuntimeControllerReadinessKind}` | null;
  readonly observerSetupState: RuntimeControllerObserverSetupState | `${RuntimeControllerObserverSetupState}`;
  readonly bindReachability: RuntimeOperationReachability | `${RuntimeOperationReachability}`;
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
  readonly viewFactoryCompiledTemplateRole: CompiledTemplateContextRole | `${CompiledTemplateContextRole}` | null;
  readonly viewFactoryCompiledTemplateState: CompiledTemplateState | `${CompiledTemplateState}` | null;
  readonly templateControllerLinkKind: SemanticRuntimeTemplateControllerLinkKind | null;
  readonly linkedTemplateControllerName: string | null;
  readonly templateControllerFlowKind: BuiltInTemplateControllerFlowKind | `${BuiltInTemplateControllerFlowKind}` | null;
  readonly childViewCardinality: BuiltInTemplateControllerChildViewCardinality | `${BuiltInTemplateControllerChildViewCardinality}` | null;
  readonly childViewRenderingState: SemanticRuntimeControllerChildViewRenderingState;
  readonly hydrationHandoffKind: SemanticRuntimeControllerHydrationHandoffKind;
  readonly compiledTemplateDefinitionName: string | null;
  readonly assemblySteps: readonly SemanticRuntimeControllerAssemblyStepRow[];
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly controllerProductHandle: ProductHandle;
    readonly controllerIdentityHandle: IdentityHandle;
    readonly parentControllerProductHandle: ProductHandle | null;
    readonly definitionProductHandle: ProductHandle | null;
    readonly instructionProductHandle: ProductHandle | null;
    readonly instructionIdentityHandle: IdentityHandle | null;
    readonly constructionHydrationContextProductHandle: ProductHandle | null;
    readonly hydrationContextProductHandle: ProductHandle | null;
    readonly auSlotsInfoProductHandle: ProductHandle | null;
    readonly bindingScopeProductHandle: ProductHandle | null;
    readonly compiledTemplateProductHandle: ProductHandle | null;
    readonly compiledTemplateClaimHandle: ClaimHandle | null;
    readonly viewFactoryProductHandle: ProductHandle | null;
    readonly viewFactoryClaimHandle: ClaimHandle | null;
    readonly viewFactoryCompiledTemplateProductHandle: ProductHandle | null;
    readonly viewFactoryCompiledTemplateClaimHandle: ClaimHandle | null;
    readonly linkedTemplateControllerProductHandle: ProductHandle | null;
    readonly templateControllerLinkClaimHandle: ClaimHandle | null;
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
  readonly rowKey: string;
  readonly owner: SemanticObservedDependencyOwnerRow;
  readonly occurrence: SemanticObservedDependencyOccurrenceRow;
  readonly handles?: {
    readonly watcherProductHandle: ProductHandle | null;
    readonly observedDependencyProductHandle: ProductHandle;
    readonly observedDependencyIdentityHandle: IdentityHandle;
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
  readonly templateInputConsumptionKind: CompositionInputConsumptionKind | `${CompositionInputConsumptionKind}`;
  readonly templateInputValueStateKind: CompositionInputValueStateKind | `${CompositionInputValueStateKind}`;
  readonly templateInputSettlementKind: EvaluationPromiseSettlementKind | `${EvaluationPromiseSettlementKind}` | null;
  /** Awaited TypeChecker type consumed by AuCompose for a bound template input. */
  readonly templateInputType: string | null;
  /** Loaded template string when static evaluation closes the framework-awaited input. */
  readonly resolvedTemplate: string | null;
  readonly componentInputConsumptionKind: CompositionInputConsumptionKind | `${CompositionInputConsumptionKind}`;
  readonly componentInputValueStateKind: CompositionInputValueStateKind | `${CompositionInputValueStateKind}`;
  readonly componentInputSettlementKind: EvaluationPromiseSettlementKind | `${EvaluationPromiseSettlementKind}` | null;
  /** Awaited TypeChecker type consumed by AuCompose for a bound component input. */
  readonly componentInputType: string | null;
  readonly modelInputConsumptionKind: CompositionInputConsumptionKind | `${CompositionInputConsumptionKind}`;
  readonly modelInputValueStateKind: CompositionInputValueStateKind | `${CompositionInputValueStateKind}`;
  readonly scopeBehaviorInputConsumptionKind: CompositionInputConsumptionKind | `${CompositionInputConsumptionKind}`;
  readonly scopeBehaviorInputValueStateKind: CompositionInputValueStateKind | `${CompositionInputValueStateKind}`;
  readonly tagInputConsumptionKind: CompositionInputConsumptionKind | `${CompositionInputConsumptionKind}`;
  readonly tagInputValueStateKind: CompositionInputValueStateKind | `${CompositionInputValueStateKind}`;
  readonly flushModeInputConsumptionKind: CompositionInputConsumptionKind | `${CompositionInputConsumptionKind}`;
  readonly flushModeInputValueStateKind: CompositionInputValueStateKind | `${CompositionInputValueStateKind}`;
  readonly hasTemplateBinding: boolean;
  readonly hasCompositionBinding: boolean;
  readonly hasComposingBinding: boolean;
  readonly componentResolutionKind: CompositionComponentResolutionKind | `${CompositionComponentResolutionKind}`;
  /** Whether TypeChecker-derived component candidates exhaust a finite exact named-class basis. */
  readonly componentCandidateCoverageKind: CompositionComponentCandidateCoverageKind | `${CompositionComponentCandidateCoverageKind}`;
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
  /** Child DI containers created for the composed controllers in this row. */
  readonly composedChildContainerCount: number;
  /** Contextual providers installed while hydrating those composed child controllers. */
  readonly composedChildContextResolverSlotCount: number;
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
    readonly templateInputTypeProductHandle: ProductHandle | null;
    readonly componentBindingProductHandle: ProductHandle | null;
    readonly componentInputTypeProductHandle: ProductHandle | null;
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
  CompositionRenderingContextKind | `${CompositionRenderingContextKind}`;

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

export const enum SemanticTemplateContentProjectionSurfaceKind {
  /** Compiler-owned provider definition attached to a custom-element use. */
  ProviderDefinition = 'provider-definition',
  /** Runtime AuSlot selected, fallback, or empty view relation. */
  AuSlotView = 'au-slot-view',
  /** Compiler-reachable native Shadow DOM slot outlet. */
  NativeSlotOutlet = 'native-slot-outlet',
}

export interface SemanticTemplateContentProjectionProviderRow {
  readonly surfaceKind: SemanticTemplateContentProjectionSurfaceKind.ProviderDefinition;
  readonly renderingDefinitionName: string;
  readonly receivingElementName: string;
  readonly slotName: string;
  readonly providerProjectedSlotNames: readonly string[];
  readonly contributorCount: number;
  readonly explicitContributorCount: number;
  readonly instructionCount: number;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly providerInstructionProductHandle: ProductHandle;
    readonly compiledTemplateProductHandle: ProductHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTemplateContentProjectionViewRow {
  readonly surfaceKind: SemanticTemplateContentProjectionSurfaceKind.AuSlotView;
  readonly renderingDefinitionName: string;
  readonly slotName: string;
  readonly selectionKind: RuntimeContentProjectionSelectionKind | `${RuntimeContentProjectionSelectionKind}`;
  readonly closureKind: RuntimeContentProjectionClosureKind | `${RuntimeContentProjectionClosureKind}`;
  /** Null only when the controller is not constructed through a renderer contextual-provider path. */
  readonly auSlotsInfoSourceKind: AuSlotsInfoSourceKind | `${AuSlotsInfoSourceKind}` | null;
  readonly providerProjectedSlotNames: readonly string[];
  readonly declaringControllerName: string | null;
  readonly receivingControllerName: string | null;
  readonly outletControllerName: string | null;
  readonly instructionCount: number;
  readonly hasViewFactory: boolean;
  readonly hasSyntheticController: boolean;
  readonly factoryContainerDepth: number | null;
  readonly factoryContainerResourceCount: number | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly outletInstructionProductHandle: ProductHandle;
    readonly providerInstructionProductHandle: ProductHandle | null;
    readonly declaringControllerProductHandle: ProductHandle | null;
    readonly receivingControllerProductHandle: ProductHandle | null;
    readonly outletControllerProductHandle: ProductHandle;
    readonly viewFactoryProductHandle: ProductHandle | null;
    readonly compiledTemplateProductHandle: ProductHandle | null;
    readonly syntheticControllerProductHandle: ProductHandle | null;
    readonly factoryContainerProductHandle: ProductHandle | null;
    readonly factoryHydrationContextProductHandle: ProductHandle | null;
    readonly slotsInfoProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticTemplateContentProjectionNativeOutletRow {
  readonly surfaceKind: SemanticTemplateContentProjectionSurfaceKind.NativeSlotOutlet;
  readonly renderingDefinitionName: string;
  readonly nameKind: CompiledNativeSlotNameKind | `${CompiledNativeSlotNameKind}`;
  readonly slotName: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly nodeProductHandle: ProductHandle | null;
    readonly nameSourceAddressHandle: AddressHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export type SemanticTemplateContentProjectionRow =
  | SemanticTemplateContentProjectionProviderRow
  | SemanticTemplateContentProjectionViewRow
  | SemanticTemplateContentProjectionNativeOutletRow;

export interface SemanticTemplateContentProjectionResult {
  readonly rows: readonly SemanticTemplateContentProjectionRow[];
}

export interface SemanticBindingTargetAccessRow {
  readonly definitionName: string;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
  readonly lookup: RuntimeBindingTargetAccessLookup | `${RuntimeBindingTargetAccessLookup}`;
  readonly targetKind: RuntimeBindingTargetKind | `${RuntimeBindingTargetKind}`;
  readonly targetProperty: string;
  readonly strategy: RuntimeBindingTargetAccessStrategy | `${RuntimeBindingTargetAccessStrategy}`;
  readonly fallbackStrategy: RuntimeBindingTargetAccessStrategy | `${RuntimeBindingTargetAccessStrategy}` | null;
  readonly observerCacheDisposition:
    | RuntimeBindingTargetObserverCacheDisposition
    | `${RuntimeBindingTargetObserverCacheDisposition}`;
  readonly supportsCallback: boolean | null;
  readonly supportsCoercer: boolean | null;
  readonly observerSource: SemanticSourceReference | null;
  readonly objectObservationAdapters: readonly SemanticObjectObservationAdapterRow[];
  readonly controllerObserverSetupOutcome:
    | RuntimeControllerObserverSetupOutcome
    | `${RuntimeControllerObserverSetupOutcome}`
    | null;
  readonly bindReachability: RuntimeOperationReachability | `${RuntimeOperationReachability}`;
  readonly nodeObserverConfig: SemanticNodeObserverConfig | null;
  readonly targetType: string | null;
  readonly targetTypeSource: RuntimeBindingTargetTypeSource | `${RuntimeBindingTargetTypeSource}` | null;
  readonly propertyType: string | null;
  readonly propertyExists: boolean | null;
  readonly isWritable: boolean | null;
  readonly isObservable: boolean | null;
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
    readonly observerSourceProductHandle: ProductHandle | null;
    readonly observerSourceIdentityHandle: IdentityHandle | null;
    readonly observerSourceAddressHandle: AddressHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticObjectObservationAdapterRow {
  readonly order: number;
  readonly adapterName: string | null;
  readonly appTaskSlot: AppTaskSlot | `${AppTaskSlot}`;
  readonly source: SemanticSourceReference | null;
  readonly sourceAddressHandle?: AddressHandle | null;
}

export interface SemanticNodeObserverConfig {
  readonly observerKind: RuntimeNodeObserverKind | `${RuntimeNodeObserverKind}`;
  readonly observerConstructorName: string | null;
  readonly eventNames: readonly string[];
  readonly readonlyValue: boolean | null;
  readonly defaultValue: string | number | boolean | null | undefined;
  readonly fieldStates: {
    readonly type: RuntimeNodeObserverConfigFieldState | `${RuntimeNodeObserverConfigFieldState}`;
    readonly events: RuntimeNodeObserverConfigFieldState | `${RuntimeNodeObserverConfigFieldState}`;
    readonly readonly: RuntimeNodeObserverConfigFieldState | `${RuntimeNodeObserverConfigFieldState}`;
    readonly default: RuntimeNodeObserverConfigFieldState | `${RuntimeNodeObserverConfigFieldState}`;
  };
  readonly openReason: string | null;
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
  readonly reachability: RuntimeOperationReachability | `${RuntimeOperationReachability}`;
  /** Listener registration strategy when this operation comes from a ListenerBinding. */
  readonly listenerStrategy: TemplateListenerStrategy | `${TemplateListenerStrategy}` | null;
  /** Authored listener modifier when one was lowered with the event registration. */
  readonly eventModifier: string | null;
  readonly eventModifierSource: SemanticSourceReference | null;
  readonly authority: RuntimeBindingTargetOperationAuthority | `${RuntimeBindingTargetOperationAuthority}`;
  readonly openReason: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly bindingProductHandle: ProductHandle | null;
    readonly rendererProductHandle: ProductHandle | null;
    readonly instructionProductHandle: ProductHandle | null;
    readonly targetOperationProductHandle: ProductHandle;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly eventModifierSourceAddressHandle: AddressHandle | null;
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
  readonly reachability: RuntimeOperationReachability | `${RuntimeOperationReachability}`;
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

/** Compiler-world resource identity retained by an authored template occurrence. */
export interface SemanticTemplateResourceReferenceRow {
  /** Author-facing resource taxonomy; use `registrationResourceKindFor` for framework registration-key joins. */
  readonly resourceKind: ResourceDefinitionKind | `${ResourceDefinitionKind}`;
  /** Canonical runtime lookup name; the authored occurrence name remains on its owning row. */
  readonly name: string;
  readonly visibilityKind: TemplateResourceVisibilityKind | `${TemplateResourceVisibilityKind}`;
  /** Registration, definition, import, or convention source that made the resource visible. */
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly resourceProductHandle: ProductHandle | null;
    readonly resourceIdentityHandle: IdentityHandle | null;
    readonly definitionProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticExpressionResourceSignalRow {
  readonly name: string;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticExpressionResourceLifecycleEffectsRow {
  readonly effectKinds: readonly (
    RuntimeExpressionResourceLifecycleEffectKind | `${RuntimeExpressionResourceLifecycleEffectKind}`
  )[];
  readonly signalState: RuntimeExpressionResourceValueState | `${RuntimeExpressionResourceValueState}`;
  readonly signals: readonly SemanticExpressionResourceSignalRow[];
  readonly rateLimitDelayMilliseconds: number | null;
  readonly rateLimitDelayState: RuntimeExpressionResourceValueState | `${RuntimeExpressionResourceValueState}` | null;
  readonly configurationSource: SemanticSourceReference | null;
  readonly openReason: string | null;
  readonly openReasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
  readonly handles?: {
    readonly configurationSourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticBindingBehaviorApplicationRow {
  readonly definitionName: string;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
  readonly behaviorName: string;
  readonly resource: SemanticTemplateResourceReferenceRow | null;
  readonly phase: RuntimeBindingBehaviorApplicationPhase | `${RuntimeBindingBehaviorApplicationPhase}`;
  readonly origin: RuntimeExpressionResourceApplicationOrigin | `${RuntimeExpressionResourceApplicationOrigin}`;
  readonly argumentCount: number;
  readonly staticArgumentValues: readonly string[];
  /** Interpolation-hole identity; zero for ordinary binding expressions. */
  readonly chainIndex: number;
  /** Depth in the authored expression-resource chain. */
  readonly authoredChainDepth: number;
  /** Depth in the effective runtime chain after reached behavior projections. */
  readonly runtimeChainDepth: number;
  readonly bindReachability: RuntimeOperationReachability | `${RuntimeOperationReachability}`;
  readonly phaseReachability: RuntimeOperationReachability | `${RuntimeOperationReachability}`;
  readonly bindOrder: number | null;
  /** Nominal execution order within this binding-behavior lifecycle phase. */
  readonly phaseOrder: number | null;
  readonly lifecycleEffects: SemanticExpressionResourceLifecycleEffectsRow;
  readonly argumentSources: readonly (SemanticSourceReference | null)[];
  readonly targetKind: RuntimeBindingTargetKind | `${RuntimeBindingTargetKind}` | null;
  readonly targetProperty: string | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly bindingProductHandle: ProductHandle | null;
    readonly expressionProductHandle: ProductHandle;
    readonly bindingBehaviorApplicationProductHandle: ProductHandle;
    readonly targetAccessProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticBindingBehaviorApplicationResult {
  readonly rows: readonly SemanticBindingBehaviorApplicationRow[];
}

export interface SemanticValueConverterApplicationRow {
  readonly definitionName: string;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
  readonly converterName: string;
  readonly resource: SemanticTemplateResourceReferenceRow | null;
  readonly phase: RuntimeValueConverterApplicationPhase | `${RuntimeValueConverterApplicationPhase}`;
  readonly origin: RuntimeExpressionResourceApplicationOrigin | `${RuntimeExpressionResourceApplicationOrigin}`;
  readonly argumentCount: number;
  /** Interpolation-hole identity; zero for ordinary binding expressions. */
  readonly chainIndex: number;
  /** Depth in the authored expression-resource chain, or null for a bind-time projection. */
  readonly authoredChainDepth: number | null;
  /** Depth in the effective runtime chain after reached behavior projections. */
  readonly runtimeChainDepth: number;
  readonly bindReachability: RuntimeOperationReachability | `${RuntimeOperationReachability}`;
  readonly phaseReachability: RuntimeOperationReachability | `${RuntimeOperationReachability}`;
  readonly bindOrder: number | null;
  /** Nominal execution order within this converter phase. */
  readonly phaseOrder: number | null;
  readonly lifecycleEffects: SemanticExpressionResourceLifecycleEffectsRow;
  readonly argumentSources: readonly (SemanticSourceReference | null)[];
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly bindingProductHandle: ProductHandle | null;
    readonly expressionProductHandle: ProductHandle;
    readonly valueConverterApplicationProductHandle: ProductHandle;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticValueConverterApplicationResult {
  readonly rows: readonly SemanticValueConverterApplicationRow[];
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
  readonly targetMutationKind: RuntimeBindingValueChannelTargetMutationKind | `${RuntimeBindingValueChannelTargetMutationKind}`;
  readonly nullishDefault: RuntimeBindingPrimitiveValue | null;
  readonly nullishDefaultState: RuntimeNodeObserverConfigFieldState | `${RuntimeNodeObserverConfigFieldState}` | null;
  readonly rawTargetPropertyType: string | null;
  readonly runtimeValueType: string | null;
  readonly realization: RuntimeOperationRealization | `${RuntimeOperationRealization}`;
  readonly bindReachability: RuntimeOperationReachability | `${RuntimeOperationReachability}`;
  readonly admittedSourceValueType: string | null;
  readonly admittedSourceMemberKind: CheckerTypeMemberKind | `${CheckerTypeMemberKind}` | null;
  readonly admittedSourceMemberSource: SemanticSourceReference | null;
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
    readonly admittedSourceValueTypeProductHandle: ProductHandle | null;
    readonly admittedSourceMemberSourceAddressHandle: AddressHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticBindingValueChannelResult {
  readonly rows: readonly SemanticBindingValueChannelRow[];
}

/** Evidence family used to classify a concrete authored control occurrence. */
export enum SemanticControlUseClassificationKind {
  /** Native control value channel matched the app-builder native control catalog exactly. */
  NativeValueChannel = 'native-value-channel',
  /** Native button-like element exposes a listener/action value channel. */
  NativeButtonAction = 'native-button-action',
  /** Native anchor exposes Aurelia router load navigation without a binding value channel. */
  NativeLinkNavigation = 'native-link-navigation',
  /** Native message element exposes a status/error role as a form-message control occurrence. */
  NativeFormMessage = 'native-form-message',
}

/** Public read-model source for a concrete control-use inventory row. */
export enum SemanticControlUseInventorySourceKind {
  /** Authored template source analyzed through runtime binding/value-channel products. */
  AuthoredRuntimeBinding = 'authored-runtime-binding',
  /** Authored static template source analyzed through HTML/template products. */
  AuthoredStaticTemplate = 'authored-static-template',
}

export interface SemanticControlUseInventoryRow {
  readonly definitionName: string;
  readonly sourceKind: SemanticControlUseInventorySourceKind | `${SemanticControlUseInventorySourceKind}`;
  readonly classificationKind: SemanticControlUseClassificationKind | `${SemanticControlUseClassificationKind}`;
  readonly realizationPolicyIds: readonly (AppBuilderControlRealizationPolicyId | `${AppBuilderControlRealizationPolicyId}`)[];
  readonly controlPatternId: AppBuilderControlPatternId | `${AppBuilderControlPatternId}`;
  readonly controlId: AppBuilderControlId | `${AppBuilderControlId}` | null;
  readonly semanticValueKind: AppBuilderControlSemanticValueKind | `${AppBuilderControlSemanticValueKind}` | null;
  readonly transportKind: AppBuilderControlTransportKind | `${AppBuilderControlTransportKind}` | null;
  readonly tagName: string;
  readonly staticType: string | null;
  readonly hasMultiple: boolean;
  readonly actionChannelKind: AppBuilderControlUseActionChannelKind | `${AppBuilderControlUseActionChannelKind}` | null;
  readonly routeInstruction: string | null;
  readonly linkText: string | null;
  readonly buttonText: string | null;
  readonly buttonType: string | null;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}` | null;
  readonly targetProperty: string | null;
  readonly targetAttribute: string | null;
  readonly targetOperationKind: RuntimeBindingTargetOperationKind | `${RuntimeBindingTargetOperationKind}` | null;
  readonly sourceOperationKind: RuntimeBindingSourceOperationKind | `${RuntimeBindingSourceOperationKind}` | null;
  readonly valueChannelKind: RuntimeBindingValueChannelKind | `${RuntimeBindingValueChannelKind}` | null;
  readonly eventName: string | null;
  readonly bindingExpression: string | null;
  readonly handlerExpression: string | null;
  readonly handlerRootName: string | null;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  readonly sourceType: string | null;
  readonly targetValueType: string | null;
  readonly sourceWritable: boolean | null;
  readonly sourceAssignmentKind: RuntimeBindingDataFlowSourceAssignmentKind | `${RuntimeBindingDataFlowSourceAssignmentKind}` | null;
  readonly sourceToTargetAssignable: boolean | null;
  readonly targetToSourceAssignable: boolean | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly bindingProductHandle: ProductHandle | null;
    readonly valueChannelProductHandle: ProductHandle | null;
    readonly targetAccessProductHandle: ProductHandle | null;
    readonly targetOperationProductHandle: ProductHandle | null;
    readonly sourceOperationProductHandle: ProductHandle | null;
    readonly dataFlowProductHandle: ProductHandle | null;
    readonly expressionProductHandle: ProductHandle | null;
    readonly htmlNodeProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticControlUseInventoryResult {
  readonly rows: readonly SemanticControlUseInventoryRow[];
}

export interface SemanticBindingValueChannelSummaryRow {
  readonly channelKind: RuntimeBindingValueChannelKind | `${RuntimeBindingValueChannelKind}`;
  readonly targetKind: RuntimeBindingTargetKind | `${RuntimeBindingTargetKind}` | null;
  readonly targetProperty: string | null;
  readonly targetMutationKind: RuntimeBindingValueChannelTargetMutationKind | `${RuntimeBindingValueChannelTargetMutationKind}`;
  readonly realization: RuntimeOperationRealization | `${RuntimeOperationRealization}`;
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

export interface SemanticBindingDataFlowValueConverterWritebackStageRow {
  readonly converterName: string;
  /** Outer-to-inner structural order used by Aurelia `astAssign`. */
  readonly stageIndex: number;
  readonly origin: RuntimeExpressionResourceApplicationOrigin | `${RuntimeExpressionResourceApplicationOrigin}`;
  readonly runtimeChainDepth: number;
  /** Runtime execution order; null when converter invocation is blocked. */
  readonly phaseOrder: number | null;
  readonly phaseReachability: RuntimeOperationReachability | `${RuntimeOperationReachability}`;
  readonly projectionState: RuntimeValueConverterWritebackStageState | `${RuntimeValueConverterWritebackStageState}`;
  /** Best-known checker input; `input-open` stages may carry a partial prior output. */
  readonly inputType: string | null;
  readonly inputTypeSource: SemanticSourceReference | null;
  /** Closed output for `type`, partial output for `open`, and null for `input-open`. */
  readonly outputType: string | null;
  readonly outputTypeSource: SemanticSourceReference | null;
  readonly openReason: string | null;
  readonly openKind: CheckerExpressionTypeOpenKind | `${CheckerExpressionTypeOpenKind}` | null;
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly valueConverterApplicationProductHandle: ProductHandle | null;
    readonly inputTypeProductHandle: ProductHandle | null;
    readonly outputTypeProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRuntimeExpressionExecutionQualifierRow {
  readonly kind: RuntimeExpressionExecutionQualifierKind | `${RuntimeExpressionExecutionQualifierKind}`;
  readonly operationName: string | null;
  readonly source: SemanticSourceReference | null;
  readonly sourceAddressHandle?: AddressHandle | null;
}

export interface SemanticRuntimeExpressionAccessTargetRow {
  readonly declarationSource: SemanticSourceReference | null;
  readonly authorityProductHandle?: ProductHandle | null;
  readonly targetIdentityHandle?: IdentityHandle | null;
  readonly targetTypeMemberHandle?: HotDetailHandle | null;
  readonly targetTypeSourceMemberHandle?: HotDetailHandle | null;
  readonly declarationSourceAddressHandle?: AddressHandle | null;
}

/** Operation, control-flow, and closure facts shared by access-use and observed-dependency queries. */
export interface SemanticRuntimeExpressionAccessUseSummaryRow {
  readonly operationKind: RuntimeExpressionOperationKind | `${RuntimeExpressionOperationKind}`;
  readonly operationIndex: number | null;
  readonly origin: RuntimeExpressionAccessOrigin | `${RuntimeExpressionAccessOrigin}`;
  readonly authored: boolean;
  readonly accessForm: RuntimeExpressionAccessForm | `${RuntimeExpressionAccessForm}`;
  readonly role: RuntimeExpressionAccessRole | `${RuntimeExpressionAccessRole}`;
  readonly phase: RuntimeExpressionAccessPhase | `${RuntimeExpressionAccessPhase}`;
  readonly tracking: RuntimeExpressionAccessTracking | `${RuntimeExpressionAccessTracking}`;
  readonly realization: RuntimeOperationRealization | `${RuntimeOperationRealization}`;
  readonly reachability: RuntimeOperationReachability | `${RuntimeOperationReachability}`;
  /** Explicit ancestor argument used by Aurelia Scope lookup after parser lowering. */
  readonly scopeLookupAncestor: number | null;
  /** Authored `$parent` count, with zero for explicit `$this`; null when no qualifier was authored. */
  readonly authoredScopeAncestor: number | null;
  /** Lexical arrow-callback nesting, which is not generally additive with `scopeLookupAncestor`. */
  readonly callbackScopeDepth: number | null;
  /** Whether the occurrence is rooted in an expression-local callback parameter. */
  readonly lexicalLocal: boolean;
  readonly targetResolution: RuntimeExpressionAccessTargetResolution | `${RuntimeExpressionAccessTargetResolution}`;
  readonly targetCount: number;
  readonly executionQualifiers: readonly SemanticRuntimeExpressionExecutionQualifierRow[];
  readonly minimumExecutions: RuntimeExpressionExecutionMinimum | `${RuntimeExpressionExecutionMinimum}`;
  readonly maximumExecutions: RuntimeExpressionExecutionMaximum | `${RuntimeExpressionExecutionMaximum}`;
  readonly coverage: RuntimeExpressionAccessCoverage | `${RuntimeExpressionAccessCoverage}`;
  readonly coverageReason: string | null;
}

/** Source and target facts shared wherever one exact access occurrence is projected. */
export interface SemanticRuntimeExpressionAccessUseOccurrenceRow
  extends SemanticRuntimeExpressionAccessUseSummaryRow {
  readonly targetLinks: readonly SemanticRuntimeExpressionAccessTargetRow[];
  readonly source: SemanticSourceReference | null;
  readonly nameSource: SemanticSourceReference | null;
}

/** Public, lossless projection of one owner-qualified runtime expression access occurrence. */
export interface SemanticRuntimeExpressionAccessUseRow extends SemanticRuntimeExpressionAccessUseOccurrenceRow {
  readonly definitionName: string | null;
  readonly ownerKind: RuntimeExpressionAccessOwnerKind | `${RuntimeExpressionAccessOwnerKind}`;
  readonly handles?: {
    readonly accessUseProductHandle: ProductHandle;
    readonly accessUseIdentityHandle: IdentityHandle;
    readonly ownerProductHandle: ProductHandle;
    readonly operationProductHandle: ProductHandle | null;
    readonly expressionProductHandle: ProductHandle | null;
    readonly scopeProductHandle: ProductHandle | null;
    readonly accessOccurrenceHandle: HotDetailHandle | null;
    readonly accessResolutionHandle: HotDetailHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
    readonly nameSourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticRuntimeExpressionAccessUseResult {
  readonly rows: readonly SemanticRuntimeExpressionAccessUseRow[];
}

export interface SemanticBindingDataFlowRow {
  readonly definitionName: string;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
  readonly direction: RuntimeBindingDataFlowDirection | `${RuntimeBindingDataFlowDirection}`;
  readonly realization: RuntimeOperationRealization | `${RuntimeOperationRealization}`;
  readonly sourceEvaluationKind: RuntimeBindingSourceEvaluationKind | `${RuntimeBindingSourceEvaluationKind}`;
  readonly sourceEvaluationReachability: RuntimeOperationReachability | `${RuntimeOperationReachability}`;
  readonly targetMutationKind: RuntimeBindingValueChannelTargetMutationKind | `${RuntimeBindingValueChannelTargetMutationKind}`;
  readonly strictBinding: boolean | null;
  readonly accessUseCount: number;
  readonly expressionParseState: TemplateExpressionParseState | `${TemplateExpressionParseState}` | null;
  readonly expressionParseResultKind: ExpressionParseResultKind | `${ExpressionParseResultKind}` | null;
  /** Zero for an ordinary expression/first hole, N for a later hole, or null for aggregate/open selection. */
  readonly expressionChainIndex: number | null;
  readonly valueSiteKind: TemplateValueSiteKind | `${TemplateValueSiteKind}` | null;
  readonly sourceKind: RuntimeBindingDataFlowSourceKind | `${RuntimeBindingDataFlowSourceKind}`;
  readonly sourceName: string | null;
  readonly sourceRootName: string | null;
  readonly sourceType: string | null;
  readonly sourceTypeOpenReason: string | null;
  readonly sourceTypeOpenKind: CheckerExpressionTypeOpenKind | `${CheckerExpressionTypeOpenKind}` | null;
  readonly sourceAssignmentTargetType: string | null;
  /** Exact authored token that receives a target-to-source write. */
  readonly sourceAssignmentOccurrenceSource: SemanticSourceReference | null;
  readonly sourceAssignmentTargetSource: SemanticSourceReference | null;
  readonly targetKind: RuntimeBindingTargetKind | `${RuntimeBindingTargetKind}` | null;
  readonly targetProperty: string | null;
  readonly targetOperationKind: RuntimeBindingTargetOperationKind | `${RuntimeBindingTargetOperationKind}` | null;
  readonly sourceOperationKind: RuntimeBindingSourceOperationKind | `${RuntimeBindingSourceOperationKind}` | null;
  readonly targetPropertyType: string | null;
  readonly targetValueType: string | null;
  readonly targetToSourceValueType: string | null;
  readonly targetToSourceValueTypeOpenReason: string | null;
  readonly targetToSourceValueTypeOpenKind: CheckerExpressionTypeOpenKind | `${CheckerExpressionTypeOpenKind}` | null;
  readonly valueConverterWritebackStages: readonly SemanticBindingDataFlowValueConverterWritebackStageRow[];
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
  /** Authored expression value evaluated or assigned by this binding edge. */
  readonly expressionSource: SemanticSourceReference | null;
  /** Authored binding carrier that owns the runtime edge. */
  readonly source: SemanticSourceReference | null;
  readonly handles?: {
    readonly bindingProductHandle: ProductHandle | null;
    readonly dataFlowProductHandle: ProductHandle;
    readonly accessUseProductHandles: readonly ProductHandle[];
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
    readonly targetToSourceValueTypeProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticBindingDataFlowResult {
  readonly rows: readonly SemanticBindingDataFlowRow[];
}

export type SemanticBindingUncertaintyExplanationConclusionKind =
  | 'flow-proved'
  | 'flow-partially-proved'
  | 'flow-blocked';

/** One cursor-selected template-authored PropertyBinding, independent from store-local handles. */
export interface SemanticBindingUncertaintyExplanationSubject {
  /** Structural identity used to reprove that a fresh answer still describes the same authored binding. */
  readonly subjectKey: string;
  readonly projectKey: string;
  readonly definitionName: string;
  readonly compilationLane: SemanticTemplateCompilationRow['compilationLane'];
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
  /** Authored binding carrier that owns every returned data-flow lane. */
  readonly source: SemanticSourceReference;
  /** Authored expression evaluated or assigned by the binding, when separately addressable. */
  readonly expressionSource: SemanticSourceReference | null;
  readonly templateSource: SemanticSourceReference | null;
  readonly targetProperties: readonly string[];
}

export interface SemanticBindingUncertaintyExplanationConclusion {
  readonly kind: SemanticBindingUncertaintyExplanationConclusionKind;
  readonly title: string;
  readonly explanation: string;
  readonly action: string;
}

/** Typed causal blocker retained by one or more data-flow materializations for the selected binding. */
export interface SemanticBindingUncertaintyExplanationBlocker {
  readonly kind: 'open-seam';
  readonly seamKindKey: string;
  readonly summary: string;
  readonly reasonKinds: readonly (OpenSeamReasonKind | `${OpenSeamReasonKind}`)[];
  readonly boundaryKinds: readonly (OpenSeamBoundaryKind | `${OpenSeamBoundaryKind}`)[];
  /** Indexes into `evidence.lanes`; one upstream seam can constrain more than one lane. */
  readonly laneIndexes: readonly number[];
  readonly sources: readonly SemanticSourceReference[];
}

export interface SemanticBindingUncertaintyExplanationEvidence {
  /** Canonical public projections of every data-flow lane owned by the selected binding. */
  readonly lanes: readonly SemanticBindingDataFlowRow[];
  readonly blockers: readonly SemanticBindingUncertaintyExplanationBlocker[];
}

export type SemanticBindingUncertaintyExplanationUncertaintyReason =
  | 'binding-direction-open'
  | 'source-evaluation-open'
  | 'target-realization-open'
  | 'source-type-open'
  | 'source-assignment-open'
  | 'target-to-source-value-open'
  | 'value-converter-writeback-open'
  | 'source-to-target-assignability-open'
  | 'target-to-source-assignability-open'
  | 'data-flow-open'
  | 'blocking-open-seam'
  | 'source-discovery-truncated';

export interface SemanticBindingUncertaintyExplanationUncertainty {
  readonly state: 'closed' | 'open' | 'truncated';
  readonly reasons: readonly SemanticBindingUncertaintyExplanationUncertaintyReason[];
  readonly explanation: string;
}

/** Human-readable pointer to the answer envelope that owns freshness and revision authority. */
export interface SemanticBindingUncertaintyExplanationCurrentness {
  readonly authority: 'answer-analysis-basis';
  readonly explanation: string;
}

export interface SemanticBindingUncertaintyExplanationNextStep {
  readonly kind: 'inspect-source' | 'inspect-query' | 'requery';
  readonly label: string;
  readonly source: SemanticSourceReference | null;
  readonly relatedQueryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}` | null;
  readonly targetQuery: SemanticAppQuery | null;
}

export interface SemanticBindingUncertaintyExplanation {
  readonly subject: SemanticBindingUncertaintyExplanationSubject;
  readonly conclusion: SemanticBindingUncertaintyExplanationConclusion;
  readonly evidence: SemanticBindingUncertaintyExplanationEvidence;
  readonly uncertainty: SemanticBindingUncertaintyExplanationUncertainty;
  readonly currentness: SemanticBindingUncertaintyExplanationCurrentness;
  readonly nextSteps: readonly SemanticBindingUncertaintyExplanationNextStep[];
}

export interface SemanticBindingUncertaintyExplanationContender {
  readonly subject: SemanticBindingUncertaintyExplanationSubject;
  readonly conclusionKind: SemanticBindingUncertaintyExplanationConclusionKind;
}

export interface SemanticBindingUncertaintyExplanationResult {
  readonly displayText: string;
  readonly projectKey: string;
  readonly explanation: SemanticBindingUncertaintyExplanation | null;
  readonly contenders: readonly SemanticBindingUncertaintyExplanationContender[];
}

export interface SemanticNullableBooleanCountRow {
  readonly yes: number;
  readonly no: number;
  readonly unknown: number;
}

export interface SemanticBindingDataFlowSummaryRow {
  readonly direction: RuntimeBindingDataFlowDirection | `${RuntimeBindingDataFlowDirection}`;
  readonly realization: RuntimeOperationRealization | `${RuntimeOperationRealization}`;
  readonly sourceEvaluationKind: RuntimeBindingSourceEvaluationKind | `${RuntimeBindingSourceEvaluationKind}`;
  readonly sourceEvaluationReachability: RuntimeOperationReachability | `${RuntimeOperationReachability}`;
  readonly targetMutationKind: RuntimeBindingValueChannelTargetMutationKind | `${RuntimeBindingValueChannelTargetMutationKind}`;
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
  RuntimeObservedMemberSourceState | `${RuntimeObservedMemberSourceState}`;

/**
 * Provenance of `observedMemberSource`: `member-declaration` is the observed member's own
 * declaration; `owner-value` is the owner/root declaration carried as a best-effort navigation aid
 * for weak, dynamic, keyed, or index-signature-shaped owners and must not be treated as member proof.
 */
export type SemanticObservedMemberSourceRoute =
  RuntimeObservedMemberSourceRoute | `${RuntimeObservedMemberSourceRoute}`;

export interface SemanticBindingObservedDependencyRow {
  readonly definitionName: string;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
  readonly realization: RuntimeOperationRealization | `${RuntimeOperationRealization}`;
  readonly rowKey: string;
  readonly owner: SemanticObservedDependencyOwnerRow;
  readonly occurrence: SemanticObservedDependencyOccurrenceRow;
  readonly handles?: {
    readonly bindingProductHandle: ProductHandle | null;
    readonly dataFlowProductHandle: ProductHandle;
    readonly observedDependencyProductHandle: ProductHandle;
    readonly observedDependencyIdentityHandle: IdentityHandle;
    readonly expressionProductHandle: ProductHandle | null;
    readonly bindingScopeProductHandle: ProductHandle | null;
  };
}

export interface SemanticBindingObservedDependencyResult {
  readonly rows: readonly SemanticBindingObservedDependencyRow[];
}

export interface SemanticBindingObservedDependencySummaryRow {
  /** Answer-local key for selecting this exact summary cluster in the same app epoch. */
  readonly clusterKey: string;
  readonly dependencyKind: RuntimeObservedDependencyKind | `${RuntimeObservedDependencyKind}`;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
  readonly realization: RuntimeOperationRealization | `${RuntimeOperationRealization}`;
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
