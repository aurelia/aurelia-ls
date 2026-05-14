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
  AuthoringSourceConflictPolicy,
  AuthoringSourceEditKind,
  AuthoringSourceFileRole,
  AuthoringSourceFormattingPolicy,
  AuthoringSourceLanguage,
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
  RuntimeBindingDataFlowSourceAssignmentKind,
  RuntimeBindingDataFlowSourceAssignmentReasonKind,
  RuntimeBindingDataFlowSourceKind,
  RuntimeBindingValueChannelAuthority,
  RuntimeBindingValueChannelKind,
} from '../observation/runtime-binding-observation.js';
import type {
  ObservationIssueKind,
  ObservationIssuePhase,
} from '../observation/observation-issue.js';
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
import type { RuntimeRendererKind } from '../template/runtime-renderer-reference.js';
import type {
  TemplateExpressionParseState,
  TemplateValueSiteKind,
} from '../template/value-site.js';
import type {
  CheckerExpressionTypeOpenKind,
} from '../type-system/expression-type-evaluation.js';
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

export const enum SemanticRuntimeAnswerOutcome {
  Hit = 'hit',
  Miss = 'miss',
  Partial = 'partial',
  Unsupported = 'unsupported',
}

export const enum SemanticAppQueryKind {
  Summary = 'summary',
  AuthoringCatalog = 'authoring-catalog',
  AuthoringOrientation = 'authoring-orientation',
  SourceFiles = 'source-files',
  UnresolvedModules = 'unresolved-modules',
  OpenSeams = 'open-seams',
  AppDiagnostics = 'app-diagnostics',
  EvaluationIssues = 'evaluation-issues',
  ConfigurationIssues = 'configuration-issues',
  DiIssues = 'di-issues',
  ObservationIssues = 'observation-issues',
  AppTopology = 'app-topology',
  StateStores = 'state-stores',
  StateIssues = 'state-issues',
  ValidationIssues = 'validation-issues',
  FetchClientIssues = 'fetch-client-issues',
  DialogIssues = 'dialog-issues',
  RouterOptions = 'router-options',
  Routes = 'routes',
  RouteContexts = 'route-contexts',
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
  BindingTargetAccesses = 'binding-target-accesses',
  TargetOperations = 'target-operations',
  BindingTargetOperations = 'binding-target-operations',
  BindingSourceOperations = 'binding-source-operations',
  BindingBehaviorApplications = 'binding-behavior-applications',
  BindingValueChannels = 'binding-value-channels',
  BindingDataFlows = 'binding-data-flows',
}

export const enum SemanticRuntimeDetail {
  /** Default API projection: readable rows with compact navigation labels. */
  Compact = 'compact',
  /** Include opaque kernel handles for exact in-process follow-up navigation. */
  Handles = 'handles',
}

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

