import {
  SemanticAppAnalysisDepth,
  semanticAppAnalysisDepthMax,
  normalizeSemanticAppAnalysisDepth,
  semanticAppAnalysisDepthSatisfies,
} from '../configuration/app-analysis.js';
import {
  readSemanticRuntimeInquiryProfileDefinition,
  type SemanticRuntimeInquiryProfile,
} from '../telemetry/inquiry-profile.js';
import type {
  SemanticAppQuery,
  SemanticAppRetentionPolicy,
  SemanticRuntimeAppQueryBatchRequest,
  SemanticRuntimeAppQueryRequest,
  SemanticRuntimeQueryClaimDisposeRequest,
  SemanticQueryClaimDisposalScope,
  SemanticQueryClaimInvalidationKind,
  SemanticTypeSystemDependencyCacheClearPolicy,
} from './contracts.js';
import {
  SemanticAppQueryKind,
} from './contracts.js';
import {
  semanticAppQueryCatalogShape,
  semanticAppQueryCatalogRow,
} from './app-query-catalog.js';
import type {
  QueryClaimDisposalPolicy,
  SemanticQueryMaterializationPolicy,
} from '../inquiry/query-claim-policy.js';
import {
  QueryClaimDisposalReason,
  queryClaimDisposalPolicy,
} from '../inquiry/query-claim-policy.js';
import {
  semanticAppProjectEpochKey,
  semanticAppSourceEpochKey,
} from './app-query-identity.js';

export interface SemanticRuntimeQueryClaimDisposalStrategyInput {
  readonly scope: SemanticRuntimeQueryClaimDisposeRequest['scope'];
  readonly projectKey: string | null;
  readonly sourceFilePath: string | null;
  readonly inquiryProfile: SemanticRuntimeInquiryProfile | null;
  readonly queryKinds: readonly string[] | null | undefined;
  readonly materializationPolicies: readonly SemanticQueryMaterializationPolicy[] | null | undefined;
}

export interface SemanticRuntimeQueryClaimDisposalStrategy {
  readonly scope: SemanticQueryClaimDisposalScope;
  readonly invalidationKind: SemanticQueryClaimInvalidationKind;
  readonly inquiryProfile: SemanticRuntimeInquiryProfile | null;
  readonly projectKey: string | null;
  readonly sourceFilePath: string | null;
  readonly epochKeys: readonly string[];
  readonly policy: QueryClaimDisposalPolicy;
}

export function semanticRuntimeQueryClaimDisposalStrategy(
  input: SemanticRuntimeQueryClaimDisposalStrategyInput,
): SemanticRuntimeQueryClaimDisposalStrategy {
  const scope = normalizeQueryClaimDisposalScope(input.scope);
  const epochKeys = queryClaimDisposalEpochKeys(input.projectKey, input.sourceFilePath);
  const invalidationKind = queryClaimInvalidationKind(input.projectKey, input.sourceFilePath);
  const policy = queryClaimDisposalPolicy(
    queryClaimDisposalReasonForInvalidation(invalidationKind),
    {
      queryKinds: normalizedQueryClaimStringList(input.queryKinds),
      materializationPolicies: input.materializationPolicies ?? undefined,
      epochKeys,
    },
  );
  return {
    scope,
    invalidationKind,
    inquiryProfile: input.inquiryProfile,
    projectKey: input.projectKey,
    sourceFilePath: input.sourceFilePath,
    epochKeys,
    policy,
  };
}

export function semanticAppQueryMaterializationPolicy(
  query: SemanticAppQuery,
  catalogPolicy: SemanticQueryMaterializationPolicy,
): SemanticQueryMaterializationPolicy {
  const shapedQuery = semanticAppQueryCatalogShape(query);
  return diagnosticProjectionControlsMaterialization(shapedQuery)
    && shapedQuery.diagnosticProjection === 'available-products'
    && catalogPolicy === 'query-type-projection'
    ? 'projection-only'
    : shapedQuery.kind === SemanticAppQueryKind.AppTopology && shapedQuery.includeTypeSurfaces === true
      ? 'query-type-projection'
      : catalogPolicy;
}

function diagnosticProjectionControlsMaterialization(query: SemanticAppQuery): boolean {
  return query.kind === SemanticAppQueryKind.AppDiagnostics
    || query.kind === SemanticAppQueryKind.AppDiagnosticSummary
    || query.kind === SemanticAppQueryKind.TemplateDiagnostics;
}

