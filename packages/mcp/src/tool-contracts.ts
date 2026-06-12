import type {
  OpenSemanticAppOptions,
  SemanticRuntimeAppBuilderQueryCatalogRequest,
  SemanticRuntimeAppBuilderQueryRequest,
  SemanticAppQuery,
  SemanticRuntimeAppQueryBatchRequest,
  SemanticRuntimeAppQueryRequest,
  SemanticRuntimeAnalysisCacheClearRequest,
  SemanticRuntimeAnalysisCacheOverviewRequest,
  SemanticRuntimeOptions,
  SemanticRuntimePageInput,
  SemanticRuntimeSourceCursorInput,
  SemanticRuntimeSourceFileInput,
} from '@aurelia-ls/semantic-runtime';

declare const __AURELIA_MCP_SERVER_VERSION__: string | undefined;

export const AURELIA_MCP_SERVER_NAME = 'au-mcp' as const;
export const AURELIA_MCP_SERVER_VERSION = typeof __AURELIA_MCP_SERVER_VERSION__ === 'string'
  ? __AURELIA_MCP_SERVER_VERSION__
  : '0.1.0';

export const aureliaMcpToolNames = {
  workspaceOverview: 'aurelia_workspace_overview',
  analysisCacheOverview: 'aurelia_analysis_cache_overview',
  clearAnalysisCache: 'aurelia_clear_analysis_cache',
  appQueryCatalog: 'aurelia_app_query_catalog',
  appBuilderCatalog: 'aurelia_app_builder_catalog',
  appBuilderQuery: 'aurelia_app_builder_query',
  appOverview: 'aurelia_app_overview',
  routerOverview: 'aurelia_router_overview',
  appQuery: 'aurelia_app_query',
  appQueryBatch: 'aurelia_app_query_batch',
  openSeamOverview: 'aurelia_open_seam_overview',
  diagnosticOverview: 'aurelia_diagnostic_overview',
  appDiagnostics: 'aurelia_app_diagnostics',
  templateCursorInfo: 'aurelia_template_cursor_info',
  templateCompletions: 'aurelia_template_completions',
  templateDiagnostics: 'aurelia_template_diagnostics',
} as const;

export interface AureliaMcpWorkspaceInput extends SemanticRuntimeOptions {
  readonly workspaceRoot: string;
}

export interface AureliaMcpOpenAppInput extends AureliaMcpWorkspaceInput, OpenSemanticAppOptions {
  readonly appRetention?: SemanticRuntimeAppQueryRequest['appRetention'];
  readonly continuationIntents?: SemanticRuntimeAppQueryRequest['continuationIntents'];
}

export interface AureliaMcpPagedInput {
  readonly page?: SemanticRuntimePageInput | null;
  readonly detail?: SemanticAppQuery['detail'] | null;
}

export interface AureliaMcpWorkspaceOverviewInput extends AureliaMcpWorkspaceInput {
  readonly projectPage?: SemanticRuntimePageInput | null;
}

export interface AureliaMcpAnalysisCacheOverviewInput {
  readonly workspaceRoot?: string | null;
  readonly storeKey?: string | null;
  readonly projectDiscovery?: SemanticRuntimeOptions['projectDiscovery'] | null;
  readonly projects?: SemanticRuntimeOptions['projects'] | null;
  readonly includeKernelBreakdowns?: SemanticRuntimeAnalysisCacheOverviewRequest['includeKernelBreakdowns'];
  readonly includeDetailDensity?: SemanticRuntimeAnalysisCacheOverviewRequest['includeDetailDensity'];
  readonly includeQueryClaimRows?: SemanticRuntimeAnalysisCacheOverviewRequest['includeQueryClaimRows'];
  readonly rowLimit?: SemanticRuntimeAnalysisCacheOverviewRequest['rowLimit'];
}

export interface AureliaMcpClearAnalysisCacheInput {
  readonly workspaceRoot?: string | null;
  readonly storeKey?: string | null;
  readonly projectDiscovery?: SemanticRuntimeOptions['projectDiscovery'] | null;
  readonly projects?: SemanticRuntimeOptions['projects'] | null;
  readonly typeSystemDependencyCacheClearPolicy?: SemanticRuntimeAnalysisCacheClearRequest['typeSystemDependencyCacheClearPolicy'];
}

export interface AureliaMcpAppQueryCatalogInput {
  /** Optional host cwd hint for local clients that want all responses to carry a workspace label. */
  readonly workspaceRoot?: string | null;
  /** Optional query group filter such as `router`, `template`, or `binding`. */
  readonly group?: string | null;
  /** Optional exact query kind filter. */
  readonly queryKind?: SemanticAppQuery['kind'] | null;
}

