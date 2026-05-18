import { z } from 'zod/v4';
import {
  AUTHORING_RECIPE_KEYS,
  SEMANTIC_APP_RETENTION_POLICIES,
  SEMANTIC_AUTHORING_CATALOG_VIEWS,
  SEMANTIC_APP_ANALYSIS_DEPTHS,
  SEMANTIC_APP_QUERY_KINDS,
  SEMANTIC_DIAGNOSTIC_PROJECTION_POLICIES,
  SEMANTIC_PROJECT_DISCOVERY_MODES,
  SEMANTIC_RUNTIME_DETAIL_VALUES,
  SEMANTIC_TYPE_SYSTEM_DEPENDENCY_CACHE_CLEAR_POLICIES,
} from '@aurelia-ls/semantic-runtime';

const pageSchema = z.object({
  size: z.number().int().positive().optional(),
  cursor: z.string().nullable().optional(),
}).strict();

const sourceFileInputSchema = z.object({
  path: z.string(),
  language: z.string().optional(),
  role: z.string().optional(),
  note: z.string().nullable().optional(),
}).strict();

const projectSchema = z.object({
  rootDir: z.string(),
  projectKey: z.string().optional(),
  sourceFiles: z.array(sourceFileInputSchema).optional(),
  sourceDiscoveryOptions: z.unknown().optional(),
}).passthrough();

const workspaceShape = {
  workspaceRoot: z.string(),
  storeKey: z.string().optional(),
  projects: z.array(projectSchema).optional(),
  projectDiscovery: z.enum(SEMANTIC_PROJECT_DISCOVERY_MODES).optional(),
} as const;

const optionalRuntimeSelectorShape = {
  workspaceRoot: z.string().nullable().optional(),
  storeKey: z.string().nullable().optional(),
  projects: z.array(projectSchema).nullable().optional(),
  projectDiscovery: z.enum(SEMANTIC_PROJECT_DISCOVERY_MODES).nullable().optional(),
} as const;

const appRetentionShape = {
  appRetention: z.enum(SEMANTIC_APP_RETENTION_POLICIES).nullable().optional(),
} as const;

const openAppShape = {
  ...workspaceShape,
  projectKey: z.string().nullable().optional(),
  sourceFilePath: z.string().nullable().optional(),
  analysisDepth: z.enum(SEMANTIC_APP_ANALYSIS_DEPTHS).nullable().optional(),
  includeAuthoringTemplates: z.boolean().nullable().optional(),
  authoringTemplateSourceFiles: z.array(z.string()).nullable().optional(),
  authoringTemplateLimit: z.number().int().nonnegative().nullable().optional(),
  ...appRetentionShape,
} as const;

const pagedShape = {
  page: pageSchema.nullable().optional(),
  detail: z.enum(SEMANTIC_RUNTIME_DETAIL_VALUES).nullable().optional(),
} as const;

const diagnosticProjectionShape = {
  diagnosticProjection: z.enum(SEMANTIC_DIAGNOSTIC_PROJECTION_POLICIES).nullable().optional(),
} as const;

const sourceFileSchema = z.object({
  filePath: z.string(),
}).strict();

const cursorSchema = sourceFileSchema.extend({
  line: z.number().int().nonnegative(),
  character: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative().nullable().optional(),
}).strict();

const semanticAppQuerySchema = z.object({
  kind: z.enum(SEMANTIC_APP_QUERY_KINDS),
  ...pagedShape,
  ...diagnosticProjectionShape,
  includeTypeSurfaces: z.boolean().nullable().optional(),
  diagnosticPageSize: z.number().int().positive().nullable().optional(),
  openSeamPageSize: z.number().int().positive().nullable().optional(),
  includeAuthoringOrientation: z.boolean().nullable().optional(),
  rowPageSize: z.number().int().nonnegative().nullable().optional(),
  cursor: cursorSchema.nullable().optional(),
  sourceFile: sourceFileSchema.nullable().optional(),
}).strict();

