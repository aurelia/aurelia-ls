import {
  type BoundaryRoute,
  type BoundaryRouteKind,
  type BoundaryRouteRef,
  getBoundaryRoute
} from "../../model/boundary-routes/boundary-routes.js";
import { ClosureStatusKind } from "../../model/semantic-runtime-handles.js";

const EMPTY_GOVERNING_ANCHOR_REFS: readonly string[] = [];

export const enum BoundaryOutcomeKind {
  RouteToOwner = 1,
  Refuse = 2
}

export const enum BoundaryRefusalReasonKind {
  MissingOwner = 1
}

export interface BoundaryHandoffPreview {
  readonly route: BoundaryRouteKind;
}

export interface BoundaryRefusal {
  readonly route: BoundaryRouteKind;
  readonly reason: BoundaryRefusalReasonKind;
}

export interface BoundaryConsequenceBasis {
  readonly route: BoundaryRoute;
  readonly kind: BoundaryOutcomeKind;
  readonly closureStatus: ClosureStatusKind;
  readonly governingAnchorRefs: readonly string[];
  readonly preview?: BoundaryHandoffPreview;
  readonly refusal?: BoundaryRefusal;
}

export function classifyBoundaryRoute(route: BoundaryRouteRef): BoundaryRouteKind {
  return route.kind;
}

export function normalizeBoundaryRefusal(route: BoundaryRouteRef): BoundaryRefusal {
  return {
    route: route.kind,
    reason: BoundaryRefusalReasonKind.MissingOwner
  };
}

export function buildBoundaryConsequenceBasis(
  route: BoundaryRouteRef,
  hasOwnerPort: boolean,
  governingAnchorRefs: readonly string[] = EMPTY_GOVERNING_ANCHOR_REFS
): BoundaryConsequenceBasis {
  const resolvedRoute = getBoundaryRoute(classifyBoundaryRoute(route));

  if (hasOwnerPort) {
    return {
      route: resolvedRoute,
      kind: BoundaryOutcomeKind.RouteToOwner,
      closureStatus: ClosureStatusKind.Qualified,
      governingAnchorRefs,
      preview: { route: resolvedRoute.kind }
    };
  }

  return {
    route: resolvedRoute,
    kind: BoundaryOutcomeKind.Refuse,
    closureStatus: ClosureStatusKind.Open,
    governingAnchorRefs,
    refusal: normalizeBoundaryRefusal(resolvedRoute)
  };
}