export interface AureliaMcpAppBuilderCatalogInput extends SemanticRuntimeAppBuilderQueryCatalogRequest {
  /** Optional host cwd hint for local clients that want all responses to carry a workspace label. */
  readonly workspaceRoot?: string | null;
  readonly storeKey?: string | null;
}

export interface AureliaMcpAppBuilderQueryInput extends Omit<SemanticRuntimeAppBuilderQueryRequest, 'kind'> {
  /** Optional host cwd hint for local clients that want all responses to carry a workspace label. */
  readonly workspaceRoot?: string | null;
  readonly storeKey?: string | null;
  readonly queryKind: SemanticRuntimeAppBuilderQueryRequest['kind'];
}

export interface AureliaMcpAppQueryInput extends AureliaMcpOpenAppInput, AureliaMcpPagedInput {
  readonly queryKind: SemanticAppQuery['kind'];
  readonly cursor?: SemanticRuntimeSourceCursorInput | null;
  readonly sourceFile?: SemanticRuntimeSourceFileInput | null;
  readonly diagnosticProjection?: SemanticAppQuery['diagnosticProjection'];
  readonly openSeamKindKey?: SemanticAppQuery['openSeamKindKey'];
  readonly openSeamReasonKind?: SemanticAppQuery['openSeamReasonKind'];
  readonly sourceRole?: SemanticAppQuery['sourceRole'];
}

export interface AureliaMcpAppQueryBatchInput extends AureliaMcpOpenAppInput {
  readonly queries: SemanticRuntimeAppQueryBatchRequest['queries'];
  readonly includeAppProfile?: SemanticRuntimeAppQueryBatchRequest['includeAppProfile'];
  readonly includeAppQueryClaimProfiles?: SemanticRuntimeAppQueryBatchRequest['includeAppQueryClaimProfiles'];
}

export interface AureliaMcpAppOverviewInput extends AureliaMcpOpenAppInput {
  readonly diagnosticPageSize?: number | null;
  readonly openSeamPageSize?: number | null;
}

export interface AureliaMcpRouterOverviewInput extends AureliaMcpOpenAppInput {
  readonly rowPageSize?: number | null;
  readonly detail?: SemanticAppQuery['detail'] | null;
}

export interface AureliaMcpAppDiagnosticsInput extends AureliaMcpOpenAppInput, AureliaMcpPagedInput {
  readonly sourceFile?: SemanticRuntimeSourceFileInput | null;
  readonly diagnosticProjection?: SemanticAppQuery['diagnosticProjection'];
}

export interface AureliaMcpDiagnosticOverviewInput extends AureliaMcpAppDiagnosticsInput {}

export interface AureliaMcpOpenSeamOverviewInput extends AureliaMcpOpenAppInput, AureliaMcpPagedInput {
  readonly sourceFile?: SemanticRuntimeSourceFileInput | null;
  readonly openSeamKindKey?: SemanticAppQuery['openSeamKindKey'];
  readonly openSeamReasonKind?: SemanticAppQuery['openSeamReasonKind'];
  readonly sourceRole?: SemanticAppQuery['sourceRole'];
}

export interface AureliaMcpTemplateCursorInput extends AureliaMcpWorkspaceInput, AureliaMcpPagedInput {
  readonly cursor: SemanticRuntimeSourceCursorInput;
  readonly projectKey?: string | null;
  readonly analysisDepth?: OpenSemanticAppOptions['analysisDepth'] | null;
  readonly includeAuthoringTemplates?: boolean | null;
  readonly authoringTemplateSourceFiles?: readonly string[] | null;
  readonly authoringTemplateLimit?: number | null;
  readonly appRetention?: SemanticRuntimeAppQueryRequest['appRetention'];
}

export interface AureliaMcpTemplateDiagnosticsInput extends AureliaMcpWorkspaceInput, AureliaMcpPagedInput {
  readonly sourceFile?: SemanticRuntimeSourceFileInput | null;
  readonly diagnosticProjection?: SemanticAppQuery['diagnosticProjection'];
  readonly projectKey?: string | null;
  readonly analysisDepth?: OpenSemanticAppOptions['analysisDepth'] | null;
  readonly includeAuthoringTemplates?: boolean | null;
  readonly authoringTemplateSourceFiles?: readonly string[] | null;
  readonly authoringTemplateLimit?: number | null;
  readonly appRetention?: SemanticRuntimeAppQueryRequest['appRetention'];
}

export interface AureliaMcpResponse<TValue> {
  readonly tool: string;
  readonly generatedAt: string;
  readonly workspaceRoot: string | null;
  readonly value: TValue;
}