export const workspaceOverviewInputSchema = {
  ...workspaceShape,
  projectPage: pageSchema.nullable().optional(),
} as const;
export const analysisCacheOverviewInputSchema = {
  ...optionalRuntimeSelectorShape,
  includeKernelBreakdowns: z.boolean().nullable().optional(),
  includeDetailDensity: z.boolean().nullable().optional(),
  includeQueryClaimRows: z.boolean().nullable().optional(),
  rowLimit: z.number().int().nonnegative().nullable().optional(),
} as const;
export const clearAnalysisCacheInputSchema = {
  ...optionalRuntimeSelectorShape,
  typeSystemDependencyCacheClearPolicy: z.enum(SEMANTIC_TYPE_SYSTEM_DEPENDENCY_CACHE_CLEAR_POLICIES).nullable().optional(),
} as const;
export const authoringCatalogInputSchema = {
  workspaceRoot: z.string().nullable().optional(),
  catalogView: z.enum(SEMANTIC_AUTHORING_CATALOG_VIEWS).nullable().optional(),
} as const;

export const authoringRecipePlanInputSchema = {
  workspaceRoot: z.string().nullable().optional(),
  recipeKey: z.enum(AUTHORING_RECIPE_KEYS),
  rootDir: z.string().nullable().optional(),
  appName: z.string().nullable().optional(),
  includeText: z.boolean().nullable().optional(),
} as const;

export const appQueryCatalogInputSchema = {
  workspaceRoot: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  queryKind: z.enum(SEMANTIC_APP_QUERY_KINDS).nullable().optional(),
} as const;

export const appQueryInputSchema = {
  ...openAppShape,
  ...pagedShape,
  ...diagnosticProjectionShape,
  queryKind: z.enum(SEMANTIC_APP_QUERY_KINDS),
  cursor: cursorSchema.nullable().optional(),
  sourceFile: sourceFileSchema.nullable().optional(),
} as const;

export const appQueryBatchInputSchema = {
  ...openAppShape,
  queries: z.array(semanticAppQuerySchema).min(1),
} as const;

export const appOverviewInputSchema = {
  ...openAppShape,
  diagnosticPageSize: z.number().int().positive().nullable().optional(),
  openSeamPageSize: z.number().int().positive().nullable().optional(),
  includeAuthoringOrientation: z.boolean().nullable().optional(),
} as const;

export const routerOverviewInputSchema = {
  ...openAppShape,
  rowPageSize: z.number().int().nonnegative().nullable().optional(),
  detail: z.enum(SEMANTIC_RUNTIME_DETAIL_VALUES).nullable().optional(),
} as const;

export const openSeamOverviewInputSchema = {
  ...openAppShape,
  ...pagedShape,
} as const;

export const authoringOrientationInputSchema = {
  ...openAppShape,
  ...pagedShape,
} as const;

export const appDiagnosticsInputSchema = {
  ...openAppShape,
  ...pagedShape,
  ...diagnosticProjectionShape,
  sourceFile: sourceFileSchema.nullable().optional(),
} as const;

export const diagnosticOverviewInputSchema = appDiagnosticsInputSchema;

export const templateCursorInputSchema = {
  ...workspaceShape,
  ...pagedShape,
  ...appRetentionShape,
  cursor: cursorSchema,
  projectKey: z.string().nullable().optional(),
  analysisDepth: z.enum(SEMANTIC_APP_ANALYSIS_DEPTHS).nullable().optional(),
  includeAuthoringTemplates: z.boolean().nullable().optional(),
  authoringTemplateSourceFiles: z.array(z.string()).nullable().optional(),
  authoringTemplateLimit: z.number().int().nonnegative().nullable().optional(),
} as const;

export const templateDiagnosticsInputSchema = {
  ...workspaceShape,
  ...pagedShape,
  ...diagnosticProjectionShape,
  ...appRetentionShape,
  sourceFile: sourceFileSchema.nullable().optional(),
  projectKey: z.string().nullable().optional(),
  analysisDepth: z.enum(SEMANTIC_APP_ANALYSIS_DEPTHS).nullable().optional(),
  includeAuthoringTemplates: z.boolean().nullable().optional(),
  authoringTemplateSourceFiles: z.array(z.string()).nullable().optional(),
  authoringTemplateLimit: z.number().int().nonnegative().nullable().optional(),
} as const;

export const aureliaMcpResponseOutputSchema = {
  tool: z.string(),
  generatedAt: z.string(),
  workspaceRoot: z.string().nullable(),
  value: z.unknown(),
} as const;
