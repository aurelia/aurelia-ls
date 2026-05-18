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
  return answer(
    SemanticRuntimeAnswerOutcome.Hit,
    `Read app overview: ${summary.summary} ${diagnostics.summary} ${openSeams.summary}`,
    {
      summary,
      topology,
      diagnostics,
      openSeams,
      authoringOrientation,
    },
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
