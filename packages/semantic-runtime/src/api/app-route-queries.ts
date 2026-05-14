import type { KernelStore } from '../kernel/store.js';
import type { AureliaAppWorldProjectEmission } from '../configuration/app-world-project-pass.js';
import {
  readComponentAgentRows,
  readRecognizedRouteRows,
  readRouteConfigRows,
  readRouteContextRows,
  readRouteEndpointRows,
  readRouteNodeRows,
  readRoutePatternRows,
  readRouteRecognizerIssueRows,
  readRouteRecognizerStateRows,
  readRouterIssueRows,
  readRouterOptionsRows,
  readRouterViewportRows,
  readRouteTreeRows,
  readTypedNavigationInstructionRows,
  readViewportAgentRows,
  readViewportInstructionRows,
  readViewportInstructionTreeRows,
} from './route-projections.js';
import {
  answer,
  includeHandles,
  outcomeForPagedRows,
  pageRows,
} from './answer-helpers.js';
import {
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

export class SemanticAppRouteQueries {
  constructor(
    private readonly emission: AureliaAppWorldProjectEmission,
    private readonly store: KernelStore,
  ) {}

  routerOptions(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouterOptionsResult> {
    const rows = readRouterOptionsRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} router options row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routes(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteConfigsResult> {
    const rows = readRouteConfigRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} source-backed router route config row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routeContexts(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteContextsResult> {
    const rows = readRouteContextRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} runtime RouteContext row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routePatterns(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRoutePatternsResult> {
    const rows = readRoutePatternRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} route-recognizer configurable route pattern row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routeEndpoints(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteEndpointsResult> {
    const rows = readRouteEndpointRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} route-recognizer endpoint row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routeRecognizerStates(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteRecognizerStatesResult> {
    const rows = readRouteRecognizerStateRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} route-recognizer State row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routeRecognizerIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteRecognizerIssuesResult> {
    const rows = this.routeRecognizerIssueRows(detail);
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} route-recognizer issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routerIssues(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouterIssuesResult> {
    const rows = this.routerIssueRows(detail);
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} router issue row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routerIssueRows(
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRouterIssuesResult['rows'] {
    return readRouterIssueRows(this.emission, this.store, includeHandles(detail));
  }

  routeRecognizerIssueRows(
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRouteRecognizerIssuesResult['rows'] {
    return readRouteRecognizerIssueRows(this.emission, this.store, includeHandles(detail));
  }

  recognizedRoutes(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRecognizedRoutesResult> {
    const rows = readRecognizedRouteRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} route-recognizer RecognizedRoute row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  typedNavigationInstructions(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticTypedNavigationInstructionsResult> {
    const rows = readTypedNavigationInstructionRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} TypedNavigationInstruction row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  viewportInstructions(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticViewportInstructionsResult> {
    const rows = readViewportInstructionRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} ViewportInstruction row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  viewportInstructionTrees(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticViewportInstructionTreesResult> {
    const rows = readViewportInstructionTreeRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} ViewportInstructionTree row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routeTrees(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteTreesResult> {
    const rows = readRouteTreeRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} RouteTree row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routeNodes(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouteNodesResult> {
    const rows = readRouteNodeRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} RouteNode row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  routerViewports(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticRouterViewportsResult> {
    const rows = readRouterViewportRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} router viewport row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  viewportAgents(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticViewportAgentsResult> {
    const rows = readViewportAgentRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} ViewportAgent row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }

  componentAgents(
    page?: SemanticRuntimePageInput,
    detail: SemanticRuntimeDetail | `${SemanticRuntimeDetail}` = SemanticRuntimeDetail.Compact,
  ): SemanticRuntimeAnswer<SemanticComponentAgentsResult> {
    const rows = readComponentAgentRows(this.emission, this.store, includeHandles(detail));
    const paged = pageRows(rows, page);
    return answer(
      outcomeForPagedRows(paged),
      `Returned ${paged.rows.length} of ${rows.length} ComponentAgent handoff row(s).`,
      { rows: paged.rows },
      paged.page,
    );
  }
}
