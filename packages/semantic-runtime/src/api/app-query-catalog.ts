import { semanticRouteQueryDescriptors } from './route-query-registry.js';
import { SemanticAppAnalysisDepth } from '../configuration/app-analysis.js';
import {
  SEMANTIC_APP_QUERY_KINDS,
  SemanticAppQueryKind,
  SemanticRuntimeAnswerOutcome,
  type SemanticAppQuery,
  type SemanticAppQueryCatalogRequest,
  type SemanticAppQueryCatalogResult,
  type SemanticAppQueryCatalogRow,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeSourceFileInput,
} from './contracts.js';
import { answer } from './answer-helpers.js';

const semanticAppQueryCatalogRows = [
  queryRow(SemanticAppQueryKind.Summary, 'overview', 'Compact project app-world counts and app shape summary.', 'overview'),
  queryRow(SemanticAppQueryKind.AppOverview, 'overview', 'Composed compact app answer for available diagnostics, open seams, and topology counts.', 'overview'),
  queryRow(SemanticAppQueryKind.AppTopology, 'overview', 'Compact topology counts and scalar facts from the opened app world; bindable type surfaces are opt-in.', 'overview'),
  queryRow(SemanticAppQueryKind.SourceFiles, 'source', 'Admitted source files for the selected project; routed runtime calls can answer this from the booted project frame without opening an app epoch.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, runtimeBoundary: 'project-frame' }),
  queryRow(SemanticAppQueryKind.UnresolvedModules, 'source', 'Static evaluator module edges that could not be resolved; routed runtime calls can answer this from read-only Aurelia project evaluation without opening an app epoch.', 'row-table', { pagingKind: 'offset-cursor', runtimeBoundary: 'static-evaluation' }),
  queryRow(SemanticAppQueryKind.OpenSeams, 'diagnostics', 'Source-backed or product-backed semantic seams still open after app-world construction; filter by sourceFile, openSeamKindKey, openSeamReasonKind, or sourceRole to inspect a cluster.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, supportsSourceFile: true, supportsOpenSeamFilters: true }),
  queryRow(SemanticAppQueryKind.OpenSeamSummary, 'diagnostics', 'Open seam clusters grouped by seam kind and reason-kind signature; filter by sourceFile, openSeamKindKey, openSeamReasonKind, or sourceRole before paging raw seams.', 'summary-row-table', { pagingKind: 'offset-cursor', supportsDetail: true, supportsSourceFile: true, supportsOpenSeamFilters: true }),
  queryRow(SemanticAppQueryKind.OpenSeamSites, 'diagnostics', 'Open seam sites grouped by authored source span and seam kind; filter by sourceFile, sourceRole, openSeamKindKey, or openSeamReasonKind before paging raw seams.', 'summary-row-table', { pagingKind: 'offset-cursor', supportsDetail: true, supportsSourceFile: true, supportsOpenSeamFilters: true }),
  queryRow(SemanticAppQueryKind.AppDiagnostics, 'diagnostics', 'Unified app diagnostics across TypeScript, modeled Aurelia issue lanes, and template diagnostics; optionally narrowed to one source file.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, supportsSourceFile: true, supportsDiagnosticProjection: true, materializationPolicy: 'query-type-projection' }),
  queryRow(SemanticAppQueryKind.AppDiagnosticSummary, 'diagnostics', 'Diagnostic clusters grouped by domain, kind, authority, severity, framework code, and owning query; explicit diagnostic projections include TypeScript diagnostics.', 'summary-row-table', { pagingKind: 'offset-cursor', supportsDetail: true, supportsSourceFile: true, supportsDiagnosticProjection: true, materializationPolicy: 'query-type-projection' }),
  queryRow(SemanticAppQueryKind.TypeScriptDiagnostics, 'diagnostics', 'Ordinary TypeScript project diagnostics from the semantic-runtime Program/tsconfig epoch.', 'row-table', { pagingKind: 'offset-cursor', supportsSourceFile: true, materializationPolicy: 'query-type-projection' }),
  queryRow(SemanticAppQueryKind.TypeScriptDiagnosticSummary, 'diagnostics', 'TypeScript diagnostic clusters grouped by compiler phase, category, code, severity, and TypeScript source label.', 'summary-row-table', { pagingKind: 'offset-cursor', supportsSourceFile: true, materializationPolicy: 'query-type-projection' }),
  queryRow(SemanticAppQueryKind.EvaluationIssues, 'evaluation', 'Static evaluator issues and unsupported runtime-dependent seams.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.ConfigurationIssues, 'configuration', 'Aurelia configuration and app-root issues projected from source and modeled registrations.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.DiIssues, 'di', 'Dependency-injection issues from the modeled container and registration world.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.ObservationIssues, 'observation', 'Observer/accessor and binding-observation issues from runtime binding setup.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.ComputedObservationDefinitions, 'observation', 'Valid @computed getter/method dependency declarations and their proxy/explicit observation mode.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.ComputedObserverSources, 'observation', 'Source-backed ComputedObserver and ControlledComputedObserver projection rows for authored getters.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.ComputedObserverObservedDependencies, 'observation', 'Getter-body and explicit-dependency reads collected by computed-observer source execution.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.RuntimeEffects, 'observation', 'Source-level IEffect rows created by direct Observation.watch(...) and Observation.run(...) calls.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.RuntimeEffectObservedDependencies, 'observation', 'Expression, function-key, and synchronous RunEffect dependency reads collected by direct Observation source effects.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.ProxyObservableEscapes, 'observation', 'Source-level ProxyObservable.getRaw(...) and ProxyObservable.unwrap(...) escape calls.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.StateStores, 'state', 'Discovered state-store products and state ownership rows.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.StateGetterBindings, 'state', '@fromState-created StateGetterBinding rows with store resolution and selector/target type projection.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.StateIssues, 'state', 'State modeling issues and state-source diagnostics.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.I18nTranslationKeys, 'i18n', 'Static i18n translation keys admitted from I18nConfiguration init resources.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.I18nTranslationBindings, 'i18n', 'Rendered i18n TranslationBinding target groups and lifecycle issue counts.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingTargets }),
  queryRow(SemanticAppQueryKind.ValidationIssues, 'validation', 'Validation rule/model issues and validation behavior diagnostics.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.FetchClientIssues, 'fetch-client', 'Fetch client configuration and retry-interceptor diagnostics.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.DialogIssues, 'dialog', 'Dialog configuration, service, and child-resolver diagnostics.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.RouterOverview, 'router', 'Summary-first route, viewport, route-tree, navigation, and router issue overview; opt into row samples with page.size or rowPageSize.', 'overview', { pagingKind: 'row-sample', supportsDetail: true }),
  ...semanticRouteQueryDescriptors.map((descriptor) =>
    queryRow(
      descriptor.queryKind,
      'router',
      `Router-family rows for ${descriptor.answerRowLabel}.`,
      'row-table',
      { pagingKind: 'offset-cursor', supportsDetail: true, routeProductKind: descriptor.routeProductKind },
    )
  ),
  queryRow(SemanticAppQueryKind.ResourceDefinitions, 'resources', 'Resolved Aurelia resource definitions visible to the app world.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.ResourceIssues, 'resources', 'Resource recognition, visibility, or materialization diagnostics.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.ResourceVisibility, 'resources', 'Resource visibility and scope rows for app and template compilation.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.TemplateCompilations, 'template', 'Compiled app-runtime and source-selected authoring template rows.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.TemplateCompletions, 'template', 'Template completion candidates at a source cursor.', 'cursor-locus', { pagingKind: 'continuation-cursor', supportsDetail: true, requiresCursor: true, materializationPolicy: 'query-type-projection', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.TemplateCursorInfo, 'template', 'Semantic template site, resource, bindable, member, and diagnostic context at a source cursor.', 'cursor-locus', { supportsDetail: true, requiresCursor: true, supportsDiagnosticProjection: true, materializationPolicy: 'query-type-projection', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.TemplateDiagnostics, 'template', 'Template diagnostics across app-runtime and source-selected authoring templates; diagnosticProjection controls answer-time TypeChecker work.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, supportsSourceFile: true, supportsDiagnosticProjection: true, materializationPolicy: 'query-type-projection', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.RuntimeControllers, 'rendering', 'Runtime controller frames and recursive hydration handoff rows.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.RuntimeWatchers, 'rendering', 'Controller-owned ComputedWatcher and ExpressionWatcher rows created from resource watch metadata.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.RuntimeWatcherObservedDependencies, 'rendering', 'ExpressionWatcher astEvaluate dependency reads and first ComputedWatcher ProxyObservable dependency reads collected during controller-owned watcher setup.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.RuntimeCompositions, 'rendering', 'Runtime-html AuCompose CompositionContext and CompositionController rows with resolved component candidates.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.BindingTargetAccesses, 'binding', 'Observer/accessor lookup selected for target-side binding access.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingTargets }),
  queryRow(SemanticAppQueryKind.TargetOperations, 'binding', 'Renderer-owned and binding-owned direct target operations.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingTargets }),
  queryRow(SemanticAppQueryKind.BindingTargetOperations, 'binding', 'Same projection as target operations for callers still using the older target-operation query name.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingTargets }),
  queryRow(SemanticAppQueryKind.BindingSourceOperations, 'binding', 'Source-side binding operations such as ref assignment and captured binding fan-out.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingTargets }),
  queryRow(SemanticAppQueryKind.BindingBehaviorApplications, 'binding', 'Materialized binding behavior applications after compiler resource scope and bind phase.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingTargets }),
  queryRow(SemanticAppQueryKind.BindingValueChannels, 'binding', 'Runtime value-channel shape selected for DOM/native/custom binding targets.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.BindingValueChannelSummary, 'binding', 'Grouped runtime value-channel and observer-coupling mechanisms for compact form/control explanation.', 'summary-row-table', { pagingKind: 'offset-cursor', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.BindingDataFlows, 'binding', 'Source-to-target and target-to-source binding data-flow rows with TypeChecker pressure.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.BindingDataFlowSummary, 'binding', 'Grouped binding data-flow directions, value channels, assignability, and writeback pressure.', 'summary-row-table', { pagingKind: 'offset-cursor', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.ControlUseInventory, 'controls', 'Concrete authored native/control uses classified through runtime binding value-channel, data-flow, static submit-control, static route-link, and static message products.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.BindingObservedDependencySummary, 'binding', 'Grouped binding observed-dependency reads, source roots, member source states, and source-backed observation pressure.', 'summary-row-table', { pagingKind: 'offset-cursor', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.BindingObservedDependencies, 'binding', 'Source-side expression dependency reads collected through template connectable observation during binding evaluation.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
] satisfies readonly SemanticAppQueryCatalogRow[];

assertCompleteQueryCatalog();

export function readSemanticAppQueryCatalog(
  request: SemanticAppQueryCatalogRequest = {},
): SemanticRuntimeAnswer<SemanticAppQueryCatalogResult> {
  const allRows = [...semanticAppQueryCatalogRows].sort((left, right) =>
    `${left.group}:${left.queryKind}`.localeCompare(`${right.group}:${right.queryKind}`)
  );
  const rows = allRows.filter((row) =>
    (request.group == null || semanticAppQueryCatalogGroupMatches(row, request.group))
    && (request.queryKind == null || row.queryKind === request.queryKind)
  );
  return answer(
    SemanticRuntimeAnswerOutcome.Hit,
    `Read app query catalog with ${rows.length} of ${allRows.length} query kind(s) across ${groupRows(rows).length} group(s).`,
    {
      totalRows: allRows.length,
      returnedRows: rows.length,
      displayText: appQueryCatalogDisplayText(rows, allRows.length),
      rows,
      groups: groupRows(rows),
    },
  );
}

function appQueryCatalogDisplayText(
  rows: readonly SemanticAppQueryCatalogRow[],
  totalRows: number,
): string {
  const groups = groupRows(rows);
  const lines = [
    `App queries: ${rows.length} of ${totalRows} query kind(s) across ${groups.length} group(s).`,
  ];
  if (groups.length > 0) {
    lines.push(`Groups: ${groups.map((group) => `${group.group}(${group.count})`).join(', ')}.`);
  }
  const previewRows = rows.slice(0, 12).map((row) =>
    `${row.queryKind} [${row.resultRole}, depth=${row.minimumAnalysisDepth}, boundary=${row.runtimeBoundary}]`
  );
  if (previewRows.length > 0) {
    lines.push(`Query kinds: ${previewRows.join('; ')}${rows.length > previewRows.length ? `; plus ${rows.length - previewRows.length} more` : ''}.`);
  }
  if (rows.some((row) => row.queryKind === SemanticAppQueryKind.BindingValueChannelSummary)
    && rows.some((row) => row.queryKind === SemanticAppQueryKind.BindingDataFlowSummary)
    && rows.some((row) => row.queryKind === SemanticAppQueryKind.BindingObservedDependencySummary)) {
    lines.push('Binding triad: batch binding-value-channel-summary, binding-data-flow-summary, and binding-observed-dependency-summary; use page.size=0 for rollup-first reads.');
  }
  if (rows.some((row) => row.group === 'router')) {
    lines.push('Router: start with router-overview before paging route, viewport, recognizer, or navigation row tables.');
  }
  if (rows.some((row) => row.supportsOpenSeamFilters)) {
    lines.push('Open seams: open-seams, open-seam-summary, and open-seam-sites accept sourceFile, sourceRole, openSeamKindKey, and openSeamReasonKind filters for drill-down.');
    lines.push('Source roles are admission/classification hints from source discovery, not proof that a nested folder such as src/tools is unreachable from app runtime.');
  }
  if (rows.some((row) => row.materializationPolicy === 'query-type-projection' || row.requiresCursor)) {
    lines.push('Type/cursor projection: cursor-locus and diagnostic projection queries may do answer-time TypeChecker work; request them only when the locus needs it.');
  }
  if (rows.some((row) => row.supportsContinuationIntentFilter)) {
    lines.push('Continuations: pass continuationIntents to narrow returned next moves without changing query materialization.');
  }
  lines.push('Next: use aurelia_app_query_batch when several related app query rows are needed from one opened app world.');
  return lines.join('\n');
}

export function semanticAppQueryCatalogRow(
  queryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
): SemanticAppQueryCatalogRow {
  const row = semanticAppQueryCatalogRows.find((candidate) => candidate.queryKind === queryKind);
  if (row == null) {
    throw new Error(`Unsupported semantic app query kind '${queryKind}'. Use the app-query catalog to list supported queryKind values.`);
  }
  return row;
}

/** Return every public app-query catalog row in stable catalog order. */
export function readSemanticAppQueryCatalogRows(): readonly SemanticAppQueryCatalogRow[] {
  return semanticAppQueryCatalogRows;
}

/** Resolve query catalog rows in catalog order for selected public app-query kinds. */
export function semanticAppQueryCatalogRowsForKinds(
  queryKinds: readonly (SemanticAppQueryKind | `${SemanticAppQueryKind}`)[],
): readonly SemanticAppQueryCatalogRow[] {
  const selected = new Set(queryKinds);
  return semanticAppQueryCatalogRows.filter((row) => selected.has(row.queryKind));
}

/** Drop query envelope fields that the target catalog row cannot consume. */
export function semanticAppQueryCatalogShape(
  query: SemanticAppQuery,
): SemanticAppQuery {
  const row = semanticAppQueryCatalogRow(query.kind);
  const sourceFile = row.supportsSourceFile ? semanticAppQuerySourceFileLocus(query) : null;
  return {
    kind: query.kind,
    ...(query.inquiryProfile == null ? {} : { inquiryProfile: query.inquiryProfile }),
    ...(query.continuationIntents == null ? {} : { continuationIntents: query.continuationIntents }),
    ...(query.page == null || !row.supportsPaging ? {} : { page: query.page }),
    ...(query.detail == null || !row.supportsDetail ? {} : { detail: query.detail }),
    ...(query.diagnosticProjection == null || !row.supportsDiagnosticProjection ? {} : { diagnosticProjection: query.diagnosticProjection }),
    ...(query.kind !== SemanticAppQueryKind.AppTopology || query.includeTypeSurfaces == null ? {} : { includeTypeSurfaces: query.includeTypeSurfaces }),
    ...(query.kind !== SemanticAppQueryKind.AppOverview || query.diagnosticPageSize == null ? {} : { diagnosticPageSize: query.diagnosticPageSize }),
    ...(query.kind !== SemanticAppQueryKind.AppOverview || query.openSeamPageSize == null ? {} : { openSeamPageSize: query.openSeamPageSize }),
    ...(row.supportsOpenSeamFilters && query.openSeamKindKey != null ? { openSeamKindKey: query.openSeamKindKey } : {}),
    ...(row.supportsOpenSeamFilters && query.openSeamReasonKind != null ? { openSeamReasonKind: query.openSeamReasonKind } : {}),
    ...(row.supportsOpenSeamFilters && query.sourceRole != null ? { sourceRole: query.sourceRole } : {}),
    ...(query.kind !== SemanticAppQueryKind.RouterOverview || query.rowPageSize == null ? {} : { rowPageSize: query.rowPageSize }),
    ...(row.requiresCursor && query.cursor != null ? { cursor: query.cursor } : {}),
    ...(!row.requiresCursor && sourceFile != null ? { sourceFile } : {}),
  };
}

/** Derive the source-file locus a source-capable app query can consume from sourceFile or cursor input. */
export function semanticAppQuerySourceFileLocus(
  query: Pick<SemanticAppQuery, 'cursor' | 'sourceFile'>,
): SemanticRuntimeSourceFileInput | null {
  if (query.sourceFile != null) {
    return query.sourceFile;
  }
  if (query.cursor != null) {
    return { filePath: query.cursor.filePath };
  }
  return null;
}

function queryRow(
  queryKind: SemanticAppQueryKind,
  group: string,
  summary: string,
  resultRole: SemanticAppQueryCatalogRow['resultRole'],
  options: Partial<Pick<
    SemanticAppQueryCatalogRow,
    'runtimeBoundary' | 'materializationPolicy' | 'pagingKind' | 'minimumAnalysisDepth' | 'supportsDetail' | 'supportsSourceFile' | 'supportsOpenSeamFilters' | 'supportsDiagnosticProjection' | 'supportsContinuationIntentFilter' | 'requiresCursor' | 'routeProductKind'
  >> = {},
): SemanticAppQueryCatalogRow {
  const pagingKind = options.pagingKind ?? 'none';
  const materializationPolicy = options.materializationPolicy ?? 'projection-only';
  const requiresCursor = options.requiresCursor ?? false;
  const supportsSourceFile = options.supportsSourceFile ?? false;
  return {
    queryKind,
    group,
    summary,
    resultRole,
    runtimeBoundary: options.runtimeBoundary ?? 'app-world',
    materializationPolicy,
    pagingKind,
    minimumAnalysisDepth: options.minimumAnalysisDepth ?? SemanticAppAnalysisDepth.RuntimeTopology,
    supportsPaging: pagingKind !== 'none',
    supportsDetail: options.supportsDetail ?? false,
    supportsSourceFile,
    supportsOpenSeamFilters: options.supportsOpenSeamFilters ?? false,
    supportsDiagnosticProjection: options.supportsDiagnosticProjection ?? false,
    supportsContinuationIntentFilter: options.supportsContinuationIntentFilter ?? supportsContinuationIntentFilter(queryKind),
    requiresCursor,
    ...(options.routeProductKind == null ? {} : { routeProductKind: options.routeProductKind }),
  };
}

function supportsContinuationIntentFilter(_queryKind: SemanticAppQueryKind): boolean {
  return true;
}

function semanticAppQueryCatalogGroupMatches(
  row: SemanticAppQueryCatalogRow,
  group: string,
): boolean {
  if (row.group === group) {
    return true;
  }
  return group === 'open-seams' && row.supportsOpenSeamFilters;
}

function groupRows(rows: readonly SemanticAppQueryCatalogRow[]): SemanticAppQueryCatalogResult['groups'] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.group, (counts.get(row.group) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([group, count]) => ({ group, count }));
}

function assertCompleteQueryCatalog(): void {
  const catalogKinds = new Set(semanticAppQueryCatalogRows.map((row) => row.queryKind));
  const missing = SEMANTIC_APP_QUERY_KINDS.filter((kind) => !catalogKinds.has(kind));
  if (missing.length > 0) {
    throw new Error(`Semantic app query catalog is missing: ${missing.join(', ')}`);
  }
}
