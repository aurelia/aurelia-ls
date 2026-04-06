export const enum SemanticReadMode {
  Observe = 1,
  Explain = 2,
  Locate = 3,
  Complete = 4,
  Audit = 5
}

export const enum SemanticInquiryEpisode {
  CurrentWorldRead = 1,
  BoundaryFrontier = 2,
  AuthoredOccurrenceRead = 3
}

export const enum SemanticSlotGroup {
  Summary = 1,
  Explanation = 2,
  Boundary = 3,
  Occurrence = 4
}

export const enum SemanticApiTerm {
  Claim = 1,
  WorldFrame = 2,
  Boundary = 3,
  Answer = 4,
  Occurrence = 5
}

export const enum AnswerCommitmentKind {
  SemanticTruth = 1,
  BoundaryFrontier = 2
}

export interface SemanticReadModeRef {
  readonly kind: SemanticReadMode;
}

export interface SemanticInquiryEpisodeRef {
  readonly kind: SemanticInquiryEpisode;
}

export interface SemanticSlotGroupRef {
  readonly kind: SemanticSlotGroup;
}

export interface SemanticApiTermRef {
  readonly kind: SemanticApiTerm;
}

export interface AnswerCommitment {
  readonly kind: AnswerCommitmentKind;
}

const READ_MODES = {
  [SemanticReadMode.Observe]: { kind: SemanticReadMode.Observe },
  [SemanticReadMode.Explain]: { kind: SemanticReadMode.Explain },
  [SemanticReadMode.Locate]: { kind: SemanticReadMode.Locate },
  [SemanticReadMode.Complete]: { kind: SemanticReadMode.Complete },
  [SemanticReadMode.Audit]: { kind: SemanticReadMode.Audit }
} as const satisfies Record<SemanticReadMode, SemanticReadModeRef>;

const INQUIRY_EPISODES = {
  [SemanticInquiryEpisode.CurrentWorldRead]: {
    kind: SemanticInquiryEpisode.CurrentWorldRead
  },
  [SemanticInquiryEpisode.BoundaryFrontier]: {
    kind: SemanticInquiryEpisode.BoundaryFrontier
  },
  [SemanticInquiryEpisode.AuthoredOccurrenceRead]: {
    kind: SemanticInquiryEpisode.AuthoredOccurrenceRead
  }
} as const satisfies Record<SemanticInquiryEpisode, SemanticInquiryEpisodeRef>;

const SLOT_GROUPS = {
  [SemanticSlotGroup.Summary]: { kind: SemanticSlotGroup.Summary },
  [SemanticSlotGroup.Explanation]: { kind: SemanticSlotGroup.Explanation },
  [SemanticSlotGroup.Boundary]: { kind: SemanticSlotGroup.Boundary }
  ,
  [SemanticSlotGroup.Occurrence]: { kind: SemanticSlotGroup.Occurrence }
} as const satisfies Record<SemanticSlotGroup, SemanticSlotGroupRef>;

const API_TERMS = {
  [SemanticApiTerm.Claim]: { kind: SemanticApiTerm.Claim },
  [SemanticApiTerm.WorldFrame]: { kind: SemanticApiTerm.WorldFrame },
  [SemanticApiTerm.Boundary]: { kind: SemanticApiTerm.Boundary },
  [SemanticApiTerm.Answer]: { kind: SemanticApiTerm.Answer },
  [SemanticApiTerm.Occurrence]: { kind: SemanticApiTerm.Occurrence }
} as const satisfies Record<SemanticApiTerm, SemanticApiTermRef>;

const ANSWER_COMMITMENTS = {
  [AnswerCommitmentKind.SemanticTruth]: {
    kind: AnswerCommitmentKind.SemanticTruth
  },
  [AnswerCommitmentKind.BoundaryFrontier]: {
    kind: AnswerCommitmentKind.BoundaryFrontier
  }
} as const satisfies Record<AnswerCommitmentKind, AnswerCommitment>;

export function getReadMode(kind: SemanticReadMode): SemanticReadModeRef {
  return READ_MODES[kind];
}

export function getInquiryEpisode(
  kind: SemanticInquiryEpisode
): SemanticInquiryEpisodeRef {
  return INQUIRY_EPISODES[kind];
}

export function getSlotGroup(kind: SemanticSlotGroup): SemanticSlotGroupRef {
  return SLOT_GROUPS[kind];
}

export function getSemanticApiTerm(kind: SemanticApiTerm): SemanticApiTermRef {
  return API_TERMS[kind];
}

export function getAnswerCommitment(
  kind: AnswerCommitmentKind
): AnswerCommitment {
  return ANSWER_COMMITMENTS[kind];
}
