import {
  InquiryContinuationCost,
  InquiryContinuationIntent,
  InquiryEvidenceCoverage,
  InquiryEvidenceStaleness,
  InquiryEvidenceState,
  InquirySourcePrecision,
  inquiryContinuationIntents,
} from '../inquiry/continuation-intent.js';
import {
  InquiryContinuationKind,
} from '../inquiry/answer.js';
import {
  AppBuilderControlManifestRowId,
} from '../app-builder/ontology/control.js';
import {
  AppBuilderEffectContractId,
} from '../app-builder/ontology/effect.js';
import {
  semanticAppQueryCatalogRow,
  semanticAppQueryCatalogShape,
  semanticAppQuerySourceFileLocus,
} from './app-query-catalog.js';
import { semanticAppQueryMaterializationPolicy } from './app-query-policy.js';
import {
  semanticSourcePrecisionForAnswerRows,
  semanticSourcePrecisionForReference,
  semanticSourcePrecisionForReferences,
  type SemanticSourceReference,
} from './source-reference.js';
import {
  SemanticAppQueryKind,
  SemanticRuntimeDetail,
  type SemanticAppQuery,
  type SemanticAppQueryCatalogRow,
  type SemanticAppDiagnosticRow,
  type SemanticAppDiagnosticSummaryRow,
  type SemanticRuntimeAnswer,
  type SemanticRuntimeContinuationRow,
  type SemanticRuntimePageInput,
  type SemanticRuntimeSourceFileInput,
  type SemanticTemplateDiagnosticRow,
} from './contracts.js';
import {
  SemanticRuntimeAppBuilderQueryKind,
  type SemanticRuntimeAppBuilderQueryRequest,
} from './app-builder.js';
import {
  mergeSemanticRuntimeContinuationRows,
  semanticRuntimeContinuationMatchesRequestedIntents,
  semanticRuntimeContinuationPageInput,
  semanticRuntimeContinuationWithAppBuilderQueryIntentFilter,
  semanticRuntimeContinuationWithAppQueryIntentFilter,
} from './continuation-helpers.js';

type ContinuationSeedBase = {
  readonly kind: InquiryContinuationKind;
  readonly rationale: string;
  readonly intents: readonly InquiryContinuationIntent[];
  readonly evidenceState?: InquiryEvidenceState;
  readonly coverage?: InquiryEvidenceCoverage;
  readonly sourcePrecision?: InquirySourcePrecision;
  readonly staleness?: InquiryEvidenceStaleness;
  readonly cost?: InquiryContinuationCost;
  readonly blockers?: readonly string[];
};

type AppQueryContinuationSeed = ContinuationSeedBase & {
  readonly targetQuery: SemanticAppQuery;
  readonly targetAppBuilderQuery?: never;
};

type AppBuilderContinuationSeed = ContinuationSeedBase & {
  readonly targetQuery?: never;
  readonly targetAppBuilderQuery: SemanticRuntimeAppBuilderQueryRequest;
};

type ContinuationSeed = AppQueryContinuationSeed | AppBuilderContinuationSeed;

/** Issue query families that should be compared with unified diagnostic clusters. */
const ISSUE_SUMMARY_QUERY_KINDS = new Set<SemanticAppQueryKind | `${SemanticAppQueryKind}`>([
  SemanticAppQueryKind.ConfigurationIssues,
  SemanticAppQueryKind.DiIssues,
  SemanticAppQueryKind.ObservationIssues,
  SemanticAppQueryKind.StateIssues,
  SemanticAppQueryKind.ValidationIssues,
  SemanticAppQueryKind.FetchClientIssues,
  SemanticAppQueryKind.DialogIssues,
  SemanticAppQueryKind.ResourceIssues,
  SemanticAppQueryKind.RouteRecognizerIssues,
  SemanticAppQueryKind.RouterIssues,
]);

type IssueContinuationQueryShape = 'row' | 'diagnostic';

type IssueContinuationSpec = {
  readonly source: SemanticAppQueryKind;
  readonly rationale: string;
  readonly target: SemanticAppQueryKind;
  readonly intent: InquiryContinuationIntent.Inspect | InquiryContinuationIntent.Diagnose;
  readonly queryShape: IssueContinuationQueryShape;
  readonly evidenceState?: InquiryEvidenceState;
};

/** Product-specific issue family follow-ups that remain below edit/authoring policy. */
const ISSUE_CONTINUATION_SPECS: readonly IssueContinuationSpec[] = [
  {
    source: SemanticAppQueryKind.ConfigurationIssues,
    rationale: 'Inspect DI issues that may share the same configuration world.',
    target: SemanticAppQueryKind.DiIssues,
    intent: InquiryContinuationIntent.Inspect,
    queryShape: 'row',
    evidenceState: InquiryEvidenceState.Open,
  },
  {
    source: SemanticAppQueryKind.ConfigurationIssues,
    rationale: 'Inspect admitted source files that contributed configuration evidence.',
    target: SemanticAppQueryKind.SourceFiles,
    intent: InquiryContinuationIntent.Inspect,
    queryShape: 'row',
  },
  {
    source: SemanticAppQueryKind.DiIssues,
    rationale: 'Inspect configuration issues around the same DI world.',
    target: SemanticAppQueryKind.ConfigurationIssues,
    intent: InquiryContinuationIntent.Inspect,
    queryShape: 'row',
    evidenceState: InquiryEvidenceState.Open,
  },
  {
    source: SemanticAppQueryKind.StateIssues,
    rationale: 'Inspect state-store rows behind these state issues.',
    target: SemanticAppQueryKind.StateStores,
    intent: InquiryContinuationIntent.Inspect,
    queryShape: 'row',
  },
  {
    source: SemanticAppQueryKind.StateIssues,
    rationale: 'Inspect binding data-flow summaries near state issue pressure.',
    target: SemanticAppQueryKind.BindingDataFlowSummary,
    intent: InquiryContinuationIntent.Inspect,
    queryShape: 'row',
    evidenceState: InquiryEvidenceState.TypeProjected,
  },
  {
    source: SemanticAppQueryKind.ValidationIssues,
    rationale: 'Inspect validation binding behavior applications before planning a repair.',
    target: SemanticAppQueryKind.BindingBehaviorApplications,
    intent: InquiryContinuationIntent.Inspect,
    queryShape: 'row',
    evidenceState: InquiryEvidenceState.TypeProjected,
  },
  {
    source: SemanticAppQueryKind.ValidationIssues,
    rationale: 'Inspect template diagnostics around validation issue loci.',
    target: SemanticAppQueryKind.TemplateDiagnostics,
    intent: InquiryContinuationIntent.Diagnose,
    queryShape: 'diagnostic',
    evidenceState: InquiryEvidenceState.TypeProjected,
  },
  {
    source: SemanticAppQueryKind.FetchClientIssues,
    rationale: 'Inspect configuration issues beside fetch-client setup issues.',
    target: SemanticAppQueryKind.ConfigurationIssues,
    intent: InquiryContinuationIntent.Inspect,
    queryShape: 'row',
    evidenceState: InquiryEvidenceState.Open,
  },
  {
    source: SemanticAppQueryKind.FetchClientIssues,
    rationale: 'Inspect source files that contributed fetch-client setup evidence.',
    target: SemanticAppQueryKind.SourceFiles,
    intent: InquiryContinuationIntent.Inspect,
    queryShape: 'row',
  },
  {
    source: SemanticAppQueryKind.DialogIssues,
    rationale: 'Inspect DI issues beside dialog service and resolver issues.',
    target: SemanticAppQueryKind.DiIssues,
    intent: InquiryContinuationIntent.Inspect,
    queryShape: 'row',
    evidenceState: InquiryEvidenceState.Open,
  },
  {
    source: SemanticAppQueryKind.DialogIssues,
    rationale: 'Inspect resource definitions around dialog component issues.',
    target: SemanticAppQueryKind.ResourceDefinitions,
    intent: InquiryContinuationIntent.Inspect,
    queryShape: 'row',
  },
];

