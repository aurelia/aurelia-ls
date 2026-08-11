import {
  SemanticAppQueryKind,
  SemanticRuntimeAnswerResult,
  type SemanticAppOverviewRequest,
  type SemanticAppOverviewResult,
  type SemanticAppQuery,
  type SemanticAppOverviewCollectionSummary,
  type SemanticAppDiagnosticSummaryResult,
  type SemanticAnalysisLimitationsResult,
  type SemanticRuntimeTypeSystemTypeScriptEnvironmentSummary,
  type SemanticAppSummary,
  type SemanticOpenSeamSitesResult,
  type SemanticRuntimeAnswer,
} from './contracts.js';
import {
  answer,
  COMPLETE_COLLECTION_ANSWER_OPTIONS,
} from './answer-helpers.js';
import type { SemanticApplicationTopologyResult } from './app-topology.js';
import {
  semanticExactSourceReference,
  type SemanticSourceReference,
} from './source-reference.js';
import { semanticTypeScriptEnvironmentDisplayText } from './typescript-environment.js';

export function readSemanticAppOverview(
  ask: (query: SemanticAppQuery) => SemanticRuntimeAnswer<unknown>,
  request: SemanticAppOverviewRequest = {},
  readTopologySummary?: () => SemanticRuntimeAnswer<SemanticAppOverviewCollectionSummary>,
  readTypeScriptEnvironment?: () => SemanticRuntimeTypeSystemTypeScriptEnvironmentSummary,
): SemanticRuntimeAnswer<SemanticAppOverviewResult> {
  const diagnosticPageSize = request.diagnosticPageSize ?? 5;
  const analysisLimitationPageSize = request.analysisLimitationPageSize ?? 5;
  const openSeamAuditPageSize = request.openSeamPageSize ?? 0;
  const summary = ask({ kind: SemanticAppQueryKind.Summary }) as SemanticRuntimeAnswer<SemanticAppSummary>;
  const topology = readTopologySummary?.()
    ?? summarizeCollectionAnswer(ask({ kind: SemanticAppQueryKind.AppTopology }) as SemanticRuntimeAnswer<SemanticApplicationTopologyResult>);
  const diagnostics = ask({
    kind: SemanticAppQueryKind.AppDiagnosticSummary,
    page: { size: diagnosticPageSize },
    diagnosticProjection: 'available-products',
  }) as SemanticRuntimeAnswer<SemanticAppDiagnosticSummaryResult>;
  const analysisLimitations = ask({
    kind: SemanticAppQueryKind.AnalysisLimitations,
    page: { size: analysisLimitationPageSize },
  }) as SemanticRuntimeAnswer<SemanticAnalysisLimitationsResult>;
  const openSeams = ask({
    kind: SemanticAppQueryKind.OpenSeamSites,
    page: { size: openSeamAuditPageSize },
  }) as SemanticRuntimeAnswer<SemanticOpenSeamSitesResult>;
  const typeScript = readTypeScriptEnvironment?.() ?? {
    analyzer: { version: 'unknown', packageJsonPath: null },
    workspace: null,
    versionRelation: 'workspace-not-found',
  };
  const value: SemanticAppOverviewResult = {
    displayText: semanticAppOverviewDisplayText({
      typeScript,
      summary,
      topology,
      diagnostics,
      analysisLimitations,
      openSeams,
    }),
    typeScript,
    summary,
    topology,
    diagnostics,
    analysisLimitations,
    openSeams,
  };
  return answer(
    SemanticRuntimeAnswerResult.Answered,
    `Read app overview: ${summary.summary} ${diagnostics.summary} ${analysisLimitations.summary}`,
    value,
    COMPLETE_COLLECTION_ANSWER_OPTIONS,
  );
}

function summarizeCollectionAnswer<TValue extends object>(
  answer: SemanticRuntimeAnswer<TValue>,
): SemanticRuntimeAnswer<SemanticAppOverviewCollectionSummary> {
  return {
    schemaVersion: answer.schemaVersion,
    result: answer.result,
    selection: answer.selection,
    coverage: answer.coverage,
    summary: answer.summary,
    value: summarizeCollectionValue(answer.value),
    page: answer.page ?? null,
  };
}

function summarizeCollectionValue(value: object): SemanticAppOverviewCollectionSummary {
  const counts: Record<string, number> = {};
  const scalars: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (Array.isArray(child)) {
      counts[key] = child.length;
    } else if (child == null || typeof child !== 'object') {
      scalars[key] = child;
    }
  }
  return { counts, scalars };
}

