import { semanticRouteQueryDescriptors } from './route-query-registry.js';
import { SemanticAppAnalysisDepth } from '../configuration/app-analysis.js';
import {
  SEMANTIC_APP_QUERY_KINDS,
  SemanticAppQueryKind,
  SemanticRuntimeAnswerOutcome,
  type SemanticAppQueryCatalogRequest,
  type SemanticAppQueryCatalogResult,
  type SemanticAppQueryCatalogRow,
  type SemanticRuntimeAnswer,
} from './contracts.js';
import { answer } from './answer-helpers.js';

const semanticAppQueryCatalogRows = [
  queryRow(SemanticAppQueryKind.Summary, 'overview', 'Compact project app-world counts and app shape summary.', 'overview'),
  queryRow(SemanticAppQueryKind.AppOverview, 'overview', 'Composed compact app answer for available diagnostics, open seams, topology counts, and opt-in authoring fit.', 'overview'),
  queryRow(SemanticAppQueryKind.AppTopology, 'overview', 'Compact topology counts and scalar facts from the opened app world; bindable type surfaces are opt-in.', 'overview'),
  queryRow(SemanticAppQueryKind.AuthoringCatalog, 'authoring', 'Static authoring ontology, operations, taste axes, and recipe contracts.', 'static-catalog', { materializationPolicy: 'static-catalog', runtimeBoundary: 'runtime-static' }),
  queryRow(SemanticAppQueryKind.AuthoringOrientation, 'authoring', 'Opened-app authoring evidence, capability fit, recipe fit, repairs, and repair clusters.', 'overview', { minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.SourceFiles, 'source', 'Admitted source files for the selected project; routed runtime calls can answer this from the booted project frame without opening an app epoch.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, runtimeBoundary: 'project-frame' }),
  queryRow(SemanticAppQueryKind.UnresolvedModules, 'source', 'Static evaluator module edges that could not be resolved; routed runtime calls can answer this from read-only Aurelia project evaluation without opening an app epoch.', 'row-table', { pagingKind: 'offset-cursor', runtimeBoundary: 'static-evaluation' }),
  queryRow(SemanticAppQueryKind.OpenSeams, 'diagnostics', 'Source-backed or product-backed semantic seams still open after app-world construction.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.OpenSeamSummary, 'diagnostics', 'Open seam clusters grouped by seam kind and reason-kind signature.', 'summary-row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.AppDiagnostics, 'diagnostics', 'Unified app diagnostics across modeled issue lanes, optionally narrowed to one source file.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, supportsSourceFile: true, supportsDiagnosticProjection: true, materializationPolicy: 'query-type-projection' }),
  queryRow(SemanticAppQueryKind.AppDiagnosticSummary, 'diagnostics', 'Diagnostic clusters grouped by domain, kind, authority, severity, framework code, and owning query; diagnosticProjection controls answer-time TypeChecker work.', 'summary-row-table', { pagingKind: 'offset-cursor', supportsDetail: true, supportsSourceFile: true, supportsDiagnosticProjection: true, materializationPolicy: 'query-type-projection' }),
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
  queryRow(SemanticAppQueryKind.TemplateCursorInfo, 'template', 'Semantic template site, resource, bindable, member, and diagnostic context at a source cursor.', 'cursor-locus', { supportsDetail: true, requiresCursor: true, materializationPolicy: 'query-type-projection', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
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
  queryRow(SemanticAppQueryKind.BindingDataFlows, 'binding', 'Source-to-target and target-to-source binding data-flow rows with TypeChecker pressure.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
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
    (request.group == null || row.group === request.group)
    && (request.queryKind == null || row.queryKind === request.queryKind)
  );
  return answer(
    SemanticRuntimeAnswerOutcome.Hit,
    `Read app query catalog with ${rows.length} of ${allRows.length} query kind(s) across ${groupRows(rows).length} group(s).`,
    {
      totalRows: allRows.length,
      returnedRows: rows.length,
      rows,
      groups: groupRows(rows),
    },
  );
}

export function semanticAppQueryCatalogRow(
  queryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
): SemanticAppQueryCatalogRow {
  const row = semanticAppQueryCatalogRows.find((candidate) => candidate.queryKind === queryKind);
  if (row == null) {
    throw new Error(`Semantic app query catalog is missing '${queryKind}'.`);
  }
  return row;
}

function queryRow(
  queryKind: SemanticAppQueryKind,
  group: string,
  summary: string,
  resultRole: SemanticAppQueryCatalogRow['resultRole'],
  options: Partial<Pick<
    SemanticAppQueryCatalogRow,
    'runtimeBoundary' | 'materializationPolicy' | 'pagingKind' | 'minimumAnalysisDepth' | 'supportsDetail' | 'supportsSourceFile' | 'supportsDiagnosticProjection' | 'requiresCursor' | 'routeProductKind'
  >> = {},
): SemanticAppQueryCatalogRow {
  const pagingKind = options.pagingKind ?? 'none';
  return {
    queryKind,
    group,
    summary,
    resultRole,
    runtimeBoundary: options.runtimeBoundary ?? 'app-world',
    materializationPolicy: options.materializationPolicy ?? 'projection-only',
    pagingKind,
    minimumAnalysisDepth: options.minimumAnalysisDepth ?? SemanticAppAnalysisDepth.RuntimeTopology,
    supportsPaging: pagingKind !== 'none',
    supportsDetail: options.supportsDetail ?? false,
    supportsSourceFile: options.supportsSourceFile ?? false,
    supportsDiagnosticProjection: options.supportsDiagnosticProjection ?? false,
    requiresCursor: options.requiresCursor ?? false,
    ...(options.routeProductKind == null ? {} : { routeProductKind: options.routeProductKind }),
  };
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