/** Attach typed next moves to public app-query answers from one catalog-aware policy point. */
export function withSemanticAppQueryContinuations<TValue>(
  query: SemanticAppQuery,
  result: SemanticRuntimeAnswer<TValue>,
  catalogRow: SemanticAppQueryCatalogRow = semanticAppQueryCatalogRow(query.kind),
): SemanticRuntimeAnswer<TValue> {
  const continuations = semanticAppQueryContinuationRows(query, result, catalogRow);
  if (continuations.length === 0) {
    return result;
  }
  return {
    ...result,
    continuations: mergeSemanticRuntimeContinuationRows(result.continuations ?? [], continuations),
  };
}

/** Apply caller-requested continuation intent filtering after claim/cache materialization. */
export function filterSemanticAppQueryContinuations<TValue>(
  query: Pick<SemanticAppQuery, 'continuationIntents'>,
  result: SemanticRuntimeAnswer<TValue>,
): SemanticRuntimeAnswer<TValue> {
  if (result.continuations == null || result.continuations.length === 0) {
    return result;
  }
  const requestedIntents = inquiryContinuationIntents(query.continuationIntents ?? []);
  if (requestedIntents.length === 0) {
    return result;
  }
  const rows = result.continuations
    .filter((row) => semanticRuntimeContinuationMatchesRequestedIntents(row, requestedIntents))
    .map((row) => semanticRuntimeContinuationWithAppBuilderQueryIntentFilter(
      semanticRuntimeContinuationWithAppQueryIntentFilter(row, requestedIntents),
      requestedIntents,
    ));
  return {
    ...result,
    continuations: rows,
  };
}

function semanticAppQueryContinuationRows(
  query: SemanticAppQuery,
  result: SemanticRuntimeAnswer<unknown>,
  catalogRow: SemanticAppQueryCatalogRow,
): readonly SemanticRuntimeContinuationRow[] {
  const seeds: ContinuationSeed[] = [];
  const locusQuery = semanticAppQueryCatalogShape(query);
  const sourceFile = semanticAppQuerySourceFileLocus(locusQuery);
  const page = semanticRuntimeContinuationPageInput(query);
  const answerSourcePrecision = semanticSourcePrecisionForAnswerRows(result.value);

  const nextPage = nextPageContinuation(query, result, catalogRow);
  addOverviewContinuations(query, seeds);
  addSourceContinuations(query, seeds, sourceFile, page);
  addDiagnosticContinuations(query, result, seeds, sourceFile, page);
  addDiagnosticValueContinuations(query, result, seeds, page);
  addTemplateContinuations(query, result, seeds, sourceFile, page);
  addRouterContinuations(query, seeds, page);
  addResourceContinuations(query, seeds, page);
  addObservationContinuations(query, seeds, page);
  addBindingContinuations(query, seeds, page);
  addRenderingContinuations(query, seeds, page);
  addStateAndI18nContinuations(query, seeds, page);
  addIssueContinuations(query, seeds, page);

  return mergeSemanticRuntimeContinuationRows(nextPage, seeds.map((seed) => seedToRow(seed, answerSourcePrecision)));
}

function addOverviewContinuations(
  query: SemanticAppQuery,
  seeds: ContinuationSeed[],
): void {
  switch (query.kind) {
    case SemanticAppQueryKind.Summary:
      seeds.push(
        inspect(
          'Open the composed app overview after the compact summary.',
          overviewQuery(SemanticAppQueryKind.AppOverview, query),
        ),
        inspect(
          'Inspect runtime topology counts behind the summary.',
          overviewQuery(SemanticAppQueryKind.AppTopology, query),
        ),
        diagnose(
          'Cluster diagnostics before paging detailed issue rows.',
          diagnosticQuery(SemanticAppQueryKind.AppDiagnosticSummary, query),
        ),
        inspect(
          'Group open semantic seams before paging seam rows.',
          overviewQuery(SemanticAppQueryKind.OpenSeamSummary, query),
          InquiryEvidenceState.Open,
        ),
        inspect(
          'Inspect router, viewport, route-tree, and navigation shape.',
          overviewQuery(SemanticAppQueryKind.RouterOverview, query),
        ),
      );
      break;
    case SemanticAppQueryKind.AppOverview:
      seeds.push(
        inspect(
          'Open topology rows behind the composed overview.',
          overviewQuery(SemanticAppQueryKind.AppTopology, query),
        ),
        diagnose(
          'Open the diagnostic clusters summarized by the overview.',
          diagnosticQuery(SemanticAppQueryKind.AppDiagnosticSummary, query),
        ),
        inspect(
          'Open seam clusters summarized by the overview.',
          overviewQuery(SemanticAppQueryKind.OpenSeamSummary, query),
          InquiryEvidenceState.Open,
        ),
        inspect(
          'Inspect router-family rows from the overview.',
          overviewQuery(SemanticAppQueryKind.RouterOverview, query),
        ),
      );
      break;
    case SemanticAppQueryKind.AppTopology:
      seeds.push(
        orient(
          'Return to the composed overview from topology detail.',
          overviewQuery(SemanticAppQueryKind.AppOverview, query),
        ),
        inspect(
          'Inspect resource definitions represented in the topology.',
          rowQuery(SemanticAppQueryKind.ResourceDefinitions, query),
        ),
        inspect(
          'Inspect binding value-flow summaries from topology context.',
          rowQuery(SemanticAppQueryKind.BindingDataFlowSummary, query),
          InquiryEvidenceState.TypeProjected,
        ),
      );
      break;
  }
}

function addSourceContinuations(
  query: SemanticAppQuery,
  seeds: ContinuationSeed[],
  sourceFile: SemanticRuntimeSourceFileInput | null,
  page: SemanticRuntimePageInput,
): void {
  switch (query.kind) {
    case SemanticAppQueryKind.SourceFiles:
      seeds.push(
        inspect(
          'Inspect static evaluator issues after seeing admitted source files.',
          pagedQuery(SemanticAppQueryKind.EvaluationIssues, query, page),
          InquiryEvidenceState.Open,
        ),
      );
      break;
    case SemanticAppQueryKind.UnresolvedModules:
      seeds.push(
        inspect(
          'Inspect admitted source files that fed static module resolution.',
          pagedQuery(SemanticAppQueryKind.SourceFiles, query, page),
        ),
        inspect(
          'Inspect evaluator issues related to unresolved module edges.',
          pagedQuery(SemanticAppQueryKind.EvaluationIssues, query, page),
          InquiryEvidenceState.Open,
        ),
      );
      break;
    case SemanticAppQueryKind.EvaluationIssues:
      seeds.push(
        inspect(
          'Inspect the source set used by static evaluation.',
          pagedQuery(SemanticAppQueryKind.SourceFiles, query, page),
        ),
        diagnose(
          'Compare evaluator issues with app diagnostic clusters.',
          withSourceFile(diagnosticQuery(SemanticAppQueryKind.AppDiagnosticSummary, query), sourceFile),
          InquiryEvidenceState.Open,
        ),
      );
      break;
  }
}

