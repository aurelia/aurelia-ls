import type {
  OpenSemanticAppOptions,
  SemanticAppQuery,
  SemanticRuntimeAppQueryBatchRequest,
  SemanticRuntimeAppQueryRequest,
  SemanticRuntimeAnalysisCacheClearRequest,
  SemanticRuntimeAnalysisCacheOverviewRequest,
  SemanticNativeProjectConfigurationsRequest,
  SemanticRuntimePageInput,
  SemanticRuntimeSourceCursorInput,
  SemanticRuntimeSourceFileInput,
  SemanticWorkspaceDescriptor,
} from '@aurelia-ls/semantic-runtime';

declare const __AURELIA_MCP_SERVER_VERSION__: string | undefined;

export const AURELIA_MCP_SERVER_NAME = 'au-mcp' as const;
export const AURELIA_MCP_SERVER_VERSION = typeof __AURELIA_MCP_SERVER_VERSION__ === 'string'
  ? __AURELIA_MCP_SERVER_VERSION__
  : '0.1.0';

export const aureliaMcpToolNames = {
  workspaceOverview: 'aurelia_workspace_overview',
  projectConfigurations: 'aurelia_project_configurations',
  analysisCacheOverview: 'aurelia_analysis_cache_overview',
  clearAnalysisCache: 'aurelia_clear_analysis_cache',
  appQueryCatalog: 'aurelia_app_query_catalog',
  patternMenu: 'aurelia_pattern_menu',
  patternExample: 'aurelia_pattern_example',
  docsSearch: 'aurelia_docs_search',
  docsFetch: 'aurelia_docs_fetch',
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

export interface AureliaMcpWorkspaceInput {
  readonly workspaceRoot: string;
  /** Existing project roots known by the caller and interpreted by shared semantic-runtime discovery. */
  readonly projectRootHints?: readonly string[] | null;
  /** Hard authored-source/workspace boundaries shared with IDE and future AOT consumers. */
  readonly excludedWorkspaceRoots?: readonly string[] | null;
}

export interface AureliaMcpOpenAppInput
  extends AureliaMcpWorkspaceInput, Omit<OpenSemanticAppOptions, 'telemetry'> {
  readonly appRetention?: SemanticRuntimeAppQueryRequest['appRetention'];
  readonly continuationIntents?: SemanticRuntimeAppQueryRequest['continuationIntents'];
}

export interface AureliaMcpPageInput {
  readonly page?: SemanticRuntimePageInput | null;
}

export interface AureliaMcpDetailInput {
  readonly detail?: SemanticAppQuery['detail'] | null;
}

export interface AureliaMcpWorkspaceOverviewInput extends AureliaMcpWorkspaceInput {
  readonly projectPage?: SemanticRuntimePageInput | null;
}

export interface AureliaMcpProjectConfigurationsInput extends AureliaMcpWorkspaceInput {
  /** Select configuration inventory (default) or exact runtime-static diagnostic rows. */
  readonly view?: 'configurations' | 'diagnostics' | null;
  readonly projectKey?: SemanticNativeProjectConfigurationsRequest['projectKey'];
  readonly sourceFilePaths?: SemanticNativeProjectConfigurationsRequest['sourceFilePaths'];
  readonly page?: SemanticNativeProjectConfigurationsRequest['page'];
}

/** Exact semantic workspace selector for cache-control tools; omit the whole selector to address every session. */
export type AureliaMcpCacheWorkspaceSelector = AureliaMcpWorkspaceInput;

export interface AureliaMcpAnalysisCacheOverviewInput {
  readonly workspace?: AureliaMcpCacheWorkspaceSelector | null;
  readonly includeKernelBreakdowns?: SemanticRuntimeAnalysisCacheOverviewRequest['includeKernelBreakdowns'];
  readonly includeDetailDensity?: SemanticRuntimeAnalysisCacheOverviewRequest['includeDetailDensity'];
  readonly includeQueryClaimRows?: SemanticRuntimeAnalysisCacheOverviewRequest['includeQueryClaimRows'];
  readonly rowLimit?: SemanticRuntimeAnalysisCacheOverviewRequest['rowLimit'];
}

export interface AureliaMcpClearAnalysisCacheInput {
  readonly workspace?: AureliaMcpCacheWorkspaceSelector | null;
  readonly typeSystemDependencyCacheClearPolicy?: SemanticRuntimeAnalysisCacheClearRequest['typeSystemDependencyCacheClearPolicy'];
}

export interface AureliaMcpAppQueryCatalogInput {
  /** Optional query group filter such as `router`, `template`, or `binding`. */
  readonly group?: string | null;
  /** Optional exact query kind filter. */
  readonly queryKind?: SemanticAppQuery['kind'] | null;
}

export interface AureliaMcpPatternMenuInput {
  /** Optional case-insensitive search over pattern id, title, and summary. */
  readonly query?: string | null;
}

export interface AureliaMcpPatternExampleInput {
  /** Stable pattern id returned by aurelia_pattern_menu. */
  readonly patternId: string;
}

export interface AureliaMcpDocsSearchInput {
  /** Non-empty search text for bundled Aurelia docs. */
  readonly query: string;
  /** Optional docs path prefix such as router/ or templates/. */
  readonly documentPathPrefix?: string | null;
  /** Optional page request; large sizes clamp. */
  readonly page?: SemanticRuntimePageInput | null;
}

export interface AureliaMcpDocsFetchInput {
  /** Docs path returned by aurelia_docs_search, such as router/route-parameters.md. */
  readonly documentPath: string;
  /** Optional section anchor returned by aurelia_docs_search; omit for a compact page fetch. */
  readonly sectionAnchor?: string | null;
  /** Optional content character budget; omitted uses a compact default and large values clamp. */
  readonly maxChars?: number | null;
}

export interface AureliaMcpAppQueryInput extends AureliaMcpOpenAppInput, AureliaMcpPageInput, AureliaMcpDetailInput {
  readonly queryKind: SemanticAppQuery['kind'];
  readonly cursor?: SemanticRuntimeSourceCursorInput | null;
  readonly sourceFile?: SemanticRuntimeSourceFileInput | null;
  readonly diagnosticProjection?: SemanticAppQuery['diagnosticProjection'];
  readonly includeTypeSurfaces?: SemanticAppQuery['includeTypeSurfaces'];
  readonly diagnosticPageSize?: SemanticAppQuery['diagnosticPageSize'];
  readonly openSeamPageSize?: SemanticAppQuery['openSeamPageSize'];
  readonly openSeamKindKey?: SemanticAppQuery['openSeamKindKey'];
  readonly openSeamReasonKind?: SemanticAppQuery['openSeamReasonKind'];
  readonly sourceRole?: SemanticAppQuery['sourceRole'];
  readonly openSeamClusterKey?: SemanticAppQuery['openSeamClusterKey'];
  readonly openSeamSiteKey?: SemanticAppQuery['openSeamSiteKey'];
  readonly observedDependencyLocus?: SemanticAppQuery['observedDependencyLocus'];
  readonly rowPageSize?: SemanticAppQuery['rowPageSize'];
  readonly includeDeclaration?: SemanticAppQuery['includeDeclaration'];
  readonly newName?: SemanticAppQuery['newName'];
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

export interface AureliaMcpAppDiagnosticsInput extends AureliaMcpOpenAppInput, AureliaMcpPageInput, AureliaMcpDetailInput {
  readonly sourceFile?: SemanticRuntimeSourceFileInput | null;
  readonly diagnosticProjection?: SemanticAppQuery['diagnosticProjection'];
}

export interface AureliaMcpDiagnosticOverviewInput extends AureliaMcpAppDiagnosticsInput {}

export interface AureliaMcpOpenSeamOverviewInput extends AureliaMcpOpenAppInput, AureliaMcpPageInput {
  readonly sourceFile?: SemanticRuntimeSourceFileInput | null;
  readonly openSeamKindKey?: SemanticAppQuery['openSeamKindKey'];
  readonly openSeamReasonKind?: SemanticAppQuery['openSeamReasonKind'];
  readonly sourceRole?: SemanticAppQuery['sourceRole'];
  readonly openSeamClusterKey?: SemanticAppQuery['openSeamClusterKey'];
  readonly openSeamSiteKey?: SemanticAppQuery['openSeamSiteKey'];
}

export interface AureliaMcpTemplateCursorInput extends AureliaMcpWorkspaceInput, AureliaMcpDetailInput {
  readonly cursor: SemanticRuntimeSourceCursorInput;
  readonly projectKey?: string | null;
  readonly analysisDepth?: OpenSemanticAppOptions['analysisDepth'] | null;
  readonly includeAuthoringTemplates?: boolean | null;
  readonly authoringTemplateSourceFiles?: readonly string[] | null;
  readonly authoringTemplateLimit?: number | null;
  readonly appRetention?: SemanticRuntimeAppQueryRequest['appRetention'];
}

export interface AureliaMcpTemplateCompletionsInput extends AureliaMcpTemplateCursorInput, AureliaMcpPageInput {}

export interface AureliaMcpTemplateDiagnosticsInput extends AureliaMcpWorkspaceInput, AureliaMcpPageInput, AureliaMcpDetailInput {
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
  /** Exact shared semantic source-world input used by this call; null for static or all-session tools. */
  readonly workspaceDescriptor: SemanticWorkspaceDescriptor | null;
  readonly value: TValue;
}