export interface OpenSemanticAppOptions {
  /** Project key selected from the booted workspace. Omit to use the default aurelia-app project. */
  readonly projectKey?: string | null;
  /** Optional source file used to select the owning project when projectKey is omitted. */
  readonly sourceFilePath?: string | null;
  /** Runtime/checker product depth requested for this app-world emission. Omit for full binding observation. */
  readonly analysisDepth?: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}` | null;
  /** Include standalone resource-library template analysis for authoring/LSP inquiries. */
  readonly includeAuthoringTemplates?: boolean | null;
  /** Optional source-file selection for authoring/LSP template compilation. */
  readonly authoringTemplateSourceFiles?: readonly string[] | null;
  /** Optional cap for standalone authoring templates compiled in this app open request. */
  readonly authoringTemplateLimit?: number | null;
}

export interface SemanticRuntimePageInput {
  readonly size?: number;
  readonly cursor?: string | null;
}

export interface SemanticAppQuery {
  readonly kind: SemanticAppQueryKind | `${SemanticAppQueryKind}`;
  readonly page?: SemanticRuntimePageInput;
  readonly detail?: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`;
  /** Source cursor used by cursor-scoped authoring queries such as template completions. */
  readonly cursor?: SemanticRuntimeSourceCursorInput | null;
  /** Source file used by file-scoped authoring queries such as template diagnostics. */
  readonly sourceFile?: SemanticRuntimeSourceFileInput | null;
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
  readonly page?: SemanticRuntimePageInput;
  readonly detail?: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`;
}

export interface SemanticRuntimeAnswer<TValue> {
  readonly schemaVersion: typeof SEMANTIC_RUNTIME_API_VERSION;
  readonly outcome: SemanticRuntimeAnswerOutcome;
  readonly summary: string;
  readonly value: TValue;
  readonly page?: SemanticRuntimePageResult | null;
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

export interface SemanticRuntimeSummary {
  readonly workspaceRoot: string;
  readonly workspaceKey: string;
  readonly projects: readonly SemanticProjectSummary[];
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
  | 'component-role'
  | 'binding-target-access'
  | 'target-operation'
  | 'binding-value-channel'
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
  readonly projectTooling: SemanticAuthoringProjectToolingCatalogRow | null;
  readonly hasCompleteFileText: boolean;
  readonly fileCount: number;
  readonly fileRoles: readonly (AuthoringSourceFileRole | `${AuthoringSourceFileRole}`)[];
  readonly languages: readonly (AuthoringSourceLanguage | `${AuthoringSourceLanguage}`)[];
  readonly editKinds: readonly (AuthoringSourceEditKind | `${AuthoringSourceEditKind}`)[];
  readonly textAuthorities: readonly (AuthoringSourceTextAuthority | `${AuthoringSourceTextAuthority}`)[];
  readonly files: readonly SemanticAuthoringSourceFileCatalogRow[];
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
  readonly runtimeTargetOperations: number;
  readonly runtimeRendererTargetOperations: number;
  readonly runtimeBindingTargetAccesses: number;
  readonly runtimeBindingTargetOperations: number;
  readonly runtimeBindingSourceOperations: number;
  readonly runtimeBindingBehaviorApplications: number;
  readonly runtimeBindingValueChannels: number;
  readonly runtimeBindingDataFlows: number;
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
  readonly rows: readonly SemanticOpenSeamRow[];
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
  readonly keyName: string | null;
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

export type SemanticAppDiagnosticDomain =
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
  readonly diagnosticAuthority: SemanticTemplateCursorDiagnosticAuthority | 'semantic-runtime-product';
  readonly frameworkErrorCode: string | null;
  readonly frameworkRawErrorAuthority?: string | null;
  readonly severity: SemanticTemplateCursorDiagnosticSeverity;
  readonly summary: string;
  readonly source: SemanticSourceReference | null;
  readonly relatedQueryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`;
}

export interface SemanticAppDiagnosticsResult {
  readonly rows: readonly SemanticAppDiagnosticRow[];
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
  readonly queryParamCount: number;
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
  readonly redirectDepth: number;
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
    readonly sourceAddressHandle: AddressHandle | null;
  };
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
    readonly identityHandle: IdentityHandle;
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
  | 'declare-explicit-member'
  | 'declare-assignable-member'
  | 'declare-scope-slot-type'
  | 'replace-any-owner'
  | 'align-assignment-type'
  | 'make-source-writable'
  | 'use-assignable-expression'
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
  readonly rows: readonly SemanticTemplateDiagnosticRow[];
}

export interface SemanticTemplateCursorInfoResult {
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
    readonly source: SemanticSourceReference | null;
    readonly handles?: {
      readonly productHandle: ProductHandle | null;
      readonly identityHandle: IdentityHandle | null;
      readonly sourceAddressHandle: AddressHandle | null;
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
  | 'expanded-aggregate';

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
  readonly isCollection: boolean | null;
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
    readonly targetPropertyTypeProductHandle: ProductHandle | null;
    readonly targetValueTypeProductHandle: ProductHandle | null;
    readonly sourceAddressHandle: AddressHandle | null;
  };
}

export interface SemanticBindingDataFlowResult {
  readonly rows: readonly SemanticBindingDataFlowRow[];
}