function addDiagnosticContinuations(
  query: SemanticAppQuery,
  result: SemanticRuntimeAnswer<unknown>,
  seeds: ContinuationSeed[],
  sourceFile: SemanticRuntimeSourceFileInput | null,
  page: SemanticRuntimePageInput,
): void {
  const templateSourcePrecision = query.kind === SemanticAppQueryKind.TemplateDiagnostics
    ? templateDiagnosticSourcePrecision(result.value)
    : undefined;
  switch (query.kind) {
    case SemanticAppQueryKind.AppDiagnosticSummary:
      seeds.push(
        diagnose(
          'Page detailed diagnostics for the selected diagnostic clusters.',
          withSourceFile(diagnosticQuery(SemanticAppQueryKind.AppDiagnostics, query, page), sourceFile),
          InquiryEvidenceState.TypeProjected,
        ),
        diagnose(
          'Inspect ordinary TypeScript diagnostics for the same project/source locus.',
          withSourceFile(pagedQuery(SemanticAppQueryKind.TypeScriptDiagnostics, query, page), sourceFile),
          InquiryEvidenceState.TypeProjected,
        ),
        diagnose(
          'Inspect template diagnostics for the same source locus.',
          withSourceFile(diagnosticQuery(SemanticAppQueryKind.TemplateDiagnostics, query, page), sourceFile),
          InquiryEvidenceState.TypeProjected,
        ),
      );
      break;
    case SemanticAppQueryKind.AppDiagnostics:
      seeds.push(
        orient(
          'Cluster detailed diagnostics back into a summary view.',
          withSourceFile(diagnosticQuery(SemanticAppQueryKind.AppDiagnosticSummary, query, page), sourceFile),
        ),
        diagnose(
          'Compare unified diagnostics with ordinary TypeScript diagnostics.',
          withSourceFile(pagedQuery(SemanticAppQueryKind.TypeScriptDiagnostics, query, page), sourceFile),
          InquiryEvidenceState.TypeProjected,
        ),
        diagnose(
          'Compare unified diagnostics with template diagnostics.',
          withSourceFile(diagnosticQuery(SemanticAppQueryKind.TemplateDiagnostics, query, page), sourceFile),
          InquiryEvidenceState.TypeProjected,
        ),
      );
      break;
    case SemanticAppQueryKind.TypeScriptDiagnosticSummary:
      seeds.push(
        diagnose(
          'Page ordinary TypeScript diagnostics behind the summary.',
          withSourceFile(pagedQuery(SemanticAppQueryKind.TypeScriptDiagnostics, query, page), sourceFile),
          InquiryEvidenceState.TypeProjected,
        ),
        diagnose(
          'Compare TypeScript diagnostic clusters with unified app diagnostic clusters.',
          withSourceFile(diagnosticQuery(SemanticAppQueryKind.AppDiagnosticSummary, query, page), sourceFile),
          InquiryEvidenceState.TypeProjected,
        ),
      );
      break;
    case SemanticAppQueryKind.TypeScriptDiagnostics:
      seeds.push(
        orient(
          'Cluster ordinary TypeScript diagnostics.',
          withSourceFile(pagedQuery(SemanticAppQueryKind.TypeScriptDiagnosticSummary, query, page), sourceFile),
          InquiryEvidenceState.TypeProjected,
        ),
        diagnose(
          'Compare TypeScript diagnostics with unified app diagnostics.',
          withSourceFile(diagnosticQuery(SemanticAppQueryKind.AppDiagnostics, query, page), sourceFile),
          InquiryEvidenceState.TypeProjected,
        ),
      );
      break;
    case SemanticAppQueryKind.TemplateDiagnostics:
      seeds.push(
        diagnose(
          'Compare template diagnostics with unified app diagnostics.',
          withSourceFile(diagnosticQuery(SemanticAppQueryKind.AppDiagnostics, query, page), sourceFile),
          InquiryEvidenceState.TypeProjected,
          templateSourcePrecision,
        ),
        diagnose(
          'Cluster diagnostics for the same template/source locus.',
          withSourceFile(diagnosticQuery(SemanticAppQueryKind.AppDiagnosticSummary, query, page), sourceFile),
          InquiryEvidenceState.TypeProjected,
          templateSourcePrecision,
        ),
      );
      break;
  }
}

function addDiagnosticValueContinuations(
  query: SemanticAppQuery,
  result: SemanticRuntimeAnswer<unknown>,
  seeds: ContinuationSeed[],
  page: SemanticRuntimePageInput,
): void {
  if (query.kind !== SemanticAppQueryKind.AppDiagnostics && query.kind !== SemanticAppQueryKind.AppDiagnosticSummary) {
    return;
  }
  const relatedTargets = new Set<SemanticAppQueryKind | `${SemanticAppQueryKind}`>();
  const relatedRows = diagnosticValueRows(result.value);
  for (const relatedQueryKind of relatedDiagnosticQueryKinds(relatedRows)) {
    if (relatedTargets.has(relatedQueryKind) || relatedQueryKind === query.kind) {
      continue;
    }
    relatedTargets.add(relatedQueryKind);
    const sourcePrecision = relatedDiagnosticSourcePrecision(relatedRows, relatedQueryKind);
    seeds.push(
      {
        ...diagnoseForRepair(
          `Inspect ${relatedQueryKind} rows referenced by returned diagnostics.`,
          rowQuery(relatedQueryKind, query, page),
          InquiryEvidenceState.SourceBacked,
          sourcePrecision,
        ),
        staleness: sourcePrecision === InquirySourcePrecision.NotRequired
          ? InquiryEvidenceStaleness.ProjectEpochSensitive
          : InquiryEvidenceStaleness.SourceEpochSensitive,
        blockers: relatedDiagnosticRepairBlockers(relatedRows, relatedQueryKind, sourcePrecision),
      },
    );
  }
}

