import { z } from 'zod/v4';
import {
  SEMANTIC_APP_RETENTION_POLICIES,
  SEMANTIC_APP_ANALYSIS_DEPTHS,
  SEMANTIC_DIAGNOSTIC_PROJECTION_POLICIES,
  INQUIRY_CONTINUATION_INTENTS,
  SEMANTIC_PROJECT_DISCOVERY_MODES,
  SEMANTIC_RUNTIME_DETAIL_VALUES,
  SEMANTIC_TYPE_SYSTEM_DEPENDENCY_CACHE_CLEAR_POLICIES,
  SemanticObservedDependencyLocusKind,
} from '@aurelia-ls/semantic-runtime';

const appQueryKindSchema = z.string()
  .describe('App query kind; discover values with aurelia_app_query_catalog.');

const pageSchema = z.object({
  size: z.number().int().nonnegative().optional()
    .describe('Rows to return. Omit for default; use 0 for summary rollup only; large values clamp to the MCP transport limit.'),
  cursor: z.string().nullable().optional()
    .describe('Opaque cursor from the prior page; omit first, pass back unchanged.'),
}).strict().describe('Paging envelope for row and summary-row queries.');

const sourceFileInputSchema = z.object({
  path: z.string()
    .describe('Project-relative or absolute source path for explicit project input.'),
  language: z.string().optional()
    .describe('Optional language hint; omit to infer from path.'),
  role: z.string().optional()
    .describe('Optional source-role override; omit for normal discovery.'),
  note: z.string().nullable().optional()
    .describe('Optional note; does not affect analysis.'),
}).strict().describe('Explicit source file for custom project input, not app-query sourceFile.');

const projectSchema = z.object({
  rootDir: z.string()
    .describe('Project root; absolute or under workspaceRoot. Omit projects for discovery.'),
  projectKey: z.string().optional()
    .describe('Optional stable project key; omit to derive from root.'),
  sourceFiles: z.array(sourceFileInputSchema).optional()
    .describe('Optional explicit source files for clean-room/synthetic projects.'),
  sourceDiscoveryOptions: z.unknown().optional()
    .describe('Optional advanced source-discovery options.'),
}).passthrough().describe('Explicit project boot input; omit for normal discovery.');

const workspaceRootSchema = z.string()
  .describe('Absolute workspace root to boot.');

const optionalWorkspaceRootSchema = z.string().nullable().optional()
  .describe('Optional workspace root; omit to use the MCP process cwd.');

const storeKeySchema = z.string().optional()
  .describe('Optional cache key; omit to derive from workspaceRoot.');

const optionalStoreKeySchema = z.string().nullable().optional()
  .describe('Optional cache key; omit to derive from workspaceRoot.');

const projectsSchema = z.array(projectSchema).optional()
  .describe('Optional explicit projects; omit for discovery.');

const optionalProjectsSchema = z.array(projectSchema).nullable().optional()
  .describe('Optional explicit projects; omit for discovery.');

const projectDiscoverySchema = z.enum(SEMANTIC_PROJECT_DISCOVERY_MODES).optional()
  .describe('Discovery mode; omit for default, use package-tsconfig for monorepos.');

const optionalProjectDiscoverySchema = z.enum(SEMANTIC_PROJECT_DISCOVERY_MODES).nullable().optional()
  .describe('Optional discovery mode; omit for default.');

const projectKeySchema = z.string().nullable().optional()
  .describe('Optional key from aurelia_workspace_overview; omit for default app.');

const sourceFilePathSchema = z.string().nullable().optional()
  .describe('Top-level file selector. Unsupported query families return result=unsupported instead of ignoring it.');

const analysisDepthSchema = z.enum(SEMANTIC_APP_ANALYSIS_DEPTHS).nullable().optional()
  .describe('Optional analysis depth; omit for catalog-driven auto-depth.');

