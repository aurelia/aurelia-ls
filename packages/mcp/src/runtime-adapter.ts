import process from 'node:process';
import {
  readSemanticAppQueryCatalog,
  semanticAppQueryCatalogRow,
  SemanticAppQueryKind,
  type ManagedSemanticWorkspaceOperationContext,
  type SemanticAppQuery,
  type SemanticRuntimeAppQueryRequest,
  type SemanticRuntimeAnalysisCacheClearRequest,
  type SemanticRuntimeAnswer,
  type SemanticNativeProjectConfigurationsResult,
  type SemanticProjectConfigurationDiagnosticsResult,
  type SemanticRuntimePagePolicy,
  type SemanticRuntimeSessionAnalysisCacheOverviewRequest,
  type SemanticWorkspaceDescriptor,
} from '@aurelia-ls/semantic-runtime';
import {
  SemanticRuntimeSessionRegistry,
  type SemanticRuntimeSessionRegistryOptions,
  type SemanticRuntimeSessionRegistryClearResult,
  type SemanticRuntimeSessionRegistryOverview,
} from './session-registry.js';
import {
  aureliaMcpToolNames,
  type AureliaMcpAnalysisCacheOverviewInput,
  type AureliaMcpAppDiagnosticsInput,
  type AureliaMcpAppOverviewInput,
  type AureliaMcpAppQueryBatchInput,
  type AureliaMcpAppQueryInput,
  type AureliaMcpAppQueryCatalogInput,
  type AureliaMcpClearAnalysisCacheInput,
  type AureliaMcpDiagnosticOverviewInput,
  type AureliaMcpOpenAppInput,
  type AureliaMcpOpenSeamOverviewInput,
  type AureliaMcpProjectConfigurationsInput,
  type AureliaMcpResponse,
  type AureliaMcpRouterOverviewInput,
  type AureliaMcpTemplateCompletionsInput,
  type AureliaMcpTemplateCursorInput,
  type AureliaMcpTemplateDiagnosticsInput,
  type AureliaMcpWorkspaceOverviewInput,
} from './tool-contracts.js';

const MCP_PAGE_POLICY: SemanticRuntimePagePolicy = {
  maxSize: 200,
  maxRowsJsonBytes: 64 * 1024,
};

export type AureliaMcpResponseProjector<TValue, TResult> = (
  response: AureliaMcpResponse<TValue>,
) => TResult | PromiseLike<TResult>;

/** Default direct-adapter projection: portable JSON only, with process-private answer capabilities removed. */
export function projectDetachedAureliaMcpResponse<TValue>(
  response: AureliaMcpResponse<TValue>,
): AureliaMcpResponse<TValue> {
  const serialized = JSON.stringify(response);
  if (serialized === undefined) {
    throw new TypeError('Aurelia MCP responses must be JSON-serializable values.');
  }
  return JSON.parse(serialized) as AureliaMcpResponse<TValue>;
}

export class AureliaMcpSemanticRuntimeAdapter {
  constructor(
    private readonly sessions = new SemanticRuntimeSessionRegistry(),
  ) {}

  async workspaceOverview<TResult>(
    input: AureliaMcpWorkspaceOverviewInput,
    project: AureliaMcpResponseProjector<SemanticRuntimeAnswer<unknown>, TResult>,
  ): Promise<TResult> {
    return this.answerWorkspace(aureliaMcpToolNames.workspaceOverview, input, (context) => context.runtime.summary({
      projectPage: input.projectPage ?? undefined,
      pagePolicy: MCP_PAGE_POLICY,
    }), project);
  }

  async projectConfigurations<TResult>(
    input: AureliaMcpProjectConfigurationsInput,
    project: AureliaMcpResponseProjector<SemanticRuntimeAnswer<
      SemanticNativeProjectConfigurationsResult | SemanticProjectConfigurationDiagnosticsResult
    >, TResult>,
  ): Promise<TResult> {
    const request = {
      projectKey: input.projectKey ?? undefined,
      sourceFilePaths: input.sourceFilePaths ?? undefined,
      page: input.page ?? undefined,
      pagePolicy: MCP_PAGE_POLICY,
      inquiryProfile: 'mcp-orientation' as const,
    };
    return this.answerWorkspace(
      aureliaMcpToolNames.projectConfigurations,
      input,
      (context) => input.view === 'diagnostics'
        ? context.runtime.projectConfigurationDiagnostics(request)
        : context.runtime.nativeProjectConfigurations(request),
      project,
    );
  }

