import type { KernelStore } from '../kernel/store.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import {
  answer,
  includeHandles,
  outcomeForPagedRows,
  pageRows,
} from './answer-helpers.js';
import {
  SemanticAppQueryKind,
  SemanticRuntimeDetail,
  type SemanticComponentAgentsResult,
  type SemanticRecognizedRoutesResult,
  type SemanticRouterOptionsResult,
  type SemanticRouteConfigsResult,
  type SemanticRouteContextsResult,
  type SemanticRouteEndpointsResult,
  type SemanticRouteNodesResult,
  type SemanticRoutePatternsResult,
  type SemanticRouteRecognizerIssuesResult,
  type SemanticRouteRecognizerStatesResult,
  type SemanticRouterIssuesResult,
  type SemanticRouteTreesResult,
  type SemanticRouterViewportsResult,
  type SemanticRuntimeAnswer,
  type SemanticRuntimePageInput,
  type SemanticTypedNavigationInstructionsResult,
  type SemanticViewportAgentsResult,
  type SemanticViewportInstructionsResult,
  type SemanticViewportInstructionTreesResult,
} from './contracts.js';
import {
  componentAgentsRouteQuery,
  recognizedRoutesRouteQuery,
  routeConfigsRouteQuery,
  routeContextsRouteQuery,
  routeEndpointsRouteQuery,
  routeNodesRouteQuery,
  routePatternsRouteQuery,
  routeRecognizerIssuesRouteQuery,
  routeRecognizerStatesRouteQuery,
  routerIssuesRouteQuery,
  routerOptionsRouteQuery,
  routerViewportsRouteQuery,
  routeTreesRouteQuery,
  semanticRouteQueryDescriptorFor,
  typedNavigationInstructionsRouteQuery,
  viewportAgentsRouteQuery,
  viewportInstructionsRouteQuery,
  viewportInstructionTreesRouteQuery,
  type SemanticRouteQueryDescriptor,
  type SemanticRouteQueryRowsResult,
} from './route-query-registry.js';

export class SemanticAppRouteQueries {
  constructor(
    private readonly emission: AureliaAppWorldProjectEmission,
    private readonly store: KernelStore,
  ) {}

  answer(
    queryKind: SemanticAppQueryKind | `${SemanticAppQueryKind}`,
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteQueryRowsResult> | null {
    const descriptor = semanticRouteQueryDescriptorFor(queryKind);
    return descriptor == null
      ? null
      : this.answerRouteQuery(descriptor, page, detail);
  }

  routerOptions(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouterOptionsResult> {
    return this.answerRouteQuery(routerOptionsRouteQuery, page, detail);
  }

  routes(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteConfigsResult> {
    return this.answerRouteQuery(routeConfigsRouteQuery, page, detail);
  }

  routeContexts(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteContextsResult> {
    return this.answerRouteQuery(routeContextsRouteQuery, page, detail);
  }

  routePatterns(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRoutePatternsResult> {
    return this.answerRouteQuery(routePatternsRouteQuery, page, detail);
  }

  routeEndpoints(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteEndpointsResult> {
    return this.answerRouteQuery(routeEndpointsRouteQuery, page, detail);
  }

  routeRecognizerStates(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteRecognizerStatesResult> {
    return this.answerRouteQuery(routeRecognizerStatesRouteQuery, page, detail);
  }

  routeRecognizerIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteRecognizerIssuesResult> {
    return this.answerRouteQuery(routeRecognizerIssuesRouteQuery, page, detail);
  }

  routerIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouterIssuesResult> {
    return this.answerRouteQuery(routerIssuesRouteQuery, page, detail);
  }

  routerIssueRows(
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRouterIssuesResult['rows'] {
    return routerIssuesRouteQuery.readRows(this.emission, this.store, includeHandles(detail));
  }

  routeRecognizerIssueRows(
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRouteRecognizerIssuesResult['rows'] {
    return routeRecognizerIssuesRouteQuery.readRows(this.emission, this.store, includeHandles(detail));
  }

  recognizedRoutes(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRecognizedRoutesResult> {
    return this.answerRouteQuery(recognizedRoutesRouteQuery, page, detail);
  }

  typedNavigationInstructions(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticTypedNavigationInstructionsResult> {
    return this.answerRouteQuery(typedNavigationInstructionsRouteQuery, page, detail);
  }

  viewportInstructions(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticViewportInstructionsResult> {
    return this.answerRouteQuery(viewportInstructionsRouteQuery, page, detail);
  }

  viewportInstructionTrees(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticViewportInstructionTreesResult> {
    return this.answerRouteQuery(viewportInstructionTreesRouteQuery, page, detail);
  }

  routeTrees(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteTreesResult> {
    return this.answerRouteQuery(routeTreesRouteQuery, page, detail);
  }

  routeNodes(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteNodesResult> {
    return this.answerRouteQuery(routeNodesRouteQuery, page, detail);
  }

  routerViewports(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouterViewportsResult> {
    return this.answerRouteQuery(routerViewportsRouteQuery, page, detail);
  }

  viewportAgents(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticViewportAgentsResult> {
    return this.answerRouteQuery(viewportAgentsRouteQuery, page, detail);
  }

  componentAgents(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticComponentAgentsResult> {
    return this.answerRouteQuery(componentAgentsRouteQuery, page, detail);
  }

  private answerRouteQuery<TResult extends SemanticRouteQueryRowsResult>(
    descriptor: SemanticRouteQueryDescriptor<TResult>,
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<TResult> {
    const rows = descriptor.readRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} ${descriptor.answerRowLabel}.`,
      { rows: paged.rows } as TResult,
      paged.page,
    );
  }
}
