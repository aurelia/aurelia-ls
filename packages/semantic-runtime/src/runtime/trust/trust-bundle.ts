import type { BoundaryOutcome } from "../../boundaries/boundary-router.js";
import type { BoundaryRouteKind } from "../../model/boundary-routes/boundary-routes.js";
import type { ClosureStatusKind } from "../../model/semantic-runtime-handles.js";
import type { WorldContextHandoff } from "../handoff/world-context-handoff.js";

export interface TrustBundle {
  readonly closureStatus: ClosureStatusKind;
  readonly worldVersion: number;
  readonly boundaryRoute: BoundaryRouteKind;
}

export function createTrustBundle(
  worldContext: WorldContextHandoff,
  boundaryOutcome: BoundaryOutcome
): TrustBundle {
  return Object.freeze({
    closureStatus: boundaryOutcome.closureStatus,
    worldVersion: worldContext.snapshot.version,
    boundaryRoute: boundaryOutcome.route
  });
}