  async analysisCacheOverview<TResult>(
    input: AureliaMcpAnalysisCacheOverviewInput,
    project: AureliaMcpResponseProjector<SemanticRuntimeSessionRegistryOverview, TResult>,
  ): Promise<TResult> {
    return this.sessions.overview(
      input.workspace == null ? undefined : runtimeOptions(input.workspace),
      cacheOverviewRequest(input),
      (overview, descriptor) => project(projectDetachedAureliaMcpResponse(
        toolResponse(aureliaMcpToolNames.analysisCacheOverview, descriptor, overview),
      )),
    );
  }

  async clearAnalysisCache<TResult>(
    input: AureliaMcpClearAnalysisCacheInput,
    project: AureliaMcpResponseProjector<SemanticRuntimeSessionRegistryClearResult, TResult>,
  ): Promise<TResult> {
    return this.sessions.clearAnalysisCache(
      input.workspace == null ? undefined : runtimeOptions(input.workspace),
      cacheClearRequest(input),
      (cleared, descriptor) => project(projectDetachedAureliaMcpResponse(
        toolResponse(aureliaMcpToolNames.clearAnalysisCache, descriptor, cleared),
      )),
    );
  }

  appQueryCatalog(input: AureliaMcpAppQueryCatalogInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    return Promise.resolve(projectDetachedAureliaMcpResponse(
      toolResponse(
        aureliaMcpToolNames.appQueryCatalog,
        null,
        readSemanticAppQueryCatalog({
          group: input.group,
          queryKind: input.queryKind,
        }),
      ),
    ));
  }

  async appQuery<TResult>(
    input: AureliaMcpAppQueryInput,
    project: AureliaMcpResponseProjector<SemanticRuntimeAnswer<unknown>, TResult>,
  ): Promise<TResult> {
    return this.answerAppQuery(aureliaMcpToolNames.appQuery, input, {
      kind: input.queryKind,
      page: input.page ?? undefined,
      detail: input.detail ?? undefined,
      cursor: input.cursor ?? undefined,
      frameworkCapability: input.frameworkCapability ?? undefined,
      sourceFile: normalizedSourceFileInput(input.sourceFile, 'sourceFile'),
      diagnosticProjection: input.diagnosticProjection ?? undefined,
      includeTypeSurfaces: input.includeTypeSurfaces ?? undefined,
      diagnosticPageSize: input.diagnosticPageSize ?? undefined,
      analysisLimitationPageSize: input.analysisLimitationPageSize ?? undefined,
      openSeamPageSize: input.openSeamPageSize ?? undefined,
      openSeamKindKey: input.openSeamKindKey ?? undefined,
      openSeamReasonKind: input.openSeamReasonKind ?? undefined,
      sourceRole: input.sourceRole ?? undefined,
      openSeamClusterKey: input.openSeamClusterKey ?? undefined,
      openSeamSiteKey: input.openSeamSiteKey ?? undefined,
      observedDependencyLocus: input.observedDependencyLocus ?? undefined,
      rowPageSize: input.rowPageSize ?? undefined,
      includeDeclaration: input.includeDeclaration ?? undefined,
      newName: input.newName ?? undefined,
    }, project);
  }