export function semanticAppQueryBatchMaterializationPolicy(
  queries: readonly SemanticAppQuery[],
): SemanticQueryMaterializationPolicy {
  const childPolicies = queries.map((query) => {
    const row = semanticAppQueryCatalogRow(query.kind as SemanticAppQueryKind);
    return semanticAppQueryMaterializationPolicy(query, row.materializationPolicy);
  });
  if (childPolicies.includes('query-type-projection')) {
    return 'query-type-projection';
  }
  return childPolicies.length > 0 && childPolicies.every((policy) => policy === 'static-catalog')
    ? 'static-catalog'
    : 'projection-only';
}

export function isAppWorldFreeAppQuery(query: SemanticAppQuery): boolean {
  return semanticAppQueryCatalogRow(query.kind as SemanticAppQueryKind).runtimeBoundary !== 'app-world';
}

export function isRuntimeStaticAppQuery(query: SemanticAppQuery): boolean {
  return semanticAppQueryCatalogRow(query.kind as SemanticAppQueryKind).runtimeBoundary === 'runtime-static';
}

export function appQuerySourceFilePath(
  request: SemanticRuntimeAppQueryRequest,
): string | null {
  return request.cursor?.filePath
    ?? request.sourceFile?.filePath
    ?? request.sourceFilePath
    ?? null;
}

export function appQueryNeedsAuthoringTemplates(
  request: SemanticAppQuery,
): boolean {
  const shapedQuery = semanticAppQueryCatalogShape(request);
  return shapedQuery.cursor != null || shapedQuery.sourceFile != null;
}

export function appQueryBatchSourceFilePath(
  request: SemanticRuntimeAppQueryBatchRequest,
): string | null {
  return request.sourceFilePath
    ?? request.queries
      .map((query) => query.cursor?.filePath ?? query.sourceFile?.filePath ?? null)
      .find((filePath): filePath is string => filePath != null && filePath.trim().length > 0)
    ?? null;
}

export function appQueryBatchAuthoringTemplateSourceFiles(
  queries: readonly SemanticAppQuery[],
): readonly string[] {
  return [...new Set(queries
    .map((query) => {
      const shapedQuery = semanticAppQueryCatalogShape(query);
      return shapedQuery.cursor?.filePath ?? shapedQuery.sourceFile?.filePath ?? null;
    })
    .filter((filePath): filePath is string => filePath != null && filePath.trim().length > 0))]
    .sort();
}

export function appQueryBatchNeedsAuthoringTemplates(
  queries: readonly SemanticAppQuery[],
): boolean {
  return queries.some(appQueryNeedsAuthoringTemplates);
}

export function routedAppQueryAnalysisDepth(
  request: SemanticRuntimeAppQueryRequest,
  catalogDepth: SemanticAppAnalysisDepth | `${SemanticAppAnalysisDepth}`,
): SemanticAppAnalysisDepth {
  const normalizedCatalogDepth = normalizeSemanticAppAnalysisDepth(catalogDepth);
  if (
    request.kind === SemanticAppQueryKind.AppOverview
    && request.includeAuthoringOrientation === true
    && !semanticAppAnalysisDepthSatisfies(normalizedCatalogDepth, SemanticAppAnalysisDepth.BindingObservation)
  ) {
    return SemanticAppAnalysisDepth.BindingObservation;
  }
  return normalizedCatalogDepth;
}

export function routedAppQueryBatchAnalysisDepth(
  request: SemanticRuntimeAppQueryBatchRequest,
): SemanticAppAnalysisDepth {
  return semanticAppAnalysisDepthMax([
    request.analysisDepth,
    ...request.queries.map((query) => {
      const row = semanticAppQueryCatalogRow(query.kind as SemanticAppQueryKind);
      return routedAppQueryAnalysisDepth(query as SemanticRuntimeAppQueryRequest, row.minimumAnalysisDepth);
    }),
  ]);
}

export function defaultInquiryProfileForRoutedAppQuery(
  request: SemanticRuntimeAppQueryRequest,
): SemanticRuntimeInquiryProfile {
  const shapedQuery = semanticAppQueryCatalogShape(request);
  if (shapedQuery.cursor != null) {
    return 'lsp-cursor';
  }
  if (shapedQuery.sourceFile != null) {
    return shapedQuery.kind === SemanticAppQueryKind.TemplateDiagnostics
      || shapedQuery.kind === SemanticAppQueryKind.AppDiagnostics
      || shapedQuery.kind === SemanticAppQueryKind.AppDiagnosticSummary
      || shapedQuery.kind === SemanticAppQueryKind.TypeScriptDiagnostics
      || shapedQuery.kind === SemanticAppQueryKind.TypeScriptDiagnosticSummary
      ? 'lsp-diagnostics'
      : 'mcp-orientation';
  }
  return 'mcp-orientation';
}

