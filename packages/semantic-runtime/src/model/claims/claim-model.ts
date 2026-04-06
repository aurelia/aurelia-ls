export const enum ClaimHomeKind {
  CurrentWorldSummary = 1,
  BoundaryFrontier = 2,
  AuthoredOccurrenceBasis = 3
}

export const enum ClaimHomeFamilyKind {
  AnchoredIdentityAndCarriedSupport = 1,
  DeclarationWorldParticipationAndReachability = 2,
  AuthoredOccurrenceClassification = 3,
  GovernedSemanticConsequence = 4,
  ExhaustiveAbsenceAndNegativeSafety = 5,
  MisuseContradictionAndOccurrenceInvalidity = 6,
  RuntimeWorldFormationAndPlacement = 7,
  RuntimeEvaluationDependencyAndFeedback = 8,
  ExtensionWorldAndInteroperabilityQualification = 9,
  EvidenceAndCompletenessLicensing = 10,
  OpenBoundaryRetreatAndDeferredFrontier = 11,
  ExpressionSemanticResolution = 12,
  ChangeImpactAndRetreatPropagation = 13
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
  readonly familyRefs: readonly ClaimHomeFamily[];
}

export interface ClaimHomeFamily {
  readonly kind: ClaimHomeFamilyKind;
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

const CLAIM_HOME_FAMILIES = {
  [ClaimHomeFamilyKind.AnchoredIdentityAndCarriedSupport]: {
    kind: ClaimHomeFamilyKind.AnchoredIdentityAndCarriedSupport
  },
  [ClaimHomeFamilyKind.DeclarationWorldParticipationAndReachability]: {
    kind: ClaimHomeFamilyKind.DeclarationWorldParticipationAndReachability
  },
  [ClaimHomeFamilyKind.AuthoredOccurrenceClassification]: {
    kind: ClaimHomeFamilyKind.AuthoredOccurrenceClassification
  },
  [ClaimHomeFamilyKind.GovernedSemanticConsequence]: {
    kind: ClaimHomeFamilyKind.GovernedSemanticConsequence
  },
  [ClaimHomeFamilyKind.ExhaustiveAbsenceAndNegativeSafety]: {
    kind: ClaimHomeFamilyKind.ExhaustiveAbsenceAndNegativeSafety
  },
  [ClaimHomeFamilyKind.MisuseContradictionAndOccurrenceInvalidity]: {
    kind: ClaimHomeFamilyKind.MisuseContradictionAndOccurrenceInvalidity
  },
  [ClaimHomeFamilyKind.RuntimeWorldFormationAndPlacement]: {
    kind: ClaimHomeFamilyKind.RuntimeWorldFormationAndPlacement
  },
  [ClaimHomeFamilyKind.RuntimeEvaluationDependencyAndFeedback]: {
    kind: ClaimHomeFamilyKind.RuntimeEvaluationDependencyAndFeedback
  },
  [ClaimHomeFamilyKind.ExtensionWorldAndInteroperabilityQualification]: {
    kind: ClaimHomeFamilyKind.ExtensionWorldAndInteroperabilityQualification
  },
  [ClaimHomeFamilyKind.EvidenceAndCompletenessLicensing]: {
    kind: ClaimHomeFamilyKind.EvidenceAndCompletenessLicensing
  },
  [ClaimHomeFamilyKind.OpenBoundaryRetreatAndDeferredFrontier]: {
    kind: ClaimHomeFamilyKind.OpenBoundaryRetreatAndDeferredFrontier
  },
  [ClaimHomeFamilyKind.ExpressionSemanticResolution]: {
    kind: ClaimHomeFamilyKind.ExpressionSemanticResolution
  },
  [ClaimHomeFamilyKind.ChangeImpactAndRetreatPropagation]: {
    kind: ClaimHomeFamilyKind.ChangeImpactAndRetreatPropagation
  }
} as const satisfies Record<ClaimHomeFamilyKind, ClaimHomeFamily>;

const CLAIM_HOMES = {
  [ClaimHomeKind.CurrentWorldSummary]: {
    kind: ClaimHomeKind.CurrentWorldSummary,
    familyRefs: [
      getClaimHomeFamily(
        ClaimHomeFamilyKind.DeclarationWorldParticipationAndReachability
      ),
      getClaimHomeFamily(
        ClaimHomeFamilyKind.ExtensionWorldAndInteroperabilityQualification
      ),
      getClaimHomeFamily(
        ClaimHomeFamilyKind.EvidenceAndCompletenessLicensing
      )
    ]
  },
  [ClaimHomeKind.BoundaryFrontier]: {
    kind: ClaimHomeKind.BoundaryFrontier,
    familyRefs: [
      getClaimHomeFamily(
        ClaimHomeFamilyKind.OpenBoundaryRetreatAndDeferredFrontier
      )
    ]
  },
  [ClaimHomeKind.AuthoredOccurrenceBasis]: {
    kind: ClaimHomeKind.AuthoredOccurrenceBasis,
    familyRefs: [
      getClaimHomeFamily(ClaimHomeFamilyKind.AuthoredOccurrenceClassification)
    ]
  }
} as const satisfies Record<ClaimHomeKind, ClaimHome>;

const CLAIM_OUTCOMES = {
  [ClaimOutcomeKind.Present]: {
    kind: ClaimOutcomeKind.Present
  },
  [ClaimOutcomeKind.NoClaim]: {
    kind: ClaimOutcomeKind.NoClaim
  },
  [ClaimOutcomeKind.BoundaryDeferred]: {
    kind: ClaimOutcomeKind.BoundaryDeferred
  }
} as const satisfies Record<ClaimOutcomeKind, ClaimOutcome>;

const CLAIM_QUALIFIERS = {
  [ClaimQualifierKind.None]: {
    kind: ClaimQualifierKind.None
  },
  [ClaimQualifierKind.BoundaryQualified]: {
    kind: ClaimQualifierKind.BoundaryQualified
  },
  [ClaimQualifierKind.WorldOpen]: {
    kind: ClaimQualifierKind.WorldOpen
  }
} as const satisfies Record<ClaimQualifierKind, ClaimQualifier>;

const CLAIM_BOUNDARIES = {
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
} as const satisfies Record<ClaimBoundaryKind, ClaimBoundary>;

export function createClaimRoute(home: ClaimHomeKind): ClaimRouteRef {
  return { home };
}

export function getClaimHome(kind: ClaimHomeKind): ClaimHome {
  return CLAIM_HOMES[kind];
}

export function getClaimHomeFamily(
  kind: ClaimHomeFamilyKind
): ClaimHomeFamily {
  return CLAIM_HOME_FAMILIES[kind];
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
