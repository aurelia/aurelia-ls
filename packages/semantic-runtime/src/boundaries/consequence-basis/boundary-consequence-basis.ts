import {
  type BoundaryRoute,
  type BoundaryRouteKind,
  type BoundaryRouteRef,
  getBoundaryRoute
} from "../../model/boundary-routes/boundary-routes.js";
import { ClosureStatusKind, type ClosureStatusKind as ClosureStatusKindValue } from "../../model/semantic-runtime-handles.js";

export const BoundaryOutcomeKind = Object.freeze({
  RouteToOwner: 1,
  Refuse: 2
} as const);

export type BoundaryOutcomeKind =
  (typeof BoundaryOutcomeKind)[keyof typeof BoundaryOutcomeKind];

export const BoundaryRefusalReasonKind = Object.freeze({
  MissingOwner: 1
} as const);

export type BoundaryRefusalReasonKind =
  (typeof BoundaryRefusalReasonKind)[keyof typeof BoundaryRefusalReasonKind];

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
  readonly closureStatus: ClosureStatusKindValue;
  readonly preview?: BoundaryHandoffPreview;
  readonly refusal?: BoundaryRefusal;
}

export function classifyBoundaryRoute(route: BoundaryRouteRef): BoundaryRouteKind {
  return route.kind;
}

export function normalizeBoundaryRefusal(route: BoundaryRouteRef): BoundaryRefusal {
  return Object.freeze({
    route: route.kind,
    reason: BoundaryRefusalReasonKind.MissingOwner
  });
}

export function buildBoundaryConsequenceBasis(
  route: BoundaryRouteRef,
  hasOwnerPort: boolean
): BoundaryConsequenceBasis {
  const resolvedRoute = getBoundaryRoute(classifyBoundaryRoute(route));

  if (hasOwnerPort) {
    return Object.freeze({
      route: resolvedRoute,
      kind: BoundaryOutcomeKind.RouteToOwner,
      closureStatus: ClosureStatusKind.Qualified,
      preview: Object.freeze({ route: resolvedRoute.kind })
    });
  }

  return Object.freeze({
    route: resolvedRoute,
    kind: BoundaryOutcomeKind.Refuse,
    closureStatus: ClosureStatusKind.Open,
    refusal: normalizeBoundaryRefusal(resolvedRoute)
  });
}