export function defaultInquiryProfileForRoutedAppQueryBatch(
  queries: readonly SemanticAppQuery[],
): SemanticRuntimeInquiryProfile {
  const shapedQueries = queries.map(semanticAppQueryCatalogShape);
  if (shapedQueries.some((query) => query.cursor != null)) {
    return 'lsp-cursor';
  }
  if (shapedQueries.some((query) =>
    query.sourceFile != null
    && (
      query.kind === SemanticAppQueryKind.TemplateDiagnostics
      || query.kind === SemanticAppQueryKind.AppDiagnostics
      || query.kind === SemanticAppQueryKind.AppDiagnosticSummary
      || query.kind === SemanticAppQueryKind.TypeScriptDiagnostics
      || query.kind === SemanticAppQueryKind.TypeScriptDiagnosticSummary
    )
  )) {
    return 'lsp-diagnostics';
  }
  return 'mcp-orientation';
}

export function shouldDisposeAppAfterRoutedQuery(
  request: { readonly appRetention?: SemanticAppRetentionPolicy | null },
  inquiryProfile: SemanticRuntimeInquiryProfile,
): boolean {
  switch (request.appRetention) {
    case 'retain-app':
      return false;
    case 'dispose-app':
      return true;
    case 'profile-default':
    case null:
    case undefined:
      return readSemanticRuntimeInquiryProfileDefinition(inquiryProfile).cacheBias === 'recompute-ok';
  }
}

export function typeSystemDependencyCacheClearPolicyForRoutedQuery(
  request: {
    readonly appRetention?: SemanticAppRetentionPolicy | null;
    readonly typeSystemDependencyCacheClearPolicy?: SemanticTypeSystemDependencyCacheClearPolicy | null;
  },
  inquiryProfile: SemanticRuntimeInquiryProfile,
): SemanticTypeSystemDependencyCacheClearPolicy {
  if (request.typeSystemDependencyCacheClearPolicy != null) {
    return request.typeSystemDependencyCacheClearPolicy;
  }
  if (!shouldDisposeAppAfterRoutedQuery(request, inquiryProfile)) {
    return 'preserve';
  }
  return defaultTypeSystemDependencyCacheClearPolicyForDisposedApp(inquiryProfile);
}

function defaultTypeSystemDependencyCacheClearPolicyForDisposedApp(
  inquiryProfile: SemanticRuntimeInquiryProfile,
): SemanticTypeSystemDependencyCacheClearPolicy {
  const definition = readSemanticRuntimeInquiryProfileDefinition(inquiryProfile);
  switch (definition.cacheBias) {
    case 'recompute-ok':
      return 'all';
    case 'bounded-retention':
      /*
       * Diagnostics can run in the background, but long editor sessions should not keep default-library SourceFiles just
       * because one disposed app answer needed a Program. External declarations usually buy more warm-session latency
       * per retained byte than lib.*.d.ts, so the bounded default keeps those and sheds the largest common bucket.
       */
      return 'default-libraries';
    case 'warm-local':
    case 'deep-operation':
    case 'deterministic-cache':
      return 'preserve';
  }
}

function normalizeQueryClaimDisposalScope(
  value: SemanticRuntimeQueryClaimDisposeRequest['scope'],
): SemanticQueryClaimDisposalScope {
  switch (value) {
    case 'runtime':
    case 'cached-apps':
    case 'all':
      return value;
    case null:
    case undefined:
      return 'all';
  }
}

function queryClaimInvalidationKind(
  projectKey: string | null,
  sourceFilePath: string | null,
): SemanticQueryClaimInvalidationKind {
  if (projectKey == null) {
    return 'manual';
  }
  return sourceFilePath == null ? 'project-epoch' : 'source-epoch';
}

function queryClaimDisposalReasonForInvalidation(
  invalidationKind: SemanticQueryClaimInvalidationKind,
): QueryClaimDisposalReason {
  switch (invalidationKind) {
    case 'manual':
      return QueryClaimDisposalReason.Manual;
    case 'project-epoch':
      return QueryClaimDisposalReason.ProjectEpochChanged;
    case 'source-epoch':
      return QueryClaimDisposalReason.SourceEpochChanged;
  }
}

function queryClaimDisposalEpochKeys(
  projectKey: string | null,
  sourceFilePath: string | null,
): readonly string[] {
  if (projectKey == null) {
    return [];
  }
  return sourceFilePath == null
    ? [semanticAppProjectEpochKey(projectKey)]
    : [
      semanticAppProjectEpochKey(projectKey),
      semanticAppSourceEpochKey(projectKey, sourceFilePath),
    ];
}

function normalizedQueryClaimStringList(
  values: readonly string[] | null | undefined,
): readonly string[] | undefined {
  if (values == null) {
    return undefined;
  }
  const normalized = [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort();
  return normalized.length === 0 ? undefined : normalized;
}
