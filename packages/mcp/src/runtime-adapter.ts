import process from 'node:process';
import {
  semanticAppQueryCatalogRow,
  SemanticAppQueryKind,
  type SemanticAppQuery,
  type SemanticRuntimeAppQueryRequest,
  type SemanticRuntimeAnalysisCacheClearRequest,
  type SemanticRuntimeAnalysisCacheOverviewRequest,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeOptions,
  type SemanticRuntimePagePolicy,
} from '@aurelia-ls/semantic-runtime';
import { SemanticRuntimeSessionRegistry, normalizeRuntimeOptions } from './session-registry.js';
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
  type AureliaMcpResponse,
  type AureliaMcpRouterOverviewInput,
  type AureliaMcpTemplateCursorInput,
  type AureliaMcpTemplateDiagnosticsInput,
  type AureliaMcpWorkspaceOverviewInput,
} from './tool-contracts.js';

const MCP_PAGE_POLICY: SemanticRuntimePagePolicy = {
  maxSize: 200,
  maxRowsJsonBytes: 64 * 1024,
};

export class AureliaMcpSemanticRuntimeAdapter {
  constructor(
    private readonly sessions = new SemanticRuntimeSessionRegistry(),
  ) {}

  async workspaceOverview(input: AureliaMcpWorkspaceOverviewInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    const runtime = await this.sessions.runtime(runtimeOptions(input));
    return toolResponse(aureliaMcpToolNames.workspaceOverview, input, runtime.summary({
      projectPage: input.projectPage ?? undefined,
      pagePolicy: MCP_PAGE_POLICY,
    }));
  }

  async analysisCacheOverview(input: AureliaMcpAnalysisCacheOverviewInput): Promise<AureliaMcpResponse<unknown>> {
    return toolResponse(
      aureliaMcpToolNames.analysisCacheOverview,
      input,
      input.workspaceRoot == null
        ? await this.sessions.overview(undefined, cacheOverviewRequest(input))
        : await this.sessions.overview({
          workspaceRoot: input.workspaceRoot,
          storeKey: input.storeKey ?? undefined,
          projects: input.projects ?? undefined,
          projectDiscovery: input.projectDiscovery ?? undefined,
        }, cacheOverviewRequest(input)),
    );
  }

  async clearAnalysisCache(input: AureliaMcpClearAnalysisCacheInput): Promise<AureliaMcpResponse<unknown>> {
    const cleared = input.workspaceRoot == null
      ? await this.sessions.clearAnalysisCache(undefined, cacheClearRequest(input))
      : await this.sessions.clearAnalysisCache({
        workspaceRoot: input.workspaceRoot,
        storeKey: input.storeKey ?? undefined,
        projects: input.projects ?? undefined,
        projectDiscovery: input.projectDiscovery ?? undefined,
      }, cacheClearRequest(input));
    return toolResponse(aureliaMcpToolNames.clearAnalysisCache, input, cleared);
  }

  async appQueryCatalog(input: AureliaMcpAppQueryCatalogInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    const runtime = await this.sessions.runtime(runtimeOptions(input));
    return toolResponse(
      aureliaMcpToolNames.appQueryCatalog,
      input,
      runtime.appQueryCatalog({
        group: input.group,
        queryKind: input.queryKind,
        inquiryProfile: 'mcp-orientation',
      }),
    );
  }

  async appQuery(input: AureliaMcpAppQueryInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    return this.answerAppQuery(aureliaMcpToolNames.appQuery, input, {
      kind: input.queryKind,
      page: input.page ?? undefined,
      detail: input.detail ?? undefined,
      cursor: input.cursor ?? undefined,
      sourceFile: normalizedSourceFileInput(input.sourceFile, 'sourceFile'),
      diagnosticProjection: input.diagnosticProjection ?? undefined,
      includeTypeSurfaces: input.includeTypeSurfaces ?? undefined,
      diagnosticPageSize: input.diagnosticPageSize ?? undefined,
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
    });
  }

