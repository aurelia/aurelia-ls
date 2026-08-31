import type {
  SemanticAppAnalysisDepth,
  SemanticTemplateAnalysisBreadth,
} from '../configuration/app-analysis.js';
import type {
  SemanticAppQuery,
  SemanticObservedDependencyLocus,
  SemanticRuntimeAppQueryBatchRequest,
  SemanticAppQueryCatalogRequest,
  SemanticRuntimePageInput,
} from './contracts.js';
import { SemanticObservedDependencyLocusKind } from './contracts.js';
import {
  semanticAppQueryCatalogShape,
  unsupportedSemanticAppQuerySelectorFields,
} from './app-query-catalog.js';
import { canonicalTypeSystemSourcePath } from '../type-system/source-file-path.js';

export interface SemanticRuntimeRoutedAppQueryKeyPlan {
  readonly analysisDepth: SemanticAppAnalysisDepth;
  readonly templateAnalysisBreadth: SemanticTemplateAnalysisBreadth;
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

export function semanticAuthoredSourceOwnershipKey(sourceFilePath: string): string {
  return [
    'authored-source-ownership',
    sourceFilePath,
  ].map(queryKeyPart).join('|');
}

export function semanticNativeProjectConfigurationsKey(
  projectKey: string | null,
  sourceFilePaths: readonly string[] | null,
  page: SemanticRuntimePageInput | null | undefined,
): string {
  return `native-project-configurations|${queryKeyPart(JSON.stringify({
    projectKey,
    sourceFilePaths,
    page: {
      size: page?.size ?? null,
      cursor: page?.cursor ?? null,
    },
  }))}`;
}

export function semanticProjectConfigurationDiagnosticsKey(
  projectKey: string | null,
  sourceFilePaths: readonly string[] | null,
  page: SemanticRuntimePageInput | null | undefined,
): string {
  return `project-configuration-diagnostics|${queryKeyPart(JSON.stringify({
    projectKey,
    sourceFilePaths,
    page: {
      size: page?.size ?? null,
      cursor: page?.cursor ?? null,
    },
  }))}`;
}

export function semanticProjectConfigurationEpochKey(projectKey: string, revision: string): string {
  return `project-configuration:${queryKeyPart(projectKey)}:${queryKeyPart(revision)}`;
}

export function semanticRuntimeRoutedAppQueryKey(
  query: SemanticAppQuery,
  plan: SemanticRuntimeRoutedAppQueryKeyPlan,
): string {
  return [
    semanticAppQueryKey(query),
    `analysis:${plan.analysisDepth}`,
    `template-analysis:${plan.templateAnalysisBreadth}`,
    `authoring:${plan.includeAuthoringTemplates}`,
    `authoring-sources:${plan.authoringTemplateSourceFiles.length === 0
      ? 'project'
      : plan.authoringTemplateSourceFiles.map(queryKeyPart).join(',')}`,
    `authoring-limit:${plan.authoringTemplateLimit ?? 'all'}`,
  ].join('|');
}

/** Identity for a caller request before unsupported selectors are normalized away. */
export function semanticAppQueryRequestKey(query: SemanticAppQuery): string {
  const queryKey = semanticAppQueryKey(query);
  const unsupportedFields = unsupportedSemanticAppQuerySelectorFields(query);
  return unsupportedFields.length === 0
    ? queryKey
    : `${queryKey}|unsupported:${unsupportedFields.map(queryKeyPart).join(',')}`;
}

export function semanticRuntimeRoutedAppQueryBatchKey(
  request: SemanticRuntimeAppQueryBatchRequest,
  plan: SemanticRuntimeRoutedAppQueryKeyPlan,
): string {
  return [
    'app-query-batch',
    `queries:${request.queries.map((query, index) => `${index}:${semanticAppQueryRequestKey(query)}`).join(',')}`,
    `analysis:${plan.analysisDepth}`,
    `template-analysis:${plan.templateAnalysisBreadth}`,
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
    `queries:${queries.map((query, index) => `${index}:${semanticAppQueryRequestKey(query)}`).join(',')}`,
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

export function semanticRuntimePreAppWorldQueryBatchKey(
  queries: readonly SemanticAppQuery[],
): string {
  return [
    'pre-app-world-batch',
    `queries:${queries.map((query, index) => `${index}:${semanticAppQueryRequestKey(query)}`).join(',')}`,
  ].map((part) => queryKeyPart(part)).join('|');
}

export function semanticRuntimeRoutedAppQueryBatchLocusKey(
  projectKey: string,
  queries: readonly SemanticAppQuery[],
): string {
  const sourceLoci = [...new Set(queries
    .map((query) => {
      const shapedQuery = semanticAppQueryCatalogShape(query);
      return shapedQuery.cursor?.filePath
        ?? shapedQuery.sourceFile?.filePath
        ?? observedDependencySourceFilePath(shapedQuery.observedDependencyLocus)
        ?? null;
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
    shapedQuery.analysisLimitationPageSize ?? 'default-analysis-limitation-page',
    shapedQuery.openSeamPageSize ?? 'default-open-seam-page',
    shapedQuery.openSeamKindKey ?? 'all-open-seam-kinds',
    shapedQuery.openSeamReasonKind ?? 'all-open-seam-reasons',
    shapedQuery.sourceRole ?? 'all-source-roles',
    shapedQuery.openSeamClusterKey ?? 'all-open-seam-clusters',
    shapedQuery.openSeamSiteKey ?? 'all-open-seam-sites',
    shapedQuery.rowPageSize ?? 'default-row-page',
    shapedQuery.page?.size ?? 'all',
    shapedQuery.page?.cursor ?? 'start',
    shapedQuery.sourceFile?.filePath ?? 'no-source-file',
    semanticObservedDependencyLocusKey(shapedQuery.observedDependencyLocus),
    shapedQuery.includeDeclaration ?? 'default-include-declaration',
    shapedQuery.newName ?? 'no-new-name',
    shapedQuery.templateResourceScopeIdentityKey ?? 'no-template-resource-scope',
    shapedQuery.resourceIdentityKey ?? 'no-resource-identity',
    shapedQuery.frameworkCapability ?? 'all-framework-capabilities',
    shapedQuery.cursor == null
      ? 'no-cursor'
      : `${shapedQuery.cursor.filePath}:${shapedQuery.cursor.line}:${shapedQuery.cursor.character}:${shapedQuery.cursor.offset ?? 'no-offset'}`,
  ];
  return parts.map((part) => queryKeyPart(String(part))).join('|');
}

/** Page-stable identity excludes page size/cursor while retaining every semantic selector and projection choice. */
export function semanticAppQueryPageScope(
  projectKey: string,
  rowUniverseEpochKey: string,
  query: SemanticAppQuery,
): {
  readonly queryKey: string;
  readonly epochKey: string;
  readonly orderingKey: string;
} {
  const shapedQuery = semanticAppQueryCatalogShape(query);
  const pageStableQuery = {
    ...shapedQuery,
    page: undefined,
  };
  return {
    queryKey: `${projectKey}|${semanticAppQueryKey(pageStableQuery)}`,
    epochKey: rowUniverseEpochKey,
    orderingKey: String(shapedQuery.kind),
  };
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
  const observedDependencyLocus = shapedQuery.observedDependencyLocus;
  if (
    observedDependencyLocus != null
    && observedDependencyLocus.kind !== SemanticObservedDependencyLocusKind.Project
  ) {
    return [
      'observed-dependency',
      projectKey,
      semanticObservedDependencyLocusKey(observedDependencyLocus),
    ].map((part) => queryKeyPart(String(part))).join(':');
  }
  if (shapedQuery.openSeamSiteKey != null) {
    return ['open-seam-site', projectKey, shapedQuery.openSeamSiteKey]
      .map((part) => queryKeyPart(String(part)))
      .join(':');
  }
  if (shapedQuery.openSeamClusterKey != null) {
    return ['open-seam-cluster', projectKey, shapedQuery.openSeamClusterKey]
      .map((part) => queryKeyPart(String(part)))
      .join(':');
  }
  return ['project', projectKey].map((part) => queryKeyPart(String(part))).join(':');
}

export function semanticAppQueryEpochKeys(
  projectKey: string,
  projectInputRevision: string,
  query: SemanticAppQuery,
): readonly string[] {
  const shapedQuery = semanticAppQueryCatalogShape(query);
  const sourceFilePath = shapedQuery.cursor?.filePath
    ?? shapedQuery.sourceFile?.filePath
    ?? observedDependencySourceFilePath(shapedQuery.observedDependencyLocus)
    ?? null;
  const keys = [
    semanticAppProjectEpochKey(projectKey),
    semanticAppProjectInputEpochKey(projectKey, projectInputRevision),
  ];
  if (sourceFilePath != null) {
    keys.push(semanticAppSourceEpochKey(projectKey, sourceFilePath));
  }
  return keys;
}

export function semanticRuntimeRoutedAppQueryEpochKeys(
  workspaceKey: string,
  projectKey: string,
  projectInputRevision: string,
  query: SemanticAppQuery,
): readonly string[] {
  return [
    semanticRuntimeWorkspaceEpochKey(workspaceKey),
    ...semanticAppQueryEpochKeys(projectKey, projectInputRevision, query),
  ];
}

export function semanticRuntimeRoutedAppQueryBatchEpochKeys(
  workspaceKey: string,
  projectKey: string,
  projectInputRevision: string,
  queries: readonly SemanticAppQuery[],
): readonly string[] {
  return [...new Set([
    semanticRuntimeWorkspaceEpochKey(workspaceKey),
    ...queries.flatMap((query) => semanticAppQueryEpochKeys(projectKey, projectInputRevision, query)),
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

export function semanticAppProjectInputEpochKey(projectKey: string, revision: string): string {
  return `project-input:${queryKeyPart(projectKey)}:${queryKeyPart(revision)}`;
}

function normalizeQuerySourceFileKey(filePath: string): string {
  return canonicalTypeSystemSourcePath(filePath.trim());
}

function semanticObservedDependencyLocusKey(
  locus: SemanticObservedDependencyLocus | null | undefined,
): string {
  if (locus == null || locus.kind === SemanticObservedDependencyLocusKind.Project) {
    return 'observed-dependency:project';
  }
  switch (locus.kind) {
    case SemanticObservedDependencyLocusKind.SourceFile:
      return `observed-dependency:source-file:${normalizeQuerySourceFileKey(locus.sourceFile.filePath)}`;
    case SemanticObservedDependencyLocusKind.Owner:
      return `observed-dependency:owner:${locus.ownerKey}`;
    case SemanticObservedDependencyLocusKind.Row:
      return `observed-dependency:row:${locus.rowKey}`;
    case SemanticObservedDependencyLocusKind.Cluster:
      return `observed-dependency:cluster:${locus.clusterKey}`;
  }
}

function observedDependencySourceFilePath(
  locus: SemanticObservedDependencyLocus | null | undefined,
): string | null {
  return locus?.kind === SemanticObservedDependencyLocusKind.SourceFile
    ? locus.sourceFile.filePath
    : null;
}

/** Normalize one semantic-runtime query-key segment for cache and claim identity strings. */
export function queryKeyPart(value: string): string {
  // Escape the key grammar and escape marker injectively while keeping ordinary identity strings readable.
  return value
    .trim()
    .replace(/\\/g, '/')
    .replace(/[\u0000-\u001f%|,:]/g, (part) =>
      `%${part.charCodeAt(0).toString(16).padStart(2, '0')}`
    );
}
