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
} from '@aurelia-ls/semantic-runtime';
import { SemanticRuntimeSessionRegistry, normalizeRuntimeOptions } from './session-registry.js';
import {
  aureliaMcpToolNames,
  type AureliaMcpAnalysisCacheOverviewInput,
  type AureliaMcpAppDiagnosticsInput,
  type AureliaMcpAppOverviewInput,
  type AureliaMcpAppQueryBatchInput,
  type AureliaMcpAppQueryInput,
  type AureliaMcpAuthoringCatalogInput,
  type AureliaMcpAuthoringRecipePlanInput,
  type AureliaMcpAuthoringOrientationInput,
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

export class AureliaMcpSemanticRuntimeAdapter {
  constructor(
    private readonly sessions = new SemanticRuntimeSessionRegistry(),
  ) {}

  async workspaceOverview(input: AureliaMcpWorkspaceOverviewInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    const runtime = await this.sessions.runtime(runtimeOptions(input));
    return toolResponse(aureliaMcpToolNames.workspaceOverview, input, runtime.summary({
      projectPage: input.projectPage ?? undefined,
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

  async authoringCatalog(input: AureliaMcpAuthoringCatalogInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    const runtime = await this.sessions.runtime(runtimeOptions(input));
    return toolResponse(
      aureliaMcpToolNames.authoringCatalog,
      input,
      runtime.authoringCatalogView({
        view: input.catalogView ?? 'overview',
        inquiryProfile: 'mcp-orientation',
      }),
    );
  }

  async authoringRecipePlan(input: AureliaMcpAuthoringRecipePlanInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    const runtime = await this.sessions.runtime(runtimeOptions(input));
    return toolResponse(
      aureliaMcpToolNames.authoringRecipePlan,
      input,
      runtime.authoringRecipePlan({
        recipeKey: input.recipeKey,
        rootDir: input.rootDir,
        appName: input.appName,
        includeText: input.includeText,
        inquiryProfile: 'mcp-authoring',
      }),
    );
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
      sourceFile: input.sourceFile ?? undefined,
      diagnosticProjection: input.diagnosticProjection ?? undefined,
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
      inquiryProfile: 'mcp-orientation',
      queries: input.queries,
    });
    return toolResponse(aureliaMcpToolNames.appQueryBatch, input, answer);
  }

  async appOverview(input: AureliaMcpAppOverviewInput): Promise<AureliaMcpResponse<unknown>> {
    return this.answerAppQuery(aureliaMcpToolNames.appOverview, input, {
      kind: SemanticAppQueryKind.AppOverview,
      diagnosticPageSize: input.diagnosticPageSize,
      openSeamPageSize: input.openSeamPageSize,
      includeAuthoringOrientation: input.includeAuthoringOrientation,
    });
  }

  async routerOverview(input: AureliaMcpRouterOverviewInput): Promise<AureliaMcpResponse<unknown>> {
    return this.answerAppQuery(aureliaMcpToolNames.routerOverview, input, {
      kind: SemanticAppQueryKind.RouterOverview,
      rowPageSize: input.rowPageSize,
      detail: input.detail ?? undefined,
    });
  }

  async authoringOrientation(input: AureliaMcpAuthoringOrientationInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    return this.answerAppQuery(aureliaMcpToolNames.authoringOrientation, input, {
      kind: SemanticAppQueryKind.AuthoringOrientation,
      page: input.page ?? undefined,
      detail: input.detail ?? undefined,
    });
  }

  async appDiagnostics(input: AureliaMcpAppDiagnosticsInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    return this.answerAppQuery(aureliaMcpToolNames.appDiagnostics, input, {
      kind: SemanticAppQueryKind.AppDiagnostics,
      page: input.page ?? undefined,
      detail: input.detail ?? undefined,
      sourceFile: input.sourceFile ?? undefined,
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
      kind: SemanticAppQueryKind.OpenSeamSummary,
      page: input.page ?? { size: 20 },
      detail: input.detail ?? undefined,
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
      sourceFile: input.sourceFile ?? undefined,
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
    const answer = await runtime.answerAppQuery({
      ...query,
      projectKey: input.projectKey ?? undefined,
      sourceFilePath: input.sourceFilePath ?? undefined,
      analysisDepth: query.analysisDepth ?? input.analysisDepth ?? semanticAppQueryCatalogRow(query.kind as SemanticAppQueryKind).minimumAnalysisDepth,
      includeAuthoringTemplates: input.includeAuthoringTemplates ?? undefined,
      authoringTemplateSourceFiles: input.authoringTemplateSourceFiles ?? undefined,
      authoringTemplateLimit: input.authoringTemplateLimit ?? undefined,
      inquiryProfile: 'mcp-orientation',
      appRetention: input.appRetention ?? 'dispose-app',
    });
    return toolResponse(toolName, input, answer);
  }
}

interface RuntimeOptionsInput extends Partial<Omit<SemanticRuntimeOptions, 'workspaceRoot'>> {
  readonly workspaceRoot?: string | null;
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
