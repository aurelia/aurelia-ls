import { assembleSemanticAnswer } from "../answers/answer-assembler.js";
import type { SemanticAnswer } from "../answers/semantic-answer.js";
import { createBoundaryRouter, type BoundaryRouter } from "../boundaries/boundary-router.js";
import { getBoundaryRoute } from "../model/boundary-routes/boundary-routes.js";
import {
  SemanticRuntimeSurfaceKind,
  type SemanticRuntimeSurfaceKind as SemanticRuntimeSurfaceKindValue
} from "../model/semantic-runtime-handles.js";
import { planSemanticQuery, type SemanticQuery } from "../query/routing/query-planner.js";
import {
  SemanticRuntimeTraceEventKind,
  type SemanticRuntimeIntrospection,
  type SemanticRuntimeTraceCaptureRequest,
  type SemanticRuntimeTraceEvent
} from "./introspection/runtime-introspection.js";
import { planRuntimeBoot, type RuntimeBootPort } from "./boot/runtime-boot-plan.js";
import { admitRuntimeReuse, planInvalidation } from "./invalidation/invalidation-coordinator.js";
import { planReread } from "./reread/reread-plan.js";
import { createTrustBundle } from "./trust/trust-bundle.js";

export interface SemanticRuntimePort {
  readonly surface: SemanticRuntimeSurfaceKindValue;
  readSemanticAnswer(query: SemanticQuery): SemanticAnswer;
  captureTrace(request?: SemanticRuntimeTraceCaptureRequest): readonly SemanticRuntimeTraceEvent[];
}

export interface SemanticRuntime extends SemanticRuntimePort {}

class DefaultSemanticRuntime implements SemanticRuntime {
  public readonly surface = SemanticRuntimeSurfaceKind.SemanticRuntime;

  readonly #boundaryRouter: BoundaryRouter;
  readonly #introspection: SemanticRuntimeIntrospection;

  public constructor(port: RuntimeBootPort) {
    const plan = planRuntimeBoot(port);
    this.#boundaryRouter = createBoundaryRouter(plan.boundaryPorts);
    this.#introspection = plan.introspection;

    this.#introspection.record(() => ({
      kind: SemanticRuntimeTraceEventKind.RuntimeCreated,
      surface: SemanticRuntimeSurfaceKind.SemanticRuntime
    }));
  }

  public readSemanticAnswer(query: SemanticQuery): SemanticAnswer {
    const plannedQuery = planSemanticQuery(query);

    this.#introspection.record(() => ({
      kind: SemanticRuntimeTraceEventKind.QueryPlanned,
      surface: SemanticRuntimeSurfaceKind.SemanticRuntime,
      questionRouteKind: query.questionRoute.kind,
      worldFrameKind: query.worldFrame.kind,
      worldVersion: query.worldFrame.version,
      boundaryRoute: query.questionRoute.boundaryRoute
    }));

    const boundaryOutcome = this.#boundaryRouter.routeBoundary(
      getBoundaryRoute(query.questionRoute.boundaryRoute)
    );
    const trustBundle = createTrustBundle(plannedQuery.worldContext, boundaryOutcome);
    const rereadPlan = planReread(query);
    const invalidationPlan = planInvalidation(rereadPlan);
    const reuseAdmission = admitRuntimeReuse(invalidationPlan);

    this.#introspection.record(() => ({
      kind: SemanticRuntimeTraceEventKind.BoundaryOutcomeProduced,
      surface: SemanticRuntimeSurfaceKind.BoundaryRouter,
      questionRouteKind: query.questionRoute.kind,
      worldFrameKind: query.worldFrame.kind,
      worldVersion: query.worldFrame.version,
      boundaryRoute: boundaryOutcome.route,
      boundaryOutcomeKind: boundaryOutcome.kind,
      closureStatus: boundaryOutcome.closureStatus
    }));

    return assembleSemanticAnswer(
      plannedQuery,
      boundaryOutcome,
      trustBundle,
      reuseAdmission
    );
  }

  public captureTrace(
    request?: SemanticRuntimeTraceCaptureRequest
  ): readonly SemanticRuntimeTraceEvent[] {
    return this.#introspection.snapshot(request);
  }
}

export function createSemanticRuntime(
  port: RuntimeBootPort = {}
): SemanticRuntime {
  return new DefaultSemanticRuntime(port);
}
