import {
  SemanticAppQueryKind,
  SemanticRuntimeAnswerOutcome,
  type SemanticAppQuery,
  type SemanticComponentAgentsResult,
  type SemanticRecognizedRoutesResult,
  type SemanticRouterOverviewRequest,
  type SemanticRouterOverviewResult,
  type SemanticRouterIssuesResult,
  type SemanticRouterViewportsResult,
  type SemanticRouteConfigsResult,
  type SemanticRouteContextsResult,
  type SemanticRouteNodesResult,
  type SemanticRouteTreesResult,
  type SemanticRuntimeAnswer,
  type SemanticTypedNavigationInstructionsResult,
  type SemanticViewportAgentsResult,
  type SemanticViewportInstructionTreesResult,
} from './contracts.js';
import { answer } from './answer-helpers.js';

export function readSemanticRouterOverview(
  ask: (query: SemanticAppQuery) => SemanticRuntimeAnswer<unknown>,
  request: SemanticRouterOverviewRequest = {},
): SemanticRuntimeAnswer<SemanticRouterOverviewResult> {
  const page = { size: normalizeRouterOverviewRowPageSize(request.rowPageSize) };
  const detail = request.detail ?? undefined;
  const routes = ask({ kind: SemanticAppQueryKind.Routes, page, detail }) as SemanticRuntimeAnswer<SemanticRouteConfigsResult>;
  const routeContexts = ask({ kind: SemanticAppQueryKind.RouteContexts, page, detail }) as SemanticRuntimeAnswer<SemanticRouteContextsResult>;
  const routerViewports = ask({ kind: SemanticAppQueryKind.RouterViewports, page, detail }) as SemanticRuntimeAnswer<SemanticRouterViewportsResult>;
  const viewportAgents = ask({ kind: SemanticAppQueryKind.ViewportAgents, page, detail }) as SemanticRuntimeAnswer<SemanticViewportAgentsResult>;
  const componentAgents = ask({ kind: SemanticAppQueryKind.ComponentAgents, page, detail }) as SemanticRuntimeAnswer<SemanticComponentAgentsResult>;
  const typedNavigationInstructions = ask({ kind: SemanticAppQueryKind.TypedNavigationInstructions, page, detail }) as SemanticRuntimeAnswer<SemanticTypedNavigationInstructionsResult>;
  const viewportInstructionTrees = ask({ kind: SemanticAppQueryKind.ViewportInstructionTrees, page, detail }) as SemanticRuntimeAnswer<SemanticViewportInstructionTreesResult>;
  const recognizedRoutes = ask({ kind: SemanticAppQueryKind.RecognizedRoutes, page, detail }) as SemanticRuntimeAnswer<SemanticRecognizedRoutesResult>;
  const routeTrees = ask({ kind: SemanticAppQueryKind.RouteTrees, page, detail }) as SemanticRuntimeAnswer<SemanticRouteTreesResult>;
  const routeNodes = ask({ kind: SemanticAppQueryKind.RouteNodes, page, detail }) as SemanticRuntimeAnswer<SemanticRouteNodesResult>;
  const routerIssues = ask({ kind: SemanticAppQueryKind.RouterIssues, page, detail }) as SemanticRuntimeAnswer<SemanticRouterIssuesResult>;
  const value = {
    counts: {
      routes: totalRows(routes),
      routeContexts: totalRows(routeContexts),
      routerViewports: totalRows(routerViewports),
      viewportAgents: totalRows(viewportAgents),
      componentAgents: totalRows(componentAgents),
      typedNavigationInstructions: totalRows(typedNavigationInstructions),
      viewportInstructionTrees: totalRows(viewportInstructionTrees),
      recognizedRoutes: totalRows(recognizedRoutes),
      routeTrees: totalRows(routeTrees),
      routeNodes: totalRows(routeNodes),
      routerIssues: totalRows(routerIssues),
    },
    routes,
    routeContexts,
    routerViewports,
    viewportAgents,
    componentAgents,
    typedNavigationInstructions,
    viewportInstructionTrees,
    recognizedRoutes,
    routeTrees,
    routeNodes,
    routerIssues,
  } satisfies SemanticRouterOverviewResult;
  return answer(
    SemanticRuntimeAnswerOutcome.Hit,
    [
      'Read router overview:',
      `${value.counts.routes} route config(s),`,
      `${value.counts.routerViewports} router viewport(s),`,
      `${value.counts.viewportAgents} viewport agent(s),`,
      `${value.counts.componentAgents} component agent(s),`,
      `${value.counts.typedNavigationInstructions} typed navigation instruction(s),`,
      `${value.counts.routeTrees} route tree(s),`,
      `${value.counts.routeNodes} route node(s),`,
      `and ${value.counts.routerIssues} router issue(s).`,
    ].join(' '),
    value,
  );
}

function totalRows(answer: SemanticRuntimeAnswer<unknown>): number {
  return answer.page?.totalRows ?? 0;
}

function normalizeRouterOverviewRowPageSize(value: number | null | undefined): number {
  if (value == null) {
    return 0;
  }
  return Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}
