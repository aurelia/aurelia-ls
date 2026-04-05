export const enum BoundaryRouteKind {
  TypedEnrichment = 1,
  CandidateDiscovery = 2,
  ProtocolProjection = 3,
  WorkspaceAuthoring = 4
}

export interface BoundaryRouteRef {
  readonly kind: BoundaryRouteKind;
}

export interface BoundaryOwnerPreviewRef {
  readonly route: BoundaryRouteKind;
}

export interface BoundaryRoute extends BoundaryRouteRef {
  readonly ownerPreview: BoundaryOwnerPreviewRef;
}

const ROUTES: Readonly<Record<BoundaryRouteKind, BoundaryRoute>> = {
  [BoundaryRouteKind.TypedEnrichment]: createBoundaryRoute(BoundaryRouteKind.TypedEnrichment),
  [BoundaryRouteKind.CandidateDiscovery]: createBoundaryRoute(BoundaryRouteKind.CandidateDiscovery),
  [BoundaryRouteKind.ProtocolProjection]: createBoundaryRoute(BoundaryRouteKind.ProtocolProjection),
  [BoundaryRouteKind.WorkspaceAuthoring]: createBoundaryRoute(BoundaryRouteKind.WorkspaceAuthoring)
};

export function getBoundaryRoute(kind: BoundaryRouteKind): BoundaryRoute {
  return ROUTES[kind];
}

function createBoundaryRoute(kind: BoundaryRouteKind): BoundaryRoute {
  return {
    kind,
    ownerPreview: { route: kind }
  };
}