const includeAuthoringTemplatesSchema = z.boolean().nullable().optional()
  .describe('Include standalone resource-library templates; omit normally.');

const authoringTemplateSourceFilesSchema = z.array(z.string()).nullable().optional()
  .describe('Optional files for standalone template compilation.');

const authoringTemplateLimitSchema = z.number().int().nonnegative().nullable().optional()
  .describe('Optional cap for standalone template compilation.');

const appRetentionSchema = z.enum(SEMANTIC_APP_RETENTION_POLICIES).nullable().optional()
  .describe('App retention. Use retain-app when follow-up calls should share an epoch.');

const continuationIntentSchema = z.array(z.enum(INQUIRY_CONTINUATION_INTENTS)).nullable().optional()
  .describe('Optional continuation intent filter; omit for all truthful next moves.');

const detailSchema = z.enum(SEMANTIC_RUNTIME_DETAIL_VALUES).nullable().optional()
  .describe('Detail level; omit for compact, use handles for kernel handles.');

const diagnosticProjectionSchema = z.enum(SEMANTIC_DIAGNOSTIC_PROJECTION_POLICIES).nullable().optional()
  .describe('Diagnostic projection; use type-projection when TypeChecker cost is wanted.');

const sourceFileSchema = z.object({
  filePath: z.string()
    .describe('Per-query file locus. Check supportsSourceFile in aurelia_app_query_catalog first.'),
}).strict().describe('Per-query file locus for supportsSourceFile=true query families.');

const cursorSchema = sourceFileSchema.extend({
  line: z.number().int().nonnegative()
    .describe('Zero-based source line for a template cursor.'),
  character: z.number().int().nonnegative()
    .describe('Zero-based character; use member token for member-owner type answers.'),
  offset: z.number().int().nonnegative().nullable().optional()
    .describe('Optional zero-based offset when the editor already has it.'),
}).strict().describe('Source cursor for template cursor/completion queries.');

const observedDependencyLocusSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal(SemanticObservedDependencyLocusKind.Project)
      .describe('Select every dependency occurrence in the project.'),
  }).strict().describe('Project-wide observed-dependency locus.'),
  z.object({
    kind: z.literal(SemanticObservedDependencyLocusKind.SourceFile)
      .describe('Select dependency occurrences anchored to one source file.'),
    sourceFile: sourceFileSchema,
  }).strict().describe('Source-file observed-dependency locus.'),
  z.object({
    kind: z.literal(SemanticObservedDependencyLocusKind.Owner)
      .describe('Select dependency occurrences for one returned owner key.'),
    ownerKey: z.string()
      .describe('Opaque owner key returned by an observed-dependency row.'),
  }).strict().describe('Owner-scoped observed-dependency locus.'),
  z.object({
    kind: z.literal(SemanticObservedDependencyLocusKind.Row)
      .describe('Select one returned dependency row.'),
    rowKey: z.string()
      .describe('Answer-local row key returned by an observed-dependency row.'),
  }).strict().describe('Single-row observed-dependency locus.'),
  z.object({
    kind: z.literal(SemanticObservedDependencyLocusKind.Cluster)
      .describe('Select dependency occurrences for one returned summary cluster.'),
    clusterKey: z.string()
      .describe('Answer-local cluster key returned by a dependency summary row.'),
  }).strict().describe('Summary-cluster observed-dependency locus.'),
]).describe('Family-owned observed-dependency locus returned by dependency row and summary queries.');

const workspaceShape = {
  workspaceRoot: workspaceRootSchema,
  storeKey: storeKeySchema,
  projects: projectsSchema,
  projectDiscovery: projectDiscoverySchema,
} as const;

const optionalRuntimeSelectorShape = {
  workspaceRoot: optionalWorkspaceRootSchema,
  storeKey: optionalStoreKeySchema,
  projects: optionalProjectsSchema,
  projectDiscovery: optionalProjectDiscoverySchema,
} as const;

