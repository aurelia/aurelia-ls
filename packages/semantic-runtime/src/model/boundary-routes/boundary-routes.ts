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

const ROUTES = {
  [BoundaryRouteKind.TypedEnrichment]: {
    kind: BoundaryRouteKind.TypedEnrichment,
    ownerPreview: { route: BoundaryRouteKind.TypedEnrichment }
  },
  [BoundaryRouteKind.CandidateDiscovery]: {
    kind: BoundaryRouteKind.CandidateDiscovery,
    ownerPreview: { route: BoundaryRouteKind.CandidateDiscovery }
  },
  [BoundaryRouteKind.ProtocolProjection]: {
    kind: BoundaryRouteKind.ProtocolProjection,
    ownerPreview: { route: BoundaryRouteKind.ProtocolProjection }
  },
  [BoundaryRouteKind.WorkspaceAuthoring]: {
    kind: BoundaryRouteKind.WorkspaceAuthoring,
    ownerPreview: { route: BoundaryRouteKind.WorkspaceAuthoring }
  }
} as const satisfies Record<BoundaryRouteKind, BoundaryRoute>;

export function getBoundaryRoute(kind: BoundaryRouteKind): BoundaryRoute {
  return ROUTES[kind];
}