function addTemplateContinuations(
  query: SemanticAppQuery,
  result: SemanticRuntimeAnswer<unknown>,
  seeds: ContinuationSeed[],
  sourceFile: SemanticRuntimeSourceFileInput | null,
  page: SemanticRuntimePageInput,
): void {
  const templateSourcePrecision = query.kind === SemanticAppQueryKind.TemplateDiagnostics
    ? templateDiagnosticSourcePrecision(result.value)
    : undefined;
  if (query.cursor != null) {
    switch (query.kind) {
      case SemanticAppQueryKind.TemplateCursorInfo:
        seeds.push(
          navigate(
            'Ask completion candidates at the same source cursor.',
            cursorQuery(SemanticAppQueryKind.TemplateCompletions, query),
          ),
          diagnose(
            'Inspect diagnostics for the cursor source file.',
            withSourceFile(diagnosticQuery(SemanticAppQueryKind.TemplateDiagnostics, query, page), sourceFile),
            InquiryEvidenceState.TypeProjected,
          ),
        );
        break;
      case SemanticAppQueryKind.TemplateCompletions:
        seeds.push(
          inspect(
            'Inspect semantic cursor context for these completions.',
            cursorQuery(SemanticAppQueryKind.TemplateCursorInfo, query),
            InquiryEvidenceState.TypeProjected,
          ),
          diagnose(
            'Inspect diagnostics for the completion source file.',
            withSourceFile(diagnosticQuery(SemanticAppQueryKind.TemplateDiagnostics, query, page), sourceFile),
            InquiryEvidenceState.TypeProjected,
          ),
        );
        break;
    }
  }

  switch (query.kind) {
    case SemanticAppQueryKind.TemplateCompilations:
      seeds.push(
        diagnose(
          'Inspect diagnostics produced from compiled template evidence.',
          withSourceFile(diagnosticQuery(SemanticAppQueryKind.TemplateDiagnostics, query, page), sourceFile),
          InquiryEvidenceState.TypeProjected,
        ),
        inspect(
          'Inspect resource definitions used by template compilation.',
          rowQuery(SemanticAppQueryKind.ResourceDefinitions, query, page),
        ),
      );
      break;
    case SemanticAppQueryKind.TemplateDiagnostics:
      seeds.push(
        inspect(
          'Inspect resource definitions involved in template diagnostics.',
          rowQuery(SemanticAppQueryKind.ResourceDefinitions, query, page),
          InquiryEvidenceState.Inferred,
          templateSourcePrecision,
        ),
        inspect(
          'Inspect binding flow summaries behind template diagnostics.',
          rowQuery(SemanticAppQueryKind.BindingDataFlowSummary, query, page),
          InquiryEvidenceState.TypeProjected,
          templateSourcePrecision,
        ),
      );
      break;
  }
}

function addRouterContinuations(
  query: SemanticAppQuery,
  seeds: ContinuationSeed[],
  page: SemanticRuntimePageInput,
): void {
  if (query.kind === SemanticAppQueryKind.RouterOverview) {
    seeds.push(
      inspect(
        'Page configured route rows from the router overview.',
        rowQuery(SemanticAppQueryKind.Routes, query, page),
      ),
      inspect(
        'Inspect route contexts and route-parameter reads.',
        rowQuery(SemanticAppQueryKind.RouteContexts, query, page),
      ),
      diagnose(
        'Inspect router issue rows after the router overview.',
        rowQuery(SemanticAppQueryKind.RouterIssues, query, page),
        InquiryEvidenceState.Open,
      ),
    );
    return;
  }

  if (semanticAppQueryCatalogRow(query.kind).group === 'router') {
    seeds.push(
      orient(
        'Return to the router overview before opening another router row table.',
        overviewQuery(SemanticAppQueryKind.RouterOverview, query),
      ),
    );
  }
}

function addResourceContinuations(
  query: SemanticAppQuery,
  seeds: ContinuationSeed[],
  page: SemanticRuntimePageInput,
): void {
  switch (query.kind) {
    case SemanticAppQueryKind.ResourceDefinitions:
      seeds.push(
        inspect(
          'Inspect resource diagnostics after resource definitions.',
          rowQuery(SemanticAppQueryKind.ResourceIssues, query, page),
          InquiryEvidenceState.Open,
        ),
        inspect(
          'Inspect resource visibility for these definitions.',
          rowQuery(SemanticAppQueryKind.ResourceVisibility, query, page),
        ),
        inspect(
          'Inspect compiled templates that consume these resources.',
          rowQuery(SemanticAppQueryKind.TemplateCompilations, query, page),
        ),
        appBuilderInspect(
          'Inspect the app-builder component API manifest terrain that uses resource-definition rows as deterministic evidence.',
          {
            kind: SemanticRuntimeAppBuilderQueryKind.ControlManifestDetail,
            controlManifestDetail: {
              controlManifestIds: [AppBuilderControlManifestRowId.ComponentApiManifest],
            },
          },
        ),
        appBuilderInspect(
          'Inspect the app-builder effect contract that names resource definitions as component-manifest publication evidence.',
          {
            kind: SemanticRuntimeAppBuilderQueryKind.EffectContractDetail,
            effectContractDetail: {
              effectContractIds: [AppBuilderEffectContractId.ComponentManifestPublication],
            },
          },
        ),
      );
      break;
    case SemanticAppQueryKind.ResourceIssues:
      seeds.push(
        inspect(
          'Inspect resource definitions related to resource issues.',
          rowQuery(SemanticAppQueryKind.ResourceDefinitions, query, page),
        ),
        diagnose(
          'Compare resource issues with unified diagnostic clusters.',
          diagnosticQuery(SemanticAppQueryKind.AppDiagnosticSummary, query, page),
          InquiryEvidenceState.Open,
        ),
      );
      break;
    case SemanticAppQueryKind.ResourceVisibility:
      seeds.push(
        inspect(
          'Return from visibility rows to resource definitions.',
          rowQuery(SemanticAppQueryKind.ResourceDefinitions, query, page),
        ),
        inspect(
          'Inspect template compilations using this resource visibility.',
          rowQuery(SemanticAppQueryKind.TemplateCompilations, query, page),
        ),
      );
      break;
  }
}