const appRetentionShape = {
  appRetention: appRetentionSchema,
} as const;

const continuationIntentShape = {
  continuationIntents: continuationIntentSchema,
} as const;

const openAppShape = {
  ...workspaceShape,
  projectKey: projectKeySchema,
  sourceFilePath: sourceFilePathSchema,
  analysisDepth: analysisDepthSchema,
  includeAuthoringTemplates: includeAuthoringTemplatesSchema,
  authoringTemplateSourceFiles: authoringTemplateSourceFilesSchema,
  authoringTemplateLimit: authoringTemplateLimitSchema,
  ...appRetentionShape,
  ...continuationIntentShape,
} as const;

const pagedShape = {
  page: pageSchema.nullable().optional()
    .describe('Optional page request; use page.size=0 for rollup-only summaries.'),
  detail: detailSchema,
} as const;

const diagnosticProjectionShape = {
  diagnosticProjection: diagnosticProjectionSchema,
} as const;

const semanticAppQuerySchema = z.object({
  kind: appQueryKindSchema,
  ...pagedShape,
  ...diagnosticProjectionShape,
  ...continuationIntentShape,
  includeTypeSurfaces: z.boolean().nullable().optional()
    .describe('Include query-local TypeChecker type surfaces; omit for compact calls.'),
  diagnosticPageSize: z.number().int().positive().nullable().optional()
    .describe('App-overview diagnostic sample size.'),
  openSeamPageSize: z.number().int().positive().nullable().optional()
    .describe('App-overview open-seam sample size.'),
  openSeamKindKey: z.string().nullable().optional()
    .describe('Open-seam kind filter; use with open-seam query families.'),
  openSeamReasonKind: z.string().nullable().optional()
    .describe('Open-seam reason-kind filter.'),
  sourceRole: z.string().nullable().optional()
    .describe('Open-seam source-role filter.'),
  openSeamClusterKey: z.string().nullable().optional()
    .describe('Answer-local open-seam cluster key returned by open-seam-summary.'),
  openSeamSiteKey: z.string().nullable().optional()
    .describe('Answer-local authored-site key returned by open-seam-sites or open-seams.'),
  rowPageSize: z.number().int().nonnegative().nullable().optional()
    .describe('Router overview row-sample size.'),
  cursor: cursorSchema.nullable().optional()
    .describe('Cursor locus for cursor query kinds.'),
  sourceFile: sourceFileSchema.nullable().optional()
    .describe('Per-query file locus. Check supportsSourceFile in aurelia_app_query_catalog.'),
  observedDependencyLocus: observedDependencyLocusSchema.nullable().optional()
    .describe('Optional project, file, owner, row, or summary-cluster locus for observed-dependency query families.'),
  includeDeclaration: z.boolean().nullable().optional()
    .describe('Include the declaration in template-reference results when the catalog admits it.'),
  newName: z.string().nullable().optional()
    .describe('Replacement name for template rename planning; omit for prepare-only queries.'),
}).strict().describe('Child app query for aurelia_app_query_batch.');

export const workspaceOverviewInputSchema = {
  ...workspaceShape,
  projectPage: pageSchema.nullable().optional()
    .describe('Optional project-row page; omit for counts/app candidates only.'),
} as const;

export const analysisCacheOverviewInputSchema = {
  ...optionalRuntimeSelectorShape,
  includeKernelBreakdowns: z.boolean().nullable().optional()
    .describe('Include kernel-density breakdowns; omit for low-token checks.'),
  includeDetailDensity: z.boolean().nullable().optional()
    .describe('Include product/hot-detail density; for profiling.'),
  includeQueryClaimRows: z.boolean().nullable().optional()
    .describe('Include retained query-claim rows; omit normally.'),
  rowLimit: z.number().int().nonnegative().nullable().optional()
    .describe('Maximum breakdown rows.'),
} as const;

