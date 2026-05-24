import path from 'node:path';
import type { BootProjectInput, ProjectBootFrame, WorkspaceBootFrame } from '../boot/frames.js';
import { bootWorkspace } from '../boot/boot-workspace.js';
import {
  readSemanticProjectShape,
  SemanticProjectShapeKind,
  type SemanticProjectShape,
} from '../boot/project-shape.js';
import {
  readProjectCompilerOptionsCacheOverview,
} from '../boot/project-compiler-options.js';
import { SourceFileRole } from '../kernel/address.js';
import { KernelStore, type KernelStoreDisposalSummary, type KernelStoreMarker } from '../kernel/store.js';
import { AureliaAppWorldProjectEmission, AureliaAppWorldProjectPass } from '../configuration/app-world-project-pass.js';
import {
  evaluateAureliaProject,
} from '../configuration/aurelia-project-evaluation.js';
import {
  SemanticAppAnalysisDepth,
  normalizeSemanticAppAnalysisDepth,
  semanticAppAnalysisDepthSatisfies,
} from '../configuration/app-analysis.js';
import type {
  StaticProjectEvaluationResult,
} from '../evaluation/project-evaluation.js';
import {
  clearTypeSystemCompilerHostSourceFileCache,
  readTypeSystemCompilerHostSourceFileCacheOverview,
  type TypeSystemCompilerHostSourceFileCacheClearSummary,
} from '../type-system/project.js';
import type {
  CheckerExpressionTypeEvaluationCacheStats,
} from '../type-system/expression-type-evaluation.js';
import {
  readSemanticApplicationTopology,
  readSemanticApplicationTopologySummary,
  type SemanticApplicationTopologyResult,
} from './app-topology.js';
import {
  readSemanticAuthoringCatalogAnswer,
  readSemanticAuthoringCatalogView,
} from './authoring-catalog.js';
import {
  readSemanticAuthoringOrientation,
  semanticAuthoringOrientationResultForDetail,
} from './authoring-orientation.js';
import {
  readSemanticAuthoringGuidance,
} from './authoring-guidance.js';
import {
  readSemanticAuthoringRecipePlan,
} from './authoring-plan.js';
import {
  readSemanticAppSummary,
  sourceRoleCounts,
} from './app-summary.js';
import {
  readSemanticSourceFiles,
} from './source-files.js';
import {
  readSemanticUnresolvedModules,
} from './unresolved-modules.js';
import {
  answerAppWorldFreeQuery,
  answerRuntimeStaticAppQuery as answerRuntimeStaticAppQueryValue,
} from './app-world-free-queries.js';
import {
  readSemanticAppOverview,
} from './app-overview.js';
import {
  readSemanticAppQueryCatalog,
  semanticAppQueryCatalogShape,
  semanticAppQueryCatalogRow,
} from './app-query-catalog.js';
import {
  filterSemanticAppQueryContinuations,
  withSemanticAppQueryContinuations,
} from './app-query-continuations.js';
import {
  semanticAppQueryEpochKeys,
  semanticAppQueryKey,
  semanticAppQueryLocusKey,
  semanticAppProjectEpochKey,
  semanticAppSourceEpochKey,
  semanticRuntimeAppWorldFreeQueryBatchKey,
  semanticRuntimeAppWorldFreeQueryKey,
  semanticRuntimeAppQueryCatalogKey,
  semanticRuntimeAuthoringGuidanceKey,
  semanticRuntimeAuthoringRecipePlanKey,
  semanticRuntimeRoutedAppQueryBatchEpochKeys,
  semanticRuntimeRoutedAppQueryBatchKey,
  semanticRuntimeRoutedAppQueryBatchLocusKey,
  semanticRuntimeRoutedAppQueryEpochKeys,
  semanticRuntimeRoutedAppQueryKey,
  semanticRuntimeSummaryKey,
  semanticRuntimeStaticAppQueryBatchKey,
  semanticRuntimeStaticAppQueryKey,
  semanticRuntimeWorkspaceEpochKey,
  semanticRuntimeWorkspaceLocusKey,
} from './app-query-identity.js';
import {
  appQueryBatchAuthoringTemplateSourceFiles,
  appQueryBatchNeedsAuthoringTemplates,
  appQueryBatchSourceFilePath,
  appQueryNeedsAuthoringTemplates,
  appQuerySourceFilePath,
  defaultInquiryProfileForRoutedAppQuery,
  defaultInquiryProfileForRoutedAppQueryBatch,
  isAppWorldFreeAppQuery,
  isRuntimeStaticAppQuery,
  routedAppQueryBatchAnalysisDepth,
  routedAppQueryAnalysisDepth,
  semanticAppQueryBatchMaterializationPolicy,
  semanticAppQueryMaterializationPolicy,
  semanticRuntimeQueryClaimDisposalStrategy,
  shouldDisposeAppAfterRoutedQuery,
  typeSystemDependencyCacheClearPolicyForRoutedQuery,
} from './app-query-policy.js';
import {
  QueryClaimGraph,
  type QueryClaimAnswerDisposalSummary,
} from '../inquiry/query-claim-graph.js';
import {
  queryClaimDisposalPolicy,
  QueryClaimDisposalReason,
  type QueryClaimDisposalPolicy,
  type SemanticQueryMaterializationPolicy,
} from '../inquiry/query-claim-policy.js';
import {
  DEFAULT_SEMANTIC_RUNTIME_INQUIRY_PROFILE,
  normalizeSemanticRuntimeInquiryProfile,
  type SemanticRuntimeInquiryProfile,
} from '../telemetry/inquiry-profile.js';
import {
  formatSemanticRuntimeBytes,
  readSemanticRuntimeMemorySample,
  type SemanticRuntimeMemoryDelta,
} from '../telemetry/memory.js';
import {
  readBindingDataFlowRows,
  readBindingDataFlowSummary,
  readBindingObservedDependencySummary,
  readBindingObservedDependencyRows,
  readBindingBehaviorApplicationRows,
  readBindingSourceOperationRows,
  readBindingTargetAccessRows,
  readBindingValueChannelSummary,
  readBindingValueChannelRows,
  readTargetOperationRows,
} from './binding-projections.js';
import {
  readRuntimeControllerRows,
  readRuntimeWatcherObservedDependencyRows,
  readRuntimeWatcherRows,
} from './controller-projections.js';
import {
  readRuntimeCompositionRows,
} from './composition-projections.js';
import {
  appDiagnosticRows,
  appDiagnosticSummaryRows,
} from './app-diagnostics.js';
import {
  readSemanticTypeScriptDiagnosticRows,
  readSemanticTypeScriptDiagnostics,
  readSemanticTypeScriptDiagnosticSummary,
} from './typescript-diagnostics.js';
import {
  readConfigurationIssueRows,
} from './configuration-projections.js';
import {
  readDiIssueRows,
} from './di-projections.js';
import {
  readEvaluationIssueRows,
} from './evaluation-projections.js';
import {
  readComputedObservationDefinitionRows,
  readComputedObserverObservedDependencyRows,
  readComputedObserverSourceRows,
  readObservationIssueRows,
  readProxyObservableEscapeRows,
  readRuntimeEffectObservedDependencyRows,
  readRuntimeEffectRows,
} from './observation-projections.js';
import {
  openSeamSummaryRows,
  readAppOpenSeams,
} from './open-seam-projections.js';
import {
  readResourceDefinitionRows,
  readResourceIssueRows,
} from './resource-projections.js';
import {
  readStateIssueRows,
  readStateStoreRows,
} from './state-projections.js';
import {
  readI18nTranslationBindingRows,
  readI18nTranslationKeyRows,
} from './i18n-projections.js';
import {
  readValidationIssueRows,
} from './validation-projections.js';
import {
  readFetchClientIssueRows,
} from './fetch-client-projections.js';
import {
  readDialogIssueRows,
} from './dialog-projections.js';
import {
  compilerWorldLabel,
  describeAddress,
} from './source-reference.js';
import {
  sourceFileAddressForAddress,
  sourcePathMatchesFileName,
} from '../kernel/source-address.js';
import {
  SemanticAppQueryKind,
  SemanticRuntimeAnswerOutcome,
  SemanticRuntimeDetail,
  SEMANTIC_TYPE_SYSTEM_DEPENDENCY_CACHE_CLEAR_POLICIES,
  type OpenSemanticAppOptions,
  type SemanticAppDiagnosticsResult,
  type SemanticAppDiagnosticRow,
  type SemanticAppDiagnosticSummaryResult,
  type SemanticAppDiagnosticSummaryRow,
  type SemanticAppOverviewRequest,
  type SemanticAppOverviewCollectionSummary,
  type SemanticAppOverviewResult,
  type SemanticAppQuery,
  type SemanticAppQueryCatalogResult,
  type SemanticAppQueryCatalogRow,
  type SemanticAppQueryCatalogRequest,
  type SemanticRuntimeAppQueryBatchRequest,
  type SemanticRuntimeAppQueryBatchResult,
  type SemanticRuntimeAppQueryRequest,
  type SemanticAppSummary,
  type SemanticRuntimeAnalysisCacheOverviewRequest,
  type SemanticRuntimeAnalysisCacheClearRequest,
  type SemanticRuntimeAnalysisCacheClearResult,
  type SemanticRuntimeAnalysisCacheOverviewResult,
  type SemanticRuntimeQueryClaimDisposeRequest,
  type SemanticRuntimeQueryClaimDisposeResult,
  type SemanticRuntimeQueryClaimDisposeProfileSummary,
  type SemanticRuntimeAnswerProfile,
  type SemanticRuntimeAppWorldFreeProfileSummary,
  type SemanticRuntimeCachedAppSummary,
  type SemanticRuntimeCachedAppQueryClaimProfileSummary,
  type SemanticRuntimePhaseTimingSummary,
  type SemanticRuntimeProjectCompilerOptionsCacheSummary,
  type SemanticRuntimeTypeSystemDependencyCacheSummary,
  type SemanticRuntimeTypeSystemProgramSourceFileGroupStats,
  type SemanticTypeSystemDependencyCacheSourceBucket,
  type SemanticTypeSystemDependencyCacheClearPolicy,
  type SemanticAuthoringCatalogResult,
  type SemanticAuthoringCatalogViewRequest,
  type SemanticAuthoringCatalogViewResult,
  type SemanticAuthoringGuidanceRequest,
  type SemanticAuthoringGuidanceResult,
  type SemanticAuthoringOrientationResult,
  type SemanticAuthoringRecipePlanRequest,
  type SemanticAuthoringRecipePlanResult,
  type SemanticBindingDataFlowResult,
  type SemanticBindingDataFlowSummaryResult,
  type SemanticBindingObservedDependencyResult,
  type SemanticBindingObservedDependencySummaryResult,
  type SemanticBindingBehaviorApplicationResult,
  type SemanticBindingSourceOperationResult,
  type SemanticBindingTargetAccessResult,
  type SemanticBindingTargetOperationResult,
  type SemanticBindingValueChannelResult,
  type SemanticBindingValueChannelSummaryResult,
  type SemanticConfigurationIssuesResult,
  type SemanticDiIssuesResult,
  type SemanticDialogIssuesResult,
  type SemanticEvaluationIssuesResult,
  type SemanticFetchClientIssuesResult,
  type SemanticI18nTranslationBindingsResult,
  type SemanticI18nTranslationKeysResult,
  type SemanticOpenSeamRow,
  type SemanticOpenSeamSummaryRow,
  type SemanticOpenSeamSummaryResult,
  type SemanticOpenSeamsResult,
  type SemanticComputedObservationDefinitionsResult,
  type SemanticComputedObserverObservedDependenciesResult,
  type SemanticComputedObserverSourcesResult,
  type SemanticObservationIssuesResult,
  type SemanticProxyObservableEscapesResult,
  type SemanticRuntimeEffectObservedDependenciesResult,
  type SemanticRuntimeEffectResult,
  type SemanticResourceDefinitionsResult,
  type SemanticResourceIssuesResult,
  type SemanticResourceVisibilityResult,
  type SemanticResourceVisibilityRow,
  type SemanticRouterOverviewRequest,
  type SemanticRouterOverviewResult,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeCompositionResult,
  type SemanticRuntimeControllerResult,
  type SemanticRuntimeWatcherObservedDependencyResult,
  type SemanticRuntimeWatcherResult,
  type SemanticRuntimeOptions,
  type SemanticRuntimePageInput,
  type SemanticRuntimeSourceCursorInput,
  type SemanticRuntimeSourceFileInput,
  type SemanticRuntimeSummary,
  type SemanticRuntimeSummaryRequest,
  type SemanticSourceFilesResult,
  type SemanticStateIssuesResult,
  type SemanticStateStoresResult,
  type SemanticValidationIssuesResult,
  type SemanticTemplateCursorQuery,
  type SemanticUnresolvedModulesResult,
  type SemanticTargetOperationResult,
  type SemanticTemplateCompletionResult,
  type SemanticTemplateCursorInfoResult,
  type SemanticTemplateDiagnosticsQuery,
  type SemanticTemplateDiagnosticsResult,
  type SemanticTypeScriptDiagnosticsResult,
  type SemanticTypeScriptDiagnosticSummaryResult,
} from './contracts.js';
import type {
  SemanticRuntimeDetailDensityRow,
  SemanticRuntimeCountRow,
  SemanticRuntimeKernelCountSnapshot,
  SemanticRuntimeKernelDensitySnapshot,
} from '../telemetry/kernel-density.js';
import {
  diffSemanticRuntimeCountRows,
  diffSemanticRuntimeDetailDensityRows,
} from '../telemetry/kernel-density.js';
import {
  answer,
  includeHandles,
  outcomeForPagedRows,
  pageRows,
} from './answer-helpers.js';
import { SemanticAppRouteQueries } from './app-route-queries.js';
import { SemanticAppTemplateQueries } from './app-template-queries.js';
import {
  readSemanticRouterOverview,
} from './router-overview.js';
import {
  semanticRouteQueryDescriptorFor,
} from './route-query-registry.js';

/** Create the in-process semantic-runtime API surface. */
export async function createSemanticRuntime(
  options: SemanticRuntimeOptions,
): Promise<SemanticRuntime> {
  return SemanticRuntime.open(options);
}

interface SemanticAppOpenPlan {
  readonly project: ProjectBootFrame;
  readonly analysisDepth: SemanticAppAnalysisDepth;
  readonly includeAuthoringTemplates: boolean;
  readonly authoringTemplateSourceFiles: readonly string[];
  readonly authoringTemplateLimit: number | null;
  readonly telemetry: OpenSemanticAppOptions['telemetry'];
}

interface SemanticRuntimeQueryClaimInput {
  readonly inquiryProfile: SemanticRuntimeInquiryProfile;
  readonly queryKind: string;
  readonly queryKey: string;
  readonly locusKey?: string;
  readonly epochKeys?: readonly string[];
  readonly materializationPolicy: SemanticQueryMaterializationPolicy;
  readonly kernelBoundary?: 'dispose-answer-local' | 'observe-only';
  readonly shouldReuseRetainedAnswer?: () => boolean;
  readonly disposeAnswerSideEffects?: () => QueryClaimAnswerDisposalSummary | null;
}

interface SemanticRuntimeStaticCatalogRequest {
  readonly inquiryProfile?: SemanticRuntimeInquiryProfile | `${SemanticRuntimeInquiryProfile}` | null;
}

/** Booted workspace facade. It owns source admission and app-world opening. */
export class SemanticRuntime {
  private readonly appsByCacheKey = new Map<string, SemanticApp>();
  private readonly projectShapesByProjectKey = new Map<string, SemanticProjectShape>();
  private readonly queryClaimsByProfile = new Map<SemanticRuntimeInquiryProfile, QueryClaimGraph>();

  private constructor(
    readonly workspace: WorkspaceBootFrame,
  ) {}

  static async open(options: SemanticRuntimeOptions): Promise<SemanticRuntime> {
    const workspaceRoot = path.resolve(options.workspaceRoot);
    const projects = options.projects?.map((project): BootProjectInput => ({
      ...project,
      rootDir: path.resolve(workspaceRoot, project.rootDir),
    }));
    const workspace = bootWorkspace({
      rootDir: workspaceRoot,
      storeKey: options.storeKey,
      projects,
      projectDiscovery: options.projectDiscovery,
    });
    return new SemanticRuntime(workspace);
  }

  summary(request: SemanticRuntimeSummaryRequest = {}): SemanticRuntimeAnswer<SemanticRuntimeSummary> {
    return this.answerRuntimeQuery(
      {
        inquiryProfile: normalizeSemanticRuntimeInquiryProfile(request.inquiryProfile),
        queryKind: 'runtime-summary',
        queryKey: semanticRuntimeSummaryKey(request),
        materializationPolicy: 'projection-only',
      },
      () => this.readSummary(request),
    );
  }

