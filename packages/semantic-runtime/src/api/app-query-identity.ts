import type {
  SemanticAppAnalysisDepth,
} from '../configuration/app-analysis.js';
import type {
  SemanticAppQuery,
  SemanticRuntimeAppQueryBatchRequest,
  SemanticAppQueryCatalogRequest,
} from './contracts.js';
import { semanticAppQueryCatalogShape } from './app-query-catalog.js';

export interface SemanticRuntimeRoutedAppQueryKeyPlan {
  readonly analysisDepth: SemanticAppAnalysisDepth;
  readonly includeAuthoringTemplates: boolean;
  readonly authoringTemplateSourceFiles: readonly string[];
  readonly authoringTemplateLimit: number | null;
}

export function semanticRuntimeAppQueryCatalogKey(
  request: SemanticAppQueryCatalogRequest,
): string {
  return [
    'app-query-catalog',
    `group:${queryKeyPart(request.group ?? 'all')}`,
    `kind:${queryKeyPart(request.queryKind ?? 'all')}`,
  ].join('|');
}

export function semanticRuntimeSummaryKey(
  request: { readonly projectPage?: { readonly size?: number; readonly cursor?: string | null } | null },
): string {
  return [
    'runtime-summary',
    `project-page-size:${request.projectPage?.size ?? 0}`,
    `project-page-cursor:${request.projectPage?.cursor ?? 'start'}`,
  ].map((part) => queryKeyPart(part)).join('|');
}

export function semanticRuntimeRoutedAppQueryKey(
  query: SemanticAppQuery,
  plan: SemanticRuntimeRoutedAppQueryKeyPlan,
): string {
  return [
    semanticAppQueryKey(query),
    `analysis:${plan.analysisDepth}`,
    `authoring:${plan.includeAuthoringTemplates}`,
    `authoring-sources:${plan.authoringTemplateSourceFiles.length === 0
      ? 'project'
      : plan.authoringTemplateSourceFiles.map(queryKeyPart).join(',')}`,
    `authoring-limit:${plan.authoringTemplateLimit ?? 'all'}`,
  ].join('|');
}

export function semanticRuntimeRoutedAppQueryBatchKey(
  request: SemanticRuntimeAppQueryBatchRequest,
  plan: SemanticRuntimeRoutedAppQueryKeyPlan,
): string {
  return [
    'app-query-batch',
    `queries:${request.queries.map((query, index) => `${index}:${semanticAppQueryKey(query)}`).join(',')}`,
    `analysis:${plan.analysisDepth}`,
    `authoring:${plan.includeAuthoringTemplates}`,
    `authoring-sources:${plan.authoringTemplateSourceFiles.length === 0
      ? 'project'
      : plan.authoringTemplateSourceFiles.map(queryKeyPart).join(',')}`,
    `authoring-limit:${plan.authoringTemplateLimit ?? 'all'}`,
    `profile:${request.includeAppProfile === true}`,
    `claim-profiles:${request.includeAppQueryClaimProfiles === true}`,
  ].join('|');
}

export function semanticRuntimeAppWorldFreeQueryKey(
  projectKey: string,
  query: SemanticAppQuery,
): string {
  return [
    'app-world-free',
    projectKey,
    semanticAppQueryKey(query),
  ].map((part) => queryKeyPart(part)).join('|');
}

export function semanticRuntimeAppWorldFreeQueryBatchKey(
  projectKey: string,
  queries: readonly SemanticAppQuery[],
): string {
  return [
    'app-world-free-batch',
    projectKey,
    `queries:${queries.map((query, index) => `${index}:${semanticAppQueryKey(query)}`).join(',')}`,
  ].map((part) => queryKeyPart(part)).join('|');
}

export function semanticRuntimeStaticAppQueryKey(
  query: SemanticAppQuery,
): string {
  return [
    'runtime-static',
    semanticAppQueryKey(query),
  ].map((part) => queryKeyPart(part)).join('|');
}

export function semanticRuntimeStaticAppQueryBatchKey(
  queries: readonly SemanticAppQuery[],
): string {
  return [
    'runtime-static-batch',
    `queries:${queries.map((query, index) => `${index}:${semanticAppQueryKey(query)}`).join(',')}`,
  ].map((part) => queryKeyPart(part)).join('|');
}

export function semanticRuntimeRoutedAppQueryBatchLocusKey(
  projectKey: string,
  queries: readonly SemanticAppQuery[],
): string {
  const sourceLoci = [...new Set(queries
    .map((query) => {
      const shapedQuery = semanticAppQueryCatalogShape(query);
      return shapedQuery.cursor?.filePath ?? shapedQuery.sourceFile?.filePath ?? null;
    })
    .filter((filePath): filePath is string => filePath != null && filePath.trim().length > 0)
    .map(normalizeQuerySourceFileKey))]
    .sort();
  return [
    'batch',
    projectKey,
    sourceLoci.length === 0 ? 'project' : sourceLoci.join(','),
  ].map((part) => queryKeyPart(part)).join(':');
}

