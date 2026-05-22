import {
  SemanticAppQueryKind,
  SemanticRuntimeAnswerOutcome,
  type SemanticAppOverviewRequest,
  type SemanticAppOverviewResult,
  type SemanticAppQuery,
  type SemanticAppOverviewAuthoringOrientationSummary,
  type SemanticAppOverviewCollectionSummary,
  type SemanticAppDiagnosticSummaryResult,
  type SemanticAppSummary,
  type SemanticAuthoringOrientationResult,
  type SemanticOpenSeamSummaryResult,
  type SemanticRuntimeAnswer,
} from './contracts.js';
import { answer } from './answer-helpers.js';
import type { SemanticApplicationTopologyResult } from './app-topology.js';

export function readSemanticAppOverview(
  ask: (query: SemanticAppQuery) => SemanticRuntimeAnswer<unknown>,
  request: SemanticAppOverviewRequest = {},
  readTopologySummary?: () => SemanticRuntimeAnswer<SemanticAppOverviewCollectionSummary>,
): SemanticRuntimeAnswer<SemanticAppOverviewResult> {
  const diagnosticPageSize = request.diagnosticPageSize ?? 5;
  const openSeamPageSize = request.openSeamPageSize ?? 5;
  const summary = ask({ kind: SemanticAppQueryKind.Summary }) as SemanticRuntimeAnswer<SemanticAppSummary>;
  const topology = readTopologySummary?.()
    ?? summarizeCollectionAnswer(ask({ kind: SemanticAppQueryKind.AppTopology }) as SemanticRuntimeAnswer<SemanticApplicationTopologyResult>);
  const diagnostics = ask({
    kind: SemanticAppQueryKind.AppDiagnosticSummary,
    page: { size: diagnosticPageSize },
    diagnosticProjection: 'available-products',
  }) as SemanticRuntimeAnswer<SemanticAppDiagnosticSummaryResult>;
  const openSeams = ask({
    kind: SemanticAppQueryKind.OpenSeamSummary,
    page: { size: openSeamPageSize },
  }) as SemanticRuntimeAnswer<SemanticOpenSeamSummaryResult>;
  const authoringOrientation = request.includeAuthoringOrientation === true
    ? summarizeAuthoringOrientation(
      ask({ kind: SemanticAppQueryKind.AuthoringOrientation }) as SemanticRuntimeAnswer<SemanticAuthoringOrientationResult>,
    )
    : null;
  const value: SemanticAppOverviewResult = {
    displayText: semanticAppOverviewDisplayText({
      summary,
      topology,
      diagnostics,
      openSeams,
      authoringOrientation,
    }),
    summary,
    topology,
    diagnostics,
    openSeams,
    authoringOrientation,
  };
  return answer(
    SemanticRuntimeAnswerOutcome.Hit,
    `Read app overview: ${summary.summary} ${diagnostics.summary} ${openSeams.summary}`,
    value,
  );
}

function summarizeAuthoringOrientation(
  answer: SemanticRuntimeAnswer<SemanticAuthoringOrientationResult>,
): SemanticRuntimeAnswer<SemanticAppOverviewAuthoringOrientationSummary> {
  const orientation = answer.value;
  return {
    schemaVersion: answer.schemaVersion,
    outcome: answer.outcome,
    summary: answer.summary,
    value: {
      project: orientation.project,
      counts: {
        coverage: orientation.coverage.length,
        taste: orientation.taste.length,
        capabilities: orientation.capabilities.length,
        operations: orientation.operations.length,
        surfaces: orientation.surfaces.length,
        recipes: orientation.recipes.length,
        repairs: orientation.repairs.length,
        repairClusters: orientation.repairClusters.length,
        openReasons: orientation.openReasons.length,
      },
      capabilities: orientation.capabilities.map((row) => ({
        key: row.key,
        supportState: row.supportState,
        openReasonKinds: row.openReasonKinds,
      })),
      recipes: orientation.recipes.map((row) => ({
        key: row.key,
        currentFitState: row.currentFitState,
        supportState: row.supportState,
        failedExpectedEffectCount: row.failedExpectedEffectCount,
        unsupportedExpectedEffectCount: row.unsupportedExpectedEffectCount,
      })),
      repairClusters: orientation.repairClusters.slice(0, 20).map((row) => ({
        repairKind: row.repairKind,
        planKind: row.planKind,
        planReadiness: row.planReadiness,
        actionTargetSourceCoverage: row.actionTargetSourceCoverage,
        runtimeBoundaryKinds: row.runtimeBoundaryKinds,
        runtimeIntentKinds: row.runtimeIntentKinds,
        count: row.count,
        summary: row.summary,
      })),
    },
    page: answer.page ?? null,
  };
}

function summarizeCollectionAnswer<TValue extends object>(
  answer: SemanticRuntimeAnswer<TValue>,
): SemanticRuntimeAnswer<SemanticAppOverviewCollectionSummary> {
  return {
    schemaVersion: answer.schemaVersion,
    outcome: answer.outcome,
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
  const openSeamRows = value.openSeams.value.totalOpenSeamRows;
  const lines = [
    `App: ${app.projectKey}; analysisDepth=${app.analysisDepth}; roots=${app.appRoots}; components=${topologyCounts.components ?? 0}; routes=${topologyCounts.routes ?? app.routeConfigs}; services=${topologyCounts.services ?? 0}; stateCompositions=${topologyCounts.stateCompositions ?? 0}.`,
    app.analysisDepth === 'binding-observation'
      ? `Bindings: ${app.runtimeBindings} runtime binding(s), ${app.runtimeBindingValueChannels} value channel(s), ${app.runtimeBindingDataFlows} data-flow row(s), ${app.runtimeBindingObservedDependencies} observed dependency row(s).`
      : bindingProjectionDepthText(app),
  ];
  if (app.routeConfigs > 0 || app.typedNavigationInstructions > 0) {
    lines.push(`Routing: ${app.routeConfigs} config(s), ${app.routeContexts} runtime context(s), ${app.typedNavigationInstructions} typed navigation instruction(s), ${app.componentAgents} component agent(s).`);
  }
  if (diagnosticRows === 0 && openSeamRows === 0) {
    lines.push('Pressure: no diagnostic or open-seam clusters in the overview page.');
  } else {
    lines.push(`Pressure: ${diagnosticRows} diagnostic row(s) and ${openSeamRows} open seam row(s) in overview clusters.`);
  }
  if (value.authoringOrientation != null) {
    const orientation = value.authoringOrientation.value;
    lines.push(`Authoring: ${orientation.counts.recipes} recipe fit row(s), ${orientation.counts.capabilities} capability row(s), ${orientation.counts.repairClusters} repair cluster(s).`);
  } else {
    lines.push('Authoring: pass includeAuthoringOrientation=true when code-shape, recipe fit, or repair pressure should be part of the first app overview.');
  }
  lines.push('Next: use aurelia_app_query_batch for binding summaries, aurelia_router_overview for routed apps, or aurelia_authoring_orientation for low-boilerplate code-shape signals.');
  return lines.join('\n');
}

function bindingProjectionDepthText(app: SemanticAppSummary): string {
  if (app.analysisDepth === 'binding-targets') {
    return `Bindings: ${app.runtimeBindings} runtime binding(s), ${app.runtimeBindingTargetAccesses} target access row(s); value-channel, data-flow, and observed-dependency rows require analysisDepth=binding-observation.`;
  }
  return `Bindings: ${app.runtimeBindings} runtime binding(s); target access, value-channel, data-flow, and observed-dependency projections require analysisDepth=binding-targets or binding-observation.`;
}
