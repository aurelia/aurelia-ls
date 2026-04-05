import { type BoundaryPortSet, hasBoundaryPort } from "./boundary-ports.js";
import {
  buildBoundaryConsequenceBasis,
  type BoundaryHandoffPreview,
  type BoundaryOutcomeKind,
  type BoundaryRefusal
} from "./consequence-basis/boundary-consequence-basis.js";
import { type BoundaryRouteKind, type BoundaryRouteRef } from "../model/boundary-routes/boundary-routes.js";
import { type ClosureStatusKind } from "../model/semantic-runtime-handles.js";

export interface BoundaryOutcome {
  readonly kind: BoundaryOutcomeKind;
  readonly route: BoundaryRouteKind;
  readonly closureStatus: ClosureStatusKind;
  readonly preview?: BoundaryHandoffPreview;
  readonly refusal?: BoundaryRefusal;
}

export interface BoundaryRouter {
  routeBoundary(route: BoundaryRouteRef): BoundaryOutcome;
}

class DefaultBoundaryRouter implements BoundaryRouter {
  readonly #ports: BoundaryPortSet;

  public constructor(ports: BoundaryPortSet) {
    this.#ports = ports;
  }

  public routeBoundary(route: BoundaryRouteRef): BoundaryOutcome {
    return routeBoundary(this.#ports, route);
  }
}

export function routeBoundary(
  ports: BoundaryPortSet,
  route: BoundaryRouteRef
): BoundaryOutcome {
  const basis = buildBoundaryConsequenceBasis(route, hasBoundaryPort(ports, route.kind));

  return {
    kind: basis.kind,
    route: basis.route.kind,
    closureStatus: basis.closureStatus,
    preview: basis.preview,
    refusal: basis.refusal
  };
}

export function createBoundaryRouter(ports: BoundaryPortSet): BoundaryRouter {
  return new DefaultBoundaryRouter(ports);
}