function semanticAppOverviewDisplayText(value: Omit<SemanticAppOverviewResult, 'displayText'>): string {
  const app = value.summary.value;
  const topologyCounts = value.topology.value.counts;
  const diagnosticRows = value.diagnostics.value.totalDiagnosticRows;
  const configuredLimitations = value.analysisLimitations.value.candidateCount
    - value.analysisLimitations.value.suppressedCandidateCount;
  const lines = [
    `App: ${app.projectKey}; analysisDepth=${app.analysisDepth}; roots=${app.appRoots}; components=${topologyCounts.components ?? 0}; routes=${topologyCounts.routes ?? app.routeConfigs}; services=${topologyCounts.services ?? 0}; stateCompositions=${topologyCounts.stateCompositions ?? 0}.`,
    semanticTypeScriptEnvironmentDisplayText(value.typeScript),
    app.analysisDepth === 'binding-observation'
      ? `Bindings: ${app.runtimeBindings} runtime binding(s), ${app.runtimeBindingValueChannels} value channel(s), ${app.runtimeBindingDataFlows} data-flow row(s), ${app.runtimeBindingObservedDependencies} observed dependency row(s).`
      : bindingProjectionDepthText(app),
  ];
  if (app.routeConfigs > 0 || app.typedNavigationInstructions > 0) {
    lines.push(`Routing: ${app.routeConfigs} config(s), ${app.routeContexts} potential context(s), ${app.typedNavigationInstructions} typed navigation instruction(s), ${app.componentAgents} planned component agent(s).`);
  }
  if (diagnosticRows === 0 && configuredLimitations === 0) {
    lines.push('Pressure: no diagnostic rows or configured analysis limitations.');
  } else {
    lines.push(`Pressure: ${diagnosticRows} diagnostic/finding row(s), including ${configuredLimitations} configured analysis limitation(s).`);
    const samples = overviewAnalysisLimitationSampleDisplay(value.analysisLimitations.value);
    if (samples.length > 0) {
      lines.push(`Analysis limitation samples: ${samples}.`);
    }
  }
  if (value.analysisLimitations.value.suppressedCandidateCount > 0) {
    lines.push(`Policy: ${value.analysisLimitations.value.suppressedCandidateCount} analysis limitation candidate(s) suppressed; underlying seam evidence remains available to explicit audit queries.`);
  }
  lines.push('Next: use analysis-limitations or diagnostic queries for normal pressure, aurelia_app_query_batch for binding summaries, aurelia_router_overview for routed apps, and open-seam queries only for explicit semantic audit.');
  return lines.join('\n');
}

function overviewAnalysisLimitationSampleDisplay(
  limitations: SemanticAnalysisLimitationsResult,
): string {
  return limitations.rows
    .slice(0, 3)
    .map((row) => {
      const productKinds = [...new Set(row.evidence.products.map((product) => product.productKindKey))].sort();
      return `${row.ruleId} policy=${row.effectivePolicy.disposition} coverage=${row.currentCoverage} affects=${productKinds.join('+') || 'no-product'} at ${overviewAnalysisLimitationSourceDisplay(row)}`;
    })
    .join(' | ');
}

function overviewAnalysisLimitationSourceDisplay(
  row: SemanticAnalysisLimitationsResult['rows'][number],
): string {
  const exact = semanticExactSourceReference(row.source);
  if (exact?.path != null && row.sourceRange != null) {
    return `${exact.path}:${row.sourceRange.start.line + 1}:${row.sourceRange.start.character + 1}`;
  }
  return overviewSourceDisplay(row.source);
}

function overviewSourceDisplay(
  source: SemanticSourceReference | null,
): string {
  if (source == null) {
    return '(no source)';
  }
  if (source.path != null) {
    return source.start == null ? source.path : `${source.path}@${source.start}`;
  }
  return source.anchor == null ? source.label : overviewSourceDisplay(source.anchor);
}

function bindingProjectionDepthText(app: SemanticAppSummary): string {
  if (app.analysisDepth === 'binding-targets') {
    return `Bindings: ${app.runtimeBindings} runtime binding(s), ${app.runtimeBindingTargetAccesses} target access row(s); value-channel, data-flow, and observed-dependency queries auto-open/auto-raise to binding-observation when asked.`;
  }
  return `Bindings: ${app.runtimeBindings} runtime binding(s); binding target/value-flow queries auto-open/auto-raise to binding-targets or binding-observation when asked.`;
}
