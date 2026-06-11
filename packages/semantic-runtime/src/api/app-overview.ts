import {
  SemanticAppQueryKind,
  SemanticRuntimeAnswerOutcome,
  type SemanticAppOverviewRequest,
  type SemanticAppOverviewResult,
  type SemanticAppQuery,
  type SemanticAppOverviewCollectionSummary,
  type SemanticAppDiagnosticSummaryResult,
  type SemanticRuntimeTypeSystemTypeScriptEnvironmentSummary,
  type SemanticAppSummary,
  type SemanticOpenSeamSitesResult,
  type SemanticRuntimeAnswer,
} from './contracts.js';
import { answer } from './answer-helpers.js';
import type { SemanticApplicationTopologyResult } from './app-topology.js';
import type { SemanticSourceReference } from './source-reference.js';
import { semanticTypeScriptEnvironmentDisplayText } from './typescript-environment.js';

export function readSemanticAppOverview(
  ask: (query: SemanticAppQuery) => SemanticRuntimeAnswer<unknown>,
  request: SemanticAppOverviewRequest = {},
  readTopologySummary?: () => SemanticRuntimeAnswer<SemanticAppOverviewCollectionSummary>,
  readTypeScriptEnvironment?: () => SemanticRuntimeTypeSystemTypeScriptEnvironmentSummary,
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
    kind: SemanticAppQueryKind.OpenSeamSites,
    page: { size: openSeamPageSize },
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
      openSeams,
    }),
    typeScript,
    summary,
    topology,
    diagnostics,
    openSeams,
  };
  return answer(
    SemanticRuntimeAnswerOutcome.Hit,
    `Read app overview: ${summary.summary} ${diagnostics.summary} ${openSeams.summary}`,
    value,
  );
}

