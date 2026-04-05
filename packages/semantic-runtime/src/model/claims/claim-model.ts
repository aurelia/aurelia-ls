export const enum ClaimHomeKind {
  CurrentWorldSummary = 1,
  BoundaryFrontier = 2
}

export const enum ClaimOutcomeKind {
  Present = 1,
  NoClaim = 2,
  BoundaryDeferred = 3
}

export const enum ClaimQualifierKind {
  None = 0,
  BoundaryQualified = 1,
  WorldOpen = 2
}

export const enum ClaimBoundaryKind {
  None = 0,
  TypedEnrichment = 1,
  CandidateDiscovery = 2,
  ProtocolProjection = 3,
  WorkspaceAuthoring = 4
}

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

const CLAIM_HOMES: Readonly<Record<ClaimHomeKind, ClaimHome>> = {
  [ClaimHomeKind.CurrentWorldSummary]: {
    kind: ClaimHomeKind.CurrentWorldSummary
  },
  [ClaimHomeKind.BoundaryFrontier]: {
    kind: ClaimHomeKind.BoundaryFrontier
  }
};

const CLAIM_OUTCOMES: Readonly<Record<ClaimOutcomeKind, ClaimOutcome>> = {
  [ClaimOutcomeKind.Present]: {
    kind: ClaimOutcomeKind.Present
  },
  [ClaimOutcomeKind.NoClaim]: {
    kind: ClaimOutcomeKind.NoClaim
  },
  [ClaimOutcomeKind.BoundaryDeferred]: {
    kind: ClaimOutcomeKind.BoundaryDeferred
  }
};

const CLAIM_QUALIFIERS: Readonly<Record<ClaimQualifierKind, ClaimQualifier>> = {
  [ClaimQualifierKind.None]: {
    kind: ClaimQualifierKind.None
  },
  [ClaimQualifierKind.BoundaryQualified]: {
    kind: ClaimQualifierKind.BoundaryQualified
  },
  [ClaimQualifierKind.WorldOpen]: {
    kind: ClaimQualifierKind.WorldOpen
  }
};

const CLAIM_BOUNDARIES: Readonly<Record<ClaimBoundaryKind, ClaimBoundary>> = {
  [ClaimBoundaryKind.None]: {
    kind: ClaimBoundaryKind.None
  },
  [ClaimBoundaryKind.TypedEnrichment]: {
    kind: ClaimBoundaryKind.TypedEnrichment
  },
  [ClaimBoundaryKind.CandidateDiscovery]: {
    kind: ClaimBoundaryKind.CandidateDiscovery
  },
  [ClaimBoundaryKind.ProtocolProjection]: {
    kind: ClaimBoundaryKind.ProtocolProjection
  },
  [ClaimBoundaryKind.WorkspaceAuthoring]: {
    kind: ClaimBoundaryKind.WorkspaceAuthoring
  }
};

export function createClaimRoute(home: ClaimHomeKind): ClaimRouteRef {
  return { home };
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
  return {
    home: route.home,
    homeRef: getClaimHome(route.home)
  };
}