  async appQueryBatch(input: AureliaMcpAppQueryBatchInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    const runtime = await this.sessions.runtime(runtimeOptions(input));
    const answer = await runtime.answerAppQueries({
      projectKey: input.projectKey ?? undefined,
      sourceFilePath: input.sourceFilePath ?? undefined,
      analysisDepth: input.analysisDepth ?? undefined,
      includeAuthoringTemplates: input.includeAuthoringTemplates ?? undefined,
      authoringTemplateSourceFiles: input.authoringTemplateSourceFiles ?? undefined,
      authoringTemplateLimit: input.authoringTemplateLimit ?? undefined,
      telemetry: input.telemetry ?? undefined,
      appRetention: input.appRetention ?? 'dispose-app',
      includeAppProfile: input.includeAppProfile ?? undefined,
      includeAppQueryClaimProfiles: input.includeAppQueryClaimProfiles ?? undefined,
      pagePolicy: MCP_PAGE_POLICY,
      inquiryProfile: 'mcp-orientation',
      queries: queriesWithSourceFilePathSelector(
        continuationFilteredQueries(input.queries, input.continuationIntents),
        input.sourceFilePath,
      ),
    });
    return toolResponse(aureliaMcpToolNames.appQueryBatch, input, answer);
  }

  async appOverview(input: AureliaMcpAppOverviewInput): Promise<AureliaMcpResponse<unknown>> {
    return this.answerAppQuery(aureliaMcpToolNames.appOverview, input, {
      kind: SemanticAppQueryKind.AppOverview,
      diagnosticPageSize: input.diagnosticPageSize,
      openSeamPageSize: input.openSeamPageSize,
    });
  }

  async routerOverview(input: AureliaMcpRouterOverviewInput): Promise<AureliaMcpResponse<unknown>> {
    return this.answerAppQuery(aureliaMcpToolNames.routerOverview, input, {
      kind: SemanticAppQueryKind.RouterOverview,
      rowPageSize: input.rowPageSize,
      detail: input.detail ?? undefined,
    });
  }

  async appDiagnostics(input: AureliaMcpAppDiagnosticsInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    return this.answerAppQuery(aureliaMcpToolNames.appDiagnostics, input, {
      kind: SemanticAppQueryKind.AppDiagnostics,
      page: input.page ?? undefined,
      detail: input.detail ?? undefined,
      sourceFile: normalizedSourceFileInput(input.sourceFile, 'sourceFile'),
      diagnosticProjection: input.diagnosticProjection ?? undefined,
    });
  }

  async diagnosticOverview(input: AureliaMcpDiagnosticOverviewInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    return this.answerAppQuery(aureliaMcpToolNames.diagnosticOverview, input, {
      kind: SemanticAppQueryKind.AppDiagnosticSummary,
      page: input.page ?? { size: 20 },
      detail: input.detail ?? undefined,
      sourceFile: input.sourceFile ?? undefined,
      diagnosticProjection: input.diagnosticProjection ?? undefined,
    });
  }

  async openSeamOverview(input: AureliaMcpOpenSeamOverviewInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    return this.answerAppQuery(aureliaMcpToolNames.openSeamOverview, input, {
      kind: SemanticAppQueryKind.OpenSeamSites,
      page: input.page ?? { size: 20 },
      detail: input.detail ?? undefined,
      sourceFile: normalizedSourceFileInput(input.sourceFile, 'sourceFile')
        ?? normalizedSourceFilePathInput(input.sourceFilePath),
      openSeamKindKey: input.openSeamKindKey ?? undefined,
      openSeamReasonKind: input.openSeamReasonKind ?? undefined,
      sourceRole: input.sourceRole ?? undefined,
      openSeamClusterKey: input.openSeamClusterKey ?? undefined,
      openSeamSiteKey: input.openSeamSiteKey ?? undefined,
    });
  }