  async appQueryBatch<TResult>(
    input: AureliaMcpAppQueryBatchInput,
    project: AureliaMcpResponseProjector<SemanticRuntimeAnswer<unknown>, TResult>,
  ): Promise<TResult> {
    return this.answerWorkspace(
      aureliaMcpToolNames.appQueryBatch,
      input,
      (context) => context.runtime.answerAppQueries({
        projectKey: input.projectKey ?? undefined,
        sourceFilePath: input.sourceFilePath ?? undefined,
        analysisDepth: input.analysisDepth ?? undefined,
        includeAuthoringTemplates: input.includeAuthoringTemplates ?? undefined,
        authoringTemplateSourceFiles: input.authoringTemplateSourceFiles ?? undefined,
        authoringTemplateLimit: input.authoringTemplateLimit ?? undefined,
        ...(input.appRetention == null ? {} : { appRetention: input.appRetention }),
        includeAppProfile: input.includeAppProfile ?? undefined,
        includeAppQueryClaimProfiles: input.includeAppQueryClaimProfiles ?? undefined,
        pagePolicy: MCP_PAGE_POLICY,
        inquiryProfile: 'mcp-orientation',
        queries: queriesWithSourceFilePathSelector(
          continuationFilteredQueries(input.queries, input.continuationIntents),
          input.sourceFilePath,
        ),
      }),
      project,
    );
  }

  async appOverview<TResult>(
    input: AureliaMcpAppOverviewInput,
    project: AureliaMcpResponseProjector<SemanticRuntimeAnswer<unknown>, TResult>,
  ): Promise<TResult> {
    return this.answerAppQuery(aureliaMcpToolNames.appOverview, input, {
      kind: SemanticAppQueryKind.AppOverview,
      diagnosticPageSize: input.diagnosticPageSize,
      analysisLimitationPageSize: input.analysisLimitationPageSize,
      openSeamPageSize: input.openSeamPageSize,
    }, project);
  }

  async routerOverview<TResult>(
    input: AureliaMcpRouterOverviewInput,
    project: AureliaMcpResponseProjector<SemanticRuntimeAnswer<unknown>, TResult>,
  ): Promise<TResult> {
    return this.answerAppQuery(aureliaMcpToolNames.routerOverview, input, {
      kind: SemanticAppQueryKind.RouterOverview,
      rowPageSize: input.rowPageSize,
      detail: input.detail ?? undefined,
    }, project);
  }

  async appDiagnostics<TResult>(
    input: AureliaMcpAppDiagnosticsInput,
    project: AureliaMcpResponseProjector<SemanticRuntimeAnswer<unknown>, TResult>,
  ): Promise<TResult> {
    return this.answerAppQuery(aureliaMcpToolNames.appDiagnostics, input, {
      kind: SemanticAppQueryKind.AppDiagnostics,
      page: input.page ?? undefined,
      detail: input.detail ?? undefined,
      sourceFile: normalizedSourceFileInput(input.sourceFile, 'sourceFile'),
      diagnosticProjection: input.diagnosticProjection ?? undefined,
    }, project);
  }

  async diagnosticOverview<TResult>(
    input: AureliaMcpDiagnosticOverviewInput,
    project: AureliaMcpResponseProjector<SemanticRuntimeAnswer<unknown>, TResult>,
  ): Promise<TResult> {
    return this.answerAppQuery(aureliaMcpToolNames.diagnosticOverview, input, {
      kind: SemanticAppQueryKind.AppDiagnosticSummary,
      page: input.page ?? { size: 20 },
      detail: input.detail ?? undefined,
      sourceFile: input.sourceFile ?? undefined,
      diagnosticProjection: input.diagnosticProjection ?? undefined,
    }, project);
  }

  async openSeamOverview<TResult>(
    input: AureliaMcpOpenSeamOverviewInput,
    project: AureliaMcpResponseProjector<SemanticRuntimeAnswer<unknown>, TResult>,
  ): Promise<TResult> {
    return this.answerAppQuery(aureliaMcpToolNames.openSeamOverview, input, {
      kind: SemanticAppQueryKind.OpenSeamSites,
      page: input.page ?? { size: 20 },
      sourceFile: normalizedSourceFileInput(input.sourceFile, 'sourceFile')
        ?? normalizedSourceFilePathInput(input.sourceFilePath),
      openSeamKindKey: input.openSeamKindKey ?? undefined,
      openSeamReasonKind: input.openSeamReasonKind ?? undefined,
      sourceRole: input.sourceRole ?? undefined,
      openSeamClusterKey: input.openSeamClusterKey ?? undefined,
      openSeamSiteKey: input.openSeamSiteKey ?? undefined,
    }, project);
  }

