import { z } from 'zod/v4';
import {
  SEMANTIC_APP_RETENTION_POLICIES,
  SEMANTIC_APP_ANALYSIS_DEPTHS,
  SEMANTIC_APP_QUERY_KINDS,
  SEMANTIC_DIAGNOSTIC_PROJECTION_POLICIES,
  INQUIRY_CONTINUATION_INTENTS,
  SEMANTIC_RUNTIME_APP_BUILDER_QUERY_KINDS,
  SEMANTIC_PROJECT_DISCOVERY_MODES,
  SEMANTIC_RUNTIME_DETAIL_VALUES,
  SEMANTIC_TYPE_SYSTEM_DEPENDENCY_CACHE_CLEAR_POLICIES,
} from '@aurelia-ls/semantic-runtime';

const pageSchema = z.object({
  size: z.number().int().nonnegative().optional(),
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

const continuationIntentShape = {
  continuationIntents: z.array(z.enum(INQUIRY_CONTINUATION_INTENTS)).nullable().optional(),
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
  ...continuationIntentShape,
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
  ...continuationIntentShape,
  includeTypeSurfaces: z.boolean().nullable().optional(),
  diagnosticPageSize: z.number().int().positive().nullable().optional(),
  openSeamPageSize: z.number().int().positive().nullable().optional(),
  rowPageSize: z.number().int().nonnegative().nullable().optional(),
  cursor: cursorSchema.nullable().optional(),
  sourceFile: sourceFileSchema.nullable().optional(),
}).strict();

const compactAppBuilderRequestEnvelopeSchema = z.record(z.string(), z.unknown())
  .describe('Compact app-builder request envelope; use app-builder catalog/detail/preflight answers for field-level contracts.');

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
export const appQueryCatalogInputSchema = {
  workspaceRoot: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  queryKind: z.enum(SEMANTIC_APP_QUERY_KINDS).nullable().optional(),
} as const;

export const appBuilderCatalogInputSchema = {
  workspaceRoot: z.string().nullable().optional(),
  storeKey: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  queryKind: z.enum(SEMANTIC_RUNTIME_APP_BUILDER_QUERY_KINDS).nullable().optional(),
  inquiryProfile: z.string().nullable().optional(),
  ...continuationIntentShape,
} as const;

export const appBuilderQueryInputSchema = {
  workspaceRoot: z.string().nullable().optional(),
  storeKey: z.string().nullable().optional(),
  queryKind: z.enum(SEMANTIC_RUNTIME_APP_BUILDER_QUERY_KINDS),
  inquiryProfile: z.string().nullable().optional(),
  ...continuationIntentShape,
  page: pageSchema.nullable().optional(),
  partMenu: compactAppBuilderRequestEnvelopeSchema.optional(),
  ontologyCatalog: compactAppBuilderRequestEnvelopeSchema.optional(),
  inputReadiness: compactAppBuilderRequestEnvelopeSchema.optional(),
  inputContractDetail: compactAppBuilderRequestEnvelopeSchema.optional(),
  architectureOptions: compactAppBuilderRequestEnvelopeSchema.optional(),
  affordanceDetail: compactAppBuilderRequestEnvelopeSchema.optional(),
  applicationPatternDetail: compactAppBuilderRequestEnvelopeSchema.optional(),
  collectionConceptDetail: compactAppBuilderRequestEnvelopeSchema.optional(),
  controlManifestDetail: compactAppBuilderRequestEnvelopeSchema.optional(),
  controlPatternDetail: compactAppBuilderRequestEnvelopeSchema.optional(),
  effectContractDetail: compactAppBuilderRequestEnvelopeSchema.optional(),
  policyDetail: compactAppBuilderRequestEnvelopeSchema.optional(),
  recommendationPolicy: compactAppBuilderRequestEnvelopeSchema.optional(),
  styleDetail: compactAppBuilderRequestEnvelopeSchema.optional(),
  targetCatalog: compactAppBuilderRequestEnvelopeSchema.optional(),
  sourceLoweringPreflight: compactAppBuilderRequestEnvelopeSchema.optional(),
  sourceLoweringInvocation: compactAppBuilderRequestEnvelopeSchema.optional(),
  sourceLoweringComposition: compactAppBuilderRequestEnvelopeSchema.optional(),
  sourceLoweringSourcePlan: compactAppBuilderRequestEnvelopeSchema.optional(),
  partSourceLoweringPreview: compactAppBuilderRequestEnvelopeSchema.optional(),
  partSourceInvocation: compactAppBuilderRequestEnvelopeSchema.optional(),
} as const;

export const appQueryInputSchema = {
  ...openAppShape,
  ...pagedShape,
  ...diagnosticProjectionShape,
  ...continuationIntentShape,
  queryKind: z.enum(SEMANTIC_APP_QUERY_KINDS),
  cursor: cursorSchema.nullable().optional(),
  sourceFile: sourceFileSchema.nullable().optional(),
} as const;

export const appQueryBatchInputSchema = {
  ...openAppShape,
  ...continuationIntentShape,
  queries: z.array(semanticAppQuerySchema).min(1),
  includeAppProfile: z.boolean().nullable().optional(),
  includeAppQueryClaimProfiles: z.boolean().nullable().optional(),
} as const;

export const appOverviewInputSchema = {
  ...openAppShape,
  diagnosticPageSize: z.number().int().positive().nullable().optional(),
  openSeamPageSize: z.number().int().positive().nullable().optional(),
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

export const appDiagnosticsInputSchema = {
  ...openAppShape,
  ...pagedShape,
  ...diagnosticProjectionShape,
  ...continuationIntentShape,
  sourceFile: sourceFileSchema.nullable().optional(),
} as const;

export const diagnosticOverviewInputSchema = appDiagnosticsInputSchema;

export const templateCursorInputSchema = {
  ...workspaceShape,
  ...pagedShape,
  ...continuationIntentShape,
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
  ...continuationIntentShape,
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