function summarizeCollectionAnswer<TValue extends object>(
  answer: SemanticRuntimeAnswer<TValue>,
): SemanticRuntimeAnswer<SemanticAppOverviewCollectionSummary> {
  return {
    schemaVersion: answer.schemaVersion,
    outcome: answer.outcome,
    closure: answer.closure,
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
  const openSeamSites = value.openSeams.value.totalOpenSeamSites;
  const lines = [
    `App: ${app.projectKey}; analysisDepth=${app.analysisDepth}; roots=${app.appRoots}; components=${topologyCounts.components ?? 0}; routes=${topologyCounts.routes ?? app.routeConfigs}; services=${topologyCounts.services ?? 0}; stateCompositions=${topologyCounts.stateCompositions ?? 0}.`,
    semanticTypeScriptEnvironmentDisplayText(value.typeScript),
    app.analysisDepth === 'binding-observation'
      ? `Bindings: ${app.runtimeBindings} runtime binding(s), ${app.runtimeBindingValueChannels} value channel(s), ${app.runtimeBindingDataFlows} data-flow row(s), ${app.runtimeBindingObservedDependencies} observed dependency row(s).`
      : bindingProjectionDepthText(app),
  ];
  if (app.routeConfigs > 0 || app.typedNavigationInstructions > 0) {
    lines.push(`Routing: ${app.routeConfigs} config(s), ${app.routeContexts} runtime context(s), ${app.typedNavigationInstructions} typed navigation instruction(s), ${app.componentAgents} component agent(s).`);
  }
  if (diagnosticRows === 0 && openSeamRows === 0) {
    lines.push('Pressure: no diagnostic rows or open seam sites in the overview page.');
  } else {
    lines.push(`Pressure: ${diagnosticRows} diagnostic row(s) and ${openSeamSites} open seam site(s) covering ${openSeamRows} raw derivation row(s).`);
    const openSeamSamples = overviewOpenSeamSampleDisplay(value.openSeams.value);
    if (openSeamSamples.length > 0) {
      lines.push(`Open seam samples: ${openSeamSamples}.`);
    }
    const openSeamBoundarySummary = overviewOpenSeamBoundaryDisplay(value.openSeams.value);
    if (openSeamBoundarySummary.length > 0) {
      lines.push(`Open seam sample boundaries: ${openSeamBoundarySummary}.`);
    }
    const openSeamSourceRoleSummary = overviewOpenSeamSourceRoleDisplay(value.openSeams.value);
    if (openSeamSourceRoleSummary.length > 0) {
      lines.push(`Open seam sample source roles: ${openSeamSourceRoleSummary}.`);
    }
    const openSeamApplicationRoleSummary = overviewOpenSeamApplicationRoleDisplay(value.openSeams.value);
    if (openSeamApplicationRoleSummary.length > 0) {
      lines.push(`Open seam sample application roles: ${openSeamApplicationRoleSummary}.`);
    }
    const openSeamStaticEvaluationOriginSummary = overviewOpenSeamStaticEvaluationOriginDisplay(value.openSeams.value);
    if (openSeamStaticEvaluationOriginSummary.length > 0) {
      lines.push(`Open seam sample static evaluation origins: ${openSeamStaticEvaluationOriginSummary}.`);
    }
    const openSeamReasonSummary = overviewOpenSeamReasonDisplay(value.openSeams.value);
    if (openSeamReasonSummary.length > 0) {
      lines.push(`Open seam sample reasons: ${openSeamReasonSummary}.`);
    }
  }
  lines.push('Next: use aurelia_app_query_batch for binding summaries, aurelia_router_overview for routed apps, or diagnostic/open-seam queries for repair planning inputs.');
  return lines.join('\n');
}

function overviewOpenSeamSampleDisplay(
  openSeams: SemanticOpenSeamSitesResult,
): string {
  return openSeams.rows
    .slice(0, 3)
    .map((row) => {
      const reasons = row.reasonKinds.length === 0 ? '' : ` reasons=${row.reasonKinds.slice(0, 2).join('+')}`;
      const sourceRole = row.sourceRole == null ? '' : ` sourceRole=${row.sourceRole}`;
      const appRoles = row.applicationFileRoles.length === 0 ? '' : ` appRoles=${row.applicationFileRoles.slice(0, 2).join('+')}`;
      const originKinds = overviewOpenSeamStaticEvaluationOriginKinds(row);
      const evalOrigins = originKinds.length === 0 ? '' : ` evalOrigins=${originKinds.slice(0, 2).join('+')}`;
      return `${row.seamKindKey} raw=${row.rawRowCount} variants=${row.variantCount}${reasons}${sourceRole}${appRoles}${evalOrigins} at ${overviewOpenSeamSourceDisplay(row)}`;
    })
    .join(' | ');
}

function overviewOpenSeamBoundaryDisplay(
  openSeams: SemanticOpenSeamSitesResult,
): string {
  const counts = new Map<string, number>();
  for (const row of openSeams.rows) {
    for (const boundaryKind of row.boundaryKinds) {
      counts.set(boundaryKind, (counts.get(boundaryKind) ?? 0) + row.rawRowCount);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([kind, count]) => `${kind} x${count}`)
    .join(', ');
}

function overviewOpenSeamSourceRoleDisplay(
  openSeams: SemanticOpenSeamSitesResult,
): string {
  const counts = new Map<string, number>();
  for (const row of openSeams.rows) {
    if (row.sourceRole == null) {
      continue;
    }
    counts.set(row.sourceRole, (counts.get(row.sourceRole) ?? 0) + row.rawRowCount);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([role, count]) => `${role} x${count}`)
    .join(', ');
}

function overviewOpenSeamApplicationRoleDisplay(
  openSeams: SemanticOpenSeamSitesResult,
): string {
  const counts = new Map<string, number>();
  for (const row of openSeams.rows) {
    for (const role of row.applicationFileRoles) {
      counts.set(role, (counts.get(role) ?? 0) + row.rawRowCount);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([role, count]) => `${role} x${count}`)
    .join(', ');
}

function overviewOpenSeamStaticEvaluationOriginDisplay(
  openSeams: SemanticOpenSeamSitesResult,
): string {
  const counts = new Map<string, number>();
  for (const row of openSeams.rows) {
    for (const originKind of overviewOpenSeamStaticEvaluationOriginKinds(row)) {
      counts.set(originKind, (counts.get(originKind) ?? 0) + row.rawRowCount);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([kind, count]) => `${kind} x${count}`)
    .join(', ');
}

function overviewOpenSeamStaticEvaluationOriginKinds(
  row: SemanticOpenSeamSitesResult['rows'][number],
): readonly string[] {
  return [...new Set(row.staticEvaluationOrigins.map((origin) => origin.kind))].sort();
}

function overviewOpenSeamReasonDisplay(
  openSeams: SemanticOpenSeamSitesResult,
): string {
  const counts = new Map<string, number>();
  for (const row of openSeams.rows) {
    for (const reasonKind of row.reasonKinds) {
      counts.set(reasonKind, (counts.get(reasonKind) ?? 0) + row.rawRowCount);
    }
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map(([kind, count]) => `${kind} x${count}`)
    .join(', ');
}

function overviewOpenSeamSourceDisplay(
  row: SemanticOpenSeamSitesResult['rows'][number],
): string {
  const exact = overviewExactSourceReference(row.source);
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

function overviewExactSourceReference(
  source: SemanticSourceReference | null,
): SemanticSourceReference | null {
  if (source == null) {
    return null;
  }
  if (source.path != null && source.start != null && source.end != null) {
    return source;
  }
  return overviewExactSourceReference(source.anchor ?? null);
}

function bindingProjectionDepthText(app: SemanticAppSummary): string {
  if (app.analysisDepth === 'binding-targets') {
    return `Bindings: ${app.runtimeBindings} runtime binding(s), ${app.runtimeBindingTargetAccesses} target access row(s); value-channel, data-flow, and observed-dependency queries auto-open/auto-raise to binding-observation when asked.`;
  }
  return `Bindings: ${app.runtimeBindings} runtime binding(s); binding target/value-flow queries auto-open/auto-raise to binding-targets or binding-observation when asked.`;
}
