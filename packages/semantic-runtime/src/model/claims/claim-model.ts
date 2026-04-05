export const ClaimHomeKind = Object.freeze({
  CurrentWorldSummary: 1,
  BoundaryFrontier: 2
} as const);

export type ClaimHomeKind =
  (typeof ClaimHomeKind)[keyof typeof ClaimHomeKind];

export const ClaimOutcomeKind = Object.freeze({
  Present: 1,
  NoClaim: 2,
  BoundaryDeferred: 3
} as const);

export type ClaimOutcomeKind =
  (typeof ClaimOutcomeKind)[keyof typeof ClaimOutcomeKind];

export const ClaimQualifierKind = Object.freeze({
  None: 0,
  BoundaryQualified: 1,
  WorldOpen: 2
} as const);

export type ClaimQualifierKind =
  (typeof ClaimQualifierKind)[keyof typeof ClaimQualifierKind];

export const ClaimBoundaryKind = Object.freeze({
  None: 0,
  TypedEnrichment: 1,
  CandidateDiscovery: 2,
  ProtocolProjection: 3,
  WorkspaceAuthoring: 4
} as const);

export type ClaimBoundaryKind =
  (typeof ClaimBoundaryKind)[keyof typeof ClaimBoundaryKind];

export interface ClaimHome {
  readonly kind: ClaimHomeKind;
}

export interface ClaimOutcome {
  readonly kind: ClaimOutcomeKind;
}

export interface ClaimQualifier {
  readonly kind: ClaimQualifierKind;
}

export interface ClaimBoundary {
  readonly kind: ClaimBoundaryKind;
}

export interface ClaimRouteRef {
  readonly home: ClaimHomeKind;
}

export interface ClaimRoute extends ClaimRouteRef {
  readonly homeRef: ClaimHome;
}

const CLAIM_HOMES: Readonly<Record<ClaimHomeKind, ClaimHome>> = Object.freeze({
  [ClaimHomeKind.CurrentWorldSummary]: Object.freeze({
    kind: ClaimHomeKind.CurrentWorldSummary
  }),
  [ClaimHomeKind.BoundaryFrontier]: Object.freeze({
    kind: ClaimHomeKind.BoundaryFrontier
  })
});

const CLAIM_OUTCOMES: Readonly<Record<ClaimOutcomeKind, ClaimOutcome>> = Object.freeze({
  [ClaimOutcomeKind.Present]: Object.freeze({
    kind: ClaimOutcomeKind.Present
  }),
  [ClaimOutcomeKind.NoClaim]: Object.freeze({
    kind: ClaimOutcomeKind.NoClaim
  }),
  [ClaimOutcomeKind.BoundaryDeferred]: Object.freeze({
    kind: ClaimOutcomeKind.BoundaryDeferred
  })
});

const CLAIM_QUALIFIERS: Readonly<Record<ClaimQualifierKind, ClaimQualifier>> = Object.freeze({
  [ClaimQualifierKind.None]: Object.freeze({
    kind: ClaimQualifierKind.None
  }),
  [ClaimQualifierKind.BoundaryQualified]: Object.freeze({
    kind: ClaimQualifierKind.BoundaryQualified
  }),
  [ClaimQualifierKind.WorldOpen]: Object.freeze({
    kind: ClaimQualifierKind.WorldOpen
  })
});

const CLAIM_BOUNDARIES: Readonly<Record<ClaimBoundaryKind, ClaimBoundary>> = Object.freeze({
  [ClaimBoundaryKind.None]: Object.freeze({
    kind: ClaimBoundaryKind.None
  }),
  [ClaimBoundaryKind.TypedEnrichment]: Object.freeze({
    kind: ClaimBoundaryKind.TypedEnrichment
  }),
  [ClaimBoundaryKind.CandidateDiscovery]: Object.freeze({
    kind: ClaimBoundaryKind.CandidateDiscovery
  }),
  [ClaimBoundaryKind.ProtocolProjection]: Object.freeze({
    kind: ClaimBoundaryKind.ProtocolProjection
  }),
  [ClaimBoundaryKind.WorkspaceAuthoring]: Object.freeze({
    kind: ClaimBoundaryKind.WorkspaceAuthoring
  })
});

export function createClaimRoute(home: ClaimHomeKind): ClaimRouteRef {
  return Object.freeze({ home });
}

export function getClaimHome(kind: ClaimHomeKind): ClaimHome {
  return CLAIM_HOMES[kind];
}

export function getClaimOutcome(kind: ClaimOutcomeKind): ClaimOutcome {
  return CLAIM_OUTCOMES[kind];
}

export function getClaimQualifier(kind: ClaimQualifierKind): ClaimQualifier {
  return CLAIM_QUALIFIERS[kind];
}

export function getClaimBoundary(kind: ClaimBoundaryKind): ClaimBoundary {
  return CLAIM_BOUNDARIES[kind];
}

export function getClaimRoute(route: ClaimRouteRef): ClaimRoute {
  return Object.freeze({
    home: route.home,
    homeRef: getClaimHome(route.home)
  });
}