export function semanticRuntimeWorkspaceLocusKey(workspaceKey: string): string {
  return `workspace:${queryKeyPart(workspaceKey)}`;
}

export function semanticRuntimeWorkspaceEpochKey(workspaceKey: string): string {
  return `workspace:${queryKeyPart(workspaceKey)}`;
}

export function semanticAppQueryKey(query: SemanticAppQuery): string {
  const shapedQuery = semanticAppQueryCatalogShape(query);
  // continuationIntents is a response-envelope filter applied after materialization; keep it out of claim identity.
  const parts = [
    shapedQuery.kind,
    shapedQuery.detail ?? 'compact',
    shapedQuery.diagnosticProjection ?? 'default-diagnostics',
    shapedQuery.includeTypeSurfaces === true ? 'type-surfaces' : 'no-type-surfaces',
    shapedQuery.diagnosticPageSize ?? 'default-diagnostic-page',
    shapedQuery.openSeamPageSize ?? 'default-open-seam-page',
    shapedQuery.rowPageSize ?? 'default-row-page',
    shapedQuery.page?.size ?? 'all',
    shapedQuery.page?.cursor ?? 'start',
    shapedQuery.sourceFile?.filePath ?? 'no-source-file',
    shapedQuery.cursor == null
      ? 'no-cursor'
      : `${shapedQuery.cursor.filePath}:${shapedQuery.cursor.line}:${shapedQuery.cursor.character}:${shapedQuery.cursor.offset ?? 'no-offset'}`,
  ];
  return parts.map((part) => queryKeyPart(String(part))).join('|');
}

export function semanticAppQueryLocusKey(
  projectKey: string,
  query: SemanticAppQuery,
): string {
  const shapedQuery = semanticAppQueryCatalogShape(query);
  if (shapedQuery.cursor != null) {
    const cursor = shapedQuery.cursor;
    return [
      'cursor',
      projectKey,
      normalizeQuerySourceFileKey(cursor.filePath),
      cursor.line,
      cursor.character,
      cursor.offset ?? 'no-offset',
    ].map((part) => queryKeyPart(String(part))).join(':');
  }
  if (shapedQuery.sourceFile?.filePath != null) {
    return ['source', projectKey, normalizeQuerySourceFileKey(shapedQuery.sourceFile.filePath)]
      .map((part) => queryKeyPart(String(part)))
      .join(':');
  }
  return ['project', projectKey].map((part) => queryKeyPart(String(part))).join(':');
}

export function semanticAppQueryEpochKeys(
  projectKey: string,
  query: SemanticAppQuery,
): readonly string[] {
  const shapedQuery = semanticAppQueryCatalogShape(query);
  const sourceFilePath = shapedQuery.cursor?.filePath ?? shapedQuery.sourceFile?.filePath ?? null;
  const keys = [semanticAppProjectEpochKey(projectKey)];
  if (sourceFilePath != null) {
    keys.push(semanticAppSourceEpochKey(projectKey, sourceFilePath));
  }
  return keys;
}

export function semanticRuntimeRoutedAppQueryEpochKeys(
  workspaceKey: string,
  projectKey: string,
  query: SemanticAppQuery,
): readonly string[] {
  return [
    semanticRuntimeWorkspaceEpochKey(workspaceKey),
    ...semanticAppQueryEpochKeys(projectKey, query),
  ];
}

export function semanticRuntimeRoutedAppQueryBatchEpochKeys(
  workspaceKey: string,
  projectKey: string,
  queries: readonly SemanticAppQuery[],
): readonly string[] {
  return [...new Set([
    semanticRuntimeWorkspaceEpochKey(workspaceKey),
    ...queries.flatMap((query) => semanticAppQueryEpochKeys(projectKey, query)),
  ])].sort();
}

export function semanticAppSourceEpochKey(
  projectKey: string,
  sourceFilePath: string,
): string {
  return [
    'source',
    projectKey,
    normalizeQuerySourceFileKey(sourceFilePath),
  ].map((part) => queryKeyPart(part)).join(':');
}

export function semanticAppProjectEpochKey(projectKey: string): string {
  return `project:${queryKeyPart(projectKey)}`;
}

function normalizeQuerySourceFileKey(filePath: string): string {
  return filePath.trim().replace(/\\/g, '/');
}

/** Normalize one semantic-runtime query-key segment for cache and claim identity strings. */
export function queryKeyPart(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/[|,:\u0000]/g, '_');
}
