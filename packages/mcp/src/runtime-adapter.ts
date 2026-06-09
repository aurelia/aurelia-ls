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
  type AureliaMcpAppBuilderCatalogInput,
  type AureliaMcpAppBuilderQueryInput,
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

  async appBuilderCatalog(input: AureliaMcpAppBuilderCatalogInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    const runtime = await this.sessions.runtime(runtimeOptions(input));
    return toolResponse(
      aureliaMcpToolNames.appBuilderCatalog,
      input,
      runtime.appBuilderQueryCatalog({
        group: input.group,
        queryKind: input.queryKind,
        inquiryProfile: input.inquiryProfile,
        continuationIntents: input.continuationIntents,
      }),
    );
  }

  async appBuilderQuery(input: AureliaMcpAppBuilderQueryInput): Promise<AureliaMcpResponse<SemanticRuntimeAnswer<unknown>>> {
    const runtime = await this.sessions.runtime(runtimeOptions(input));
    return toolResponse(
      aureliaMcpToolNames.appBuilderQuery,
      input,
      runtime.answerAppBuilderQuery({
        kind: input.queryKind,
        inquiryProfile: input.inquiryProfile,
        continuationIntents: input.continuationIntents,
        page: input.page ?? undefined,
        partMenu: input.partMenu,
        ontologyCatalog: input.ontologyCatalog,
        inputReadiness: input.inputReadiness,
        inputContractDetail: input.inputContractDetail,
        architectureOptions: input.architectureOptions,
        affordanceDetail: input.affordanceDetail,
        applicationPatternDetail: input.applicationPatternDetail,
        collectionConceptDetail: input.collectionConceptDetail,
        controlManifestDetail: input.controlManifestDetail,
        controlPatternDetail: input.controlPatternDetail,
        effectContractDetail: input.effectContractDetail,
        policyDetail: input.policyDetail,
        recommendationPolicy: input.recommendationPolicy,
        styleDetail: input.styleDetail,
        targetCatalog: input.targetCatalog,
        sourceLoweringPreflight: input.sourceLoweringPreflight,
        sourceLoweringInvocation: input.sourceLoweringInvocation,
        sourceLoweringComposition: input.sourceLoweringComposition,
        sourceLoweringSourcePlan: input.sourceLoweringSourcePlan,
        partSourceLoweringPreview: input.partSourceLoweringPreview,
        partSourceInvocation: input.partSourceInvocation,
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
      includeAppProfile: input.includeAppProfile ?? undefined,
      includeAppQueryClaimProfiles: input.includeAppQueryClaimProfiles ?? undefined,
      inquiryProfile: 'mcp-orientation',
      queries: continuationFilteredQueries(input.queries, input.continuationIntents),
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
      continuationIntents: query.continuationIntents ?? input.continuationIntents ?? undefined,
      inquiryProfile: 'mcp-orientation',
      appRetention: input.appRetention ?? 'dispose-app',
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
