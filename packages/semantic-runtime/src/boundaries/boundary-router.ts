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
  readonly governingAnchorRefs: readonly string[];
  readonly preview?: BoundaryHandoffPreview;
  readonly refusal?: BoundaryRefusal;
}

export class BoundaryRouter {
  readonly #ports: BoundaryPortSet;

  public constructor(ports: BoundaryPortSet) {
    this.#ports = ports;
  }

  public routeBoundary(
    route: BoundaryRouteRef,
    governingAnchorRefs?: readonly string[]
  ): BoundaryOutcome {
    return routeBoundary(this.#ports, route, governingAnchorRefs);
  }
}

export function routeBoundary(
  ports: BoundaryPortSet,
  route: BoundaryRouteRef,
  governingAnchorRefs?: readonly string[]
): BoundaryOutcome {
  const basis = buildBoundaryConsequenceBasis(
    route,
    hasBoundaryPort(ports, route.kind),
    governingAnchorRefs
  );

  return {
    kind: basis.kind,
    route: basis.route.kind,
    closureStatus: basis.closureStatus,
    governingAnchorRefs: basis.governingAnchorRefs,
    preview: basis.preview,
    refusal: basis.refusal
  };
}
