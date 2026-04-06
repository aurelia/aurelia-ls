import type { BoundaryOutcome } from "../../boundaries/boundary-router.js";
import type { BoundaryRouteKind } from "../../model/boundary-routes/boundary-routes.js";
import type { ClaimHomeKind } from "../../model/claims/claim-model.js";
import {
  ClosureStatusKind,
  SemanticRuntimeSurfaceKind
} from "../../model/semantic-runtime-handles.js";
import type { PublishedEvaluatorResult } from "../../evaluators/kernel/evaluator-read-port.js";
import type { RuntimeWorldContextHandoff } from "../handoff/world-context-handoff.js";
import { getQuestionRouteClaimRoute } from "../../query/framing/question-route.js";

export interface TrustBundle {
  readonly closureStatus: ClosureStatusKind;
  readonly worldVersion: number;
  readonly claimHome: ClaimHomeKind;
  readonly boundaryRoute?: BoundaryRouteKind;
  readonly governingSurface: SemanticRuntimeSurfaceKind;
}

export function createTrustBundle(
  worldContext: RuntimeWorldContextHandoff,
  evaluation: PublishedEvaluatorResult | undefined,
  boundaryOutcome?: BoundaryOutcome
): TrustBundle {
  return {
    closureStatus: evaluation?.closureStatus ?? boundaryOutcome?.closureStatus ?? ClosureStatusKind.Open,
    worldVersion: worldContext.worldFrameHandle.version,
    claimHome: getQuestionRouteClaimRoute(worldContext.questionRoute).home,
    boundaryRoute: boundaryOutcome?.route,
    governingSurface: evaluation?.surface ?? SemanticRuntimeSurfaceKind.BoundaryRouter
  };
}