  async templateCursorInfo<TResult>(
    input: AureliaMcpTemplateCursorInput,
    project: AureliaMcpResponseProjector<SemanticRuntimeAnswer<unknown>, TResult>,
  ): Promise<TResult> {
    return this.answerAppQuery(aureliaMcpToolNames.templateCursorInfo, input, {
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      cursor: input.cursor,
      analysisDepth: input.analysisDepth ?? semanticAppQueryCatalogRow(SemanticAppQueryKind.TemplateCursorInfo).minimumAnalysisDepth,
      detail: input.detail ?? undefined,
    }, project);
  }

  async templateCompletions<TResult>(
    input: AureliaMcpTemplateCompletionsInput,
    project: AureliaMcpResponseProjector<SemanticRuntimeAnswer<unknown>, TResult>,
  ): Promise<TResult> {
    return this.answerAppQuery(aureliaMcpToolNames.templateCompletions, input, {
      kind: SemanticAppQueryKind.TemplateCompletions,
      cursor: input.cursor,
      analysisDepth: input.analysisDepth ?? semanticAppQueryCatalogRow(SemanticAppQueryKind.TemplateCompletions).minimumAnalysisDepth,
      page: input.page ?? undefined,
      detail: input.detail ?? undefined,
    }, project);
  }

  async templateDiagnostics<TResult>(
    input: AureliaMcpTemplateDiagnosticsInput,
    project: AureliaMcpResponseProjector<SemanticRuntimeAnswer<unknown>, TResult>,
  ): Promise<TResult> {
    return this.answerAppQuery(aureliaMcpToolNames.templateDiagnostics, input, {
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: normalizedSourceFileInput(input.sourceFile, 'sourceFile'),
      analysisDepth: input.analysisDepth ?? semanticAppQueryCatalogRow(SemanticAppQueryKind.TemplateDiagnostics).minimumAnalysisDepth,
      page: input.page ?? undefined,
      detail: input.detail ?? undefined,
      diagnosticProjection: input.diagnosticProjection ?? undefined,
    }, project);
  }

  dispose(): Promise<void> {
    return this.sessions.disposeAll();
  }

  private async answerAppQuery<TResult>(
    toolName: string,
    input: AureliaMcpOpenAppInput,
    query: SemanticAppQuery & Pick<SemanticRuntimeAppQueryRequest, 'analysisDepth'>,
    project: AureliaMcpResponseProjector<SemanticRuntimeAnswer<unknown>, TResult>,
  ): Promise<TResult> {
    return this.answerWorkspace(toolName, input, (context) => {
      const queryWithSelectors = queryWithSourceFilePathSelector(query, input.sourceFilePath);
      return context.runtime.answerAppQuery({
        ...queryWithSelectors,
        projectKey: input.projectKey ?? undefined,
        sourceFilePath: input.sourceFilePath ?? undefined,
        analysisDepth: queryWithSelectors.analysisDepth ?? input.analysisDepth ?? semanticAppQueryCatalogRow(queryWithSelectors.kind).minimumAnalysisDepth,
        includeAuthoringTemplates: input.includeAuthoringTemplates ?? undefined,
        authoringTemplateSourceFiles: input.authoringTemplateSourceFiles ?? undefined,
        authoringTemplateLimit: input.authoringTemplateLimit ?? undefined,
        continuationIntents: queryWithSelectors.continuationIntents ?? input.continuationIntents ?? undefined,
        inquiryProfile: 'mcp-orientation',
        ...(input.appRetention == null ? {} : { appRetention: input.appRetention }),
        pagePolicy: MCP_PAGE_POLICY,
      });
    }, project);
  }