function addObservationContinuations(
  query: SemanticAppQuery,
  seeds: ContinuationSeed[],
  page: SemanticRuntimePageInput,
): void {
  switch (query.kind) {
    case SemanticAppQueryKind.ComputedObservationDefinitions:
      seeds.push(
        inspect(
          'Inspect source rows for modeled computed observers.',
          rowQuery(SemanticAppQueryKind.ComputedObserverSources, query, page),
        ),
        inspect(
          'Inspect observed dependencies collected for computed observers.',
          rowQuery(SemanticAppQueryKind.ComputedObserverObservedDependencies, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
        diagnose(
          'Inspect observation issues related to computed-observer modeling.',
          rowQuery(SemanticAppQueryKind.ObservationIssues, query, page),
          InquiryEvidenceState.Open,
        ),
      );
      break;
    case SemanticAppQueryKind.ComputedObserverSources:
      seeds.push(
        inspect(
          'Return to computed observation declarations.',
          rowQuery(SemanticAppQueryKind.ComputedObservationDefinitions, query, page),
        ),
        inspect(
          'Inspect dependencies observed from these computed sources.',
          rowQuery(SemanticAppQueryKind.ComputedObserverObservedDependencies, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
        diagnose(
          'Inspect observation issues beside computed source rows.',
          rowQuery(SemanticAppQueryKind.ObservationIssues, query, page),
          InquiryEvidenceState.Open,
        ),
      );
      break;
    case SemanticAppQueryKind.ComputedObserverObservedDependencies:
      seeds.push(
        inspect(
          'Inspect computed observer source rows behind these dependencies.',
          rowQuery(SemanticAppQueryKind.ComputedObserverSources, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
        inspect(
          'Compare computed dependencies with binding observed-dependency summaries.',
          rowQuery(SemanticAppQueryKind.BindingObservedDependencySummary, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
      );
      break;
    case SemanticAppQueryKind.RuntimeEffects:
      seeds.push(
        inspect(
          'Inspect dependencies observed by direct runtime effects.',
          rowQuery(SemanticAppQueryKind.RuntimeEffectObservedDependencies, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
        diagnose(
          'Inspect observation issues beside direct runtime effects.',
          rowQuery(SemanticAppQueryKind.ObservationIssues, query, page),
          InquiryEvidenceState.Open,
        ),
      );
      break;
    case SemanticAppQueryKind.RuntimeEffectObservedDependencies:
      seeds.push(
        inspect(
          'Return to direct runtime effect source rows.',
          rowQuery(SemanticAppQueryKind.RuntimeEffects, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
        inspect(
          'Compare runtime-effect dependencies with binding observed-dependency summaries.',
          rowQuery(SemanticAppQueryKind.BindingObservedDependencySummary, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
      );
      break;
    case SemanticAppQueryKind.ProxyObservableEscapes:
      seeds.push(
        diagnose(
          'Inspect observation issues related to raw/proxy escape calls.',
          rowQuery(SemanticAppQueryKind.ObservationIssues, query, page),
          InquiryEvidenceState.Open,
        ),
        inspect(
          'Inspect binding observed-dependency summaries near proxy-observation pressure.',
          rowQuery(SemanticAppQueryKind.BindingObservedDependencySummary, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
      );
      break;
  }
}

function addBindingContinuations(
  query: SemanticAppQuery,
  seeds: ContinuationSeed[],
  page: SemanticRuntimePageInput,
): void {
  switch (query.kind) {
    case SemanticAppQueryKind.BindingValueChannelSummary:
      seeds.push(bindingRow('Page detailed value-channel rows.', SemanticAppQueryKind.BindingValueChannels, query, page));
      break;
    case SemanticAppQueryKind.BindingDataFlowSummary:
      seeds.push(bindingRow('Page detailed binding data-flow rows.', SemanticAppQueryKind.BindingDataFlows, query, page));
      break;
    case SemanticAppQueryKind.BindingObservedDependencySummary:
      seeds.push(bindingRow('Page detailed observed-dependency rows.', SemanticAppQueryKind.BindingObservedDependencies, query, page));
      break;
    case SemanticAppQueryKind.BindingValueChannels:
      seeds.push(
        bindingSummary('Group value-channel rows.', SemanticAppQueryKind.BindingValueChannelSummary, query, page),
        bindingRow('Classify native control uses backed by value-channel, static submit, route-link, and message rows.', SemanticAppQueryKind.ControlUseInventory, query, page),
      );
      break;
    case SemanticAppQueryKind.BindingDataFlows:
      seeds.push(
        bindingSummary('Group binding data-flow rows.', SemanticAppQueryKind.BindingDataFlowSummary, query, page),
        bindingRow('Classify native control uses backed by binding data-flow, static submit, route-link, and message rows.', SemanticAppQueryKind.ControlUseInventory, query, page),
      );
      break;
    case SemanticAppQueryKind.BindingObservedDependencies:
      seeds.push(bindingSummary('Group observed-dependency rows.', SemanticAppQueryKind.BindingObservedDependencySummary, query, page));
      break;
    case SemanticAppQueryKind.ControlUseInventory:
      seeds.push(
        bindingRow('Inspect runtime value channels that classify authored controls.', SemanticAppQueryKind.BindingValueChannels, query, page),
        bindingRow('Inspect binding data-flow rows behind authored controls.', SemanticAppQueryKind.BindingDataFlows, query, page),
      );
      break;
    case SemanticAppQueryKind.BindingTargetAccesses:
    case SemanticAppQueryKind.TargetOperations:
    case SemanticAppQueryKind.BindingTargetOperations:
    case SemanticAppQueryKind.BindingSourceOperations:
    case SemanticAppQueryKind.BindingBehaviorApplications:
      seeds.push(
        inspect(
          'Inspect binding value-flow summaries after target/source operations.',
          rowQuery(SemanticAppQueryKind.BindingDataFlowSummary, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
        diagnose(
          'Inspect template diagnostics for the binding operation locus.',
          diagnosticQuery(SemanticAppQueryKind.TemplateDiagnostics, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
      );
      break;
  }
}

function addRenderingContinuations(
  query: SemanticAppQuery,
  seeds: ContinuationSeed[],
  page: SemanticRuntimePageInput,
): void {
  switch (query.kind) {
    case SemanticAppQueryKind.RuntimeControllers:
      seeds.push(
        inspect(
          'Inspect binding data-flow created by runtime controllers.',
          rowQuery(SemanticAppQueryKind.BindingDataFlowSummary, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
        inspect(
          'Inspect controller-owned watcher rows.',
          rowQuery(SemanticAppQueryKind.RuntimeWatchers, query, page),
        ),
      );
      break;
    case SemanticAppQueryKind.RuntimeWatchers:
      seeds.push(
        inspect(
          'Inspect dependencies observed by runtime watchers.',
          rowQuery(SemanticAppQueryKind.RuntimeWatcherObservedDependencies, query, page),
        ),
        inspect(
          'Inspect observed-dependency summary rows.',
          rowQuery(SemanticAppQueryKind.BindingObservedDependencySummary, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
      );
      break;
    case SemanticAppQueryKind.RuntimeWatcherObservedDependencies:
      seeds.push(
        inspect(
          'Group watcher dependencies with binding observed-dependency summaries.',
          rowQuery(SemanticAppQueryKind.BindingObservedDependencySummary, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
      );
      break;
    case SemanticAppQueryKind.RuntimeCompositions:
      seeds.push(
        inspect(
          'Inspect topology around runtime composition rows.',
          overviewQuery(SemanticAppQueryKind.AppTopology, query),
        ),
      );
      break;
  }
}

function addStateAndI18nContinuations(
  query: SemanticAppQuery,
  seeds: ContinuationSeed[],
  page: SemanticRuntimePageInput,
): void {
  switch (query.kind) {
    case SemanticAppQueryKind.StateStores:
      seeds.push(
        inspect(
          'Inspect @fromState StateGetterBinding rows that consume configured stores.',
          rowQuery(SemanticAppQueryKind.StateGetterBindings, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
        diagnose(
          'Inspect state modeling issues for discovered state stores.',
          rowQuery(SemanticAppQueryKind.StateIssues, query, page),
          InquiryEvidenceState.Open,
        ),
        inspect(
          'Inspect app topology around discovered state stores.',
          overviewQuery(SemanticAppQueryKind.AppTopology, query),
        ),
      );
      break;
    case SemanticAppQueryKind.StateGetterBindings:
      seeds.push(
        inspect(
          'Inspect configured stores referenced by @fromState bindings.',
          rowQuery(SemanticAppQueryKind.StateStores, query, page),
        ),
        diagnose(
          'Inspect state lookup and decorator issues around @fromState bindings.',
          rowQuery(SemanticAppQueryKind.StateIssues, query, page),
          InquiryEvidenceState.Open,
        ),
      );
      break;
    case SemanticAppQueryKind.I18nTranslationKeys:
      seeds.push(
        inspect(
          'Inspect rendered i18n translation bindings for these keys.',
          rowQuery(SemanticAppQueryKind.I18nTranslationBindings, query, page),
        ),
        diagnose(
          'Inspect template diagnostics around i18n translation usage.',
          diagnosticQuery(SemanticAppQueryKind.TemplateDiagnostics, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
      );
      break;
    case SemanticAppQueryKind.I18nTranslationBindings:
      seeds.push(
        inspect(
          'Inspect static i18n translation keys admitted by configuration.',
          rowQuery(SemanticAppQueryKind.I18nTranslationKeys, query, page),
        ),
        diagnose(
          'Inspect template diagnostics around rendered i18n bindings.',
          diagnosticQuery(SemanticAppQueryKind.TemplateDiagnostics, query, page),
          InquiryEvidenceState.TypeProjected,
        ),
      );
      break;
  }
}

function addIssueContinuations(
  query: SemanticAppQuery,
  seeds: ContinuationSeed[],
  page: SemanticRuntimePageInput,
): void {
  if (ISSUE_SUMMARY_QUERY_KINDS.has(query.kind)) {
    seeds.push(
      diagnose(
        'Compare issue rows with unified diagnostic clusters.',
        diagnosticQuery(SemanticAppQueryKind.AppDiagnosticSummary, query, page),
        InquiryEvidenceState.Open,
      ),
    );
  }

  for (const spec of issueContinuationSpecsFor(query.kind)) {
    seeds.push(issueContinuationSeed(spec, query, page));
  }

  if (query.kind === SemanticAppQueryKind.OpenSeamSummary) {
    seeds.push(
      inspect(
        'Group open seams by unique authored source site before paging raw derivations.',
        rowQuery(SemanticAppQueryKind.OpenSeamSites, query, page),
        InquiryEvidenceState.Open,
      ),
      inspect(
        'Page raw open seam rows behind the summary.',
        rowQuery(SemanticAppQueryKind.OpenSeams, query, page),
        InquiryEvidenceState.Open,
      ),
    );
  }
  if (query.kind === SemanticAppQueryKind.OpenSeamSites) {
    seeds.push(
      inspect(
        'Page raw open seam rows behind the selected authored sites.',
        rowQuery(SemanticAppQueryKind.OpenSeams, query, page),
        InquiryEvidenceState.Open,
      ),
      orient(
        'Group open seams by seam kind and reason signature.',
        rowQuery(SemanticAppQueryKind.OpenSeamSummary, query, page),
        InquiryEvidenceState.Open,
      ),
    );
  }
  if (query.kind === SemanticAppQueryKind.OpenSeams) {
    seeds.push(
      orient(
        'Group repeated derivation rows by unique authored source site.',
        rowQuery(SemanticAppQueryKind.OpenSeamSites, query, page),
        InquiryEvidenceState.Open,
      ),
      orient(
        'Group open seams before choosing a narrower follow-up.',
        rowQuery(SemanticAppQueryKind.OpenSeamSummary, query, page),
        InquiryEvidenceState.Open,
      ),
    );
  }
}

function issueContinuationSpecsFor(
  source: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
): readonly IssueContinuationSpec[] {
  return ISSUE_CONTINUATION_SPECS.filter((spec) => spec.source === source);
}

function issueContinuationSeed(
  spec: IssueContinuationSpec,
  query: SemanticAppQuery,
  page: SemanticRuntimePageInput,
): ContinuationSeed {
  const targetQuery = spec.queryShape === 'diagnostic'
    ? diagnosticQuery(spec.target, query, page)
    : rowQuery(spec.target, query, page);
  return spec.intent === 'diagnose'
    ? diagnose(spec.rationale, targetQuery, spec.evidenceState)
    : inspect(spec.rationale, targetQuery, spec.evidenceState);
}

function nextPageContinuation(
  query: SemanticAppQuery,
  result: SemanticRuntimeAnswer<unknown>,
  catalogRow: SemanticAppQueryCatalogRow,
): readonly SemanticRuntimeContinuationRow[] {
  if (!catalogRow.supportsPaging || result.page?.nextCursor == null) {
    return [];
  }
  const targetQuery: SemanticAppQuery = {
    ...publicAppQueryBase(query),
    page: {
      ...(query.page ?? {}),
      cursor: result.page.nextCursor,
      size: result.page.size,
    },
  };
  const targetRow = semanticAppQueryCatalogRow(targetQuery.kind);
  return [
    seedToRow({
      kind: InquiryContinuationKind.NextPage,
      rationale: 'Continue paging this query with the next cursor.',
      targetQuery,
      intents: [InquiryContinuationIntent.Inspect],
      evidenceState: InquiryEvidenceState.NotRequired,
      coverage: InquiryEvidenceCoverage.PartialKnownGaps,
      sourcePrecision: InquirySourcePrecision.NotRequired,
      staleness: stalenessForQuery(targetQuery, targetRow),
    }),
  ];
}

function seedToRow(
  seed: ContinuationSeed,
  answerSourcePrecision?: InquirySourcePrecision,
): SemanticRuntimeContinuationRow {
  if (isAppBuilderContinuationSeed(seed)) {
    return {
      kind: seed.kind,
      rationale: seed.rationale,
      targetAppBuilderQueryKind: seed.targetAppBuilderQuery.kind,
      targetAppBuilderQuery: seed.targetAppBuilderQuery,
      intents: seed.intents,
      cost: seed.cost ?? InquiryContinuationCost.Free,
      evidence: {
        evidenceState: seed.evidenceState ?? InquiryEvidenceState.NotRequired,
        coverage: seed.coverage ?? InquiryEvidenceCoverage.PartialKnownGaps,
        sourcePrecision: seed.sourcePrecision ?? InquirySourcePrecision.NotRequired,
        staleness: seed.staleness ?? InquiryEvidenceStaleness.CurrentEpoch,
      },
      blockers: seed.blockers ?? [],
    };
  }
  const targetQuery = semanticAppQueryCatalogShape(seed.targetQuery);
  const targetRow = semanticAppQueryCatalogRow(targetQuery.kind);
  return {
    kind: seed.kind,
    rationale: seed.rationale,
    targetQueryKind: targetQuery.kind,
    targetQuery,
    intents: seed.intents,
    cost: costForQuery(targetQuery, targetRow),
    evidence: {
      evidenceState: seed.evidenceState ?? evidenceStateForQuery(targetQuery, targetRow),
      coverage: seed.coverage ?? coverageForCatalogRow(targetRow),
      sourcePrecision: seed.sourcePrecision ?? answerSourcePrecision ?? sourcePrecisionForQuery(targetQuery),
      staleness: seed.staleness ?? stalenessForQuery(targetQuery, targetRow),
    },
    blockers: seed.blockers ?? [],
  };
}

function orient(
  rationale: string,
  targetQuery: SemanticAppQuery,
  evidenceState: InquiryEvidenceState = InquiryEvidenceState.Inferred,
): ContinuationSeed {
  return seed(InquiryContinuationKind.FollowQuery, rationale, targetQuery, [InquiryContinuationIntent.Orient, InquiryContinuationIntent.Inspect], evidenceState);
}

function inspect(
  rationale: string,
  targetQuery: SemanticAppQuery,
  evidenceState: InquiryEvidenceState = InquiryEvidenceState.Inferred,
  sourcePrecision?: InquirySourcePrecision,
): AppQueryContinuationSeed {
  return {
    ...seed(InquiryContinuationKind.FollowQuery, rationale, targetQuery, [InquiryContinuationIntent.Inspect], evidenceState),
    ...withSourcePrecision(sourcePrecision),
  };
}

function appBuilderInspect(
  rationale: string,
  targetAppBuilderQuery: SemanticRuntimeAppBuilderQueryRequest,
): AppBuilderContinuationSeed {
  return {
    kind: InquiryContinuationKind.FollowQuery,
    rationale,
    targetAppBuilderQuery,
    intents: [InquiryContinuationIntent.Inspect],
    evidenceState: InquiryEvidenceState.NotRequired,
    coverage: InquiryEvidenceCoverage.PartialKnownGaps,
    sourcePrecision: InquirySourcePrecision.NotRequired,
    staleness: InquiryEvidenceStaleness.CurrentEpoch,
    cost: InquiryContinuationCost.Free,
    blockers: [],
  };
}

function diagnose(
  rationale: string,
  targetQuery: SemanticAppQuery,
  evidenceState: InquiryEvidenceState = InquiryEvidenceState.TypeProjected,
  sourcePrecision?: InquirySourcePrecision,
): AppQueryContinuationSeed {
  return {
    ...seed(InquiryContinuationKind.FollowQuery, rationale, targetQuery, [InquiryContinuationIntent.Diagnose], evidenceState),
    ...withSourcePrecision(sourcePrecision),
  };
}

function diagnoseForRepair(
  rationale: string,
  targetQuery: SemanticAppQuery,
  evidenceState: InquiryEvidenceState = InquiryEvidenceState.TypeProjected,
  sourcePrecision?: InquirySourcePrecision,
): AppQueryContinuationSeed {
  return {
    ...seed(InquiryContinuationKind.FollowQuery, rationale, targetQuery, [InquiryContinuationIntent.Diagnose, InquiryContinuationIntent.Repair], evidenceState),
    ...withSourcePrecision(sourcePrecision),
  };
}

function navigate(
  rationale: string,
  targetQuery: SemanticAppQuery,
): AppQueryContinuationSeed {
  return seed(InquiryContinuationKind.FollowQuery, rationale, targetQuery, [InquiryContinuationIntent.Navigate, InquiryContinuationIntent.Inspect], InquiryEvidenceState.TypeProjected);
}

function seed(
  kind: InquiryContinuationKind,
  rationale: string,
  targetQuery: SemanticAppQuery,
  intents: readonly InquiryContinuationIntent[],
  evidenceState: InquiryEvidenceState,
): AppQueryContinuationSeed {
  return {
    kind,
    rationale,
    targetQuery,
    intents,
    evidenceState,
  };
}

function isAppBuilderContinuationSeed(seed: ContinuationSeed): seed is AppBuilderContinuationSeed {
  return seed.targetAppBuilderQuery != null;
}

function bindingRow(
  rationale: string,
  targetKind: SemanticAppQueryKind,
  query: SemanticAppQuery,
  page: SemanticRuntimePageInput,
): ContinuationSeed {
  return inspect(
    rationale,
    rowQuery(targetKind, query, page),
    InquiryEvidenceState.TypeProjected,
  );
}

function bindingSummary(
  rationale: string,
  targetKind: SemanticAppQueryKind,
  query: SemanticAppQuery,
  page: SemanticRuntimePageInput,
): ContinuationSeed {
  return inspect(
    rationale,
    rowQuery(targetKind, query, page),
    InquiryEvidenceState.TypeProjected,
  );
}

function overviewQuery(
  kind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
  source: SemanticAppQuery,
): SemanticAppQuery {
  return {
    kind,
    ...detailFromQuery(kind, source),
    ...diagnosticProjectionFromQuery(kind, source),
  };
}

function rowQuery(
  kind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
  source: SemanticAppQuery,
  page: SemanticRuntimePageInput = semanticRuntimeContinuationPageInput(source),
): SemanticAppQuery {
  return {
    kind,
    ...detailFromQuery(kind, source),
    ...diagnosticProjectionFromQuery(kind, source),
    ...openSeamFilterFromQuery(kind, source),
    page,
  };
}

function pagedQuery(
  kind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
  source: SemanticAppQuery,
  page: SemanticRuntimePageInput = semanticRuntimeContinuationPageInput(source),
): SemanticAppQuery {
  return {
    kind,
    ...detailFromQuery(kind, source),
    page,
  };
}

function diagnosticQuery(
  kind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
  source: SemanticAppQuery,
  page: SemanticRuntimePageInput = semanticRuntimeContinuationPageInput(source),
): SemanticAppQuery {
  return {
    kind,
    ...detailFromQuery(kind, source),
    ...diagnosticProjectionFromQuery(kind, source),
    page,
  };
}

function cursorQuery(
  kind: SemanticAppQueryKind.TemplateCompletions | SemanticAppQueryKind.TemplateCursorInfo,
  source: SemanticAppQuery,
): SemanticAppQuery {
  return {
    kind,
    cursor: source.cursor,
    ...detailFromQuery(kind, source),
    ...diagnosticProjectionFromQuery(kind, source),
  };
}

function withSourceFile(
  query: SemanticAppQuery,
  sourceFile: SemanticRuntimeSourceFileInput | null,
): SemanticAppQuery {
  if (sourceFile == null || !semanticAppQueryCatalogRow(query.kind).supportsSourceFile) {
    return query;
  }
  return {
    ...query,
    sourceFile,
  };
}

function detailFromQuery(
  kind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
  query: SemanticAppQuery,
): Pick<SemanticAppQuery, 'detail'> {
  return query.detail == null || !semanticAppQueryCatalogRow(kind).supportsDetail
    ? {}
    : { detail: query.detail === SemanticRuntimeDetail.Handles ? SemanticRuntimeDetail.Handles : SemanticRuntimeDetail.Compact };
}

function diagnosticProjectionFromQuery(
  kind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
  query: SemanticAppQuery,
): Pick<SemanticAppQuery, 'diagnosticProjection'> {
  return semanticAppQueryCatalogRow(kind).supportsDiagnosticProjection && query.diagnosticProjection != null
    ? { diagnosticProjection: query.diagnosticProjection }
    : {};
}

function openSeamFilterFromQuery(
  kind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
  query: SemanticAppQuery,
): Pick<SemanticAppQuery, 'sourceFile' | 'openSeamKindKey' | 'openSeamReasonKind' | 'sourceRole'> {
  if (!semanticAppQueryCatalogRow(kind).supportsOpenSeamFilters) {
    return {};
  }
  return {
    ...(query.sourceFile == null ? {} : { sourceFile: query.sourceFile }),
    ...(query.openSeamKindKey == null ? {} : { openSeamKindKey: query.openSeamKindKey }),
    ...(query.openSeamReasonKind == null ? {} : { openSeamReasonKind: query.openSeamReasonKind }),
    ...(query.sourceRole == null ? {} : { sourceRole: query.sourceRole }),
  };
}

function costForQuery(
  query: SemanticAppQuery,
  row: SemanticAppQueryCatalogRow,
): InquiryContinuationCost {
  if (semanticAppQueryMaterializationPolicy(query, row.materializationPolicy) === 'query-type-projection') {
    return InquiryContinuationCost.QueryTypeProjection;
  }
  switch (row.runtimeBoundary) {
    case 'runtime-static':
      return InquiryContinuationCost.Free;
    case 'project-frame':
    case 'static-evaluation':
      return InquiryContinuationCost.ProjectionOnly;
    case 'app-world':
      return InquiryContinuationCost.AppWorld;
  }
}

function evidenceStateForQuery(
  query: SemanticAppQuery,
  row: SemanticAppQueryCatalogRow,
): InquiryEvidenceState {
  if (semanticAppQueryMaterializationPolicy(query, row.materializationPolicy) === 'query-type-projection') {
    return InquiryEvidenceState.TypeProjected;
  }
  if (row.group === 'diagnostics') {
    return InquiryEvidenceState.Open;
  }
  if (row.runtimeBoundary === 'runtime-static') {
    return InquiryEvidenceState.NotRequired;
  }
  return InquiryEvidenceState.Inferred;
}

function coverageForCatalogRow(row: SemanticAppQueryCatalogRow): InquiryEvidenceCoverage {
  if (row.supportsPaging || row.resultRole === 'overview' || row.resultRole === 'summary-row-table') {
    return InquiryEvidenceCoverage.PartialKnownGaps;
  }
  if (row.requiresCursor || row.runtimeBoundary === 'runtime-static') {
    return InquiryEvidenceCoverage.CompleteForLocus;
  }
  return InquiryEvidenceCoverage.Unknown;
}

function sourcePrecisionForQuery(query: SemanticAppQuery): InquirySourcePrecision {
  if (query.cursor != null) {
    return InquirySourcePrecision.ExactAuthoredSpan;
  }
  if (query.sourceFile != null) {
    return InquirySourcePrecision.CarrierSpan;
  }
  return InquirySourcePrecision.NotRequired;
}

function stalenessForQuery(
  query: SemanticAppQuery,
  row: SemanticAppQueryCatalogRow,
): InquiryEvidenceStaleness {
  if (query.cursor != null || query.sourceFile != null) {
    return InquiryEvidenceStaleness.SourceEpochSensitive;
  }
  if (row.runtimeBoundary === 'runtime-static') {
    return InquiryEvidenceStaleness.CurrentEpoch;
  }
  return InquiryEvidenceStaleness.ProjectEpochSensitive;
}

function relatedDiagnosticQueryKinds(
  rows: readonly (SemanticAppDiagnosticRow | SemanticAppDiagnosticSummaryRow)[],
): readonly (SemanticAppQueryKind | `${SemanticAppQueryKind}`)[] {
  const relatedQueryKinds: (SemanticAppQueryKind | `${SemanticAppQueryKind}`)[] = [];
  const seen = new Set<SemanticAppQueryKind | `${SemanticAppQueryKind}`>();
  for (const row of rows) {
    if (row.relatedQueryKind == null || seen.has(row.relatedQueryKind)) {
      continue;
    }
    seen.add(row.relatedQueryKind);
    relatedQueryKinds.push(row.relatedQueryKind);
  }
  return relatedQueryKinds;
}

function relatedDiagnosticSourcePrecision(
  rows: readonly (SemanticAppDiagnosticRow | SemanticAppDiagnosticSummaryRow)[],
  relatedQueryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
): InquirySourcePrecision {
  return semanticSourcePrecisionForReferences(relatedDiagnosticSourceReferences(rows, relatedQueryKind));
}

function relatedDiagnosticRepairBlockers(
  rows: readonly (SemanticAppDiagnosticRow | SemanticAppDiagnosticSummaryRow)[],
  relatedQueryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
  sourcePrecision: InquirySourcePrecision,
): readonly string[] {
  const relatedRows = rows.filter((row) => row.relatedQueryKind === relatedQueryKind);
  if (relatedRows.length === 0) {
    return ['No returned diagnostic row references this related query family.'];
  }
  const blockers: string[] = [];
  const sources = relatedDiagnosticSourceReferences(rows, relatedQueryKind);
  if (
    sourcePrecision !== InquirySourcePrecision.ExactAuthoredSpan
    || sources.length === 0
    || sources.some((source) => semanticSourcePrecisionForReference(source) !== InquirySourcePrecision.ExactAuthoredSpan)
  ) {
    blockers.push('At least one returned diagnostic row for this related family lacks an exact authored source span.');
  }
  const hasFrameworkOrSemanticAuthority = relatedRows.some((row) =>
    row.frameworkErrorCode != null
    || (typeof row.diagnosticAuthority === 'string' && row.diagnosticAuthority.startsWith('framework-'))
    || row.diagnosticAuthority === 'semantic-runtime-product'
    || row.diagnosticAuthority === 'typescript'
  );
  if (!hasFrameworkOrSemanticAuthority) {
    blockers.push('No framework, TypeScript, or semantic-runtime diagnostic authority was returned for this related diagnostic family.');
  }
  return blockers;
}

function relatedDiagnosticSourceReferences(
  rows: readonly (SemanticAppDiagnosticRow | SemanticAppDiagnosticSummaryRow)[],
  relatedQueryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
): readonly (SemanticSourceReference | null)[] {
  const sources: (SemanticSourceReference | null)[] = [];
  for (const row of rows) {
    if (row.relatedQueryKind !== relatedQueryKind) {
      continue;
    }
    sources.push(...('sampleSources' in row ? row.sampleSources : [row.source]));
  }
  return sources;
}

function templateDiagnosticSourcePrecision(value: unknown): InquirySourcePrecision | undefined {
  const rows = templateDiagnosticValueRows(value);
  if (rows.length === 0) {
    return undefined;
  }
  return semanticSourcePrecisionForReferences(rows.flatMap((row) => [row.source, row.template.source]));
}

function withSourcePrecision(
  sourcePrecision: InquirySourcePrecision | undefined,
): Pick<ContinuationSeed, 'sourcePrecision'> {
  return sourcePrecision == null
    ? {}
    : { sourcePrecision };
}

function diagnosticValueRows(value: unknown): readonly (SemanticAppDiagnosticRow | SemanticAppDiagnosticSummaryRow)[] {
  if (value == null || typeof value !== 'object' || !('rows' in value) || !Array.isArray(value.rows)) {
    return [];
  }
  return value.rows.filter((row): row is SemanticAppDiagnosticRow | SemanticAppDiagnosticSummaryRow =>
    row != null
    && typeof row === 'object'
    && 'relatedQueryKind' in row
    && typeof row.relatedQueryKind === 'string'
  );
}

function templateDiagnosticValueRows(value: unknown): readonly SemanticTemplateDiagnosticRow[] {
  if (value == null || typeof value !== 'object' || !('rows' in value) || !Array.isArray(value.rows)) {
    return [];
  }
  return value.rows.filter((row): row is SemanticTemplateDiagnosticRow =>
    row != null
    && typeof row === 'object'
    && 'source' in row
    && 'template' in row
    && row.template != null
    && typeof row.template === 'object'
    && 'source' in row.template
  );
}

function publicAppQueryBase(query: SemanticAppQuery): SemanticAppQuery {
  return semanticAppQueryCatalogShape(query);
}