  async templateCursorInfo(input: AureliaMcpTemplateCursorInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    return this.answerAppQuery(aureliaMcpToolNames.templateCursorInfo, input, {
      kind: SemanticAppQueryKind.TemplateCursorInfo,
      cursor: input.cursor,
      analysisDepth: input.analysisDepth ?? semanticAppQueryCatalogRow(SemanticAppQueryKind.TemplateCursorInfo).minimumAnalysisDepth,
      detail: input.detail ?? undefined,
    });
  }

  async templateCompletions(input: AureliaMcpTemplateCursorInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    return this.answerAppQuery(aureliaMcpToolNames.templateCompletions, input, {
      kind: SemanticAppQueryKind.TemplateCompletions,
      cursor: input.cursor,
      analysisDepth: input.analysisDepth ?? semanticAppQueryCatalogRow(SemanticAppQueryKind.TemplateCompletions).minimumAnalysisDepth,
      page: input.page ?? undefined,
      detail: input.detail ?? undefined,
    });
  }

  async templateDiagnostics(input: AureliaMcpTemplateDiagnosticsInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    return this.answerAppQuery(aureliaMcpToolNames.templateDiagnostics, input, {
      kind: SemanticAppQueryKind.TemplateDiagnostics,
      sourceFile: normalizedSourceFileInput(input.sourceFile, 'sourceFile'),
      analysisDepth: input.analysisDepth ?? semanticAppQueryCatalogRow(SemanticAppQueryKind.TemplateDiagnostics).minimumAnalysisDepth,
      page: input.page ?? undefined,
      detail: input.detail ?? undefined,
      diagnosticProjection: input.diagnosticProjection ?? undefined,
    });
  }

  private async answerAppQuery(
    toolName: string,
    input: AureliaMcpOpenAppInput,
    query: SemanticAppQuery & Pick<SemanticRuntimeAppQueryRequest, 'analysisDepth'>,
  ): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    const runtime = await this.sessions.runtime(runtimeOptions(input));
    const queryWithSelectors = queryWithSourceFilePathSelector(query, input.sourceFilePath);
    const answer = await runtime.answerAppQuery({
      ...queryWithSelectors,
      projectKey: input.projectKey ?? undefined,
      sourceFilePath: input.sourceFilePath ?? undefined,
      analysisDepth: queryWithSelectors.analysisDepth ?? input.analysisDepth ?? semanticAppQueryCatalogRow(queryWithSelectors.kind as SemanticAppQueryKind).minimumAnalysisDepth,
      includeAuthoringTemplates: input.includeAuthoringTemplates ?? undefined,
      authoringTemplateSourceFiles: input.authoringTemplateSourceFiles ?? undefined,
      authoringTemplateLimit: input.authoringTemplateLimit ?? undefined,
      continuationIntents: queryWithSelectors.continuationIntents ?? input.continuationIntents ?? undefined,
      inquiryProfile: 'mcp-orientation',
      appRetention: input.appRetention ?? 'dispose-app',
      pagePolicy: MCP_PAGE_POLICY,
    });
    return toolResponse(toolName, input, answer);
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
  readonly storeKey?: string | null;
  readonly projects?: SemanticRuntimeOptions['projects'] | null;
  readonly projectDiscovery?: SemanticRuntimeOptions['projectDiscovery'] | null;
}

function runtimeOptions(input: RuntimeOptionsInput): SemanticRuntimeOptions {
  return normalizeRuntimeOptions({
    workspaceRoot: input.workspaceRoot ?? process.cwd(),
    storeKey: input.storeKey ?? undefined,
    projects: input.projects ?? undefined,
    projectDiscovery: input.projectDiscovery ?? undefined,
  });
}

function cacheOverviewRequest(
  input: AureliaMcpAnalysisCacheOverviewInput,
): SemanticRuntimeAnalysisCacheOverviewRequest {
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
  input: { readonly workspaceRoot?: string | null },
  value: TValue,
): AureliaMcpResponse<TValue> {
  return {
    tool,
    generatedAt: new Date().toISOString(),
    workspaceRoot: input.workspaceRoot == null ? null : normalizeRuntimeOptions({ workspaceRoot: input.workspaceRoot }).workspaceRoot,
    value,
  };
}