  private answerWorkspace<TValue, TResult>(
    toolName: string,
    input: RuntimeOptionsInput,
    answer: (
      context: ManagedSemanticWorkspaceOperationContext,
    ) => SemanticRuntimeAnswer<TValue> | PromiseLike<SemanticRuntimeAnswer<TValue>>,
    project: AureliaMcpResponseProjector<SemanticRuntimeAnswer<TValue>, TResult>,
  ): Promise<TResult> {
    return this.sessions.run(runtimeOptions(input), async (context, descriptor) => {
      const answered = await answer(context);
      return project(projectDetachedAureliaMcpResponse(toolResponse(toolName, descriptor, answered)));
    });
  }
}

function continuationFilteredQueries(
  queries: readonly SemanticAppQuery[],
  continuationIntents: SemanticRuntimeAppQueryRequest['continuationIntents'],
): readonly SemanticAppQuery[] {
  if (continuationIntents == null || continuationIntents.length === 0) {
    return queries;
  }
  return queries.map((query) => ({
    ...query,
    continuationIntents: query.continuationIntents ?? continuationIntents,
  }));
}

function queriesWithSourceFilePathSelector(
  queries: readonly SemanticAppQuery[],
  sourceFilePath: string | null | undefined,
): readonly SemanticAppQuery[] {
  if (sourceFilePath == null) {
    return queries;
  }
  return queries.map((query) => queryWithSourceFilePathSelector(query, sourceFilePath));
}

function queryWithSourceFilePathSelector<TQuery extends SemanticAppQuery>(
  query: TQuery,
  sourceFilePath: string | null | undefined,
): TQuery {
  if (sourceFilePath == null || query.sourceFile != null) {
    return query;
  }
  return {
    ...query,
    sourceFile: normalizedSourceFilePathInput(sourceFilePath),
  };
}

interface RuntimeOptionsInput {
  readonly workspaceRoot?: string | null;
  readonly projectRootHints?: readonly string[] | null;
  readonly excludedWorkspaceRoots?: readonly string[] | null;
}

function runtimeOptions(input: RuntimeOptionsInput): SemanticRuntimeSessionRegistryOptions {
  return {
    workspaceRoot: input.workspaceRoot ?? process.cwd(),
    projectRootHints: input.projectRootHints ?? undefined,
    excludedWorkspaceRoots: input.excludedWorkspaceRoots ?? undefined,
  };
}

function cacheOverviewRequest(
  input: AureliaMcpAnalysisCacheOverviewInput,
): SemanticRuntimeSessionAnalysisCacheOverviewRequest {
  return {
    includeKernelBreakdowns: input.includeKernelBreakdowns ?? undefined,
    includeDetailDensity: input.includeDetailDensity ?? undefined,
    includeQueryClaimRows: input.includeQueryClaimRows ?? undefined,
    rowLimit: input.rowLimit ?? undefined,
  };
}

function cacheClearRequest(
  input: AureliaMcpClearAnalysisCacheInput,
): SemanticRuntimeAnalysisCacheClearRequest {
  return {
    typeSystemDependencyCacheClearPolicy: input.typeSystemDependencyCacheClearPolicy ?? undefined,
  };
}

function normalizedSourceFileInput(
  value: unknown,
  fieldName: string,
): { readonly filePath: string } | undefined {
  if (value == null) {
    return undefined;
  }
  if (!isPlainRecord(value) || typeof value.filePath !== 'string') {
    throw new Error(
      `${fieldName} must be an object with a string filePath field, for example { "filePath": "src/my-app.html" }.`,
    );
  }
  return {
    filePath: value.filePath,
  };
}

function normalizedSourceFilePathInput(
  value: string | null | undefined,
): { readonly filePath: string } | undefined {
  return value == null ? undefined : { filePath: value };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function toolResponse<TValue>(
  tool: string,
  workspaceDescriptor: SemanticWorkspaceDescriptor | null,
  value: TValue,
): AureliaMcpResponse<TValue> {
  return {
    tool,
    generatedAt: new Date().toISOString(),
    workspaceRoot: workspaceDescriptor?.workspaceRoot ?? null,
    workspaceDescriptor,
    value,
  };
}