export const clearAnalysisCacheInputSchema = {
  ...optionalRuntimeSelectorShape,
  typeSystemDependencyCacheClearPolicy: z.enum(SEMANTIC_TYPE_SYSTEM_DEPENDENCY_CACHE_CLEAR_POLICIES).nullable().optional()
    .describe('Dependency SourceFile cache policy; omit to keep warm libs.'),
} as const;

export const appQueryCatalogInputSchema = {
  workspaceRoot: optionalWorkspaceRootSchema,
  group: z.string().nullable().optional()
    .describe('Optional catalog group filter; omit for all groups.'),
  queryKind: appQueryKindSchema.nullable().optional()
    .describe('Optional exact query kind; omit for the menu.'),
} as const;

export const patternMenuInputSchema = {
  query: z.string().nullable().optional()
    .describe('Optional case-insensitive search over pattern id, title, and summary.'),
} as const;

export const patternExampleInputSchema = {
  patternId: z.string()
    .describe('Stable pattern id returned by aurelia_pattern_menu.'),
} as const;

export const docsSearchInputSchema = {
  query: z.string().min(1)
    .describe('Non-empty search text for the bundled Aurelia docs corpus.'),
  documentPathPrefix: z.string().nullable().optional()
    .describe('Optional docs path prefix such as router/ or templates/. Omit for all current docs except permanently excluded search surfaces.'),
  page: pageSchema.nullable().optional()
    .describe('Optional page request; large sizes clamp. Use nextCursor from the prior docs search response.'),
} as const;

export const docsFetchInputSchema = {
  documentPath: z.string()
    .describe('Docs path returned by aurelia_docs_search, such as router/route-parameters.md.'),
  sectionAnchor: z.string().nullable().optional()
    .describe('Optional section anchor returned by aurelia_docs_search; omit for a compact page fetch.'),
  maxChars: z.number().int().positive().nullable().optional()
    .describe('Optional content character budget; omitted uses a compact default and large values clamp.'),
} as const;

export const appQueryInputSchema = {
  ...openAppShape,
  ...pagedShape,
  ...diagnosticProjectionShape,
  ...continuationIntentShape,
  queryKind: appQueryKindSchema,
  cursor: cursorSchema.nullable().optional()
    .describe('Cursor locus. Use member token for member-owner type answers.'),
  sourceFile: sourceFileSchema.nullable().optional()
    .describe('Per-query file scope. Check supportsSourceFile; unsupported returns result=unsupported.'),
  includeTypeSurfaces: z.boolean().nullable().optional()
    .describe('Include query-local TypeChecker type surfaces when the selected query admits them.'),
  diagnosticPageSize: z.number().int().positive().nullable().optional()
    .describe('App-overview diagnostic sample size.'),
  openSeamPageSize: z.number().int().positive().nullable().optional()
    .describe('App-overview open-seam sample size.'),
  openSeamKindKey: z.string().nullable().optional()
    .describe('Open-seam kind filter.'),
  openSeamReasonKind: z.string().nullable().optional()
    .describe('Open-seam reason-kind filter.'),
  sourceRole: z.string().nullable().optional()
    .describe('Open-seam source-role filter.'),
  openSeamClusterKey: z.string().nullable().optional()
    .describe('Answer-local open-seam cluster key returned by open-seam-summary.'),
  openSeamSiteKey: z.string().nullable().optional()
    .describe('Answer-local authored-site key returned by open-seam-sites or open-seams.'),
  observedDependencyLocus: observedDependencyLocusSchema.nullable().optional()
    .describe('Optional project, file, owner, row, or summary-cluster locus for observed-dependency query families.'),
  rowPageSize: z.number().int().nonnegative().nullable().optional()
    .describe('Router overview row-sample size.'),
  includeDeclaration: z.boolean().nullable().optional()
    .describe('Include the declaration in template-reference results when the catalog admits it.'),
  newName: z.string().nullable().optional()
    .describe('Replacement name for template rename planning; omit for prepare-only queries.'),
} as const;

