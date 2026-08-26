import { semanticRouteQueryDescriptors } from './route-query-registry.js';
import { SemanticAppAnalysisDepth } from '../configuration/app-analysis.js';
import {
  SEMANTIC_APP_QUERY_KINDS,
  SemanticAppQueryKind,
  SemanticObservedDependencyLocusKind,
  SemanticRuntimeAnswerResult,
  type SemanticAppQuery,
  type SemanticAppQueryCatalogRequest,
  type SemanticAppQueryCatalogResult,
  type SemanticAppQueryCatalogRow,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeSourceFileInput,
} from './contracts.js';
import {
  answer,
  COMPLETE_COLLECTION_ANSWER_OPTIONS,
} from './answer-helpers.js';
import { isFrameworkRegistrationCapability } from '../registration/framework-registration-manifest.js';

const observedDependencyRowLocusKinds = [
  SemanticObservedDependencyLocusKind.Project,
  SemanticObservedDependencyLocusKind.SourceFile,
  SemanticObservedDependencyLocusKind.Owner,
  SemanticObservedDependencyLocusKind.Row,
] as const;

const bindingObservedDependencyLocusKinds = [
  ...observedDependencyRowLocusKinds,
  SemanticObservedDependencyLocusKind.Cluster,
] as const;

const semanticAppQueryCatalogRows = [
  queryRow(SemanticAppQueryKind.Summary, 'overview', 'Compact project app-world counts and app shape summary.', 'overview'),
  queryRow(SemanticAppQueryKind.AppOverview, 'overview', 'Composed compact app answer for diagnostics, configured analysis limitations, topology counts, and an explicit raw-seam audit child.', 'overview'),
  queryRow(SemanticAppQueryKind.AppTopology, 'overview', 'Compact topology counts and scalar facts from the opened app world; handles and bindable type surfaces are opt-in.', 'overview', { supportsDetail: true, supportsTypeSurfaces: true }),
  queryRow(SemanticAppQueryKind.TemplateDocumentOwnership, 'template', 'Complete exact component-template source-path set retained by converged custom-element definitions.', 'overview'),
  queryRow(SemanticAppQueryKind.SourceFiles, 'source', 'Admitted source files for the selected project; routed runtime calls can answer this from the booted project frame without opening an app epoch.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, runtimeBoundary: 'project-frame' }),
  queryRow(SemanticAppQueryKind.UnresolvedModules, 'source', 'Static evaluator module edges that could not be resolved; routed runtime calls can answer this from read-only Aurelia project evaluation without opening an app epoch.', 'row-table', { pagingKind: 'offset-cursor', runtimeBoundary: 'static-evaluation' }),
  queryRow(SemanticAppQueryKind.OpenSeams, 'diagnostics', 'Source-backed or product-backed semantic seams still open after app-world construction; filter by source, causal cluster, authored site, seam kind, reason kind, or source role.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, supportsSourceFile: true, supportsOpenSeamFilters: true }),
  queryRow(SemanticAppQueryKind.OpenSeamSummary, 'diagnostics', 'Open seam clusters grouped by seam kind and reason-kind signature; returned cluster keys can narrow sites or raw seam rows within the same app answer epoch.', 'summary-row-table', { pagingKind: 'offset-cursor', supportsSourceFile: true, supportsOpenSeamFilters: true }),
  queryRow(SemanticAppQueryKind.OpenSeamSites, 'diagnostics', 'Open seam sites grouped by exact authored root source; returned site keys can narrow raw seam rows within the same app answer epoch.', 'summary-row-table', { pagingKind: 'offset-cursor', supportsSourceFile: true, supportsOpenSeamFilters: true }),
  queryRow(SemanticAppQueryKind.AnalysisLimitations, 'diagnostics', 'Configured, adjudicated analysis limitations at unique authored product-pressure sites; raw seams remain available through the explicit open-seam audit queries.', 'row-table', { pagingKind: 'offset-cursor', supportsSourceFile: true }),
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
  queryRow(SemanticAppQueryKind.ComputedObserverObservedDependencies, 'observation', 'Getter-body and explicit-dependency reads collected by computed-observer source execution.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, observedDependencyLocusKinds: observedDependencyRowLocusKinds }),
  queryRow(SemanticAppQueryKind.RuntimeEffects, 'observation', 'Immutable construction-site plans for direct Observation.watch(...) and Observation.run(...) calls.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.RuntimeEffectObservedDependencies, 'observation', 'Expression, function-key, and synchronous RunEffect dependency reads collected by direct Observation source effects.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, observedDependencyLocusKinds: observedDependencyRowLocusKinds }),
  queryRow(SemanticAppQueryKind.ProxyObservableEscapes, 'observation', 'Source-level ProxyObservable.getRaw(...) and ProxyObservable.unwrap(...) escape calls.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.RuntimeExpressionAccessUses, 'observation', 'Owner-qualified authored expression accesses with exact operation slots, execution semantics, checker targets, and source loci.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.StateStores, 'state', 'Discovered state-store products and state ownership rows.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.StateGetterBindings, 'state', 'Source-level @fromState binding definitions with store resolution and selector/target type projection.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.StateIssues, 'state', 'State modeling issues and state-source diagnostics.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.I18nTranslationKeys, 'i18n', 'Static i18n translation keys admitted from I18nConfiguration init resources.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.I18nTranslationBindings, 'i18n', 'Rendered i18n TranslationBinding target groups and lifecycle issue counts.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingTargets }),
  queryRow(SemanticAppQueryKind.ValidationIssues, 'validation', 'Validation rule/model issues and validation behavior diagnostics.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.FetchClientIssues, 'fetch-client', 'Fetch client configuration and retry-interceptor diagnostics.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.DialogIssues, 'dialog', 'Dialog configuration, service, and child-resolver diagnostics.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.FrameworkCapabilityDemands, 'framework', 'Authored framework/plugin capability demands with registration admission, package/import availability evidence, and source-backed actionability posture.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, supportsSourceFile: true }),
  queryRow(SemanticAppQueryKind.FrameworkCapabilityExplanation, 'framework', 'Engine-authored causal explanation for the exact template-authored framework capability demand selected at a source cursor.', 'cursor-locus', { requiresCursor: true }),
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
  queryRow(SemanticAppQueryKind.ResourceInventory, 'resources', 'Project-selected runtime resource inventory with stable semantic identity, provenance, and exact declaration roles; bindable type surfaces are opt-in.', 'row-table', { pagingKind: 'offset-cursor', supportsTypeSurfaces: true }),
  queryRow(SemanticAppQueryKind.ResourceDefinitions, 'resources', 'Resolved Aurelia resource definitions visible to the app world.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, materializationPolicy: 'query-type-projection' }),
  queryRow(SemanticAppQueryKind.ResourceIssues, 'resources', 'Resource recognition, visibility, or materialization diagnostics.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.ResourceVisibility, 'resources', 'Resource visibility and scope rows for app and template compilation.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.TemplateResourceAvailability, 'resources', 'Effective runtime resources for one exact source/cursor-selected template compiler scope; bindable type surfaces are opt-in.', 'cursor-locus', { requiresCursor: true, supportsTypeSurfaces: true }),
  queryRow(SemanticAppQueryKind.ResourceAvailabilityExplanation, 'resources', 'Engine-authored causal explanation of canonical-name availability for one exact resource identity in one source/cursor-selected template compiler scope.', 'cursor-locus', { requiresCursor: true }),
  queryRow(SemanticAppQueryKind.TemplateCompilations, 'template', 'Compiled app-runtime and source-selected authoring template rows.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.AttributeInterpretationExplanation, 'template', 'Engine-authored explanation of how Aurelia interpreted one exact top-level authored HTML attribute name, projected from compiler products without inferring omitted work.', 'cursor-locus', { requiresCursor: true }),
  queryRow(SemanticAppQueryKind.TemplateCompletions, 'template', 'Template completion candidates at a source cursor.', 'cursor-locus', { pagingKind: 'continuation-cursor', supportsDetail: true, requiresCursor: true, materializationPolicy: 'query-type-projection', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.TemplateCursorInfo, 'template', 'Semantic template site, resource, bindable, member, and diagnostic context at a source cursor.', 'cursor-locus', { supportsDetail: true, requiresCursor: true, supportsDiagnosticProjection: true, materializationPolicy: 'query-type-projection', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.TemplateReferences, 'template', 'Source-linked template references for the selected member at a source cursor.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, requiresCursor: true, materializationPolicy: 'query-type-projection', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.TemplateRename, 'template', 'Conservative edit plan for renaming a source-backed template member, local, bindable, or resource name.', 'cursor-locus', { supportsDetail: true, requiresCursor: true, materializationPolicy: 'query-type-projection', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.TemplateRenameFromTypeScript, 'template', 'Template-side edit plan for a TypeScript member rename initiated at a source cursor.', 'cursor-locus', { supportsDetail: true, requiresCursor: true, materializationPolicy: 'query-type-projection', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.TemplateCodeActions, 'template', 'Conservative edit plans for runtime-owned template diagnostics at a source cursor.', 'cursor-locus', { supportsDetail: true, requiresCursor: true, supportsDiagnosticProjection: true, materializationPolicy: 'query-type-projection', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.TemplateSemanticTokens, 'template', 'Source-linked template semantic tokens derived from compiled template and expression facts.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, supportsSourceFile: true }),
  queryRow(SemanticAppQueryKind.TemplateFoldingRanges, 'template', 'Source-linked foldable template regions derived from compiled HTML structure.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, supportsSourceFile: true }),
  queryRow(SemanticAppQueryKind.TemplateInlayHints, 'template', 'Source-linked template inlay hints derived from runtime binding facts.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, supportsSourceFile: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.TemplateDiagnostics, 'template', 'Template diagnostics across app-runtime and source-selected authoring templates; diagnosticProjection controls answer-time TypeChecker work.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, supportsSourceFile: true, supportsDiagnosticProjection: true, materializationPolicy: 'query-type-projection', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.RuntimeControllers, 'rendering', 'Runtime controller frames and recursive hydration handoff rows.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.RuntimeWatchers, 'rendering', 'Controller-owned ComputedWatcher and ExpressionWatcher rows created from resource watch metadata.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.RuntimeWatcherObservedDependencies, 'rendering', 'ExpressionWatcher astEvaluate dependency reads and first ComputedWatcher ProxyObservable dependency reads collected during controller-owned watcher setup.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, observedDependencyLocusKinds: observedDependencyRowLocusKinds }),
  queryRow(SemanticAppQueryKind.RuntimeCompositions, 'rendering', 'Runtime-html AuCompose CompositionContext and CompositionController rows with resolved component candidates.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.TemplateContentProjections, 'rendering', 'Compiler provider definitions, runtime AuSlot view selection, and native Shadow DOM slot outlets.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true }),
  queryRow(SemanticAppQueryKind.BindingTargetAccesses, 'binding', 'Observer/accessor lookup selected for target-side binding access.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingTargets }),
  queryRow(SemanticAppQueryKind.TargetOperations, 'binding', 'Renderer-owned and binding-owned direct target operations.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingTargets }),
  queryRow(SemanticAppQueryKind.BindingTargetOperations, 'binding', 'Same projection as target operations for callers still using the older target-operation query name.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingTargets }),
  queryRow(SemanticAppQueryKind.BindingSourceOperations, 'binding', 'Source-side binding operations such as ref assignment and captured binding fan-out.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingTargets }),
  queryRow(SemanticAppQueryKind.BindingBehaviorApplications, 'binding', 'Materialized binding behavior applications after compiler resource scope and bind phase.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingTargets }),
  queryRow(SemanticAppQueryKind.ValueConverterApplications, 'binding', 'Materialized value converter applications over runtime binding expressions.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.BindingValueChannels, 'binding', 'Runtime value-channel shape selected for DOM/native/custom binding targets.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.BindingValueChannelSummary, 'binding', 'Grouped runtime value-channel and observer-coupling mechanisms for compact form/control explanation.', 'summary-row-table', { pagingKind: 'offset-cursor', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.BindingDataFlows, 'binding', 'Source-to-target and target-to-source binding data-flow rows with TypeChecker pressure.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.BindingUncertaintyExplanation, 'binding', 'Engine-authored explanation of what Aurelia can prove, and what blocks stronger certainty, for the exact template-authored property binding selected at a source cursor.', 'cursor-locus', { requiresCursor: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.BindingDataFlowSummary, 'binding', 'Grouped binding data-flow directions, value channels, assignability, and writeback pressure.', 'summary-row-table', { pagingKind: 'offset-cursor', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.ControlUseInventory, 'controls', 'Concrete authored native/control uses classified through runtime binding value-channel, data-flow, static submit-control, static route-link, and static message products.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation }),
  queryRow(SemanticAppQueryKind.BindingObservedDependencySummary, 'binding', 'Grouped binding observed-dependency reads, source roots, member source states, and source-backed observation pressure.', 'summary-row-table', { pagingKind: 'offset-cursor', minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation, observedDependencyLocusKinds: bindingObservedDependencyLocusKinds }),
  queryRow(SemanticAppQueryKind.BindingObservedDependencies, 'binding', 'Source-side expression dependency reads collected through template connectable observation during binding evaluation.', 'row-table', { pagingKind: 'offset-cursor', supportsDetail: true, minimumAnalysisDepth: SemanticAppAnalysisDepth.BindingObservation, observedDependencyLocusKinds: bindingObservedDependencyLocusKinds }),
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
    SemanticRuntimeAnswerResult.Answered,
    `Read app query catalog with ${rows.length} of ${allRows.length} query kind(s) across ${groupRows(rows).length} group(s).`,
    {
      totalRows: allRows.length,
      returnedRows: rows.length,
      displayText: appQueryCatalogDisplayText(rows, allRows.length),
      rows,
      groups: groupRows(rows),
    },
    COMPLETE_COLLECTION_ANSWER_OPTIONS,
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
    lines.push('Open seams: open-seams, open-seam-summary, and open-seam-sites accept sourceFile, sourceRole, openSeamKindKey, openSeamReasonKind, openSeamClusterKey, and openSeamSiteKey filters for drill-down.');
    lines.push('Source roles are admission/classification hints from source discovery, not proof that a nested folder such as src/tools is unreachable from app runtime.');
  }
  if (rows.some((row) => row.materializationPolicy === 'query-type-projection' || row.supportsTypeSurfaces || row.requiresCursor)) {
    lines.push('Type/cursor projection: cursor-locus, diagnostic projection, and explicit type-surface queries may do answer-time TypeChecker work; request them only when the locus needs it.');
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
    ...(query.includeTypeSurfaces == null || !row.supportsTypeSurfaces ? {} : { includeTypeSurfaces: query.includeTypeSurfaces }),
    ...(query.kind !== SemanticAppQueryKind.AppOverview || query.diagnosticPageSize == null ? {} : { diagnosticPageSize: query.diagnosticPageSize }),
    ...(query.kind !== SemanticAppQueryKind.AppOverview || query.analysisLimitationPageSize == null ? {} : { analysisLimitationPageSize: query.analysisLimitationPageSize }),
    ...(query.kind !== SemanticAppQueryKind.AppOverview || query.openSeamPageSize == null ? {} : { openSeamPageSize: query.openSeamPageSize }),
    ...(row.supportsOpenSeamFilters && query.openSeamKindKey != null ? { openSeamKindKey: query.openSeamKindKey } : {}),
    ...(row.supportsOpenSeamFilters && query.openSeamReasonKind != null ? { openSeamReasonKind: query.openSeamReasonKind } : {}),
    ...(row.supportsOpenSeamFilters && query.sourceRole != null ? { sourceRole: query.sourceRole } : {}),
    ...(row.supportsOpenSeamFilters && query.openSeamClusterKey != null ? { openSeamClusterKey: query.openSeamClusterKey } : {}),
    ...(row.supportsOpenSeamFilters && query.openSeamSiteKey != null ? { openSeamSiteKey: query.openSeamSiteKey } : {}),
    ...(
      query.observedDependencyLocus != null
      && row.observedDependencyLocusKinds.includes(query.observedDependencyLocus.kind)
        ? { observedDependencyLocus: query.observedDependencyLocus }
        : {}
    ),
    ...(query.kind !== SemanticAppQueryKind.RouterOverview || query.rowPageSize == null ? {} : { rowPageSize: query.rowPageSize }),
    ...(row.requiresCursor && query.cursor != null ? { cursor: query.cursor } : {}),
    ...(
      query.kind === SemanticAppQueryKind.FrameworkCapabilityExplanation
      && query.frameworkCapability != null
        ? { frameworkCapability: query.frameworkCapability }
        : {}
    ),
    ...(
      (
        query.kind === SemanticAppQueryKind.TemplateResourceAvailability
        || query.kind === SemanticAppQueryKind.ResourceAvailabilityExplanation
      )
      && query.templateResourceScopeIdentityKey != null
        ? { templateResourceScopeIdentityKey: query.templateResourceScopeIdentityKey }
        : {}
    ),
    ...(
      query.kind === SemanticAppQueryKind.ResourceAvailabilityExplanation
      && query.resourceIdentityKey != null
        ? { resourceIdentityKey: query.resourceIdentityKey }
        : {}
    ),
    ...(query.kind !== SemanticAppQueryKind.TemplateReferences || query.includeDeclaration == null ? {} : { includeDeclaration: query.includeDeclaration }),
    ...(
      (query.kind !== SemanticAppQueryKind.TemplateRename && query.kind !== SemanticAppQueryKind.TemplateRenameFromTypeScript)
        || query.newName == null
        ? {}
        : { newName: query.newName }
    ),
    ...(!row.requiresCursor && sourceFile != null ? { sourceFile } : {}),
  };
}

/** Return caller fields that the selected query catalog row cannot consume as current-query input. */
export function unsupportedSemanticAppQuerySelectorFields(
  query: SemanticAppQuery,
): readonly string[] {
  const row = semanticAppQueryCatalogRow(query.kind);
  const unsupportedFields: string[] = [];
  if (query.page != null && !row.supportsPaging) {
    unsupportedFields.push('page');
  }
  if (query.detail != null && !row.supportsDetail) {
    unsupportedFields.push('detail');
  }
  if (query.sourceFile != null && !row.supportsSourceFile) {
    unsupportedFields.push('sourceFile');
  }
  if (query.cursor != null && !row.requiresCursor && !row.supportsSourceFile) {
    unsupportedFields.push('cursor');
  }
  if (
    query.templateResourceScopeIdentityKey != null
    && query.kind !== SemanticAppQueryKind.TemplateResourceAvailability
    && query.kind !== SemanticAppQueryKind.ResourceAvailabilityExplanation
  ) {
    unsupportedFields.push('templateResourceScopeIdentityKey');
  }
  if (
    query.resourceIdentityKey != null
    && query.kind !== SemanticAppQueryKind.ResourceAvailabilityExplanation
  ) {
    unsupportedFields.push('resourceIdentityKey');
  } else if (
    query.kind === SemanticAppQueryKind.ResourceAvailabilityExplanation
    && (query.resourceIdentityKey == null || query.resourceIdentityKey.length === 0)
  ) {
    unsupportedFields.push('resourceIdentityKey(required)');
  }
  if (
    query.frameworkCapability != null
    && query.kind !== SemanticAppQueryKind.FrameworkCapabilityExplanation
  ) {
    unsupportedFields.push('frameworkCapability');
  } else if (
    query.frameworkCapability != null
    && !isFrameworkRegistrationCapability(query.frameworkCapability)
  ) {
    unsupportedFields.push('frameworkCapability');
  }
  if (query.includeTypeSurfaces != null && !row.supportsTypeSurfaces) {
    unsupportedFields.push('includeTypeSurfaces');
  }
  if (query.diagnosticPageSize != null && query.kind !== SemanticAppQueryKind.AppOverview) {
    unsupportedFields.push('diagnosticPageSize');
  }
  if (query.analysisLimitationPageSize != null && query.kind !== SemanticAppQueryKind.AppOverview) {
    unsupportedFields.push('analysisLimitationPageSize');
  }
  if (query.openSeamPageSize != null && query.kind !== SemanticAppQueryKind.AppOverview) {
    unsupportedFields.push('openSeamPageSize');
  }
  for (const field of [
    'openSeamKindKey',
    'openSeamReasonKind',
    'sourceRole',
    'openSeamClusterKey',
    'openSeamSiteKey',
  ] as const) {
    if (query[field] != null && !row.supportsOpenSeamFilters) {
      unsupportedFields.push(field);
    }
  }
  if (
    query.observedDependencyLocus != null
    && !row.observedDependencyLocusKinds.includes(query.observedDependencyLocus.kind)
  ) {
    unsupportedFields.push(`observedDependencyLocus(${query.observedDependencyLocus.kind})`);
  }
  if (query.rowPageSize != null && query.kind !== SemanticAppQueryKind.RouterOverview) {
    unsupportedFields.push('rowPageSize');
  }
  if (query.includeDeclaration != null && query.kind !== SemanticAppQueryKind.TemplateReferences) {
    unsupportedFields.push('includeDeclaration');
  }
  if (
    query.newName != null
    && query.kind !== SemanticAppQueryKind.TemplateRename
    && query.kind !== SemanticAppQueryKind.TemplateRenameFromTypeScript
  ) {
    unsupportedFields.push('newName');
  }
  return unsupportedFields;
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
    'runtimeBoundary' | 'materializationPolicy' | 'pagingKind' | 'minimumAnalysisDepth' | 'supportsDetail' | 'supportsSourceFile' | 'observedDependencyLocusKinds' | 'supportsOpenSeamFilters' | 'supportsDiagnosticProjection' | 'supportsTypeSurfaces' | 'supportsContinuationIntentFilter' | 'requiresCursor' | 'routeProductKind'
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
    observedDependencyLocusKinds: options.observedDependencyLocusKinds ?? [],
    supportsOpenSeamFilters: options.supportsOpenSeamFilters ?? false,
    supportsDiagnosticProjection: options.supportsDiagnosticProjection ?? false,
    supportsTypeSurfaces: options.supportsTypeSurfaces ?? false,
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
