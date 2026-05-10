import type {
  BootProjectDiscoveryMode,
  BootProjectInput,
} from '../boot/frames.js';
import type {
  SemanticProjectAureliaDependencyScope,
  SemanticProjectAureliaSourceSignalKind,
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
import type { ControllerPhase } from '../configuration/controller.js';
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
  RuntimeBindingKind,
  RuntimeBindingSourceOperationAuthority,
  RuntimeBindingSourceOperationKind,
  RuntimeBindingTargetAccessAuthority,
  RuntimeBindingTargetAccessLookup,
  RuntimeBindingTargetAccessStrategy,
  RuntimeBindingTargetKind,
  RuntimeBindingTargetOperationAuthority,
  RuntimeBindingTargetOperationKind,
  RuntimeTargetOperationOwnerKind,
} from '../template/runtime-binding.js';
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
import type { CheckerTypeMemberKind } from '../type-system/type-shape.js';
import type { ExpressionParseResultKind } from '../expression/parse-result-algebra.js';
import type {
  BuiltInTemplateControllerChildViewCardinality,
  BuiltInTemplateControllerFlowKind,
} from '../template/template-controller-semantics.js';
import type {
  NavigationInstructionKind,
  RouteableComponentKind,
  RouteConfigKind,
  RouteRecognizerModelKind,
  RouteRecognizerSegmentKind,
  RouteRecognizerStateKind,
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
  SourceFiles = 'source-files',
  UnresolvedModules = 'unresolved-modules',
  OpenSeams = 'open-seams',
  AppTopology = 'app-topology',
  RouterOptions = 'router-options',
  Routes = 'routes',
  RouteContexts = 'route-contexts',
  RoutePatterns = 'route-patterns',
  RouteEndpoints = 'route-endpoints',
  RouteRecognizerStates = 'route-recognizer-states',
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
  /** Project key selected from the booted workspace. Omit to use the first project. */
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
  readonly aureliaDependencyScopes: readonly SemanticProjectAureliaDependencyScopeCount[];
  readonly aureliaSourceSignals: readonly SemanticProjectAureliaSourceSignalCount[];
}

export interface SemanticSourceRoleCount {
  readonly role: string;
  readonly count: number;
}

export interface SemanticProjectAureliaDependencyScopeCount {
  readonly scope: SemanticProjectAureliaDependencyScope | `${SemanticProjectAureliaDependencyScope}`;
  readonly count: number;
}

export interface SemanticProjectAureliaSourceSignalCount {
  readonly signal: SemanticProjectAureliaSourceSignalKind | `${SemanticProjectAureliaSourceSignalKind}`;
  readonly count: number;
}

export interface SemanticAppSummary {
  readonly analysisDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`;
  readonly projectKey: string;
  readonly rootDir: string;
  readonly sourceFiles: number;
  readonly evaluatedSources: number;
  readonly unresolvedModuleEdges: number;
  readonly resourceDefinitions: number;
  readonly routerOptions: number;
  readonly routeConfigs: number;
  readonly routeConfigContexts: number;
  readonly routeContexts: number;
  readonly routeRecognizers: number;
  readonly routePatterns: number;
  readonly routeEndpoints: number;
  readonly routeRecognizerStates: number;
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
  readonly containers: number;
  readonly runtimeChildContainers: number;
  readonly resolverSlots: number;
  readonly runtimeChildContextResolverSlots: number;
  readonly runtimeControllers: number;
  readonly resourceSlots: number;
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

export interface SemanticResourceDefinitionBindableRow {
  readonly name: string;
  readonly attribute: string;
  readonly callback: string;
  readonly mode: BindableBindingMode | `${BindableBindingMode}`;
  readonly setterKind: BindableSetterKind | `${BindableSetterKind}`;
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

export interface SemanticResourceDefinitionRow {
  readonly projectKey: string;
  readonly resourceKind: ResourceDefinitionKind;
  readonly name: string | null;
  readonly aliases: readonly string[];
  readonly key: string | null;
  readonly targetName: string | null;
  readonly captureKind: CustomElementCaptureKind | `${CustomElementCaptureKind}` | null;
  readonly template: SemanticResourceDefinitionTemplateRow | null;
  readonly bindables: readonly SemanticResourceDefinitionBindableRow[];
  readonly watches: readonly SemanticResourceDefinitionWatchRow[];
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
  | 'binding-source-assignment-strictness'
  | 'binding-source-assignment-runtime-noop';

export type SemanticTemplateCursorDiagnosticAuthority =
  | 'semantic-authoring-policy'
  | 'framework-runtime-behavior'
  | 'framework-error-code';

export type SemanticTemplateCursorSuggestionKind =
  | 'declare-explicit-member'
  | 'declare-assignable-member'
  | 'declare-scope-slot-type'
  | 'replace-any-owner'
  | 'use-assignable-expression'
  | 'inspect-owner-type';

export type SemanticTemplateCursorSuggestionActionKind =
  | 'declare-member'
  | 'declare-scope-slot'
  | 'replace-owner-type'
  | 'rewrite-expression'
  | 'inspect-owner-type';

export type SemanticTemplateCursorSuggestionActionTargetKind =
  | 'owner-type'
  | 'scope-slot'
  | 'expression';

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
  readonly propertyType: string | null;
  readonly propertyExists: boolean | null;
  readonly isWritable: boolean | null;
  readonly isObservable: boolean;
  readonly authority: RuntimeBindingTargetAccessAuthority | `${RuntimeBindingTargetAccessAuthority}`;
  readonly openReason: string | null;
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

export interface SemanticBindingValueChannelRow {
  readonly definitionName: string;
  readonly bindingKind: RuntimeBindingKind | `${RuntimeBindingKind}`;
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
  readonly expressionParseState: TemplateExpressionParseState | `${TemplateExpressionParseState}` | null;
  readonly expressionParseResultKind: ExpressionParseResultKind | `${ExpressionParseResultKind}` | null;
  readonly sourceKind: RuntimeBindingDataFlowSourceKind | `${RuntimeBindingDataFlowSourceKind}`;
  readonly sourceName: string | null;
  readonly sourceType: string | null;
  readonly sourceTypeOpenReason: string | null;
  readonly sourceAssignmentTargetType: string | null;
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
