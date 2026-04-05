export const BoundaryRouteKind = Object.freeze({
  TypedEnrichment: 1,
  CandidateDiscovery: 2,
  ProtocolProjection: 3,
  WorkspaceAuthoring: 4
} as const);

export type BoundaryRouteKind =
  (typeof BoundaryRouteKind)[keyof typeof BoundaryRouteKind];

export interface BoundaryRouteRef {
  readonly kind: BoundaryRouteKind;
}

export interface BoundaryOwnerPreviewRef {
  readonly route: BoundaryRouteKind;
}

export interface BoundaryRoute extends BoundaryRouteRef {
  readonly ownerPreview: BoundaryOwnerPreviewRef;
}

const ROUTES: Readonly<Record<BoundaryRouteKind, BoundaryRoute>> = Object.freeze({
  [BoundaryRouteKind.TypedEnrichment]: Object.freeze({
    kind: BoundaryRouteKind.TypedEnrichment,
    ownerPreview: Object.freeze({ route: BoundaryRouteKind.TypedEnrichment })
  }),
  [BoundaryRouteKind.CandidateDiscovery]: Object.freeze({
    kind: BoundaryRouteKind.CandidateDiscovery,
    ownerPreview: Object.freeze({ route: BoundaryRouteKind.CandidateDiscovery })
  }),
  [BoundaryRouteKind.ProtocolProjection]: Object.freeze({
    kind: BoundaryRouteKind.ProtocolProjection,
    ownerPreview: Object.freeze({ route: BoundaryRouteKind.ProtocolProjection })
  }),
  [BoundaryRouteKind.WorkspaceAuthoring]: Object.freeze({
    kind: BoundaryRouteKind.WorkspaceAuthoring,
    ownerPreview: Object.freeze({ route: BoundaryRouteKind.WorkspaceAuthoring })
  })
});

export function getBoundaryRoute(kind: BoundaryRouteKind): BoundaryRoute {
  return ROUTES[kind];
}