  private readSummary(request: SemanticRuntimeSummaryRequest): SemanticRuntimeAnswer<SemanticRuntimeSummary> {
    const projects = this.workspace.projects.map((project) => {
      const shape = this.readProjectShape(project);
      return {
        projectKey: project.projectKey,
        rootDir: project.rootDir,
        sourceFiles: project.sourceFiles.length,
        sourceRoles: sourceRoleCounts(project),
        hasAureliaAppEntrypointSignal: shape.shapeKind === SemanticProjectShapeKind.AureliaApp,
        shapeKind: shape.shapeKind,
        analysisKind: shape.analysisKind,
        aureliaDependencyScopes: shape.aureliaDependencyScopes,
        aureliaSourceSignals: shape.aureliaSourceSignals,
        shapeReasons: shape.shapeReasons,
      };
    });
    const appCandidates = projects
      .filter((project) => project.shapeKind === SemanticProjectShapeKind.AureliaApp)
      .map((project) => ({
        projectKey: project.projectKey,
        rootDir: project.rootDir,
        sourceFiles: project.sourceFiles,
        shapeKind: project.shapeKind,
        analysisKind: project.analysisKind,
      }));
    const pagedProjects = pageRows(projects, summaryProjectPage(request.projectPage ?? undefined));
    const projectShapeCounts = countProjectShapes(projects);
    const projectAnalysisCounts = countProjectAnalysisKinds(projects);
    const defaultAppProjectKey = appCandidates[0]?.projectKey ?? null;
    const value: SemanticRuntimeSummary = {
      workspaceRoot: this.workspace.rootDir,
      workspaceKey: this.workspace.workspaceKey,
      displayText: semanticRuntimeSummaryDisplayText({
        workspaceRoot: this.workspace.rootDir,
        projectCount: projects.length,
        returnedProjectCount: pagedProjects.page.returnedRows,
        hasMoreProjectRows: pagedProjects.page.nextCursor != null,
        projectShapeCounts,
        projectAnalysisCounts,
        defaultAppProjectKey,
        appCandidates,
      }),
      projectShapeCounts,
      projectAnalysisCounts,
      defaultAppProjectKey,
      appCandidates,
      projects: pagedProjects.rows,
    };
    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      `Booted ${projects.length} semantic-runtime project frame(s) with ${value.appCandidates.length} app candidate(s); returned ${pagedProjects.page.returnedRows} project row(s).`,
      value,
      pagedProjects.page,
    );
  }

  analysisCacheOverview(
    request: SemanticRuntimeAnalysisCacheOverviewRequest = {},
  ): SemanticRuntimeAnswer<SemanticRuntimeAnalysisCacheOverviewResult> {
    const rowLimit = normalizeCacheOverviewRowLimit(request.rowLimit);
    const workspaceKernel = trimKernelDensitySnapshot(
      this.workspace.store.readTelemetrySnapshot({
        includeBreakdowns: request.includeKernelBreakdowns === true,
        includeDetailDensity: request.includeDetailDensity === true,
      }),
      rowLimit,
    );
    const cachedApps = [...this.appsByCacheKey.values()]
      .map((app) => app.cacheSummary(rowLimit, request.includeQueryClaimRows === true))
      .sort((left, right) =>
        left.projectKey.localeCompare(right.projectKey)
        || String(left.analysisDepth).localeCompare(String(right.analysisDepth))
        || Number(left.includeAuthoringTemplates) - Number(right.includeAuthoringTemplates)
        || left.authoringTemplateSourceFileCount - right.authoringTemplateSourceFileCount
      );
    const runtimeQueryClaimProfiles = this.runtimeQueryClaimProfileSummaries(rowLimit, request.includeQueryClaimRows === true);
    const projectCompilerOptionsCache = projectCompilerOptionsCacheSummary();
    const typeSystemDependencyCache = typeSystemDependencyCacheSummary(
      rowLimit,
      request.includeTypeSystemDependencyEntries === true,
    );
    const processMemory = readSemanticRuntimeMemorySample();
    const valueWithoutDisplayText: Omit<SemanticRuntimeAnalysisCacheOverviewResult, 'displayText'> = {
      cachedAppCount: cachedApps.length,
      cachedApps,
      runtimeQueryClaimProfiles,
      projectCompilerOptionsCache,
      typeSystemDependencyCache,
      processMemory,
      workspaceKernel,
      retention: {
        runtimeCacheScope: 'semantic-runtime-session',
        workspaceKernelScope: 'semantic-runtime-session',
        appEpochScope: 'cached-app',
        queryClaimScope: 'runtime-and-app-session-policy',
        reclaimAction: 'clear-analysis-cache',
        notes: [
          'Cached app objects can be reused by compatible analysis-depth and authoring-template requests.',
          'clearAnalysisCache() drops cached app epochs and disposes kernel records back to the first app-construction marker while keeping boot/source discovery alive.',
          'Opening a non-compatible app epoch for a project that already has cached app records clears cached app epochs first, because app-world handles are not yet salted by analysis-depth or authoring-template request.',
          'Project compiler options are cached process-locally by project root and cloned on read, so static evaluation and TypeSystem construction can share one filesystem-derived config shape without sharing a mutable options object.',
          'The TypeScript dependency declaration/source-file cache is process-local and survives ordinary app-cache clearing; recompute-friendly routed answers clear it when they dispose the app epoch, and warm sessions can pass typeSystemDependencyCacheClearPolicy=preserve.',
          'Runtime-level static answers and opened-app answers use separate query-claim graphs so static catalog reuse does not force app-world construction.',
          'Routed app answers also record a lightweight runtime-level query claim before optional app-epoch disposal, so one-off MCP-style calls can explain their cost without retaining the opened app.',
          'Pass includeQueryClaimRows with a small rowLimit when you need the recent retained query outcomes behind the aggregate graph counters.',
          'Query claims retain answer-shape telemetry according to the app inquiry profile and can be disposed independently from durable kernel products.',
          'Detail-density rows are opt-in because they scan hot sidecar objects; use them when memory pressure needs product-detail shape evidence.',
        ],
      },
      summary: `Semantic-runtime session retains ${cachedApps.length} cached app epoch(s) and ${workspaceKernel.totalRecords} kernel record(s).`,
    };
    const value: SemanticRuntimeAnalysisCacheOverviewResult = {
      ...valueWithoutDisplayText,
      displayText: semanticRuntimeAnalysisCacheOverviewDisplayText(valueWithoutDisplayText),
    };
    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      value.summary,
      value,
    );
  }

  clearAnalysisCache(
    request: SemanticRuntimeAnalysisCacheClearRequest = {},
  ): SemanticRuntimeAnswer<SemanticRuntimeAnalysisCacheClearResult> {
    const typeSystemDependencyCacheClearPolicy = normalizeTypeSystemDependencyCacheClearPolicy(
      request.typeSystemDependencyCacheClearPolicy,
    );
    const clearedTypeSystemDependencyCache = clearTypeSystemCompilerHostSourceFileCache(typeSystemDependencyCacheClearPolicy);
    if (this.appsByCacheKey.size === 0) {
      const disposedRuntimeQueryClaimRecords = this.disposeRuntimeQueryClaims(QueryClaimDisposalReason.SessionEnded);
      if (disposedRuntimeQueryClaimRecords > 0 || clearedTypeSystemDependencyCache.entries > 0) {
      const workspaceKernel = this.workspace.store.readTelemetrySnapshot({ includeBreakdowns: false });
        const value = withAnalysisCacheClearDisplayText({
          typeSystemDependencyCacheClearPolicy,
          disposedCachedApps: 0,
          disposedQueryClaimRecords: disposedRuntimeQueryClaimRecords,
          disposedKernelRecords: 0,
          disposedProductDetails: 0,
          disposedHotDetails: 0,
          disposedKernelHandleCharacters: 0,
          ...typeSystemDependencyCacheClearResultFields(clearedTypeSystemDependencyCache),
          remainingCachedApps: 0,
          workspaceKernel,
          summary:
            `Cleared ${disposedRuntimeQueryClaimRecords} runtime query-claim record(s) and ` +
            `${clearedTypeSystemDependencyCache.entries} TypeScript dependency source-file cache file(s) ` +
            `using policy '${typeSystemDependencyCacheClearPolicy}'; ` +
            `workspace kernel retains ${workspaceKernel.totalRecords} record(s).`,
        });
        return answer(SemanticRuntimeAnswerOutcome.Hit, value.summary, value);
      }
      const workspaceKernel = this.workspace.store.readTelemetrySnapshot({ includeBreakdowns: false });
      const value = withAnalysisCacheClearDisplayText({
        typeSystemDependencyCacheClearPolicy,
        disposedCachedApps: 0,
        disposedQueryClaimRecords: 0,
        disposedKernelRecords: 0,
        disposedProductDetails: 0,
        disposedHotDetails: 0,
        disposedKernelHandleCharacters: 0,
        ...typeSystemDependencyCacheClearResultFields(clearedTypeSystemDependencyCache),
        remainingCachedApps: 0,
        workspaceKernel,
        summary: `No cached app epochs to clear; workspace kernel retains ${workspaceKernel.totalRecords} record(s).`,
      });
      return answer(SemanticRuntimeAnswerOutcome.Hit, value.summary, value);
    }

    const disposed = this.disposeCachedAppEpochs(QueryClaimDisposalReason.AppEpochDisposed);
    const disposedRuntimeQueryClaimRecords = this.disposeRuntimeQueryClaims(QueryClaimDisposalReason.SessionEnded);
    const workspaceKernel = this.workspace.store.readTelemetrySnapshot({ includeBreakdowns: false });
    const value = withAnalysisCacheClearDisplayText({
      typeSystemDependencyCacheClearPolicy,
      disposedCachedApps: disposed.apps,
      disposedQueryClaimRecords: disposed.queryClaimRecords + disposedRuntimeQueryClaimRecords,
      disposedKernelRecords: disposed.kernel.records,
      disposedProductDetails: disposed.kernel.productDetails,
      disposedHotDetails: disposed.kernel.hotDetails,
      disposedKernelHandleCharacters: disposed.kernel.handleCharacters,
      ...typeSystemDependencyCacheClearResultFields(clearedTypeSystemDependencyCache),
      remainingCachedApps: this.appsByCacheKey.size,
      workspaceKernel,
      summary:
        `Cleared ${disposed.apps} cached app epoch(s), ${disposed.queryClaimRecords} query-claim record(s), ` +
        `${describeKernelDisposal(disposed.kernel)}, and ${clearedTypeSystemDependencyCache.entries} ` +
        `TypeScript dependency source-file cache file(s) using policy '${typeSystemDependencyCacheClearPolicy}'; ` +
        `workspace kernel now retains ${workspaceKernel.totalRecords} record(s).`,
    });
    return answer(SemanticRuntimeAnswerOutcome.Hit, value.summary, value);
  }

  disposeQueryClaims(
    request: SemanticRuntimeQueryClaimDisposeRequest = {},
  ): SemanticRuntimeAnswer<SemanticRuntimeQueryClaimDisposeResult> {
    const inquiryProfile = request.inquiryProfile == null
      ? null
      : normalizeSemanticRuntimeInquiryProfile(request.inquiryProfile);
    const project = this.projectForQueryClaimDisposal(request);
    const sourceFilePath = queryClaimDisposalSourceFilePath(project, request);
    const strategy = semanticRuntimeQueryClaimDisposalStrategy({
      scope: request.scope,
      projectKey: project?.projectKey ?? null,
      sourceFilePath,
      inquiryProfile,
      queryKinds: request.queryKinds,
      materializationPolicies: request.materializationPolicies,
    });
    const runtimeDisposals = strategy.scope === 'cached-apps'
      ? []
      : this.disposeRuntimeQueryClaimProfilesByPolicy(strategy.policy, strategy.inquiryProfile);
    const appDisposals = strategy.scope === 'runtime'
      ? []
      : this.disposeCachedAppQueryClaimProfilesByPolicy(strategy.policy, strategy.inquiryProfile, strategy.projectKey);
    const profileDisposals = [...runtimeDisposals, ...appDisposals];
    const disposedRuntimeQueryClaimRecords = sumProfileDisposalRecords(runtimeDisposals);
    const disposedAppQueryClaimRecords = sumProfileDisposalRecords(appDisposals);
    const value: SemanticRuntimeQueryClaimDisposeResult = {
      scope: strategy.scope,
      invalidationKind: strategy.invalidationKind,
      projectKey: strategy.projectKey,
      sourceFilePath: strategy.sourceFilePath,
      inquiryProfile: strategy.inquiryProfile,
      queryKinds: strategy.policy.queryKinds ?? [],
      materializationPolicies: strategy.policy.materializationPolicies ?? [],
      epochKeys: strategy.epochKeys,
      disposedRuntimeQueryClaimRecords,
      disposedAppQueryClaimRecords,
      disposedQueryClaimRecords: disposedRuntimeQueryClaimRecords + disposedAppQueryClaimRecords,
      profileDisposals,
      cachedAppCount: this.appsByCacheKey.size,
      summary:
        `Disposed ${disposedRuntimeQueryClaimRecords + disposedAppQueryClaimRecords} query-claim record(s) ` +
        `from scope '${strategy.scope}' using '${strategy.invalidationKind}' invalidation` +
        (strategy.projectKey == null ? '' : ` for project '${strategy.projectKey}'`) +
        (strategy.sourceFilePath == null ? '' : ` and source '${strategy.sourceFilePath}'`) +
        (strategy.inquiryProfile == null ? '.' : ` in inquiry profile '${strategy.inquiryProfile}'.`),
    };
    return answer(SemanticRuntimeAnswerOutcome.Hit, value.summary, value);
  }

  authoringCatalog(
    request: SemanticRuntimeStaticCatalogRequest = {},
  ): SemanticRuntimeAnswer<SemanticAuthoringCatalogResult> {
    return this.answerRuntimeQuery(
      {
        inquiryProfile: normalizeSemanticRuntimeInquiryProfile(request.inquiryProfile),
        queryKind: 'authoring-catalog',
        queryKey: 'authoring-catalog:full',
        materializationPolicy: 'static-catalog',
      },
      () => readSemanticAuthoringCatalogAnswer(),
    );
  }

  appQueryCatalog(request: SemanticAppQueryCatalogRequest = {}): SemanticRuntimeAnswer<SemanticAppQueryCatalogResult> {
    return this.answerRuntimeQuery(
      {
        inquiryProfile: normalizeSemanticRuntimeInquiryProfile(request.inquiryProfile),
        queryKind: 'app-query-catalog',
        queryKey: semanticRuntimeAppQueryCatalogKey(request),
        materializationPolicy: 'static-catalog',
      },
      () => readSemanticAppQueryCatalog(request),
    );
  }

  async answerAppQuery(request: SemanticRuntimeAppQueryRequest): Promise<SemanticRuntimeAnswer<unknown>> {
    const catalogRow = semanticAppQueryCatalogRow(request.kind as SemanticAppQueryKind);
    const inquiryProfile = normalizeSemanticRuntimeInquiryProfile(
      request.inquiryProfile ?? defaultInquiryProfileForRoutedAppQuery(request),
    );
    if (catalogRow.runtimeBoundary === 'runtime-static') {
      return filterSemanticAppQueryContinuations(
        request,
        this.answerRuntimeStaticAppQuery(request, catalogRow, inquiryProfile),
      );
    }
    if (isAppWorldFreeAppQuery(request)) {
      return filterSemanticAppQueryContinuations(
        request,
        this.answerAppWorldFreeQuery(request, catalogRow, inquiryProfile),
      );
    }
    return filterSemanticAppQueryContinuations(
      request,
      this.answerAppWorldQuery(request, catalogRow, inquiryProfile),
    );
  }

  private answerRuntimeStaticAppQuery(
    request: SemanticRuntimeAppQueryRequest,
    catalogRow: SemanticAppQueryCatalogRow,
    inquiryProfile: SemanticRuntimeInquiryProfile,
  ): SemanticRuntimeAnswer<unknown> {
    return this.answerRuntimeQuery(
      {
        inquiryProfile,
        queryKind: request.kind,
        queryKey: semanticRuntimeStaticAppQueryKey(request),
        locusKey: semanticRuntimeWorkspaceLocusKey(this.workspace.workspaceKey),
        epochKeys: [semanticRuntimeWorkspaceEpochKey(this.workspace.workspaceKey)],
        materializationPolicy: semanticAppQueryMaterializationPolicy(request, catalogRow.materializationPolicy),
        kernelBoundary: 'observe-only',
      },
      () => withSemanticAppQueryContinuations(
        request,
        answerRuntimeStaticAppQueryValue(request),
        catalogRow,
      ),
    );
  }

  private answerAppWorldFreeQuery(
    request: SemanticRuntimeAppQueryRequest,
    catalogRow: SemanticAppQueryCatalogRow,
    inquiryProfile: SemanticRuntimeInquiryProfile,
  ): SemanticRuntimeAnswer<unknown> {
    const plan = this.planOpenApp({
      projectKey: request.projectKey,
      sourceFilePath: appQuerySourceFilePath(request),
      analysisDepth: request.analysisDepth ?? catalogRow.minimumAnalysisDepth,
      telemetry: {
        ...(request.telemetry ?? {}),
        inquiryProfile,
      },
    });
    const canonicalRequest = canonicalizeRuntimeAppQueryRequest(plan.project, request);
    let evaluation: StaticProjectEvaluationResult | null = null;
    const readEvaluation = (): StaticProjectEvaluationResult => {
      evaluation ??= evaluateAureliaProject(plan.project);
      return evaluation;
    };
    const result = this.answerRuntimeQuery(
      {
        inquiryProfile,
        queryKind: canonicalRequest.kind,
        queryKey: semanticRuntimeAppWorldFreeQueryKey(plan.project.projectKey, canonicalRequest),
        locusKey: semanticAppQueryLocusKey(plan.project.projectKey, canonicalRequest),
        epochKeys: semanticRuntimeRoutedAppQueryEpochKeys(
          this.workspace.workspaceKey,
          plan.project.projectKey,
          canonicalRequest,
        ),
        materializationPolicy: semanticAppQueryMaterializationPolicy(canonicalRequest, catalogRow.materializationPolicy),
        kernelBoundary: 'observe-only',
      },
      () => withSemanticAppQueryContinuations(
        canonicalRequest,
        answerAppWorldFreeQuery(
          plan.project,
          canonicalRequest,
          readEvaluation,
        ),
        catalogRow,
      ),
    );
    return withAppWorldFreeEvaluationProfile(result, evaluation, request.telemetry);
  }

  private answerAppWorldQuery(
    request: SemanticRuntimeAppQueryRequest,
    catalogRow: SemanticAppQueryCatalogRow,
    inquiryProfile: SemanticRuntimeInquiryProfile,
  ): SemanticRuntimeAnswer<unknown> {
    const typeSystemDependencyCacheClearPolicy = normalizeTypeSystemDependencyCacheClearPolicy(
      typeSystemDependencyCacheClearPolicyForRoutedQuery(request, inquiryProfile),
    );
    const plan = this.planOpenApp({
      projectKey: request.projectKey,
      sourceFilePath: appQuerySourceFilePath(request),
      analysisDepth: request.analysisDepth ?? routedAppQueryAnalysisDepth(request, catalogRow.minimumAnalysisDepth),
      includeAuthoringTemplates: request.includeAuthoringTemplates ?? appQueryNeedsAuthoringTemplates(request),
      authoringTemplateSourceFiles: request.authoringTemplateSourceFiles,
      authoringTemplateLimit: request.authoringTemplateLimit,
      telemetry: {
        ...(request.telemetry ?? {}),
        inquiryProfile,
      },
    });
    const cachedBefore = this.readCachedApp(
      plan.project.projectKey,
      plan.analysisDepth,
      plan.includeAuthoringTemplates,
      plan.authoringTemplateSourceFiles,
      plan.authoringTemplateLimit,
    );
    const canonicalRequest = canonicalizeRuntimeAppQueryRequest(plan.project, request);
    let appOpened = false;
    return this.answerRuntimeQuery(
      {
        inquiryProfile,
        queryKind: canonicalRequest.kind,
        queryKey: semanticRuntimeRoutedAppQueryKey(canonicalRequest, plan),
        locusKey: semanticAppQueryLocusKey(plan.project.projectKey, canonicalRequest),
        epochKeys: semanticRuntimeRoutedAppQueryEpochKeys(
          this.workspace.workspaceKey,
          plan.project.projectKey,
          canonicalRequest,
        ),
        materializationPolicy: semanticAppQueryMaterializationPolicy(canonicalRequest, catalogRow.materializationPolicy),
        kernelBoundary: 'observe-only',
        shouldReuseRetainedAnswer: () =>
          shouldDisposeAppAfterRoutedQuery(request, inquiryProfile) || cachedBefore != null,
        disposeAnswerSideEffects: () => {
          const forceCachedAppDisposal = cachedBefore != null && request.appRetention === 'dispose-app';
          return this.disposeRoutedAppAnswerSideEffects(
            shouldDisposeAppAfterRoutedQuery(request, inquiryProfile)
              && (appOpened || forceCachedAppDisposal)
              && (cachedBefore == null || request.appRetention === 'dispose-app'),
            typeSystemDependencyCacheClearPolicy,
          );
        },
      },
      () => {
        const app = this.openPlannedApp(plan);
        appOpened = true;
        return app.ask({
          ...canonicalRequest,
          inquiryProfile,
        });
      },
    );
  }

  async answerAppQueries(
    request: SemanticRuntimeAppQueryBatchRequest,
  ): Promise<SemanticRuntimeAnswer<SemanticRuntimeAppQueryBatchResult>> {
    const queries = [...request.queries];
    const inquiryProfile = normalizeSemanticRuntimeInquiryProfile(
      request.inquiryProfile ?? defaultInquiryProfileForRoutedAppQueryBatch(queries),
    );
    if (queries.every(isRuntimeStaticAppQuery)) {
      return this.answerRuntimeStaticAppQueryBatch(queries, inquiryProfile);
    }
    const typeSystemDependencyCacheClearPolicy = normalizeTypeSystemDependencyCacheClearPolicy(
      typeSystemDependencyCacheClearPolicyForRoutedQuery(request, inquiryProfile),
    );
    const plan = this.planOpenApp({
      projectKey: request.projectKey,
      sourceFilePath: appQueryBatchSourceFilePath(request),
      analysisDepth: routedAppQueryBatchAnalysisDepth(request),
      includeAuthoringTemplates: request.includeAuthoringTemplates ?? appQueryBatchNeedsAuthoringTemplates(queries),
      authoringTemplateSourceFiles: request.authoringTemplateSourceFiles ?? appQueryBatchAuthoringTemplateSourceFiles(queries),
      authoringTemplateLimit: request.authoringTemplateLimit,
      telemetry: {
        ...(request.telemetry ?? {}),
        inquiryProfile,
      },
    });
    const canonicalQueries = queries.map((query) => canonicalizeAppQueryForProject(plan.project, query));
    if (canonicalQueries.every(isAppWorldFreeAppQuery)) {
      return this.answerAppWorldFreeQueryBatch(plan, canonicalQueries, inquiryProfile);
    }
    const cachedBefore = this.readCachedApp(
      plan.project.projectKey,
      plan.analysisDepth,
      plan.includeAuthoringTemplates,
      plan.authoringTemplateSourceFiles,
      plan.authoringTemplateLimit,
    );
    return this.answerAppWorldQueryBatch(
      request,
      plan,
      canonicalQueries,
      inquiryProfile,
      cachedBefore,
      typeSystemDependencyCacheClearPolicy,
    );
  }

  private answerRuntimeStaticAppQueryBatch(
    queries: readonly SemanticAppQuery[],
    inquiryProfile: SemanticRuntimeInquiryProfile,
  ): SemanticRuntimeAnswer<SemanticRuntimeAppQueryBatchResult> {
    return this.answerRuntimeQuery(
      {
        inquiryProfile,
        queryKind: 'app-query-batch',
        queryKey: semanticRuntimeStaticAppQueryBatchKey(queries),
        locusKey: semanticRuntimeWorkspaceLocusKey(this.workspace.workspaceKey),
        epochKeys: [semanticRuntimeWorkspaceEpochKey(this.workspace.workspaceKey)],
        materializationPolicy: semanticAppQueryBatchMaterializationPolicy(queries),
        kernelBoundary: 'observe-only',
      },
      () => {
        const rows = queries.map((query, index) =>
          this.runtimeStaticBatchRow(query, index, inquiryProfile)
        );
        const value: SemanticRuntimeAppQueryBatchResult = {
          projectKey: null,
          analysisDepth: null,
          displayText: appQueryBatchDisplayText({
            projectKey: null,
            analysisDepth: null,
            rows,
            appWorldOpened: false,
            includeAuthoringTemplates: false,
            authoringTemplateSourceFileCount: 0,
            includeAppProfile: false,
            includeAppQueryClaimProfiles: false,
          }),
          includeAuthoringTemplates: false,
          authoringTemplateSourceFileCount: 0,
          authoringTemplateLimit: 0,
          queryCount: rows.length,
          rows,
          appWorldOpened: false,
          appProfile: null,
          appQueryClaimProfiles: [],
        };
        return answer(
          SemanticRuntimeAnswerOutcome.Hit,
          `Answered ${rows.length} runtime-static app query claim(s) without selecting a project or opening an app epoch.`,
          value,
        );
      },
    );
  }

  private runtimeStaticBatchRow(
    query: SemanticAppQuery,
    index: number,
    inquiryProfile: SemanticRuntimeInquiryProfile,
  ): SemanticRuntimeAppQueryBatchResult['rows'][number] {
    const childQuery = {
      ...query,
      inquiryProfile: query.inquiryProfile ?? inquiryProfile,
    };
    const childInquiryProfile = normalizeSemanticRuntimeInquiryProfile(childQuery.inquiryProfile);
    const catalogRow = semanticAppQueryCatalogRow(childQuery.kind as SemanticAppQueryKind);
    const materializationPolicy = semanticAppQueryMaterializationPolicy(childQuery, catalogRow.materializationPolicy);
    return {
      index,
      queryKind: childQuery.kind,
      materializationPolicy,
      answer: filterSemanticAppQueryContinuations(
        childQuery,
        this.answerRuntimeQuery(
          {
            inquiryProfile: childInquiryProfile,
            queryKind: childQuery.kind,
            queryKey: semanticRuntimeStaticAppQueryKey(childQuery),
            locusKey: semanticRuntimeWorkspaceLocusKey(this.workspace.workspaceKey),
            epochKeys: [semanticRuntimeWorkspaceEpochKey(this.workspace.workspaceKey)],
            materializationPolicy,
            kernelBoundary: 'observe-only',
          },
          () => withSemanticAppQueryContinuations(
            childQuery,
            answerRuntimeStaticAppQueryValue(childQuery),
            catalogRow,
          ),
        ),
      ),
    };
  }

  private answerAppWorldFreeQueryBatch(
    plan: SemanticAppOpenPlan,
    canonicalQueries: readonly SemanticAppQuery[],
    inquiryProfile: SemanticRuntimeInquiryProfile,
  ): SemanticRuntimeAnswer<SemanticRuntimeAppQueryBatchResult> {
    let evaluation: StaticProjectEvaluationResult | null = null;
    const result = this.answerRuntimeQuery(
      {
        inquiryProfile,
        queryKind: 'app-query-batch',
        queryKey: semanticRuntimeAppWorldFreeQueryBatchKey(plan.project.projectKey, canonicalQueries),
        locusKey: semanticRuntimeRoutedAppQueryBatchLocusKey(plan.project.projectKey, canonicalQueries),
        epochKeys: semanticRuntimeRoutedAppQueryBatchEpochKeys(
          this.workspace.workspaceKey,
          plan.project.projectKey,
          canonicalQueries,
        ),
        materializationPolicy: semanticAppQueryBatchMaterializationPolicy(canonicalQueries),
        kernelBoundary: 'observe-only',
      },
      () => {
        const readEvaluation = (): StaticProjectEvaluationResult => {
          evaluation ??= evaluateAureliaProject(plan.project);
          return evaluation;
        };
        const rows = canonicalQueries.map((query, index) =>
          this.appWorldFreeBatchRow(plan, query, index, inquiryProfile, readEvaluation)
        );
        const value: SemanticRuntimeAppQueryBatchResult = {
          projectKey: plan.project.projectKey,
          analysisDepth: plan.analysisDepth,
          displayText: appQueryBatchDisplayText({
            projectKey: plan.project.projectKey,
            analysisDepth: plan.analysisDepth,
            rows,
            appWorldOpened: false,
            includeAuthoringTemplates: false,
            authoringTemplateSourceFileCount: 0,
            includeAppProfile: false,
            includeAppQueryClaimProfiles: false,
          }),
          includeAuthoringTemplates: false,
          authoringTemplateSourceFileCount: 0,
          authoringTemplateLimit: 0,
          queryCount: rows.length,
          rows,
          appWorldOpened: false,
          appProfile: null,
          appQueryClaimProfiles: [],
        };
        return answer(
          SemanticRuntimeAnswerOutcome.Hit,
          `Answered ${rows.length} app-world-free query claim(s) for '${plan.project.projectKey}' without opening an app epoch.`,
          value,
        );
      },
    );
    return withAppWorldFreeEvaluationProfile(result, evaluation, plan.telemetry);
  }

  private appWorldFreeBatchRow(
    plan: SemanticAppOpenPlan,
    query: SemanticAppQuery,
    index: number,
    inquiryProfile: SemanticRuntimeInquiryProfile,
    readEvaluation: () => StaticProjectEvaluationResult,
  ): SemanticRuntimeAppQueryBatchResult['rows'][number] {
    const childQuery = {
      ...query,
      inquiryProfile: query.inquiryProfile ?? inquiryProfile,
    };
    const childInquiryProfile = normalizeSemanticRuntimeInquiryProfile(childQuery.inquiryProfile);
    const catalogRow = semanticAppQueryCatalogRow(childQuery.kind as SemanticAppQueryKind);
    const materializationPolicy = semanticAppQueryMaterializationPolicy(childQuery, catalogRow.materializationPolicy);
    return {
      index,
      queryKind: childQuery.kind,
      materializationPolicy,
      answer: filterSemanticAppQueryContinuations(
        childQuery,
        this.answerRuntimeQuery(
          {
            inquiryProfile: childInquiryProfile,
            queryKind: childQuery.kind,
            queryKey: semanticRuntimeAppWorldFreeQueryKey(plan.project.projectKey, childQuery),
            locusKey: semanticAppQueryLocusKey(plan.project.projectKey, childQuery),
            epochKeys: semanticRuntimeRoutedAppQueryEpochKeys(
              this.workspace.workspaceKey,
              plan.project.projectKey,
              childQuery,
            ),
            materializationPolicy,
            kernelBoundary: 'observe-only',
          },
          () => withSemanticAppQueryContinuations(
            childQuery,
            answerAppWorldFreeQuery(plan.project, childQuery, readEvaluation),
            catalogRow,
          ),
        ),
      ),
    };
  }

  private answerAppWorldQueryBatch(
    request: SemanticRuntimeAppQueryBatchRequest,
    plan: SemanticAppOpenPlan,
    canonicalQueries: readonly SemanticAppQuery[],
    inquiryProfile: SemanticRuntimeInquiryProfile,
    cachedBefore: SemanticApp | null,
    typeSystemDependencyCacheClearPolicy: SemanticTypeSystemDependencyCacheClearPolicy,
  ): SemanticRuntimeAnswer<SemanticRuntimeAppQueryBatchResult> {
    let appOpened = false;
    return this.answerRuntimeQuery(
      {
        inquiryProfile,
        queryKind: 'app-query-batch',
        queryKey: semanticRuntimeRoutedAppQueryBatchKey({ ...request, queries: canonicalQueries }, plan),
        locusKey: semanticRuntimeRoutedAppQueryBatchLocusKey(plan.project.projectKey, canonicalQueries),
        epochKeys: semanticRuntimeRoutedAppQueryBatchEpochKeys(
          this.workspace.workspaceKey,
          plan.project.projectKey,
          canonicalQueries,
        ),
        materializationPolicy: semanticAppQueryBatchMaterializationPolicy(canonicalQueries),
        kernelBoundary: 'observe-only',
        shouldReuseRetainedAnswer: () =>
          request.includeAppProfile !== true
          && request.includeAppQueryClaimProfiles !== true
          && (shouldDisposeAppAfterRoutedQuery(request, inquiryProfile) || cachedBefore != null),
        disposeAnswerSideEffects: () => {
          const forceCachedAppDisposal = cachedBefore != null && request.appRetention === 'dispose-app';
          return this.disposeRoutedAppAnswerSideEffects(
            shouldDisposeAppAfterRoutedQuery(request, inquiryProfile)
              && (appOpened || forceCachedAppDisposal)
              && (cachedBefore == null || request.appRetention === 'dispose-app'),
            typeSystemDependencyCacheClearPolicy,
          );
        },
      },
      () => {
        const app = this.openPlannedApp(plan);
        appOpened = true;
        const rows = canonicalQueries.map((query, index) =>
          this.appWorldBatchRow(app, query, index, inquiryProfile)
        );
        const includeAppProfile = request.includeAppProfile === true;
        const includeAppQueryClaimProfiles = request.includeAppQueryClaimProfiles === true;
        const appSummary = includeAppProfile || includeAppQueryClaimProfiles
          ? app.cacheSummary(8, false)
          : null;
        const value: SemanticRuntimeAppQueryBatchResult = {
          projectKey: plan.project.projectKey,
          analysisDepth: plan.analysisDepth,
          displayText: appQueryBatchDisplayText({
            projectKey: plan.project.projectKey,
            analysisDepth: plan.analysisDepth,
            rows,
            appWorldOpened: true,
            includeAuthoringTemplates: plan.includeAuthoringTemplates,
            authoringTemplateSourceFileCount: plan.authoringTemplateSourceFiles.length,
            includeAppProfile,
            includeAppQueryClaimProfiles,
          }),
          includeAuthoringTemplates: plan.includeAuthoringTemplates,
          authoringTemplateSourceFileCount: plan.authoringTemplateSourceFiles.length,
          authoringTemplateLimit: plan.authoringTemplateLimit,
          queryCount: rows.length,
          rows,
          appWorldOpened: true,
          appProfile: includeAppProfile ? appSummary?.profile ?? null : null,
          appQueryClaimProfiles: includeAppQueryClaimProfiles ? appSummary?.queryClaimProfiles ?? [] : [],
        };
        return answer(
          SemanticRuntimeAnswerOutcome.Hit,
          `Answered ${rows.length} routed app query claim(s) for '${plan.project.projectKey}' at analysisDepth='${plan.analysisDepth}'.`,
          value,
        );
      },
    );
  }

  private appWorldBatchRow(
    app: SemanticApp,
    query: SemanticAppQuery,
    index: number,
    inquiryProfile: SemanticRuntimeInquiryProfile,
  ): SemanticRuntimeAppQueryBatchResult['rows'][number] {
    const childQuery = {
      ...query,
      inquiryProfile: query.inquiryProfile ?? inquiryProfile,
    };
    const catalogRow = semanticAppQueryCatalogRow(childQuery.kind as SemanticAppQueryKind);
    return {
      index,
      queryKind: childQuery.kind,
      materializationPolicy: semanticAppQueryMaterializationPolicy(childQuery, catalogRow.materializationPolicy),
      answer: app.ask(childQuery),
    };
  }

  authoringCatalogView(
    request: SemanticAuthoringCatalogViewRequest = {},
  ): SemanticRuntimeAnswer<SemanticAuthoringCatalogResult | SemanticAuthoringCatalogViewResult> {
    return this.answerRuntimeQuery(
      {
        inquiryProfile: normalizeSemanticRuntimeInquiryProfile(request.inquiryProfile),
        queryKind: 'authoring-catalog-view',
        queryKey: `authoring-catalog-view:${request.view ?? 'overview'}`,
        materializationPolicy: 'static-catalog',
      },
      () => readSemanticAuthoringCatalogView(request),
    );
  }

  authoringGuidance(
    request: SemanticAuthoringGuidanceRequest = {},
  ): SemanticRuntimeAnswer<SemanticAuthoringGuidanceResult | null> {
    return this.answerRuntimeQuery(
      {
        inquiryProfile: normalizeSemanticRuntimeInquiryProfile(request.inquiryProfile),
        queryKind: 'authoring-guidance',
        queryKey: semanticRuntimeAuthoringGuidanceKey(request),
        materializationPolicy: 'static-catalog',
      },
      () => readSemanticAuthoringGuidance(request),
    );
  }

  authoringRecipePlan(
    request: SemanticAuthoringRecipePlanRequest,
  ): SemanticRuntimeAnswer<SemanticAuthoringRecipePlanResult | null> {
    return this.answerRuntimeQuery(
      {
        inquiryProfile: normalizeSemanticRuntimeInquiryProfile(request.inquiryProfile),
        queryKind: 'authoring-recipe-plan',
        queryKey: semanticRuntimeAuthoringRecipePlanKey(request),
        materializationPolicy: 'static-catalog',
      },
      () => readSemanticAuthoringRecipePlan(request),
    );
  }

  async openApp(options: OpenSemanticAppOptions = {}): Promise<SemanticApp> {
    return this.openPlannedApp(this.planOpenApp(options));
  }

  private answerRuntimeQuery<TValue>(
    input: SemanticRuntimeQueryClaimInput,
    materialize: () => SemanticRuntimeAnswer<TValue>,
  ): SemanticRuntimeAnswer<TValue> {
    const queryClaims = this.runtimeQueryClaimsForProfile(input.inquiryProfile);
    const kernelBoundary = input.kernelBoundary ?? 'dispose-answer-local';
    const boundary = kernelBoundary === 'observe-only'
      ? {
        shouldReuseRetainedAnswer: input.shouldReuseRetainedAnswer,
        readKernelSnapshot: () => this.workspace.store.readTelemetrySnapshot(),
        disposeAnswerSideEffects: input.disposeAnswerSideEffects,
      }
      : {
        shouldReuseRetainedAnswer: input.shouldReuseRetainedAnswer,
        readKernelMarker: () => this.workspace.store.mark(),
        readKernelSnapshot: () => this.workspace.store.readTelemetrySnapshot(),
        disposeKernelSince: (marker: KernelStoreMarker) => this.workspace.store.disposeSince(marker),
        disposeAnswerSideEffects: input.disposeAnswerSideEffects,
      };
    return queryClaims.answer({
      queryKind: input.queryKind,
      queryKey: input.queryKey,
      locusKey: input.locusKey ?? semanticRuntimeWorkspaceLocusKey(this.workspace.workspaceKey),
      epochKeys: input.epochKeys ?? [semanticRuntimeWorkspaceEpochKey(this.workspace.workspaceKey)],
      materializationPolicy: input.materializationPolicy,
    }, materialize, boundary);
  }

  private runtimeQueryClaimsForProfile(
    profile: SemanticRuntimeInquiryProfile | string | null | undefined,
  ): QueryClaimGraph {
    const normalized = normalizeSemanticRuntimeInquiryProfile(profile ?? DEFAULT_SEMANTIC_RUNTIME_INQUIRY_PROFILE);
    const existing = this.queryClaimsByProfile.get(normalized);
    if (existing != null) {
      return existing;
    }
    const graph = new QueryClaimGraph(normalized);
    this.queryClaimsByProfile.set(normalized, graph);
    return graph;
  }

  private runtimeQueryClaimProfileSummaries(
    rowLimit: number,
    includeRows: boolean,
  ): readonly SemanticRuntimeCachedAppQueryClaimProfileSummary[] {
    return [...this.queryClaimsByProfile.entries()]
      .map(([inquiryProfile, queryClaims]) => ({
        inquiryProfile,
        queryClaims: queryClaims.snapshot(),
        ...queryClaimRowsForCacheOverview(queryClaims, rowLimit, includeRows),
      }))
      .sort((left, right) => left.inquiryProfile.localeCompare(right.inquiryProfile));
  }

  private disposeRuntimeQueryClaims(reason: QueryClaimDisposalReason): number {
    let disposed = 0;
    const policy = queryClaimDisposalPolicy(reason);
    for (const graph of this.queryClaimsByProfile.values()) {
      disposed += graph.dispose(policy);
    }
    return disposed;
  }

  private disposeRoutedAppAnswerSideEffects(
    shouldDisposeAppEpoch: boolean,
    typeSystemDependencyCacheClearPolicy: SemanticTypeSystemDependencyCacheClearPolicy,
  ): QueryClaimAnswerDisposalSummary | null {
    let disposal: QueryClaimAnswerDisposalSummary | null = null;
    if (shouldDisposeAppEpoch) {
      const disposed = this.disposeCachedAppEpochs(QueryClaimDisposalReason.AppEpochDisposed);
      disposal = {
        queryClaims: disposed.queryClaimRecords,
        kernel: disposed.kernel,
      };
    }

    if (typeSystemDependencyCacheClearPolicy !== 'preserve') {
      const cleared = clearTypeSystemCompilerHostSourceFileCache(typeSystemDependencyCacheClearPolicy);
      disposal = {
        ...(disposal ?? {}),
        typeSystemDependencyCache: {
          policy: cleared.policy,
          sourceFiles: cleared.entries,
          sourceTextCharacters: cleared.sourceTextCharacters,
          nodeModuleSourceFiles: cleared.nodeModuleEntries,
          nodeModuleSourceTextCharacters: cleared.nodeModuleSourceTextCharacters,
          declarationSourceFiles: cleared.declarationEntries,
          declarationSourceTextCharacters: cleared.declarationSourceTextCharacters,
          defaultLibrarySourceFiles: cleared.defaultLibraryEntries,
          defaultLibrarySourceTextCharacters: cleared.defaultLibrarySourceTextCharacters,
          externalDeclarationSourceFiles: cleared.externalDeclarationEntries,
          externalDeclarationSourceTextCharacters: cleared.externalDeclarationSourceTextCharacters,
          remainingSourceFiles: cleared.remainingEntries,
        },
      };
    }
    return disposal;
  }

  private disposeRuntimeQueryClaimsByPolicy(
    policy: QueryClaimDisposalPolicy,
    inquiryProfile: SemanticRuntimeInquiryProfile | null,
  ): number {
    let disposed = 0;
    for (const [profile, graph] of this.queryClaimsByProfile.entries()) {
      if (inquiryProfile != null && profile !== inquiryProfile) {
        continue;
      }
      disposed += graph.dispose(policy);
    }
    return disposed;
  }

  private disposeRuntimeQueryClaimProfilesByPolicy(
    policy: QueryClaimDisposalPolicy,
    inquiryProfile: SemanticRuntimeInquiryProfile | null,
  ): readonly SemanticRuntimeQueryClaimDisposeProfileSummary[] {
    const summaries: SemanticRuntimeQueryClaimDisposeProfileSummary[] = [];
    for (const [profile, graph] of this.queryClaimsByProfile.entries()) {
      if (inquiryProfile != null && profile !== inquiryProfile) {
        continue;
      }
      const disposal = graph.disposeWithSummary(policy);
      if (disposal.disposedRecords === 0) {
        continue;
      }
      summaries.push({
        scope: 'runtime',
        projectKey: null,
        inquiryProfile: profile,
        disposal,
      });
    }
    return summaries;
  }

  private disposeCachedAppQueryClaimsByPolicy(
    policy: QueryClaimDisposalPolicy,
    inquiryProfile: SemanticRuntimeInquiryProfile | null,
    projectKey: string | null,
  ): number {
    let disposed = 0;
    for (const app of this.appsByCacheKey.values()) {
      if (projectKey != null && app.project.projectKey !== projectKey) {
        continue;
      }
      disposed += app.disposeQueryClaimsByPolicy(policy, inquiryProfile);
    }
    return disposed;
  }

  private disposeCachedAppQueryClaimProfilesByPolicy(
    policy: QueryClaimDisposalPolicy,
    inquiryProfile: SemanticRuntimeInquiryProfile | null,
    projectKey: string | null,
  ): readonly SemanticRuntimeQueryClaimDisposeProfileSummary[] {
    const summaries: SemanticRuntimeQueryClaimDisposeProfileSummary[] = [];
    for (const app of this.appsByCacheKey.values()) {
      if (projectKey != null && app.project.projectKey !== projectKey) {
        continue;
      }
      summaries.push(...app.disposeQueryClaimProfilesByPolicy(policy, inquiryProfile));
    }
    return summaries;
  }

  private projectForQueryClaimDisposal(
    request: SemanticRuntimeQueryClaimDisposeRequest,
  ): ProjectBootFrame | null {
    if (request.projectKey != null) {
      return selectProject(this.workspace.projects, request.projectKey);
    }
    const sourceFilePath = normalizeSourceFilePathOption(request.sourceFile?.filePath ?? request.sourceFilePath);
    return sourceFilePath == null ? null : this.selectProjectForSourceFile(sourceFilePath);
  }

  private planOpenApp(options: OpenSemanticAppOptions): SemanticAppOpenPlan {
    const analysisDepth = normalizeSemanticAppAnalysisDepth(options.analysisDepth);
    const includeAuthoringTemplates = options.includeAuthoringTemplates === true;
    const sourceFilePath = normalizeSourceFilePathOption(options.sourceFilePath);
    const requestedAuthoringSourceFiles = normalizeAuthoringTemplateSourceFiles(options.authoringTemplateSourceFiles);
    const project = options.projectKey == null
      ? this.selectProjectForOpen(sourceFilePath)
      : selectProject(this.workspace.projects, options.projectKey);
    const projectSourceFilePath = sourceFilePath == null
      ? null
      : canonicalProjectSourceFilePath(project, sourceFilePath);
    const projectAuthoringSourceFiles = canonicalProjectSourceFilePaths(project, requestedAuthoringSourceFiles);
    const authoringTemplateSourceFiles = includeAuthoringTemplates
      ? authoringTemplateSourceFilesForOpen(projectSourceFilePath, projectAuthoringSourceFiles)
      : [];
    const authoringTemplateLimit = includeAuthoringTemplates ? normalizeAuthoringTemplateLimit(options.authoringTemplateLimit) : 0;
    return {
      project,
      analysisDepth,
      includeAuthoringTemplates,
      authoringTemplateSourceFiles,
      authoringTemplateLimit,
      telemetry: options.telemetry ?? null,
    };
  }

  private openPlannedApp(plan: SemanticAppOpenPlan): SemanticApp {
    return this.openProjectApp(
      plan.project,
      plan.analysisDepth,
      plan.includeAuthoringTemplates,
      plan.authoringTemplateSourceFiles,
      plan.authoringTemplateLimit,
      plan.telemetry,
    );
  }

  async templateCompletions(
    query: SemanticTemplateCursorQuery,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCompletionResult>> {
    const app = await this.openTemplateCursorApp(query);
    return app.ask({
      kind: SemanticAppQueryKind.TemplateCompletions,
      inquiryProfile: 'lsp-cursor',
      cursor: canonicalizeSourceCursorInput(app.project, query.cursor),
      page: query.page,
      detail: query.detail,
    }) as SemanticRuntimeAnswer<SemanticTemplateCompletionResult>;
  }

  async templateCursorInfo(
    query: SemanticTemplateCursorQuery,
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult>> {
    const app = await this.openTemplateCursorApp(query);
    return app.ask({
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      inquiryProfile: 'lsp-cursor',
      cursor: canonicalizeSourceCursorInput(app.project, query.cursor),
      detail: query.detail,
      diagnosticProjection: query.diagnosticProjection,
    }) as SemanticRuntimeAnswer<SemanticTemplateCursorInfoResult>;
  }

  async templateDiagnostics(
    query: SemanticTemplateDiagnosticsQuery = {},
  ): Promise<SemanticRuntimeAnswer<SemanticTemplateDiagnosticsResult>> {
    const app = await this.openTemplateDiagnosticsApp(query);
    return app.ask({
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      inquiryProfile: 'lsp-diagnostics',
      sourceFile: query.sourceFile == null ? query.sourceFile : canonicalizeSourceFileInput(app.project, query.sourceFile),
      page: query.page,
      detail: query.detail,
      diagnosticProjection: query.diagnosticProjection,
    }) as SemanticRuntimeAnswer<SemanticTemplateDiagnosticsResult>;
  }

  private openProjectApp(
    project: ProjectBootFrame,
    analysisDepth: SemanticAppAnalysisDepth,
    includeAuthoringTemplates: boolean,
    authoringTemplateSourceFiles: readonly string[],
    authoringTemplateLimit: number | null,
    telemetry: OpenSemanticAppOptions['telemetry'] = null,
  ): SemanticApp {
    const existing = this.readCachedApp(
      project.projectKey,
      analysisDepth,
      includeAuthoringTemplates,
      authoringTemplateSourceFiles,
      authoringTemplateLimit,
    );
    if (existing != null) {
      return existing;
    }
    if (this.hasCachedAppForProject(project.projectKey)) {
      this.disposeCachedAppEpochs(QueryClaimDisposalReason.AppEpochDisposed);
    }
    const kernelMarker = this.workspace.store.mark();
    let emission: AureliaAppWorldProjectEmission;
    try {
      emission = new AureliaAppWorldProjectPass().constructAndEmit(this.workspace.store, project, {
        analysisDepth,
        includeAuthoringTemplates,
        authoringTemplateSourceFiles,
        authoringTemplateLimit,
        telemetry,
      });
    } catch (error) {
      this.workspace.store.disposeSince(kernelMarker);
      throw error;
    }
    const app = new SemanticApp(this, project, emission, {
      analysisDepth,
      includeAuthoringTemplates,
      authoringTemplateSourceFileCount: authoringTemplateSourceFiles.length,
      authoringTemplateLimit,
      kernelMarker,
    });
    this.appsByCacheKey.set(
      appCacheKey(project.projectKey, analysisDepth, includeAuthoringTemplates, authoringTemplateSourceFiles, authoringTemplateLimit),
      app,
    );
    return app;
  }

  private async openTemplateCursorApp(
    query: SemanticTemplateCursorQuery,
  ): Promise<SemanticApp> {
    const analysisDepth = normalizeSemanticAppAnalysisDepth(query.analysisDepth ?? SemanticAppAnalysisDepth.BindingObservation);
    const sourceFilePath = normalizeSourceFilePathOption(query.cursor.filePath);
    const requestedProject = query.projectKey == null
      ? null
      : selectProject(this.workspace.projects, query.projectKey);
    const cached = sourceFilePath == null
      ? null
      : this.readCachedTemplateCursorApp(requestedProject, analysisDepth, sourceFilePath);
    if (cached != null) {
      return cached;
    }
    const project = requestedProject ?? this.selectProjectForOpen(sourceFilePath);
    return this.openApp({
      projectKey: project.projectKey,
      sourceFilePath,
      analysisDepth,
      includeAuthoringTemplates: query.includeAuthoringTemplates ?? true,
      authoringTemplateSourceFiles: query.authoringTemplateSourceFiles,
      authoringTemplateLimit: query.authoringTemplateLimit,
      telemetry: { inquiryProfile: 'lsp-cursor' },
    });
  }

  private async openTemplateDiagnosticsApp(
    query: SemanticTemplateDiagnosticsQuery,
  ): Promise<SemanticApp> {
    const analysisDepth = normalizeSemanticAppAnalysisDepth(query.analysisDepth ?? SemanticAppAnalysisDepth.BindingObservation);
    const sourceFilePath = normalizeSourceFilePathOption(query.sourceFile?.filePath);
    const requestedProject = query.projectKey == null
      ? null
      : selectProject(this.workspace.projects, query.projectKey);
    const cached = sourceFilePath == null
      ? null
      : this.readCachedTemplateCursorApp(requestedProject, analysisDepth, sourceFilePath);
    if (cached != null) {
      return cached;
    }
    const project = requestedProject ?? this.selectProjectForOpen(sourceFilePath);
    return this.openApp({
      projectKey: project.projectKey,
      sourceFilePath,
      analysisDepth,
      includeAuthoringTemplates: query.includeAuthoringTemplates ?? sourceFilePath != null,
      authoringTemplateSourceFiles: query.authoringTemplateSourceFiles,
      authoringTemplateLimit: query.authoringTemplateLimit,
      telemetry: { inquiryProfile: 'lsp-diagnostics' },
    });
  }

  private readCachedTemplateCursorApp(
    project: ProjectBootFrame | null,
    requestedDepth: SemanticAppAnalysisDepth,
    sourceFilePath: string,
  ): SemanticApp | null {
    for (const app of this.appsByCacheKey.values()) {
      if (
        (project == null || app.project.projectKey === project.projectKey)
        && semanticAppAnalysisDepthSatisfies(app.emission.analysisDepth, requestedDepth)
        && appContainsTemplateSourceFile(app, sourceFilePath)
      ) {
        return app;
      }
    }
    return null;
  }

  private readCachedApp(
    projectKey: string,
    requestedDepth: SemanticAppAnalysisDepth,
    includeAuthoringTemplates: boolean,
    authoringTemplateSourceFiles: readonly string[],
    authoringTemplateLimit: number | null,
  ): SemanticApp | null {
    const exact = this.appsByCacheKey.get(
      appCacheKey(projectKey, requestedDepth, includeAuthoringTemplates, authoringTemplateSourceFiles, authoringTemplateLimit),
    );
    if (exact != null) {
      return exact;
    }
    for (const app of this.appsByCacheKey.values()) {
      if (
        app.project.projectKey === projectKey
        && semanticAppAnalysisDepthSatisfies(app.emission.analysisDepth, requestedDepth)
        && appSatisfiesAuthoringTemplateRequest(app, includeAuthoringTemplates, authoringTemplateSourceFiles, authoringTemplateLimit)
      ) {
        return app;
      }
    }
    return null;
  }

  private hasCachedAppForProject(projectKey: string): boolean {
    return [...this.appsByCacheKey.values()].some((app) => app.project.projectKey === projectKey);
  }

  private disposeCachedAppEpochs(
    reason: QueryClaimDisposalReason,
  ): { readonly apps: number; readonly queryClaimRecords: number; readonly kernel: KernelStoreDisposalSummary } {
    const apps = [...this.appsByCacheKey.values()];
    if (apps.length === 0) {
      return {
        apps: 0,
        queryClaimRecords: 0,
        kernel: {
          records: 0,
          productDetails: 0,
          hotDetails: 0,
          handleCharacters: 0,
        },
      };
    }
    const earliestMarker = earliestKernelMarker(apps.map((app) => app.kernelMarker));
    const queryClaimRecords = apps.reduce(
      (total, app) => total + app.disposeQueryClaims(reason),
      0,
    );
    this.appsByCacheKey.clear();
    const kernel = this.workspace.store.disposeSince(earliestMarker);
    return {
      apps: apps.length,
      queryClaimRecords,
      kernel,
    };
  }

  private readProjectShape(project: ProjectBootFrame): SemanticProjectShape {
    const existing = this.projectShapesByProjectKey.get(project.projectKey);
    if (existing != null) {
      return existing;
    }
    const shape = readSemanticProjectShape(project);
    this.projectShapesByProjectKey.set(project.projectKey, shape);
    return shape;
  }

  private selectDefaultProject(): ProjectBootFrame {
    const aureliaAppProject = this.workspace.projects.find((project) =>
      this.readProjectShape(project).shapeKind === SemanticProjectShapeKind.AureliaApp
    );
    if (aureliaAppProject != null) {
      return aureliaAppProject;
    }
    if (this.workspace.projects.length === 0) {
      throw new Error('Cannot open semantic app: workspace did not boot any projects.');
    }
    throw new Error(
      `Cannot open semantic app without projectKey or sourceFilePath: no aurelia-app project was found; project shapes: ${this.projectShapeSummary()}.`,
    );
  }

  private projectShapeSummary(): string {
    const counts = new Map<string, number>();
    for (const project of this.workspace.projects) {
      const shapeKind = this.readProjectShape(project).shapeKind;
      counts.set(shapeKind, (counts.get(shapeKind) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([shapeKind, count]) => `${shapeKind}=${count}`)
      .join(', ');
  }

  private selectProjectForOpen(sourceFilePath: string | null): ProjectBootFrame {
    return sourceFilePath == null
      ? this.selectDefaultProject()
      : this.selectProjectForSourceFile(sourceFilePath);
  }

  private selectProjectForSourceFile(sourceFilePath: string): ProjectBootFrame {
    for (const address of this.workspace.store.readSourceFileAddressesByFileName(sourceFilePath)) {
      const project = this.workspace.projects.find((candidate) =>
        candidate.sourceFiles.some((source) => source.addressHandle === address.handle)
      );
      if (project != null) {
        return project;
      }
    }
    throw new Error(`Cannot open semantic app: source file '${sourceFilePath}' was not admitted into any project.`);
  }
}

function countProjectShapes(
  projects: SemanticRuntimeSummary['projects'],
): SemanticRuntimeSummary['projectShapeCounts'] {
  type ShapeKind = SemanticRuntimeSummary['projects'][number]['shapeKind'];
  const counts = new Map<ShapeKind, number>();
  for (const project of projects) {
    counts.set(project.shapeKind, (counts.get(project.shapeKind) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([shapeKind, count]) => ({ shapeKind, count }));
}

function countProjectAnalysisKinds(
  projects: SemanticRuntimeSummary['projects'],
): SemanticRuntimeSummary['projectAnalysisCounts'] {
  type AnalysisKind = SemanticRuntimeSummary['projects'][number]['analysisKind'];
  const counts = new Map<AnalysisKind, number>();
  for (const project of projects) {
    counts.set(project.analysisKind, (counts.get(project.analysisKind) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([analysisKind, count]) => ({ analysisKind, count }));
}

function summaryProjectPage(
  projectPage: SemanticRuntimePageInput | undefined,
): SemanticRuntimePageInput {
  return {
    size: projectPage?.size ?? 0,
    cursor: projectPage?.cursor ?? null,
  };
}

interface SemanticRuntimeSummaryDisplayInput {
  readonly workspaceRoot: string;
  readonly projectCount: number;
  readonly returnedProjectCount: number;
  readonly hasMoreProjectRows: boolean;
  readonly projectShapeCounts: SemanticRuntimeSummary['projectShapeCounts'];
  readonly projectAnalysisCounts: SemanticRuntimeSummary['projectAnalysisCounts'];
  readonly defaultAppProjectKey: string | null;
  readonly appCandidates: SemanticRuntimeSummary['appCandidates'];
}

function semanticRuntimeSummaryDisplayText(input: SemanticRuntimeSummaryDisplayInput): string {
  const lines = [
    `Workspace: ${input.workspaceRoot}`,
    `Projects: ${input.projectCount}; shapes ${countRowsDisplay(input.projectShapeCounts, 'shapeKind')}; analysis ${countRowsDisplay(input.projectAnalysisCounts, 'analysisKind')}.`,
    input.defaultAppProjectKey == null
      ? 'Default app: none discovered; pass projectKey or an explicit projects array before opening an app.'
      : `Default app: ${input.defaultAppProjectKey}.`,
  ];
  if (input.appCandidates.length > 0) {
    lines.push(`App candidates: ${input.appCandidates.slice(0, 5).map((candidate) =>
      `${candidate.projectKey} (${candidate.sourceFiles} source file(s), ${candidate.analysisKind})`
    ).join('; ')}${input.appCandidates.length > 5 ? `; +${input.appCandidates.length - 5} more` : ''}.`);
  }
  if (input.returnedProjectCount === 0 && input.projectCount > 0) {
    lines.push('Project rows: omitted by default; pass projectPage.size when package-level rows are needed.');
  } else {
    lines.push(`Project rows: returned ${input.returnedProjectCount}${input.hasMoreProjectRows ? ' with more rows available' : ''}.`);
  }
  lines.push('Next: open the default app with aurelia_app_overview, or pass projectKey for a selected app candidate.');
  return lines.join('\n');
}

function countRowsDisplay<TRow extends { readonly count: number }>(
  rows: readonly TRow[],
  key: keyof TRow,
): string {
  if (rows.length === 0) {
    return 'none';
  }
  return rows.map((row) => `${String(row[key])}=${row.count}`).join(', ');
}

function semanticRuntimeAnalysisCacheOverviewDisplayText(
  value: Omit<SemanticRuntimeAnalysisCacheOverviewResult, 'displayText'>,
): string {
  const workspaceKernel = value.workspaceKernel;
  const lines = [
    `Analysis cache: ${value.cachedAppCount} cached app epoch(s); workspace kernel ${workspaceKernel.totalRecords} record(s), ${workspaceKernel.productDetails} product detail(s), ${workspaceKernel.hotDetails} hot detail(s), ${workspaceKernel.handleCharacters} handle character(s).`,
    `Process memory: rss=${formatSemanticRuntimeBytes(value.processMemory.rssBytes)}, heapUsed=${formatSemanticRuntimeBytes(value.processMemory.heapUsedBytes)}, heapTotal=${formatSemanticRuntimeBytes(value.processMemory.heapTotalBytes)}, rssOther=${formatSemanticRuntimeBytes(value.processMemory.rssOtherBytes)}.`,
    `TypeScript dependency cache: ${value.typeSystemDependencyCache.entries} file(s), ${value.typeSystemDependencyCache.sourceTextCharacters} source-text character(s), suggestedClearPolicy=${value.typeSystemDependencyCache.suggestedClearPolicy} (${value.typeSystemDependencyCache.dominantSourceTextBucket}).`,
    `Project compiler-options cache: ${value.projectCompilerOptionsCache.entries} project-root shape(s), hits=${value.projectCompilerOptionsCache.hits}, misses=${value.projectCompilerOptionsCache.misses}, writes=${value.projectCompilerOptionsCache.writes}.`,
  ];
  if (value.runtimeQueryClaimProfiles.length > 0) {
    lines.push(`Runtime query claims: ${value.runtimeQueryClaimProfiles.map((profile) =>
      `${profile.inquiryProfile} retained=${profile.queryClaims.retainedRecords}/${profile.queryClaims.createdRecords}`
    ).join('; ')}.`);
  }
  if (value.cachedApps.length === 0) {
    lines.push('Cached apps: none; pass appRetention=retain-app on an app tool when multiple MCP calls should share one app epoch.');
  } else {
    lines.push(`Cached apps: ${value.cachedApps.slice(0, RUNTIME_DISPLAY_SAMPLE_LIMIT).map((app) =>
      `${app.projectKey} depth=${app.analysisDepth} retainedClaims=${app.queryClaims.retainedRecords} appTime=${app.profile.totalMilliseconds.toFixed(1)}ms`
    ).join(' | ')}${value.cachedApps.length > RUNTIME_DISPLAY_SAMPLE_LIMIT ? ` | +${value.cachedApps.length - RUNTIME_DISPLAY_SAMPLE_LIMIT} more` : ''}.`);
  }
  if ('recordKinds' in workspaceKernel) {
    lines.push(`Kernel top records: ${countRowsKeyDisplay(workspaceKernel.recordKinds)}.`);
    lines.push(`Kernel top products: ${countRowsKeyDisplay(workspaceKernel.productKinds)}.`);
  } else {
    lines.push('Breakdowns: omitted; pass includeKernelBreakdowns when the question is what retained records are made of.');
  }
  if (value.typeSystemDependencyCache.entries > 0) {
    lines.push('Next: clear app epochs with aurelia_clear_analysis_cache; set typeSystemDependencyCacheClearPolicy only after the dependency-cache bucket above explains the CPU-vs-memory trade-off.');
  } else {
    lines.push('Next: inspect retained sessions after appRetention=retain-app, or leave default dispose-app for one-off MCP app-building calls.');
  }
  return lines.join('\n');
}

function withAnalysisCacheClearDisplayText(
  value: Omit<SemanticRuntimeAnalysisCacheClearResult, 'displayText'>,
): SemanticRuntimeAnalysisCacheClearResult {
  return {
    ...value,
    displayText: semanticRuntimeAnalysisCacheClearDisplayText(value),
  };
}

function semanticRuntimeAnalysisCacheClearDisplayText(
  value: Omit<SemanticRuntimeAnalysisCacheClearResult, 'displayText'>,
): string {
  const lines = [
    `Analysis cache clear: disposed ${value.disposedCachedApps} cached app epoch(s), ${value.disposedQueryClaimRecords} query-claim record(s), and ${value.disposedKernelRecords} kernel record(s); dependencyPolicy=${value.typeSystemDependencyCacheClearPolicy}.`,
    `Kernel disposal: ${value.disposedProductDetails} product detail(s), ${value.disposedHotDetails} hot detail(s), ${value.disposedKernelHandleCharacters} handle character(s); remaining app epochs=${value.remainingCachedApps}, workspace kernel records=${value.workspaceKernel.totalRecords}.`,
    `TypeScript dependency cache cleared: ${value.clearedTypeSystemDependencySourceFiles} file(s), ${value.clearedTypeSystemDependencySourceTextCharacters} source-text character(s), nodeModules=${value.clearedTypeSystemDependencyNodeModuleSourceFiles}, defaultLibraries=${value.clearedTypeSystemDependencyDefaultLibrarySourceFiles}, externalDeclarations=${value.clearedTypeSystemDependencyExternalDeclarationSourceFiles}.`,
  ];
  if (value.remainingCachedApps > 0) {
    lines.push('Next: run analysis-cache overview with kernel breakdowns if retained epochs remain unexpectedly.');
  } else {
    lines.push('Next: reopen app tools as needed; default MCP app calls dispose app epochs unless appRetention=retain-app was requested.');
  }
  return lines.join('\n');
}

function countRowsKeyDisplay(rows: readonly { readonly key: string; readonly count: number }[]): string {
  return rows.length === 0 ? 'none' : rows.map((row) => `${row.key}=${row.count}`).join(', ');
}

interface AppQueryBatchDisplayInput {
  readonly projectKey: string | null;
  readonly analysisDepth: SemanticRuntimeAppQueryBatchResult['analysisDepth'];
  readonly rows: SemanticRuntimeAppQueryBatchResult['rows'];
  readonly appWorldOpened: boolean;
  readonly includeAuthoringTemplates: boolean;
  readonly authoringTemplateSourceFileCount: number;
  readonly includeAppProfile: boolean;
  readonly includeAppQueryClaimProfiles: boolean;
}

function appQueryBatchDisplayText(input: AppQueryBatchDisplayInput): string {
  const lines = [
    input.projectKey == null
      ? `Batch: ${input.rows.length} runtime-static query claim(s); no app epoch opened.`
      : `Batch: ${input.rows.length} query claim(s) for ${input.projectKey}; analysisDepth=${input.analysisDepth}; appWorld=${input.appWorldOpened ? 'opened' : 'not opened'}.`,
  ];
  if (input.includeAuthoringTemplates) {
    lines.push(`Authoring templates: included ${input.authoringTemplateSourceFileCount} selected source file(s).`);
  }
  for (const row of input.rows.slice(0, APP_QUERY_BATCH_DISPLAY_ROW_LIMIT)) {
    lines.push(`${row.index + 1}. ${row.queryKind} [${row.materializationPolicy}]: ${row.answer.summary}`);
    const childDisplay = firstSemanticDisplayTextLine(row.answer);
    if (childDisplay != null) {
      lines.push(`   ${childDisplay}`);
    }
  }
  if (input.rows.length > APP_QUERY_BATCH_DISPLAY_ROW_LIMIT) {
    lines.push(`... ${input.rows.length - APP_QUERY_BATCH_DISPLAY_ROW_LIMIT} more query claim(s) omitted from text.`);
  }
  if (input.includeAppProfile || input.includeAppQueryClaimProfiles) {
    lines.push('Profiling fields were included by explicit request; keep them off for ordinary MCP app-building orientation.');
  } else {
    lines.push('Profiles: omitted; use includeAppProfile/includeAppQueryClaimProfiles only for telemetry work.');
  }
  return lines.join('\n');
}

const APP_QUERY_BATCH_DISPLAY_ROW_LIMIT = 8;

function firstSemanticDisplayTextLine(answer: SemanticRuntimeAnswer<unknown>): string | null {
  const value = answer.value;
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const displayText = (value as { readonly displayText?: unknown }).displayText;
  if (typeof displayText !== 'string') {
    return null;
  }
  const line = displayText.split(/\r?\n/u).map((part) => part.trim()).find((part) => part.length > 0) ?? null;
  return line == null ? null : trimDisplayLine(line);
}

function trimDisplayLine(line: string): string {
  return line.length <= 180
    ? line
    : `${line.slice(0, 177)}...`;
}

function openSeamsDisplayText(
  rows: readonly SemanticOpenSeamRow[],
  totalRows: number,
): string {
  const lines = [`Open seams: returned ${rows.length} of ${totalRows} row(s).`];
  if (totalRows === 0) {
    lines.push('Pressure: no open semantic seams in this app emission.');
  } else {
    lines.push(`Seam kinds: ${runtimeCountMapDisplay(runtimeCountValues(rows, (row) => row.seamKindKey))}.`);
    lines.push(`Reason kinds: ${runtimeListDisplay(runtimeUniqueValuesFromMany(rows, (row) => row.reasonKinds, RUNTIME_DISPLAY_LIST_LIMIT))}.`);
    lines.push(`Samples: ${rows.slice(0, RUNTIME_DISPLAY_SAMPLE_LIMIT).map((row) =>
      `${row.seamKindKey}: ${trimDisplayLine(row.summary)}`
    ).join(' | ')}.`);
    lines.push('Next: use open-seam-summary for clusters or page open-seams with handles when an exact runtime boundary needs follow-up.');
  }
  return lines.join('\n');
}

function openSeamSummaryDisplayText(
  rows: readonly SemanticOpenSeamSummaryRow[],
  totalOpenSeamRows: number,
): string {
  const lines = [`Open seam clusters: returned ${rows.length} cluster(s) covering ${totalOpenSeamRows} open semantic seam(s).`];
  if (totalOpenSeamRows === 0) {
    lines.push('Pressure: no open semantic seams in this app emission.');
  } else {
    lines.push(`Clusters: ${rows.slice(0, RUNTIME_DISPLAY_SAMPLE_LIMIT).map((row) =>
      `${row.seamKindKey} x${row.count} (${runtimeListDisplay(row.reasonKinds)})`
    ).join(' | ')}.`);
    lines.push(`Source-file coverage: ${rows.reduce((sum, row) => sum + row.sourceFileCount, 0)} cluster source-file reference(s).`);
    lines.push('Next: page raw open-seams only after the cluster identifies the runtime boundary or source family to inspect.');
  }
  return lines.join('\n');
}

function appDiagnosticsDisplayText(
  rows: readonly SemanticAppDiagnosticRow[],
  totalRows: number,
): string {
  const lines = [`Diagnostics: returned ${rows.length} of ${totalRows} row(s).`];
  if (totalRows === 0) {
    lines.push('Pressure: no app diagnostics in this locus.');
  } else {
    lines.push(`Severity: ${runtimeCountMapDisplay(runtimeCountValues(rows, (row) => row.severity))}.`);
    lines.push(`Domains: ${runtimeCountMapDisplay(runtimeCountValues(rows, (row) => row.diagnosticDomain))}.`);
    const frameworkCodes = runtimeUniqueValues(rows, (row) => row.frameworkErrorCode, RUNTIME_DISPLAY_LIST_LIMIT);
    if (frameworkCodes.length > 0) {
      lines.push(`Framework codes: ${frameworkCodes.join(', ')}.`);
    }
    lines.push(`Samples: ${rows.slice(0, RUNTIME_DISPLAY_SAMPLE_LIMIT).map((row) =>
      `${row.diagnosticDomain}/${row.diagnosticKind}: ${trimDisplayLine(row.summary)}`
    ).join(' | ')}.`);
    lines.push('Next: use diagnostic-overview for clusters or page the related query kind for exact product-family rows.');
  }
  return lines.join('\n');
}

function includeTypeScriptDiagnostics(query: Pick<SemanticAppQuery, 'diagnosticProjection'>): boolean {
  return query.diagnosticProjection !== 'available-products';
}

function appDiagnosticSummaryDisplayText(
  rows: readonly SemanticAppDiagnosticSummaryRow[],
  totalDiagnosticRows: number,
): string {
  const lines = [`Diagnostic clusters: returned ${rows.length} cluster(s) covering ${totalDiagnosticRows} diagnostic row(s).`];
  if (totalDiagnosticRows === 0) {
    lines.push('Pressure: no app diagnostics in this locus.');
  } else {
    lines.push(`Severity: ${runtimeCountMapDisplay(runtimeCountValues(rows, (row) => row.severity))}.`);
    lines.push(`Domains: ${runtimeCountMapDisplay(runtimeCountValues(rows, (row) => row.diagnosticDomain))}.`);
    lines.push(`Clusters: ${rows.slice(0, RUNTIME_DISPLAY_SAMPLE_LIMIT).map((row) =>
      `${row.diagnosticDomain}/${row.diagnosticKind} ${row.severity} x${row.count} -> ${row.relatedQueryKind}`
    ).join(' | ')}.`);
    lines.push('Next: page the related query kind or app diagnostics after selecting the highest-value cluster.');
  }
  return lines.join('\n');
}

const RUNTIME_DISPLAY_LIST_LIMIT = 6;
const RUNTIME_DISPLAY_SAMPLE_LIMIT = 4;

function runtimeCountValues<TRow>(
  rows: readonly TRow[],
  read: (row: TRow) => string | null,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = read(row);
    if (value != null) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

function runtimeUniqueValues<TRow>(
  rows: readonly TRow[],
  read: (row: TRow) => string | null,
  limit: number,
): readonly string[] {
  return [...new Set(rows.map(read).filter((value): value is string => value != null))]
    .sort((left, right) => left.localeCompare(right))
    .slice(0, limit);
}

function runtimeUniqueValuesFromMany<TRow>(
  rows: readonly TRow[],
  read: (row: TRow) => readonly string[],
  limit: number,
): readonly string[] {
  return [...new Set(rows.flatMap(read))]
    .sort((left, right) => left.localeCompare(right))
    .slice(0, limit);
}

function runtimeCountMapDisplay(counts: ReadonlyMap<string, number>): string {
  if (counts.size === 0) {
    return 'none';
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}=${count}`)
    .join(', ');
}

function runtimeListDisplay(values: readonly unknown[]): string {
  return values.length === 0 ? 'none' : values.map(String).join(', ');
}

function withAppWorldFreeEvaluationProfile<TValue>(
  result: SemanticRuntimeAnswer<TValue>,
  evaluation: StaticProjectEvaluationResult | null,
  telemetry: OpenSemanticAppOptions['telemetry'],
): SemanticRuntimeAnswer<TValue> {
  if (evaluation == null || telemetry == null) {
    return result;
  }
  const profile: SemanticRuntimeAnswerProfile = {
    ...(result.profile ?? {}),
    appWorldFreeProfile: semanticRuntimeAppWorldFreeProfileSummary(evaluation, normalizeCacheOverviewRowLimit(null)),
  };
  return {
    ...result,
    profile,
  };
}

function semanticRuntimeAppWorldFreeProfileSummary(
  evaluation: StaticProjectEvaluationResult,
  rowLimit: number,
): SemanticRuntimeAppWorldFreeProfileSummary {
  return {
    totalMilliseconds: roundMilliseconds(evaluation.profile.totalMilliseconds),
    staticEvaluationPhases: semanticRuntimeAggregatedPhaseTimingSummaries(evaluation.profile.phases, rowLimit),
    staticEvaluationHost: evaluation.profile.sourceHost,
    staticEvaluationSources: evaluation.profile.sourceFiles,
  };
}

/** Open app facade. It owns one project-level semantic app-world emission and compact query entrypoints. */
export class SemanticApp {
  private readonly routeQueries: SemanticAppRouteQueries;
  readonly queryClaims: QueryClaimGraph;
  private readonly queryClaimsByProfile = new Map<SemanticRuntimeInquiryProfile, QueryClaimGraph>();
  private readonly activeInquiryProfileStack: SemanticRuntimeInquiryProfile[] = [];
  readonly templateQueries: SemanticAppTemplateQueries;

  constructor(
    readonly runtime: SemanticRuntime,
    readonly project: ProjectBootFrame,
    readonly emission: AureliaAppWorldProjectEmission,
    private readonly cacheRequest: SemanticAppCacheRequest,
  ) {
    this.queryClaims = this.queryClaimsForProfile(emission.profile.inquiryProfile);
    this.routeQueries = new SemanticAppRouteQueries(emission, runtime.workspace.store);
    this.templateQueries = new SemanticAppTemplateQueries(
      emission,
      runtime.workspace.store,
      runtime.workspace.rootDir,
      project.rootDir,
    );
  }

  get kernelMarker(): KernelStoreMarker {
    return this.cacheRequest.kernelMarker;
  }

  cacheSummary(rowLimit: number, includeQueryClaimRows: boolean): SemanticRuntimeCachedAppSummary {
    return {
      projectKey: this.project.projectKey,
      analysisDepth: this.cacheRequest.analysisDepth,
      includeAuthoringTemplates: this.cacheRequest.includeAuthoringTemplates,
      authoringTemplateSourceFileCount: this.cacheRequest.authoringTemplateSourceFileCount,
      authoringTemplateLimit: this.cacheRequest.authoringTemplateLimit,
      profile: {
        inquiryProfile: this.emission.profile.inquiryProfile,
        totalMilliseconds: roundMilliseconds(this.emission.profile.totalMilliseconds),
        phaseCount: this.emission.profile.phases.length,
        topPhases: semanticRuntimePhaseTimingSummaries(this.emission.profile.phases, rowLimit),
        staticEvaluationPhases: semanticRuntimeAggregatedPhaseTimingSummaries(this.emission.evaluation.profile.phases, rowLimit),
        staticEvaluationHost: this.emission.evaluation.profile.sourceHost,
        staticEvaluationSources: this.emission.evaluation.profile.sourceFiles,
        typeSystemPhases: semanticRuntimeAggregatedPhaseTimingSummaries(this.emission.typeSystem.profile.phases, rowLimit),
        resourceRecognitionPhases: semanticRuntimeAggregatedPhaseTimingSummaries(this.emission.resources.profile.phases, rowLimit),
        templatePhases: semanticRuntimeAggregatedPhaseTimingSummaries(this.emission.templates.profile.phases, rowLimit),
        templateRuntimePhases: semanticRuntimeTemplateRuntimePhaseTimingSummaries(this.emission, rowLimit),
        templateExpressionTypeCache: semanticRuntimeTemplateExpressionTypeCacheSummary(this.emission),
        compilerOptions: this.emission.typeSystem.profile.compilerOptions,
        hostSourceFileCache: this.emission.typeSystem.profile.hostSourceFileCache,
        programRootFiles: this.emission.typeSystem.profile.programRootFiles,
        programSourceFiles: this.emission.typeSystem.profile.programSourceFiles,
        programRootFileGroups: trimTypeSystemProgramSourceFileGroups(
          this.emission.typeSystem.profile.programRootFileGroups,
          rowLimit,
        ),
        programSourceFileGroups: trimTypeSystemProgramSourceFileGroups(
          this.emission.typeSystem.profile.programSourceFileGroups,
          rowLimit,
        ),
        programNodeRemaps: this.emission.typeSystem.readProgramNodeRemapStats(),
      },
      queryClaims: this.queryClaims.snapshot(),
      queryClaimProfiles: this.queryClaimProfileSummaries(rowLimit, includeQueryClaimRows),
    };
  }

  ask(query: SemanticAppQuery): SemanticRuntimeAnswer<unknown> {
    const continuationQuery = query;
    query = semanticAppQueryCatalogShape(query);
    const answerCurrentQuery = <TValue>(
      materialize: () => SemanticRuntimeAnswer<TValue>,
    ): SemanticRuntimeAnswer<TValue> => this.answerQuery(query, materialize, continuationQuery);
    if (semanticRouteQueryDescriptorFor(query.kind) != null) {
      return answerCurrentQuery(() => {
        const routeAnswer = this.routeQueries.answer(query.kind, query.page, query.detail);
        if (routeAnswer == null) {
          throw new Error(`Route query '${query.kind}' was admitted but produced no answer.`);
        }
        return routeAnswer;
      });
    }
    switch (query.kind) {
      case SemanticAppQueryKind.Summary:
        return answerCurrentQuery(() => this.summary());
      case SemanticAppQueryKind.AppOverview:
        return answerCurrentQuery(() => this.overview({
          diagnosticPageSize: query.diagnosticPageSize,
          openSeamPageSize: query.openSeamPageSize,
          includeAuthoringOrientation: query.includeAuthoringOrientation,
        }));
      case SemanticAppQueryKind.AuthoringCatalog:
        return answerCurrentQuery(() => this.authoringCatalog());
      case SemanticAppQueryKind.AuthoringOrientation:
        return answerCurrentQuery(() => this.authoringOrientation(
          query.page,
          query.detail ?? SemanticRuntimeDetail.Compact,
        ));
      case SemanticAppQueryKind.SourceFiles:
        return answerCurrentQuery(() => this.sourceFiles(query.page, query.detail));
      case SemanticAppQueryKind.UnresolvedModules:
        return answerCurrentQuery(() => this.unresolvedModules(query.page));
      case SemanticAppQueryKind.OpenSeams:
        return answerCurrentQuery(() => this.openSeams(query.page, query.detail));
      case SemanticAppQueryKind.OpenSeamSummary:
        return answerCurrentQuery(() => this.openSeamSummary(query.page, query.detail));
      case SemanticAppQueryKind.AppDiagnostics:
        return answerCurrentQuery(() => this.appDiagnostics(query));
      case SemanticAppQueryKind.AppDiagnosticSummary:
        return answerCurrentQuery(() => this.appDiagnosticSummary(query));
      case SemanticAppQueryKind.TypeScriptDiagnostics:
        return answerCurrentQuery(() => this.typeScriptDiagnostics(query.page, query.sourceFile));
      case SemanticAppQueryKind.TypeScriptDiagnosticSummary:
        return answerCurrentQuery(() => this.typeScriptDiagnosticSummary(query.page, query.sourceFile));
      case SemanticAppQueryKind.EvaluationIssues:
        return answerCurrentQuery(() => this.evaluationIssues(query.page, query.detail));
      case SemanticAppQueryKind.ConfigurationIssues:
        return answerCurrentQuery(() => this.configurationIssues(query.page, query.detail));
      case SemanticAppQueryKind.DiIssues:
        return answerCurrentQuery(() => this.diIssues(query.page, query.detail));
      case SemanticAppQueryKind.ObservationIssues:
        return answerCurrentQuery(() => this.observationIssues(query.page, query.detail));
      case SemanticAppQueryKind.ComputedObservationDefinitions:
        return answerCurrentQuery(() => this.computedObservationDefinitions(query.page, query.detail));
      case SemanticAppQueryKind.ComputedObserverSources:
        return answerCurrentQuery(() => this.computedObserverSources(query.page, query.detail));
      case SemanticAppQueryKind.ComputedObserverObservedDependencies:
        return answerCurrentQuery(() => this.computedObserverObservedDependencies(query.page, query.detail));
      case SemanticAppQueryKind.RuntimeEffects:
        return answerCurrentQuery(() => this.runtimeEffects(query.page, query.detail));
      case SemanticAppQueryKind.RuntimeEffectObservedDependencies:
        return answerCurrentQuery(() => this.runtimeEffectObservedDependencies(query.page, query.detail));
      case SemanticAppQueryKind.ProxyObservableEscapes:
        return answerCurrentQuery(() => this.proxyObservableEscapes(query.page, query.detail));
      case SemanticAppQueryKind.AppTopology:
        return answerCurrentQuery(() => this.appTopology(query.detail, query.includeTypeSurfaces));
      case SemanticAppQueryKind.StateStores:
        return answerCurrentQuery(() => this.stateStores(query.page, query.detail));
      case SemanticAppQueryKind.StateIssues:
        return answerCurrentQuery(() => this.stateIssues(query.page, query.detail));
      case SemanticAppQueryKind.I18nTranslationKeys:
        return answerCurrentQuery(() => this.i18nTranslationKeys(query.page, query.detail));
      case SemanticAppQueryKind.I18nTranslationBindings:
        return answerCurrentQuery(() => this.i18nTranslationBindings(query.page, query.detail));
      case SemanticAppQueryKind.ValidationIssues:
        return answerCurrentQuery(() => this.validationIssues(query.page, query.detail));
      case SemanticAppQueryKind.FetchClientIssues:
        return answerCurrentQuery(() => this.fetchClientIssues(query.page, query.detail));
      case SemanticAppQueryKind.DialogIssues:
        return answerCurrentQuery(() => this.dialogIssues(query.page, query.detail));
      case SemanticAppQueryKind.RouterOverview:
        return answerCurrentQuery(() => this.routerOverview({
          rowPageSize: query.rowPageSize ?? query.page?.size,
          detail: query.detail,
        }));
      case SemanticAppQueryKind.ResourceDefinitions:
        return answerCurrentQuery(() => this.resourceDefinitions(query.page, query.detail));
      case SemanticAppQueryKind.ResourceIssues:
        return answerCurrentQuery(() => this.resourceIssues(query.page, query.detail));
      case SemanticAppQueryKind.ResourceVisibility:
        return answerCurrentQuery(() => this.resourceVisibility(query.page, query.detail));
      case SemanticAppQueryKind.TemplateCompilations:
        return answerCurrentQuery(() => this.templateQueries.templateCompilations(query.page, query.detail));
      case SemanticAppQueryKind.TemplateCompletions:
        return answerCurrentQuery(() => this.templateQueries.templateCompletions(query));
      case SemanticAppQueryKind.TemplateCursorInfo:
        return answerCurrentQuery(() => this.templateQueries.templateCursorInfo(query));
      case SemanticAppQueryKind.TemplateDiagnostics:
        return answerCurrentQuery(() => this.templateQueries.templateDiagnostics(query));
      case SemanticAppQueryKind.RuntimeControllers:
        return answerCurrentQuery(() => this.runtimeControllers(query.page, query.detail));
      case SemanticAppQueryKind.RuntimeWatchers:
        return answerCurrentQuery(() => this.runtimeWatchers(query.page, query.detail));
      case SemanticAppQueryKind.RuntimeWatcherObservedDependencies:
        return answerCurrentQuery(() => this.runtimeWatcherObservedDependencies(query.page, query.detail));
      case SemanticAppQueryKind.RuntimeCompositions:
        return answerCurrentQuery(() => this.runtimeCompositions(query.page, query.detail));
      case SemanticAppQueryKind.BindingTargetAccesses:
        return answerCurrentQuery(() => this.bindingTargetAccesses(query.page, query.detail));
      case SemanticAppQueryKind.TargetOperations:
        return answerCurrentQuery(() => this.targetOperations(query.page, query.detail));
      case SemanticAppQueryKind.BindingTargetOperations:
        return answerCurrentQuery(() => this.targetOperations(query.page, query.detail));
      case SemanticAppQueryKind.BindingSourceOperations:
        return answerCurrentQuery(() => this.bindingSourceOperations(query.page, query.detail));
      case SemanticAppQueryKind.BindingBehaviorApplications:
        return answerCurrentQuery(() => this.bindingBehaviorApplications(query.page, query.detail));
      case SemanticAppQueryKind.BindingValueChannels:
        return answerCurrentQuery(() => this.bindingValueChannels(query.page, query.detail));
      case SemanticAppQueryKind.BindingValueChannelSummary:
        return answerCurrentQuery(() => this.bindingValueChannelSummary(query.page));
      case SemanticAppQueryKind.BindingDataFlows:
        return answerCurrentQuery(() => this.bindingDataFlows(query.page, query.detail));
      case SemanticAppQueryKind.BindingDataFlowSummary:
        return answerCurrentQuery(() => this.bindingDataFlowSummary(query.page));
      case SemanticAppQueryKind.BindingObservedDependencySummary:
        return answerCurrentQuery(() => this.bindingObservedDependencySummary(query.page));
      case SemanticAppQueryKind.BindingObservedDependencies:
        return answerCurrentQuery(() => this.bindingObservedDependencies(query.page, query.detail));
      default:
        return answerCurrentQuery(() => answer(
          SemanticRuntimeAnswerOutcome.Unsupported,
          `Semantic app query '${query.kind}' is not supported by the operational API surface.`,
          { query },
        ));
    }
  }

  private answerQuery<TValue>(
    query: SemanticAppQuery,
    materialize: () => SemanticRuntimeAnswer<TValue>,
    continuationQuery: SemanticAppQuery = query,
  ): SemanticRuntimeAnswer<TValue> {
    const catalogRow = semanticAppQueryCatalogRow(query.kind as SemanticAppQueryKind);
    const inquiryProfile = this.inquiryProfileForQuery(query);
    const queryClaims = this.queryClaimsForProfile(inquiryProfile);
    return filterSemanticAppQueryContinuations(
      continuationQuery,
      queryClaims.answer({
        queryKind: query.kind,
        queryKey: semanticAppQueryKey(query),
        locusKey: semanticAppQueryLocusKey(this.project.projectKey, query),
        epochKeys: semanticAppQueryEpochKeys(this.project.projectKey, query),
        materializationPolicy: semanticAppQueryMaterializationPolicy(query, catalogRow.materializationPolicy),
      }, () => {
        this.activeInquiryProfileStack.push(inquiryProfile);
        try {
          return withSemanticAppQueryContinuations(
            continuationQuery,
            materialize(),
            catalogRow,
          );
        } finally {
          this.activeInquiryProfileStack.pop();
        }
      }, {
        readKernelMarker: () => this.runtime.workspace.store.mark(),
        readKernelSnapshot: () => this.runtime.workspace.store.readTelemetrySnapshot(),
        disposeKernelSince: (marker) => this.runtime.workspace.store.disposeSince(marker),
      }),
    );
  }

  private answerPublicQueryIfNeeded<TValue>(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<TValue> | null {
    if (this.activeInquiryProfileStack.length > 0) {
      return null;
    }
    return this.ask(query) as SemanticRuntimeAnswer<TValue>;
  }

  private inquiryProfileForQuery(query: SemanticAppQuery): SemanticRuntimeInquiryProfile {
    return normalizeSemanticRuntimeInquiryProfile(
      query.inquiryProfile
        ?? this.activeInquiryProfileStack[this.activeInquiryProfileStack.length - 1]
        ?? this.emission.profile.inquiryProfile,
    );
  }

  private queryClaimsForProfile(
    profile: SemanticRuntimeInquiryProfile | string | null | undefined,
  ): QueryClaimGraph {
    const normalized = normalizeSemanticRuntimeInquiryProfile(profile ?? DEFAULT_SEMANTIC_RUNTIME_INQUIRY_PROFILE);
    const existing = this.queryClaimsByProfile.get(normalized);
    if (existing != null) {
      return existing;
    }
    const graph = new QueryClaimGraph(normalized);
    this.queryClaimsByProfile.set(normalized, graph);
    return graph;
  }

  private queryClaimProfileSummaries(
    rowLimit: number,
    includeRows: boolean,
  ): readonly SemanticRuntimeCachedAppQueryClaimProfileSummary[] {
    return [...this.queryClaimsByProfile.entries()]
      .map(([inquiryProfile, queryClaims]) => ({
        inquiryProfile,
        queryClaims: queryClaims.snapshot(),
        ...queryClaimRowsForCacheOverview(queryClaims, rowLimit, includeRows),
      }))
      .sort((left, right) => left.inquiryProfile.localeCompare(right.inquiryProfile));
  }

  disposeQueryClaims(
    reason: QueryClaimDisposalReason,
  ): number {
    let disposed = 0;
    const policy = queryClaimDisposalPolicy(reason);
    for (const graph of this.queryClaimsByProfile.values()) {
      disposed += graph.dispose(policy);
    }
    return disposed;
  }

  disposeQueryClaimsByPolicy(
    policy: QueryClaimDisposalPolicy,
    inquiryProfile: SemanticRuntimeInquiryProfile | null = null,
  ): number {
    let disposed = 0;
    for (const [profile, graph] of this.queryClaimsByProfile.entries()) {
      if (inquiryProfile != null && profile !== inquiryProfile) {
        continue;
      }
      disposed += graph.dispose(policy);
    }
    return disposed;
  }

  disposeQueryClaimProfilesByPolicy(
    policy: QueryClaimDisposalPolicy,
    inquiryProfile: SemanticRuntimeInquiryProfile | null = null,
  ): readonly SemanticRuntimeQueryClaimDisposeProfileSummary[] {
    const summaries: SemanticRuntimeQueryClaimDisposeProfileSummary[] = [];
    for (const [profile, graph] of this.queryClaimsByProfile.entries()) {
      if (inquiryProfile != null && profile !== inquiryProfile) {
        continue;
      }
      const disposal = graph.disposeWithSummary(policy);
      if (disposal.disposedRecords === 0) {
        continue;
      }
      summaries.push({
        scope: 'cached-app',
        projectKey: this.project.projectKey,
        inquiryProfile: profile,
        disposal,
      });
    }
    return summaries;
  }

  disposeQueryClaimsForSourceEpoch(
    sourceFilePath: string | null = null,
  ): number {
    const epochKeys = sourceFilePath == null
      ? undefined
      : [
        semanticAppProjectEpochKey(this.project.projectKey),
        semanticAppSourceEpochKey(this.project.projectKey, sourceFilePath),
      ];
    let disposed = 0;
    for (const graph of this.queryClaimsByProfile.values()) {
      disposed += graph.disposeForSourceEpoch(epochKeys);
    }
    return disposed;
  }

  summary(): SemanticRuntimeAnswer<SemanticAppSummary> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticAppSummary>({
      kind: SemanticAppQueryKind.Summary,
    });
    if (claimed != null) {
      return claimed;
    }
    const value = readSemanticAppSummary(this.project, this.emission, this.runtime.workspace.store);
    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      `Opened semantic app '${value.projectKey}' with ${value.appRoots} app root(s), ${value.evaluationIssues} evaluation issue(s), ${value.stateStores} state store(s), ${value.routeConfigs} route config(s), ${value.routePatterns} route pattern(s), ${value.routeEndpoints} route endpoint(s), ${value.routeRecognizerIssues} route recognizer issue(s), ${value.compilerWorlds} compiler world(s), and ${value.compiledResources} compiled resource template(s).`,
      value,
    );
  }

  overview(request: SemanticAppOverviewRequest = {}): SemanticRuntimeAnswer<SemanticAppOverviewResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticAppOverviewResult>({
      kind: SemanticAppQueryKind.AppOverview,
      diagnosticPageSize: request.diagnosticPageSize,
      openSeamPageSize: request.openSeamPageSize,
      includeAuthoringOrientation: request.includeAuthoringOrientation,
    });
    if (claimed != null) {
      return claimed;
    }
    return readSemanticAppOverview(
      (query) => this.ask(query),
      request,
      () => this.appTopologySummary(),
    );
  }

  private appTopologySummary(): SemanticRuntimeAnswer<SemanticAppOverviewCollectionSummary> {
    const value = readSemanticApplicationTopologySummary(this.runtime.workspace.store, this.emission);
    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      `Read compact app topology summary for '${value.scalars.projectKey}' with ${value.counts.components ?? 0} component(s), ${value.counts.routes ?? 0} route(s), and ${value.counts.services ?? 0} service/model source(s).`,
      value,
    );
  }

  routerOverview(request: SemanticRouterOverviewRequest = {}): SemanticRuntimeAnswer<SemanticRouterOverviewResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticRouterOverviewResult>({
      kind: SemanticAppQueryKind.RouterOverview,
      rowPageSize: request.rowPageSize,
      detail: request.detail ?? undefined,
    });
    if (claimed != null) {
      return claimed;
    }
    return readSemanticRouterOverview((query) => this.ask(query), request);
  }

  authoringCatalog(): SemanticRuntimeAnswer<SemanticAuthoringCatalogResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticAuthoringCatalogResult>({
      kind: SemanticAppQueryKind.AuthoringCatalog,
    });
    if (claimed != null) {
      return claimed;
    }
    return this.runtime.authoringCatalog({
      inquiryProfile: this.activeInquiryProfileStack[this.activeInquiryProfileStack.length - 1]
        ?? this.emission.profile.inquiryProfile,
    });
  }

  authoringOrientation(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticAuthoringOrientationResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticAuthoringOrientationResult>({
      kind: SemanticAppQueryKind.AuthoringOrientation,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const orientation = semanticAuthoringOrientationResultForDetail(
      readSemanticAuthoringOrientation(this.project, this.emission, this.runtime.workspace.store),
      detail,
    );
    const pagedRepairClusters = page == null
      ? null
      : pageRows(orientation.repairClusters, page);
    const value = pagedRepairClusters == null
      ? orientation
      : {
          ...orientation,
          repairClusters: pagedRepairClusters.rows,
        };
    return answer(
      pagedRepairClusters == null ? SemanticRuntimeAnswerOutcome.Hit : outcomeForPagedRows(pagedRepairClusters),
      `Oriented authoring for '${value.project.projectKey}' across ${value.coverage.length} coverage row(s), ${value.capabilities.length} capability row(s), ${value.openReasons.length} open reason kind(s), and ${value.repairClusters.length}${pagedRepairClusters == null ? '' : ` of ${pagedRepairClusters.page.totalRows}`} repair cluster(s).`,
      value,
      pagedRepairClusters?.page ?? null,
    );
  }

  sourceFiles(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticSourceFilesResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticSourceFilesResult>({
      kind: SemanticAppQueryKind.SourceFiles,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    return readSemanticSourceFiles(this.project, page, detail);
  }

  unresolvedModules(
    page?: SemanticRuntimePageInput,
  ): SemanticRuntimeAnswer<SemanticUnresolvedModulesResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticUnresolvedModulesResult>({
      kind: SemanticAppQueryKind.UnresolvedModules,
      page,
    });
    if (claimed != null) {
      return claimed;
    }
    return readSemanticUnresolvedModules(this.emission.evaluation, page);
  }

  openSeams(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticOpenSeamsResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticOpenSeamsResult>({
      kind: SemanticAppQueryKind.OpenSeams,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = this.openSeamRows(detail);
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} open semantic seam(s).`,
      {
        displayText: openSeamsDisplayText(paged.rows, rows.length),
        rows: paged.rows,
      },
      paged.page,
    );
  }

  openSeamSummary(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticOpenSeamSummaryResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticOpenSeamSummaryResult>({
      kind: SemanticAppQueryKind.OpenSeamSummary,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const seamRows = this.openSeamRows(detail);
    const rows = openSeamSummaryRows(seamRows);
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} open seam cluster(s) covering ${seamRows.length} open semantic seam(s).`,
      {
        totalOpenSeamRows: seamRows.length,
        displayText: openSeamSummaryDisplayText(paged.rows, seamRows.length),
        rows: paged.rows,
      },
      paged.page,
    );
  }

  private openSeamRows(
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`,
  ): readonly SemanticOpenSeamRow[] {
    const handles = includeHandles(detail);
    return readAppOpenSeams(this.emission, this.runtime.workspace.store)
      .map((seam): SemanticOpenSeamRow => ({
        seamKindKey: seam.seamKindKey,
        summary: seam.summary,
        reasonKinds: seam.reasonKinds,
        reasonSources: seam.reasonSources.map((source) => ({
          reasonKind: source.reasonKind,
          summary: source.summary,
          source: describeAddress(this.runtime.workspace.store, source.addressHandle),
          ...(handles ? {
            handles: {
              addressHandle: source.addressHandle,
              evidenceHandle: source.evidenceHandle ?? null,
            },
          } : {}),
        })),
        source: describeAddress(this.runtime.workspace.store, seam.addressHandle),
        ...(handles ? {
          handles: {
            handle: seam.handle,
            addressHandle: seam.addressHandle,
          },
        } : {}),
      }))
      .sort((left, right) =>
        `${left.seamKindKey}:${left.summary}`.localeCompare(`${right.seamKindKey}:${right.summary}`)
      );
  }

  appDiagnostics(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticAppDiagnosticsResult> {
    const appQuery = {
      ...query,
      kind: SemanticAppQueryKind.AppDiagnostics,
    };
    const claimed = this.answerPublicQueryIfNeeded<SemanticAppDiagnosticsResult>(appQuery);
    if (claimed != null) {
      return claimed;
    }
    const detail = appQuery.detail ?? SemanticRuntimeDetail.Compact;
    const rows = this.appDiagnosticRowsForQuery(appQuery, detail);
    const paged = pageRows(rows, appQuery.page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} app diagnostic row(s).`,
      {
        displayText: appDiagnosticsDisplayText(paged.rows, rows.length),
        rows: paged.rows,
      },
      paged.page,
    );
  }

  appDiagnosticSummary(
    query: SemanticAppQuery,
  ): SemanticRuntimeAnswer<SemanticAppDiagnosticSummaryResult> {
    const appQuery = {
      ...query,
      kind: SemanticAppQueryKind.AppDiagnosticSummary,
    };
    const claimed = this.answerPublicQueryIfNeeded<SemanticAppDiagnosticSummaryResult>(appQuery);
    if (claimed != null) {
      return claimed;
    }
    const detail = appQuery.detail ?? SemanticRuntimeDetail.Compact;
    const diagnosticRows = this.appDiagnosticRowsForQuery(appQuery, detail);
    const rows = appDiagnosticSummaryRows(diagnosticRows);
    const paged = pageRows(rows, appQuery.page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} app diagnostic cluster(s) covering ${diagnosticRows.length} diagnostic row(s).`,
      {
        totalDiagnosticRows: diagnosticRows.length,
        displayText: appDiagnosticSummaryDisplayText(paged.rows, diagnosticRows.length),
        rows: paged.rows,
      },
      paged.page,
    );
  }

  typeScriptDiagnostics(
    page?: SemanticRuntimePageInput,
    sourceFile?: SemanticRuntimeSourceFileInput | null,
  ): SemanticRuntimeAnswer<SemanticTypeScriptDiagnosticsResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticTypeScriptDiagnosticsResult>({
      kind: SemanticAppQueryKind.TypeScriptDiagnostics,
      page,
      sourceFile,
    });
    if (claimed != null) {
      return claimed;
    }
    return readSemanticTypeScriptDiagnostics(
      this.emission.typeSystem,
      this.project.projectKey,
      sourceFile,
      page,
    );
  }

  typeScriptDiagnosticSummary(
    page?: SemanticRuntimePageInput,
    sourceFile?: SemanticRuntimeSourceFileInput | null,
  ): SemanticRuntimeAnswer<SemanticTypeScriptDiagnosticSummaryResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticTypeScriptDiagnosticSummaryResult>({
      kind: SemanticAppQueryKind.TypeScriptDiagnosticSummary,
      page,
      sourceFile,
    });
    if (claimed != null) {
      return claimed;
    }
    return readSemanticTypeScriptDiagnosticSummary(
      this.emission.typeSystem,
      this.project.projectKey,
      sourceFile,
      page,
    );
  }

  private appDiagnosticRowsForQuery(
    query: SemanticAppQuery,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}`,
  ) {
    const typeScriptRows = includeTypeScriptDiagnostics(query)
      ? readSemanticTypeScriptDiagnosticRows(this.emission.typeSystem, this.project.projectKey, query.sourceFile)
      : [];
    const evaluationRows = readEvaluationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const configurationRows = readConfigurationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const diRows = readDiIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const observationRows = readObservationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const templateRows = this.templateQueries.templateDiagnosticRows({ ...query, detail });
    const resourceRows = readResourceIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const stateRows = readStateIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const validationRows = readValidationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const fetchClientRows = readFetchClientIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const dialogRows = readDialogIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const routerRows = this.routeQueries.routerIssueRows(detail);
    const routeRows = this.routeQueries.routeRecognizerIssueRows(detail);
    return appDiagnosticRows(
      this.project.sourceFiles,
      this.project.projectKey,
      query,
      typeScriptRows,
      evaluationRows,
      configurationRows,
      diRows,
      observationRows,
      templateRows,
      resourceRows,
      stateRows,
      validationRows,
      fetchClientRows,
      dialogRows,
      routerRows,
      routeRows,
    );
  }

  evaluationIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticEvaluationIssuesResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticEvaluationIssuesResult>({
      kind: SemanticAppQueryKind.EvaluationIssues,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readEvaluationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} evaluation issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  configurationIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticConfigurationIssuesResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticConfigurationIssuesResult>({
      kind: SemanticAppQueryKind.ConfigurationIssues,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readConfigurationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} configuration issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  diIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticDiIssuesResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticDiIssuesResult>({
      kind: SemanticAppQueryKind.DiIssues,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readDiIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} DI issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  observationIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticObservationIssuesResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticObservationIssuesResult>({
      kind: SemanticAppQueryKind.ObservationIssues,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readObservationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} observation issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  computedObservationDefinitions(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticComputedObservationDefinitionsResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticComputedObservationDefinitionsResult>({
      kind: SemanticAppQueryKind.ComputedObservationDefinitions,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readComputedObservationDefinitionRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} computed observation definition row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  computedObserverSources(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticComputedObserverSourcesResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticComputedObserverSourcesResult>({
      kind: SemanticAppQueryKind.ComputedObserverSources,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readComputedObserverSourceRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} computed observer source row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  computedObserverObservedDependencies(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticComputedObserverObservedDependenciesResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticComputedObserverObservedDependenciesResult>({
      kind: SemanticAppQueryKind.ComputedObserverObservedDependencies,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readComputedObserverObservedDependencyRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} computed observer observed dependency row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  runtimeEffects(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRuntimeEffectResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticRuntimeEffectResult>({
      kind: SemanticAppQueryKind.RuntimeEffects,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readRuntimeEffectRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} source-level runtime effect row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  runtimeEffectObservedDependencies(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRuntimeEffectObservedDependenciesResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticRuntimeEffectObservedDependenciesResult>({
      kind: SemanticAppQueryKind.RuntimeEffectObservedDependencies,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readRuntimeEffectObservedDependencyRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} source-level runtime effect observed-dependency row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  proxyObservableEscapes(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticProxyObservableEscapesResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticProxyObservableEscapesResult>({
      kind: SemanticAppQueryKind.ProxyObservableEscapes,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readProxyObservableEscapeRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} source-level ProxyObservable escape row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  appTopology(
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
    includeTypeSurfaces: boolean | null | undefined = false,
  ): SemanticRuntimeAnswer<SemanticApplicationTopologyResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticApplicationTopologyResult>({
      kind: SemanticAppQueryKind.AppTopology,
      detail,
      includeTypeSurfaces,
    });
    if (claimed != null) {
      return claimed;
    }
    const handles = includeHandles(detail);
    const value = readSemanticApplicationTopology(this.runtime.workspace.store, this.emission, handles, {
      includeTypeSurfaces: includeTypeSurfaces === true,
    });
    return answer(
      SemanticRuntimeAnswerOutcome.Hit,
      `Recovered ${value.appRoots.length} app root(s), ${value.components.length} component(s), ${value.routes.length} route config(s), and ${value.files.length} roleful app file(s).`,
      value,
    );
  }

  stateStores(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticStateStoresResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticStateStoresResult>({
      kind: SemanticAppQueryKind.StateStores,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readStateStoreRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} @aurelia/state store configuration row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  stateIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticStateIssuesResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticStateIssuesResult>({
      kind: SemanticAppQueryKind.StateIssues,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readStateIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} @aurelia/state issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  i18nTranslationKeys(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticI18nTranslationKeysResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticI18nTranslationKeysResult>({
      kind: SemanticAppQueryKind.I18nTranslationKeys,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readI18nTranslationKeyRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} static i18n translation key row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  i18nTranslationBindings(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticI18nTranslationBindingsResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticI18nTranslationBindingsResult>({
      kind: SemanticAppQueryKind.I18nTranslationBindings,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readI18nTranslationBindingRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} rendered i18n translation binding row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  validationIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticValidationIssuesResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticValidationIssuesResult>({
      kind: SemanticAppQueryKind.ValidationIssues,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readValidationIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} @aurelia/validation issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  fetchClientIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticFetchClientIssuesResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticFetchClientIssuesResult>({
      kind: SemanticAppQueryKind.FetchClientIssues,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readFetchClientIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} @aurelia/fetch-client issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  dialogIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticDialogIssuesResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticDialogIssuesResult>({
      kind: SemanticAppQueryKind.DialogIssues,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readDialogIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} @aurelia/dialog issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  resourceDefinitions(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticResourceDefinitionsResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticResourceDefinitionsResult>({
      kind: SemanticAppQueryKind.ResourceDefinitions,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readResourceDefinitionRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} recognized resource definition row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  resourceIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticResourceIssuesResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticResourceIssuesResult>({
      kind: SemanticAppQueryKind.ResourceIssues,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readResourceIssueRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} resource metadata issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  resourceVisibility(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticResourceVisibilityResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticResourceVisibilityResult>({
      kind: SemanticAppQueryKind.ResourceVisibility,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const handles = includeHandles(detail);
    const rows = this.emission.templates.compilerWorlds
      .flatMap((compilerWorld): readonly SemanticResourceVisibilityRow[] =>
        [
          ...compilerWorld.resourceScope.resources,
          ...compilerWorld.resourceScope.syntaxResources,
        ].map((resource) => ({
          compilerWorld: compilerWorldLabel(this.runtime.workspace.store, compilerWorld),
          resourceKind: resource.resourceKind,
          name: resource.name,
          aliases: resource.aliases,
          visibilityKind: resource.visibilityKind,
          source: describeAddress(this.runtime.workspace.store, resource.sourceAddressHandle),
          ...(handles ? {
            handles: {
              compilerWorldProductHandle: compilerWorld.world.productHandle,
              resourceProductHandle: resource.resourceProductHandle,
              definitionProductHandle: resource.definitionProductHandle,
              sourceAddressHandle: resource.sourceAddressHandle,
            },
          } : {}),
        }))
      )
      .sort((left, right) =>
        `${left.resourceKind}:${left.name}:${left.compilerWorld}`
          .localeCompare(`${right.resourceKind}:${right.name}:${right.compilerWorld}`)
      );
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} compiler-visible resource row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  runtimeControllers(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRuntimeControllerResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticRuntimeControllerResult>({
      kind: SemanticAppQueryKind.RuntimeControllers,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readRuntimeControllerRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime controller hydration row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  runtimeWatchers(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRuntimeWatcherResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticRuntimeWatcherResult>({
      kind: SemanticAppQueryKind.RuntimeWatchers,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readRuntimeWatcherRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime watcher row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  runtimeWatcherObservedDependencies(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRuntimeWatcherObservedDependencyResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticRuntimeWatcherObservedDependencyResult>({
      kind: SemanticAppQueryKind.RuntimeWatcherObservedDependencies,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const rows = readRuntimeWatcherObservedDependencyRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime watcher observed-dependency row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  runtimeCompositions(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRuntimeCompositionResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticRuntimeCompositionResult>({
      kind: SemanticAppQueryKind.RuntimeCompositions,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingObservation,
      'runtime composition rows',
      { rows: [] } satisfies SemanticRuntimeCompositionResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const rows = readRuntimeCompositionRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime composition row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  bindingTargetAccesses(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingTargetAccessResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticBindingTargetAccessResult>({
      kind: SemanticAppQueryKind.BindingTargetAccesses,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingTargets,
      'runtime binding target-access rows',
      { rows: [] } satisfies SemanticBindingTargetAccessResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const rows = readBindingTargetAccessRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime binding target-access row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  targetOperations(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticTargetOperationResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticTargetOperationResult>({
      kind: SemanticAppQueryKind.TargetOperations,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingTargets,
      'combined runtime target-operation rows',
      { rows: [] } satisfies SemanticTargetOperationResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const rows = readTargetOperationRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime target-operation row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  bindingTargetOperations(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingTargetOperationResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticBindingTargetOperationResult>({
      kind: SemanticAppQueryKind.BindingTargetOperations,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    return this.targetOperations(page, detail);
  }

  bindingSourceOperations(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingSourceOperationResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticBindingSourceOperationResult>({
      kind: SemanticAppQueryKind.BindingSourceOperations,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingTargets,
      'runtime binding source-operation rows',
      { rows: [] } satisfies SemanticBindingSourceOperationResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const rows = readBindingSourceOperationRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime binding source-operation row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  bindingBehaviorApplications(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingBehaviorApplicationResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticBindingBehaviorApplicationResult>({
      kind: SemanticAppQueryKind.BindingBehaviorApplications,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingTargets,
      'runtime binding-behavior application rows',
      { rows: [] } satisfies SemanticBindingBehaviorApplicationResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const rows = readBindingBehaviorApplicationRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime binding-behavior application row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  bindingValueChannels(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingValueChannelResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticBindingValueChannelResult>({
      kind: SemanticAppQueryKind.BindingValueChannels,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingObservation,
      'runtime binding value-channel rows',
      { rows: [] } satisfies SemanticBindingValueChannelResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const rows = readBindingValueChannelRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime binding value-channel row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  bindingValueChannelSummary(
    page?: SemanticRuntimePageInput,
  ): SemanticRuntimeAnswer<SemanticBindingValueChannelSummaryResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticBindingValueChannelSummaryResult>({
      kind: SemanticAppQueryKind.BindingValueChannelSummary,
      page,
    });
    if (claimed != null) {
      return claimed;
    }
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingObservation,
      'runtime binding value-channel summary rows',
      {
        displayText: 'Binding value-channel summary requires analysisDepth=\'binding-observation\'.',
        totalRows: 0,
        summaryRows: 0,
        observerCouplingRows: 0,
        channelsWithoutObserverCouplings: 0,
        rows: [],
        observerCouplings: [],
      } satisfies SemanticBindingValueChannelSummaryResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const summary = readBindingValueChannelSummary(this.emission, this.runtime.workspace.store);
    const paged = pageRows(summary.rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${summary.summaryRows} runtime binding value-channel summary row(s) over ${summary.totalRows} value-channel row(s).`,
      { ...summary, rows: paged.rows },
      paged.page,
    );
  }

  bindingDataFlows(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingDataFlowResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticBindingDataFlowResult>({
      kind: SemanticAppQueryKind.BindingDataFlows,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingObservation,
      'runtime binding data-flow rows',
      { rows: [] } satisfies SemanticBindingDataFlowResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const rows = readBindingDataFlowRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime binding data-flow row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  bindingDataFlowSummary(
    page?: SemanticRuntimePageInput,
  ): SemanticRuntimeAnswer<SemanticBindingDataFlowSummaryResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticBindingDataFlowSummaryResult>({
      kind: SemanticAppQueryKind.BindingDataFlowSummary,
      page,
    });
    if (claimed != null) {
      return claimed;
    }
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingObservation,
      'runtime binding data-flow summary rows',
      {
        displayText: 'Binding data-flow summary requires analysisDepth=\'binding-observation\'.',
        totalRows: 0,
        summaryRows: 0,
        issueRows: [],
        rows: [],
      } satisfies SemanticBindingDataFlowSummaryResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const summary = readBindingDataFlowSummary(this.emission, this.runtime.workspace.store);
    const paged = pageRows(summary.rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${summary.summaryRows} runtime binding data-flow summary row(s) over ${summary.totalRows} data-flow row(s), with ${summary.issueRows.length} issue summary row(s).`,
      { ...summary, rows: paged.rows },
      paged.page,
    );
  }

  bindingObservedDependencies(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticBindingObservedDependencyResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticBindingObservedDependencyResult>({
      kind: SemanticAppQueryKind.BindingObservedDependencies,
      page,
      detail,
    });
    if (claimed != null) {
      return claimed;
    }
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingObservation,
      'runtime binding observed-dependency rows',
      { rows: [] } satisfies SemanticBindingObservedDependencyResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const rows = readBindingObservedDependencyRows(this.emission, this.runtime.workspace.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime binding observed-dependency row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  bindingObservedDependencySummary(
    page?: SemanticRuntimePageInput,
  ): SemanticRuntimeAnswer<SemanticBindingObservedDependencySummaryResult> {
    const claimed = this.answerPublicQueryIfNeeded<SemanticBindingObservedDependencySummaryResult>({
      kind: SemanticAppQueryKind.BindingObservedDependencySummary,
      page,
    });
    if (claimed != null) {
      return claimed;
    }
    const unsupported = this.requireAnalysisDepth(
      SemanticAppAnalysisDepth.BindingObservation,
      'runtime binding observed-dependency summary rows',
      {
        displayText: 'Binding observed-dependency summary requires analysisDepth=\'binding-observation\'.',
        totalRows: 0,
        summaryRows: 0,
        memberSourceStateRows: [],
        rows: [],
      } satisfies SemanticBindingObservedDependencySummaryResult,
    );
    if (unsupported != null) {
      return unsupported;
    }
    const summary = readBindingObservedDependencySummary(this.emission, this.runtime.workspace.store);
    const paged = pageRows(summary.rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${summary.summaryRows} runtime binding observed-dependency summary row(s) over ${summary.totalRows} observed-dependency row(s), with ${summary.memberSourceStateRows.length} member-source-state summary row(s).`,
      { ...summary, rows: paged.rows },
      paged.page,
    );
  }

  private requireAnalysisDepth<TValue>(
    requiredDepth: SemanticAppAnalysisDepth,
    label: string,
    value: TValue,
  ): SemanticRuntimeAnswer<TValue> | null {
    if (semanticAppAnalysisDepthSatisfies(this.emission.analysisDepth, requiredDepth)) {
      return null;
    }
    return answer(
      SemanticRuntimeAnswerOutcome.Unsupported,
      `${label} require analysisDepth='${requiredDepth}', but this app was opened with analysisDepth='${this.emission.analysisDepth}'.`,
      value,
    );
  }
}

interface SemanticAppCacheRequest {
  readonly analysisDepth: SemanticAppAnalysisDepth;
  readonly includeAuthoringTemplates: boolean;
  readonly authoringTemplateSourceFileCount: number;
  readonly authoringTemplateLimit: number | null;
  readonly kernelMarker: KernelStoreMarker;
}

function earliestKernelMarker(
  markers: readonly KernelStoreMarker[],
): KernelStoreMarker {
  if (markers.length === 0) {
    throw new Error('Cannot select earliest kernel marker from an empty marker list.');
  }
  return markers.reduce((earliest, marker) =>
    marker.records < earliest.records
      ? marker
      : earliest
  );
}

function describeKernelDisposal(
  disposal: KernelStoreDisposalSummary,
): string {
  return `${disposal.records} kernel record(s), ${disposal.productDetails} product detail(s), ` +
    `${disposal.hotDetails} hot detail(s), and ${disposal.handleCharacters} handle character(s)`;
}

function projectCompilerOptionsCacheSummary(): SemanticRuntimeProjectCompilerOptionsCacheSummary {
  const cache = readProjectCompilerOptionsCacheOverview();
  return {
    entries: cache.entries,
    hits: cache.hits,
    misses: cache.misses,
    writes: cache.writes,
    clearOperations: cache.clearOperations,
    clearedEntries: cache.clearedEntries,
    pathMappingCount: cache.pathMappingCount,
    pathMappingTargetCount: cache.pathMappingTargetCount,
    configDiagnosticCount: cache.configDiagnosticCount,
    configRootFileCount: cache.configRootFileCount,
    cacheScope: 'process',
    counterScope: 'process-lifetime',
    cachedValuePolicy: 'compiler-options-by-project-root',
    summary:
      `Project compiler-options cache retains ${cache.entries} project-root option shape(s) ` +
      `with ${cache.pathMappingCount} path mapping(s) and ${cache.pathMappingTargetCount} target(s); ` +
      `cached config diagnostics=${cache.configDiagnosticCount}; config root files=${cache.configRootFileCount}; ` +
      `lifetime counters are ${cache.hits} hit(s), ${cache.misses} miss(es), ${cache.writes} write(s), ` +
      `${cache.clearOperations} clear operation(s), and ${cache.clearedEntries} cleared entry(s).`,
  };
}

function typeSystemDependencyCacheSummary(
  rowLimit = 0,
  includeLargestEntries = false,
): SemanticRuntimeTypeSystemDependencyCacheSummary {
  const cache = readTypeSystemCompilerHostSourceFileCacheOverview(includeLargestEntries ? rowLimit : 0);
  const clearSuggestion = typeSystemDependencyCacheClearSuggestion(cache);
  return {
    entries: cache.entries,
    distinctCanonicalPaths: cache.distinctCanonicalPaths,
    duplicateCanonicalPathEntries: cache.duplicateCanonicalPathEntries,
    sourceTextCharacters: cache.sourceTextCharacters,
    nodeModuleEntries: cache.nodeModuleEntries,
    nodeModuleSourceTextCharacters: cache.nodeModuleSourceTextCharacters,
    declarationEntries: cache.declarationEntries,
    declarationSourceTextCharacters: cache.declarationSourceTextCharacters,
    defaultLibraryEntries: cache.defaultLibraryEntries,
    defaultLibrarySourceTextCharacters: cache.defaultLibrarySourceTextCharacters,
    externalDeclarationEntries: cache.externalDeclarationEntries,
    externalDeclarationSourceTextCharacters: cache.externalDeclarationSourceTextCharacters,
    parseOptions: cache.parseOptions,
    duplicateParseOptionSets: cache.duplicateParseOptionSets,
    hits: cache.hits,
    hitSourceTextCharacters: cache.hitSourceTextCharacters,
    misses: cache.misses,
    writes: cache.writes,
    writeSourceTextCharacters: cache.writeSourceTextCharacters,
    bypasses: cache.bypasses,
    cacheableNodeModuleReads: cache.cacheableNodeModuleReads,
    cacheableExternalDeclarationReads: cache.cacheableExternalDeclarationReads,
    bypassFreshSourceFileReads: cache.bypassFreshSourceFileReads,
    bypassProjectSourceReads: cache.bypassProjectSourceReads,
    bypassExternalSourceReads: cache.bypassExternalSourceReads,
    clearOperations: cache.clearOperations,
    clearedEntries: cache.clearedEntries,
    clearedSourceTextCharacters: cache.clearedSourceTextCharacters,
    clearedNodeModuleEntries: cache.clearedNodeModuleEntries,
    clearedNodeModuleSourceTextCharacters: cache.clearedNodeModuleSourceTextCharacters,
    clearedDeclarationEntries: cache.clearedDeclarationEntries,
    clearedDeclarationSourceTextCharacters: cache.clearedDeclarationSourceTextCharacters,
    clearedDefaultLibraryEntries: cache.clearedDefaultLibraryEntries,
    clearedDefaultLibrarySourceTextCharacters: cache.clearedDefaultLibrarySourceTextCharacters,
    clearedExternalDeclarationEntries: cache.clearedExternalDeclarationEntries,
    clearedExternalDeclarationSourceTextCharacters: cache.clearedExternalDeclarationSourceTextCharacters,
    lastClearPolicy: cache.lastClearPolicy,
    cacheScope: 'process',
    counterScope: 'process-lifetime',
    cachedSourcePolicy: 'dependency-and-library-files',
    clearPolicies: SEMANTIC_TYPE_SYSTEM_DEPENDENCY_CACHE_CLEAR_POLICIES,
    dominantSourceTextBucket: clearSuggestion.bucket,
    suggestedClearPolicy: clearSuggestion.policy,
    suggestedClearSourceTextCharacters: clearSuggestion.sourceTextCharacters,
    largestEntries: cache.largestEntries,
    clearAction: 'clear-analysis-cache-type-system-dependency-cache-clear-policy',
    summary:
      `TypeSystemProject dependency source-file cache retains ${cache.entries} process-local source file(s) ` +
      `across ${cache.distinctCanonicalPaths} canonical path(s) with ${cache.sourceTextCharacters} source-text character(s); ` +
      `lifetime counters are ${cache.hits} hit(s), ${cache.misses} miss(es), ${cache.writes} write(s), ` +
      `${cache.hitSourceTextCharacters} hit source-text character(s), ${cache.writeSourceTextCharacters} write source-text character(s), ` +
      `${cache.bypasses} bypass(es), ${cache.clearOperations} clear operation(s), ` +
      `${cache.clearedEntries} cleared source file(s), and ${cache.duplicateCanonicalPathEntries} duplicate parse-option entry(s). ` +
      `Suggested clear policy is '${clearSuggestion.policy}' from bucket '${clearSuggestion.bucket}'.`,
  };
}

function typeSystemDependencyCacheClearResultFields(
  cleared: TypeSystemCompilerHostSourceFileCacheClearSummary,
): Pick<
  SemanticRuntimeAnalysisCacheClearResult,
  | 'clearedTypeSystemDependencySourceFiles'
  | 'clearedTypeSystemDependencySourceTextCharacters'
  | 'clearedTypeSystemDependencyNodeModuleSourceFiles'
  | 'clearedTypeSystemDependencyNodeModuleSourceTextCharacters'
  | 'clearedTypeSystemDependencyDeclarationSourceFiles'
  | 'clearedTypeSystemDependencyDeclarationSourceTextCharacters'
  | 'clearedTypeSystemDependencyDefaultLibrarySourceFiles'
  | 'clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters'
  | 'clearedTypeSystemDependencyExternalDeclarationSourceFiles'
  | 'clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters'
> {
  return {
    clearedTypeSystemDependencySourceFiles: cleared.entries,
    clearedTypeSystemDependencySourceTextCharacters: cleared.sourceTextCharacters,
    clearedTypeSystemDependencyNodeModuleSourceFiles: cleared.nodeModuleEntries,
    clearedTypeSystemDependencyNodeModuleSourceTextCharacters: cleared.nodeModuleSourceTextCharacters,
    clearedTypeSystemDependencyDeclarationSourceFiles: cleared.declarationEntries,
    clearedTypeSystemDependencyDeclarationSourceTextCharacters: cleared.declarationSourceTextCharacters,
    clearedTypeSystemDependencyDefaultLibrarySourceFiles: cleared.defaultLibraryEntries,
    clearedTypeSystemDependencyDefaultLibrarySourceTextCharacters: cleared.defaultLibrarySourceTextCharacters,
    clearedTypeSystemDependencyExternalDeclarationSourceFiles: cleared.externalDeclarationEntries,
    clearedTypeSystemDependencyExternalDeclarationSourceTextCharacters: cleared.externalDeclarationSourceTextCharacters,
  };
}

function typeSystemDependencyCacheClearSuggestion(cache: {
  readonly entries: number;
  readonly nodeModuleSourceTextCharacters: number;
  readonly defaultLibrarySourceTextCharacters: number;
  readonly externalDeclarationSourceTextCharacters: number;
}): {
  readonly bucket: SemanticTypeSystemDependencyCacheSourceBucket;
  readonly policy: SemanticTypeSystemDependencyCacheClearPolicy;
  readonly sourceTextCharacters: number;
} {
  if (cache.entries === 0) {
    return {
      bucket: 'none',
      policy: 'preserve',
      sourceTextCharacters: 0,
    };
  }
  const nonDefaultNodeModuleCharacters = Math.max(
    0,
    cache.nodeModuleSourceTextCharacters - cache.defaultLibrarySourceTextCharacters,
  );
  const buckets: readonly {
    readonly bucket: SemanticTypeSystemDependencyCacheSourceBucket;
    readonly policy: SemanticTypeSystemDependencyCacheClearPolicy;
    readonly sourceTextCharacters: number;
  }[] = [
    {
      bucket: 'default-libraries',
      policy: 'default-libraries',
      sourceTextCharacters: cache.defaultLibrarySourceTextCharacters,
    },
    {
      bucket: 'external-declarations',
      policy: 'external-declarations',
      sourceTextCharacters: cache.externalDeclarationSourceTextCharacters,
    },
    {
      bucket: 'node-modules',
      policy: 'node-modules',
      sourceTextCharacters: nonDefaultNodeModuleCharacters,
    },
  ];
  const largest = buckets.reduce((selected, candidate) =>
    candidate.sourceTextCharacters > selected.sourceTextCharacters ? candidate : selected
  );
  return largest.sourceTextCharacters === 0
    ? {
      bucket: 'none',
      policy: 'preserve',
      sourceTextCharacters: 0,
    }
    : largest;
}

function normalizeTypeSystemDependencyCacheClearPolicy(
  value: SemanticTypeSystemDependencyCacheClearPolicy | string | null | undefined,
): SemanticTypeSystemDependencyCacheClearPolicy {
  return SEMANTIC_TYPE_SYSTEM_DEPENDENCY_CACHE_CLEAR_POLICIES.includes(value as SemanticTypeSystemDependencyCacheClearPolicy)
    ? value as SemanticTypeSystemDependencyCacheClearPolicy
    : 'preserve';
}

function normalizeCacheOverviewRowLimit(value: number | null | undefined): number {
  if (value == null) {
    return 8;
  }
  if (!Number.isFinite(value)) {
    return 8;
  }
  return Math.max(0, Math.floor(value));
}

function trimTypeSystemProgramSourceFileGroups(
  rows: readonly SemanticRuntimeTypeSystemProgramSourceFileGroupStats[],
  rowLimit: number,
): readonly SemanticRuntimeTypeSystemProgramSourceFileGroupStats[] {
  return rowLimit <= 0 ? [] : rows.slice(0, rowLimit);
}

function trimKernelDensitySnapshot(
  snapshot: SemanticRuntimeKernelCountSnapshot | SemanticRuntimeKernelDensitySnapshot,
  rowLimit: number,
): SemanticRuntimeKernelCountSnapshot | SemanticRuntimeKernelDensitySnapshot {
  if (!('recordKinds' in snapshot)) {
    return snapshot;
  }
  return {
    ...snapshot,
    recordKinds: trimCountRows(snapshot.recordKinds, rowLimit),
    addressKinds: trimCountRows(snapshot.addressKinds, rowLimit),
    sourceSpanRoles: trimCountRows(snapshot.sourceSpanRoles, rowLimit),
    sourceFileRoles: trimCountRows(snapshot.sourceFileRoles, rowLimit),
    identityKinds: trimCountRows(snapshot.identityKinds, rowLimit),
    productKinds: trimCountRows(snapshot.productKinds, rowLimit),
    productDetailKinds: trimCountRows(snapshot.productDetailKinds, rowLimit),
    hotDetailKinds: trimCountRows(snapshot.hotDetailKinds, rowLimit),
    claimPredicates: trimCountRows(snapshot.claimPredicates, rowLimit),
    openSeamKinds: trimCountRows(snapshot.openSeamKinds, rowLimit),
    recordKindHandleCharacters: trimCountRows(snapshot.recordKindHandleCharacters, rowLimit),
    productKindHandleCharacters: trimCountRows(snapshot.productKindHandleCharacters, rowLimit),
    sourceSpanRoleHandleCharacters: trimCountRows(snapshot.sourceSpanRoleHandleCharacters, rowLimit),
    sidecarIndexes: rowLimit === 0 ? [] : snapshot.sidecarIndexes.slice(0, rowLimit),
    ...(snapshot.productDetailDensity == null
      ? {}
      : { productDetailDensity: trimDetailDensityRows(snapshot.productDetailDensity, rowLimit) }),
    ...(snapshot.hotDetailDensity == null
      ? {}
      : { hotDetailDensity: trimDetailDensityRows(snapshot.hotDetailDensity, rowLimit) }),
  };
}

function trimCountRows(
  rows: readonly SemanticRuntimeCountRow[],
  rowLimit: number,
): readonly SemanticRuntimeCountRow[] {
  return rowLimit === 0 ? [] : rows.slice(0, rowLimit);
}

function trimDetailDensityRows(
  rows: readonly SemanticRuntimeDetailDensityRow[],
  rowLimit: number,
): readonly SemanticRuntimeDetailDensityRow[] {
  if (rowLimit === 0) {
    return [];
  }
  return rows.slice(0, rowLimit).map((row) => ({
    ...row,
    objectKinds: trimCountRows(row.objectKinds, rowLimit),
    constructors: trimCountRows(row.constructors, rowLimit),
    directArrayFields: trimCountRows(row.directArrayFields, rowLimit),
    directStringFields: trimCountRows(row.directStringFields, rowLimit),
    directNonHandleStringFields: trimCountRows(row.directNonHandleStringFields, rowLimit),
    directKernelHandleFields: trimCountRows(row.directKernelHandleFields, rowLimit),
    directKernelHandleKinds: trimCountRows(row.directKernelHandleKinds, rowLimit),
    directKernelHandleKindCharacters: trimCountRows(row.directKernelHandleKindCharacters, rowLimit),
    directNonEnvelopeKernelHandleFields: trimCountRows(row.directNonEnvelopeKernelHandleFields, rowLimit),
    directNonEnvelopeKernelHandleKinds: trimCountRows(row.directNonEnvelopeKernelHandleKinds, rowLimit),
    directNonEnvelopeKernelHandleKindCharacters: trimCountRows(row.directNonEnvelopeKernelHandleKindCharacters, rowLimit),
    directEnvelopeHandleEchoFields: trimCountRows(row.directEnvelopeHandleEchoFields, rowLimit),
    directEnvelopeHandleEchoKinds: trimCountRows(row.directEnvelopeHandleEchoKinds, rowLimit),
    directEnvelopeHandleEchoKindCharacters: trimCountRows(row.directEnvelopeHandleEchoKindCharacters, rowLimit),
    directLocalKeyFields: trimCountRows(row.directLocalKeyFields, rowLimit),
  }));
}

function queryClaimRowsForCacheOverview(
  queryClaims: QueryClaimGraph,
  rowLimit: number,
  includeRows: boolean,
): Pick<SemanticRuntimeCachedAppQueryClaimProfileSummary, 'queryClaimRows'> | {} {
  if (!includeRows) {
    return {};
  }
  if (rowLimit === 0) {
    return { queryClaimRows: [] };
  }
  return {
    queryClaimRows: queryClaims.readRecentRecords(rowLimit),
  };
}

interface SemanticRuntimePhaseTimingLike {
  readonly name: string;
  readonly milliseconds: number;
  readonly itemCount?: number;
  readonly memory?: {
    readonly delta: SemanticRuntimeMemoryDelta;
  };
  readonly kernel?: SemanticRuntimePhaseKernelLike;
}

type SemanticRuntimePhaseKernelLike =
  | {
    readonly before: SemanticRuntimeKernelCountSnapshot | SemanticRuntimeKernelDensitySnapshot;
    readonly after: SemanticRuntimeKernelCountSnapshot | SemanticRuntimeKernelDensitySnapshot;
    readonly delta: SemanticRuntimeKernelCountSnapshot;
    readonly recordKinds?: readonly SemanticRuntimeCountRow[];
    readonly sourceSpanRoles?: readonly SemanticRuntimeCountRow[];
    readonly productKinds?: readonly SemanticRuntimeCountRow[];
    readonly productDetailKinds?: readonly SemanticRuntimeCountRow[];
    readonly hotDetailKinds?: readonly SemanticRuntimeCountRow[];
    readonly productDetailDensityDelta?: readonly SemanticRuntimeDetailDensityRow[];
    readonly hotDetailDensityDelta?: readonly SemanticRuntimeDetailDensityRow[];
  }
  | SemanticRuntimeAggregatedPhaseKernel;

function semanticRuntimePhaseTimingSummaries(
  phases: readonly SemanticRuntimePhaseTimingLike[],
  rowLimit: number,
): readonly SemanticRuntimePhaseTimingSummary[] {
  return phases
    .map((phase): SemanticRuntimePhaseTimingSummary => ({
      name: phase.name,
      milliseconds: roundMilliseconds(phase.milliseconds),
      ...(phase.itemCount == null ? {} : { itemCount: phase.itemCount }),
      ...(phase.memory?.delta == null ? {} : { memory: phase.memory.delta }),
      ...(phase.kernel?.delta == null ? {} : { kernel: semanticRuntimePhaseKernelSummary(phase, rowLimit) }),
    }))
    .sort((left, right) => right.milliseconds - left.milliseconds || left.name.localeCompare(right.name))
    .slice(0, rowLimit);
}

function semanticRuntimeAggregatedPhaseTimingSummaries(
  phases: readonly SemanticRuntimePhaseTimingLike[],
  rowLimit: number,
): readonly SemanticRuntimePhaseTimingSummary[] {
  const totals = new Map<string, {
    name: string;
    milliseconds: number;
    itemCount: number;
    memory?: { delta: SemanticRuntimeMemoryDelta };
    kernel?: SemanticRuntimeAggregatedPhaseKernel;
  }>();
  for (const phase of phases) {
    const total = totals.get(phase.name) ?? {
      name: phase.name,
      milliseconds: 0,
      itemCount: 0,
    };
    total.milliseconds += phase.milliseconds;
    total.itemCount += phase.itemCount ?? 1;
    if (phase.memory?.delta != null) {
      total.memory = { delta: sumSemanticRuntimeMemoryDeltas(total.memory?.delta ?? null, phase.memory.delta) };
    }
    if (phase.kernel?.delta != null) {
      total.kernel = addSemanticRuntimeAggregatedPhaseKernel(total.kernel ?? null, phase, rowLimit);
    }
    totals.set(phase.name, total);
  }
  return semanticRuntimePhaseTimingSummaries([...totals.values()], rowLimit);
}

function semanticRuntimeTemplateRuntimePhaseTimingSummaries(
  emission: AureliaAppWorldProjectEmission,
  rowLimit: number,
): readonly SemanticRuntimePhaseTimingSummary[] {
  const totals = new Map<string, {
    name: string;
    milliseconds: number;
    itemCount: number;
    memory?: { delta: SemanticRuntimeMemoryDelta };
    kernel?: SemanticRuntimeAggregatedPhaseKernel;
  }>();
  for (const resource of [
    ...emission.templates.resources,
    ...emission.templates.authoringResources,
  ]) {
    for (const phase of resource.runtimeAnalysis.profile.phases) {
      const total = totals.get(phase.name) ?? {
        name: phase.name,
        milliseconds: 0,
        itemCount: 0,
      };
      total.milliseconds += phase.milliseconds;
      total.itemCount += 1;
      if (phase.memory?.delta != null) {
        total.memory = { delta: sumSemanticRuntimeMemoryDeltas(total.memory?.delta ?? null, phase.memory.delta) };
      }
      if (phase.kernel?.delta != null) {
        total.kernel = addSemanticRuntimeAggregatedPhaseKernel(total.kernel ?? null, phase, rowLimit);
      }
      totals.set(phase.name, total);
    }
  }
  return semanticRuntimePhaseTimingSummaries([...totals.values()], rowLimit);
}

interface SemanticRuntimeAggregatedPhaseKernel {
  delta: SemanticRuntimeKernelCountSnapshot;
  readonly recordKinds: Map<string, number>;
  readonly productKinds: Map<string, number>;
  readonly productDetailKinds: Map<string, number>;
  readonly hotDetailKinds: Map<string, number>;
  readonly sourceSpanRoles: Map<string, number>;
  readonly productDetailDensity: Map<string, SemanticRuntimeDetailDensityRow>;
  readonly hotDetailDensity: Map<string, SemanticRuntimeDetailDensityRow>;
}

function addSemanticRuntimeAggregatedPhaseKernel(
  current: SemanticRuntimeAggregatedPhaseKernel | null,
  phase: SemanticRuntimePhaseTimingLike,
  rowLimit: number,
): SemanticRuntimeAggregatedPhaseKernel {
  const kernel = phase.kernel;
  if (kernel == null) {
    throw new Error('Cannot aggregate phase kernel without kernel profile.');
  }
  const aggregate = current ?? {
    delta: emptySemanticRuntimeKernelCountSnapshot(),
    recordKinds: new Map<string, number>(),
    productKinds: new Map<string, number>(),
    productDetailKinds: new Map<string, number>(),
    hotDetailKinds: new Map<string, number>(),
    sourceSpanRoles: new Map<string, number>(),
    productDetailDensity: new Map<string, SemanticRuntimeDetailDensityRow>(),
    hotDetailDensity: new Map<string, SemanticRuntimeDetailDensityRow>(),
  };
  aggregate.delta = sumSemanticRuntimeKernelCountSnapshots(aggregate.delta, kernel.delta);
  if (rowLimit > 0) {
    addSemanticRuntimeCountRows(aggregate.recordKinds, phaseKernelDiffRows(phase, 'recordKinds'));
    addSemanticRuntimeCountRows(aggregate.productKinds, phaseKernelDiffRows(phase, 'productKinds'));
    addSemanticRuntimeCountRows(aggregate.productDetailKinds, phaseKernelDiffRows(phase, 'productDetailKinds'));
    addSemanticRuntimeCountRows(aggregate.hotDetailKinds, phaseKernelDiffRows(phase, 'hotDetailKinds'));
    addSemanticRuntimeCountRows(aggregate.sourceSpanRoles, phaseKernelDiffRows(phase, 'sourceSpanRoles'));
    addSemanticRuntimeDetailDensityRows(aggregate.productDetailDensity, phaseKernelDetailDensityRows(phase, 'productDetailDensity'));
    addSemanticRuntimeDetailDensityRows(aggregate.hotDetailDensity, phaseKernelDetailDensityRows(phase, 'hotDetailDensity'));
  }
  return aggregate;
}

function semanticRuntimePhaseKernelSummary(
  phase: SemanticRuntimePhaseTimingLike,
  rowLimit: number,
): NonNullable<SemanticRuntimePhaseTimingSummary['kernel']> {
  const kernel = phase.kernel;
  if (kernel == null) {
    throw new Error('Cannot summarize phase kernel without kernel profile.');
  }
  if (isSemanticRuntimeAggregatedPhaseKernel(kernel)) {
    return {
      ...kernel.delta,
      ...countRowSummary('recordKinds', kernel.recordKinds, rowLimit),
      ...countRowSummary('productKinds', kernel.productKinds, rowLimit),
      ...countRowSummary('productDetailKinds', kernel.productDetailKinds, rowLimit),
      ...countRowSummary('hotDetailKinds', kernel.hotDetailKinds, rowLimit),
      ...countRowSummary('sourceSpanRoles', kernel.sourceSpanRoles, rowLimit),
      ...detailDensitySummary('productDetailDensity', kernel.productDetailDensity, rowLimit),
      ...detailDensitySummary('hotDetailDensity', kernel.hotDetailDensity, rowLimit),
    };
  }
  return {
    ...kernel.delta,
    ...countRowsWhenPresent('recordKinds', phaseKernelDiffRows(phase, 'recordKinds'), rowLimit),
    ...countRowsWhenPresent('productKinds', phaseKernelDiffRows(phase, 'productKinds'), rowLimit),
    ...countRowsWhenPresent('productDetailKinds', phaseKernelDiffRows(phase, 'productDetailKinds'), rowLimit),
    ...countRowsWhenPresent('hotDetailKinds', phaseKernelDiffRows(phase, 'hotDetailKinds'), rowLimit),
    ...countRowsWhenPresent('sourceSpanRoles', phaseKernelDiffRows(phase, 'sourceSpanRoles'), rowLimit),
    ...detailDensityRowsWhenPresent('productDetailDensity', phaseKernelDetailDensityRows(phase, 'productDetailDensity'), rowLimit),
    ...detailDensityRowsWhenPresent('hotDetailDensity', phaseKernelDetailDensityRows(phase, 'hotDetailDensity'), rowLimit),
  };
}

function isSemanticRuntimeAggregatedPhaseKernel(
  kernel: SemanticRuntimePhaseKernelLike | null | undefined,
): kernel is SemanticRuntimeAggregatedPhaseKernel {
  return kernel != null && 'recordKinds' in kernel && kernel.recordKinds instanceof Map;
}

function phaseKernelDiffRows(
  phase: SemanticRuntimePhaseTimingLike,
  field: 'recordKinds' | 'productKinds' | 'productDetailKinds' | 'hotDetailKinds' | 'sourceSpanRoles',
): readonly SemanticRuntimeCountRow[] {
  const kernel = phase.kernel;
  if (kernel != null && !isSemanticRuntimeAggregatedPhaseKernel(kernel) && Array.isArray(kernel[field])) {
    return kernel[field];
  }
  if (
    kernel == null
    || isSemanticRuntimeAggregatedPhaseKernel(kernel)
    || !isSemanticRuntimeKernelDensitySnapshot(kernel.before)
    || !isSemanticRuntimeKernelDensitySnapshot(kernel.after)
  ) {
    return [];
  }
  return diffSemanticRuntimeCountRows(kernel.after[field], kernel.before[field]);
}

function phaseKernelDetailDensityRows(
  phase: SemanticRuntimePhaseTimingLike,
  field: 'productDetailDensity' | 'hotDetailDensity',
): readonly SemanticRuntimeDetailDensityRow[] {
  const kernel = phase.kernel;
  if (
    kernel == null
    || isSemanticRuntimeAggregatedPhaseKernel(kernel)
    || !isSemanticRuntimeKernelDensitySnapshot(kernel.before)
    || !isSemanticRuntimeKernelDensitySnapshot(kernel.after)
  ) {
    if (
      kernel != null
      && !isSemanticRuntimeAggregatedPhaseKernel(kernel)
    ) {
      return field === 'productDetailDensity'
        ? kernel.productDetailDensityDelta ?? []
        : kernel.hotDetailDensityDelta ?? [];
    }
    return [];
  }
  const deltaRows = field === 'productDetailDensity'
    ? kernel.productDetailDensityDelta
    : kernel.hotDetailDensityDelta;
  return deltaRows ?? diffSemanticRuntimeDetailDensityRows(kernel.after[field], kernel.before[field]);
}

function isSemanticRuntimeKernelDensitySnapshot(
  snapshot: SemanticRuntimeKernelCountSnapshot | SemanticRuntimeKernelDensitySnapshot,
): snapshot is SemanticRuntimeKernelDensitySnapshot {
  return 'recordKinds' in snapshot;
}

function countRowsWhenPresent<TKey extends 'recordKinds' | 'productKinds' | 'productDetailKinds' | 'hotDetailKinds' | 'sourceSpanRoles'>(
  key: TKey,
  rows: readonly SemanticRuntimeCountRow[],
  rowLimit: number,
): Pick<NonNullable<SemanticRuntimePhaseTimingSummary['kernel']>, TKey> | {} {
  const trimmed = trimCountRows(rows, rowLimit);
  return trimmed.length === 0 ? {} : { [key]: trimmed } as Pick<NonNullable<SemanticRuntimePhaseTimingSummary['kernel']>, TKey>;
}

function countRowSummary<TKey extends 'recordKinds' | 'productKinds' | 'productDetailKinds' | 'hotDetailKinds' | 'sourceSpanRoles'>(
  key: TKey,
  rows: ReadonlyMap<string, number>,
  rowLimit: number,
): Pick<NonNullable<SemanticRuntimePhaseTimingSummary['kernel']>, TKey> | {} {
  return countRowsWhenPresent(key, sortedSemanticRuntimeCountRows(rows), rowLimit);
}

function detailDensityRowsWhenPresent<TKey extends 'productDetailDensity' | 'hotDetailDensity'>(
  key: TKey,
  rows: readonly SemanticRuntimeDetailDensityRow[],
  rowLimit: number,
): Pick<NonNullable<SemanticRuntimePhaseTimingSummary['kernel']>, TKey> | {} {
  const trimmed = trimDetailDensityRows(rows, rowLimit);
  return trimmed.length === 0 ? {} : { [key]: trimmed } as Pick<NonNullable<SemanticRuntimePhaseTimingSummary['kernel']>, TKey>;
}

function detailDensitySummary<TKey extends 'productDetailDensity' | 'hotDetailDensity'>(
  key: TKey,
  rows: ReadonlyMap<string, SemanticRuntimeDetailDensityRow>,
  rowLimit: number,
): Pick<NonNullable<SemanticRuntimePhaseTimingSummary['kernel']>, TKey> | {} {
  return detailDensityRowsWhenPresent(key, [...rows.values()], rowLimit);
}

function addSemanticRuntimeCountRows(
  target: Map<string, number>,
  rows: readonly SemanticRuntimeCountRow[],
): void {
  for (const row of rows) {
    target.set(row.key, (target.get(row.key) ?? 0) + row.count);
  }
}

function addSemanticRuntimeDetailDensityRows(
  target: Map<string, SemanticRuntimeDetailDensityRow>,
  rows: readonly SemanticRuntimeDetailDensityRow[],
): void {
  for (const row of diffSemanticRuntimeDetailDensityRows([...target.values(), ...rows], [])) {
    target.set(row.detailKind, row);
  }
}

function sortedSemanticRuntimeCountRows(
  rows: ReadonlyMap<string, number>,
): readonly SemanticRuntimeCountRow[] {
  return [...rows.entries()]
    .filter(([, count]) => count !== 0)
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => Math.abs(right.count) - Math.abs(left.count) || left.key.localeCompare(right.key));
}

function emptySemanticRuntimeKernelCountSnapshot(): SemanticRuntimeKernelCountSnapshot {
  return {
    totalRecords: 0,
    addresses: 0,
    identities: 0,
    evidence: 0,
    provenance: 0,
    claims: 0,
    openSeams: 0,
    products: 0,
    materializations: 0,
    productDetails: 0,
    hotDetails: 0,
    handleCharacters: 0,
  };
}

function sumSemanticRuntimeKernelCountSnapshots(
  left: SemanticRuntimeKernelCountSnapshot,
  right: SemanticRuntimeKernelCountSnapshot,
): SemanticRuntimeKernelCountSnapshot {
  return {
    totalRecords: left.totalRecords + right.totalRecords,
    addresses: left.addresses + right.addresses,
    identities: left.identities + right.identities,
    evidence: left.evidence + right.evidence,
    provenance: left.provenance + right.provenance,
    claims: left.claims + right.claims,
    openSeams: left.openSeams + right.openSeams,
    products: left.products + right.products,
    materializations: left.materializations + right.materializations,
    productDetails: left.productDetails + right.productDetails,
    hotDetails: left.hotDetails + right.hotDetails,
    handleCharacters: left.handleCharacters + right.handleCharacters,
  };
}

function semanticRuntimeTemplateExpressionTypeCacheSummary(
  emission: AureliaAppWorldProjectEmission,
): CheckerExpressionTypeEvaluationCacheStats | null {
  const caches = [
    ...emission.templates.resources,
    ...emission.templates.authoringResources,
  ].map((resource) => resource.runtimeAnalysis.profile.expressionTypeCache);
  if (caches.length === 0) {
    return null;
  }
  const aggregate = {
    entries: 0,
    hits: 0,
    misses: 0,
    writes: 0,
    entriesByBucket: new Map<string, number>(),
    hitsByBucket: new Map<string, number>(),
    missesByBucket: new Map<string, number>(),
    writesByBucket: new Map<string, number>(),
  };
  for (const cache of caches) {
    aggregate.entries += cache.entries;
    aggregate.hits += cache.hits;
    aggregate.misses += cache.misses;
    aggregate.writes += cache.writes;
    addCountRecordToMap(aggregate.entriesByBucket, cache.entriesByBucket);
    addCountRecordToMap(aggregate.hitsByBucket, cache.hitsByBucket);
    addCountRecordToMap(aggregate.missesByBucket, cache.missesByBucket);
    addCountRecordToMap(aggregate.writesByBucket, cache.writesByBucket);
  }
  return {
    entries: aggregate.entries,
    hits: aggregate.hits,
    misses: aggregate.misses,
    writes: aggregate.writes,
    entriesByBucket: countMapToRecord(aggregate.entriesByBucket),
    hitsByBucket: countMapToRecord(aggregate.hitsByBucket),
    missesByBucket: countMapToRecord(aggregate.missesByBucket),
    writesByBucket: countMapToRecord(aggregate.writesByBucket),
  };
}

function addCountRecordToMap(target: Map<string, number>, source: Readonly<Record<string, number>>): void {
  for (const [key, value] of Object.entries(source)) {
    target.set(key, (target.get(key) ?? 0) + value);
  }
}

function countMapToRecord(source: Map<string, number>): Readonly<Record<string, number>> {
  return Object.fromEntries([...source.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function sumSemanticRuntimeMemoryDeltas(
  left: SemanticRuntimeMemoryDelta | null,
  right: SemanticRuntimeMemoryDelta,
): SemanticRuntimeMemoryDelta {
  return {
    rssBytes: (left?.rssBytes ?? 0) + right.rssBytes,
    heapTotalBytes: (left?.heapTotalBytes ?? 0) + right.heapTotalBytes,
    heapUsedBytes: (left?.heapUsedBytes ?? 0) + right.heapUsedBytes,
    externalBytes: (left?.externalBytes ?? 0) + right.externalBytes,
    arrayBuffersBytes: (left?.arrayBuffersBytes ?? 0) + right.arrayBuffersBytes,
    rssOtherBytes: (left?.rssOtherBytes ?? 0) + right.rssOtherBytes,
    v8HeapPhysicalBytes: (left?.v8HeapPhysicalBytes ?? 0) + right.v8HeapPhysicalBytes,
    v8HeapAvailableBytes: (left?.v8HeapAvailableBytes ?? 0) + right.v8HeapAvailableBytes,
    v8MallocedMemoryBytes: (left?.v8MallocedMemoryBytes ?? 0) + right.v8MallocedMemoryBytes,
    v8PeakMallocedMemoryBytes: (left?.v8PeakMallocedMemoryBytes ?? 0) + right.v8PeakMallocedMemoryBytes,
    v8ExternalMemoryBytes: (left?.v8ExternalMemoryBytes ?? 0) + right.v8ExternalMemoryBytes,
    v8NativeContextCount: (left?.v8NativeContextCount ?? 0) + right.v8NativeContextCount,
    v8DetachedContextCount: (left?.v8DetachedContextCount ?? 0) + right.v8DetachedContextCount,
  };
}

function roundMilliseconds(value: number): number {
  return Math.round(value * 10) / 10;
}

function appCacheKey(
  projectKey: string,
  analysisDepth: SemanticAppAnalysisDepth,
  includeAuthoringTemplates: boolean,
  authoringTemplateSourceFiles: readonly string[],
  authoringTemplateLimit: number | null,
): string {
  const sourceFileKey = authoringTemplateSourceFiles.length === 0
    ? 'project'
    : authoringTemplateSourceFiles.join('|');
  return `${projectKey}:${analysisDepth}:authoring=${includeAuthoringTemplates}:${sourceFileKey}:${authoringTemplateLimit ?? 'all'}`;
}

function normalizeAuthoringTemplateLimit(value: number | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  return Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

function normalizeAuthoringTemplateSourceFiles(value: readonly string[] | null | undefined): readonly string[] {
  if (value == null) {
    return [];
  }
  return [...new Set(value
    .map((fileName) => fileName.trim().replace(/\\/g, '/'))
    .filter((fileName) => fileName.length > 0))]
    .sort();
}

function normalizeSourceFilePathOption(value: string | null | undefined): string | null {
  const [path] = normalizeAuthoringTemplateSourceFiles(value == null ? [] : [value]);
  return path ?? null;
}

function queryClaimDisposalSourceFilePath(
  project: ProjectBootFrame | null,
  request: SemanticRuntimeQueryClaimDisposeRequest,
): string | null {
  if (project == null) {
    return null;
  }
  const requested = normalizeSourceFilePathOption(request.sourceFile?.filePath ?? request.sourceFilePath);
  return requested == null ? null : canonicalProjectSourceFilePath(project, requested);
}

function canonicalizeRuntimeAppQueryRequest(
  project: ProjectBootFrame,
  request: SemanticRuntimeAppQueryRequest,
): SemanticRuntimeAppQueryRequest {
  return {
    ...request,
    ...canonicalizeAppQuerySourceFields(project, request),
    ...(request.sourceFilePath == null
      ? {}
      : { sourceFilePath: canonicalProjectSourceFilePath(project, request.sourceFilePath) }),
  };
}

function canonicalizeAppQueryForProject(
  project: ProjectBootFrame,
  query: SemanticAppQuery,
): SemanticAppQuery {
  return {
    ...query,
    ...canonicalizeAppQuerySourceFields(project, query),
  };
}

function canonicalizeAppQuerySourceFields(
  project: ProjectBootFrame,
  query: Pick<SemanticAppQuery, 'cursor' | 'sourceFile'>,
): Pick<SemanticAppQuery, 'cursor' | 'sourceFile'> {
  return {
    ...(query.cursor == null ? {} : { cursor: canonicalizeSourceCursorInput(project, query.cursor) }),
    ...(query.sourceFile == null ? {} : { sourceFile: canonicalizeSourceFileInput(project, query.sourceFile) }),
  };
}

function canonicalizeSourceCursorInput(
  project: ProjectBootFrame,
  cursor: SemanticRuntimeSourceCursorInput,
): SemanticRuntimeSourceCursorInput {
  return {
    ...cursor,
    filePath: canonicalProjectSourceFilePath(project, cursor.filePath),
  };
}

function canonicalizeSourceFileInput(
  project: ProjectBootFrame,
  sourceFile: SemanticRuntimeSourceFileInput,
): SemanticRuntimeSourceFileInput {
  return {
    ...sourceFile,
    filePath: canonicalProjectSourceFilePath(project, sourceFile.filePath),
  };
}

function canonicalProjectSourceFilePaths(
  project: ProjectBootFrame,
  values: readonly string[],
): readonly string[] {
  return [...new Set(values.map((value) => canonicalProjectSourceFilePath(project, value)))]
    .sort();
}

function sumProfileDisposalRecords(
  summaries: readonly SemanticRuntimeQueryClaimDisposeProfileSummary[],
): number {
  return summaries.reduce((total, summary) => total + summary.disposal.disposedRecords, 0);
}

function canonicalProjectSourceFilePath(
  project: ProjectBootFrame,
  value: string,
): string {
  return admittedProjectSourceFilePath(project, value)
    ?? projectRelativePath(project.rootDir, value)
    ?? projectRelativePath(project.rootDir, path.resolve(project.workspaceRootDir, value))
    ?? value;
}

function admittedProjectSourceFilePath(
  project: ProjectBootFrame,
  value: string,
): string | null {
  const normalized = value.replace(/\\/g, '/');
  return project.sourceFiles
    .map((source) => source.path)
    .filter((sourcePath) => sourcePathMatchesFileName(sourcePath, normalized))
    .sort((left, right) => right.length - left.length)[0]
    ?? null;
}

function projectRelativePath(
  projectRootDir: string,
  value: string,
): string | null {
  if (!path.isAbsolute(value)) {
    return null;
  }
  const relativePath = path.relative(projectRootDir, value);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }
  return relativePath.replace(/\\/g, '/');
}

function authoringTemplateSourceFilesForOpen(
  sourceFilePath: string | null,
  requestedAuthoringSourceFiles: readonly string[],
): readonly string[] {
  if (requestedAuthoringSourceFiles.length > 0) {
    return requestedAuthoringSourceFiles;
  }
  return sourceFilePath == null ? [] : [sourceFilePath];
}

function appSatisfiesAuthoringTemplateRequest(
  app: SemanticApp,
  includeAuthoringTemplates: boolean,
  authoringTemplateSourceFiles: readonly string[],
  authoringTemplateLimit: number | null,
): boolean {
  if (!includeAuthoringTemplates) {
    return true;
  }
  if (!authoringTemplateSourceFileRequestSatisfied(
    app.emission.templates.authoringTemplateSourceFiles,
    authoringTemplateSourceFiles,
    app.emission.templates.authoringTemplateLimit,
  )) {
    return false;
  }
  return authoringTemplateLimitSatisfied(app.emission.templates.authoringTemplateLimit, authoringTemplateLimit);
}

function authoringTemplateSourceFileRequestSatisfied(
  existingSourceFiles: readonly string[],
  requestedSourceFiles: readonly string[],
  existingTemplateLimit: number | null,
): boolean {
  if (requestedSourceFiles.length === 0) {
    return existingSourceFiles.length === 0;
  }
  if (existingSourceFiles.length === 0) {
    return existingTemplateLimit == null;
  }
  const existing = new Set(existingSourceFiles);
  return requestedSourceFiles.every((fileName) => existing.has(fileName));
}

function authoringTemplateLimitSatisfied(
  existingTemplateLimit: number | null,
  requestedTemplateLimit: number | null,
): boolean {
  if (existingTemplateLimit == null) {
    return true;
  }
  if (requestedTemplateLimit == null) {
    return false;
  }
  return existingTemplateLimit >= requestedTemplateLimit;
}

function appContainsTemplateSourceFile(
  app: SemanticApp,
  filePath: string,
): boolean {
  return [
    ...app.emission.templates.resources,
    ...app.emission.templates.authoringResources,
  ].some((resource) => {
    const source = sourceFileAddressForAddress(
      app.runtime.workspace.store,
      resource.compilation.unit.templateSource.sourceAddressHandle,
    );
    return source != null && sourcePathMatchesFileName(source.path, filePath);
  });
}

function selectProject(
  projects: readonly ProjectBootFrame[],
  projectKey: string,
): ProjectBootFrame {
  const project = projects.find((candidate) => candidate.projectKey === projectKey);
  if (project == null) {
    throw new Error(`Cannot open semantic app: project '${projectKey}' was not booted.`);
  }
  return project;
}