export const appQueryBatchInputSchema = {
  ...openAppShape,
  ...continuationIntentShape,
  queries: z.array(semanticAppQuerySchema).min(1)
    .describe('Child app queries through one opened app/query-claim boundary.'),
  includeAppProfile: z.boolean().nullable().optional()
    .describe('Include app construction profile; omit normally.'),
  includeAppQueryClaimProfiles: z.boolean().nullable().optional()
    .describe('Include query-claim profiles; omit unless profiling.'),
} as const;

export const appOverviewInputSchema = {
  ...openAppShape,
  diagnosticPageSize: z.number().int().positive().nullable().optional()
    .describe('Diagnostic sample size inside app overview.'),
  openSeamPageSize: z.number().int().positive().nullable().optional()
    .describe('Open-seam site sample size inside app overview.'),
} as const;

export const routerOverviewInputSchema = {
  ...openAppShape,
  rowPageSize: z.number().int().nonnegative().nullable().optional()
    .describe('Sample rows per router-owned collection.'),
  detail: detailSchema,
} as const;

export const openSeamOverviewInputSchema = {
  ...openAppShape,
  ...pagedShape,
  sourceFile: sourceFileSchema.nullable().optional()
    .describe('Per-query open-seam file scope.'),
  openSeamKindKey: z.string().nullable().optional()
    .describe('Open-seam kind filter.'),
  openSeamReasonKind: z.string().nullable().optional()
    .describe('Open-seam reason-kind filter.'),
  sourceRole: z.string().nullable().optional()
    .describe('Open-seam source-role filter.'),
  openSeamClusterKey: z.string().nullable().optional()
    .describe('Answer-local open-seam cluster key returned by open-seam-summary.'),
  openSeamSiteKey: z.string().nullable().optional()
    .describe('Answer-local authored-site key returned by open-seam-sites or open-seams.'),
} as const;

export const appDiagnosticsInputSchema = {
  ...openAppShape,
  ...pagedShape,
  ...diagnosticProjectionShape,
  ...continuationIntentShape,
  sourceFile: sourceFileSchema.nullable().optional()
    .describe('Per-query diagnostics file scope.'),
} as const;

export const diagnosticOverviewInputSchema = appDiagnosticsInputSchema;

export const templateCursorInputSchema = {
  ...workspaceShape,
  ...pagedShape,
  ...continuationIntentShape,
  ...appRetentionShape,
  cursor: cursorSchema,
  projectKey: projectKeySchema,
  analysisDepth: analysisDepthSchema,
  includeAuthoringTemplates: includeAuthoringTemplatesSchema,
  authoringTemplateSourceFiles: authoringTemplateSourceFilesSchema,
  authoringTemplateLimit: authoringTemplateLimitSchema,
} as const;

export const templateDiagnosticsInputSchema = {
  ...workspaceShape,
  ...pagedShape,
  ...diagnosticProjectionShape,
  ...continuationIntentShape,
  ...appRetentionShape,
  sourceFile: sourceFileSchema.nullable().optional()
    .describe('Optional template diagnostics file scope.'),
  projectKey: projectKeySchema,
  analysisDepth: analysisDepthSchema,
  includeAuthoringTemplates: includeAuthoringTemplatesSchema,
  authoringTemplateSourceFiles: authoringTemplateSourceFilesSchema,
  authoringTemplateLimit: authoringTemplateLimitSchema,
} as const;

export const aureliaMcpResponseOutputSchema = {
  tool: z.string()
    .describe('MCP tool name.'),
  generatedAt: z.string()
    .describe('ISO response timestamp.'),
  workspaceRoot: z.string().nullable()
    .describe('Normalized workspace root or null.'),
  value: z.unknown()
    .describe('Semantic-runtime answer or structured value.'),
} as const;
