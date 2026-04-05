export const SemanticReadMode = Object.freeze({
  Observe: 1,
  Explain: 2,
  Locate: 3,
  Complete: 4,
  Audit: 5
} as const);

export type SemanticReadMode =
  (typeof SemanticReadMode)[keyof typeof SemanticReadMode];

export const SemanticInquiryEpisode = Object.freeze({
  CurrentWorldRead: 1,
  BoundaryFrontier: 2
} as const);

export type SemanticInquiryEpisode =
  (typeof SemanticInquiryEpisode)[keyof typeof SemanticInquiryEpisode];

export const SemanticSlotGroup = Object.freeze({
  Summary: 1,
  Explanation: 2,
  Boundary: 3
} as const);

export type SemanticSlotGroup =
  (typeof SemanticSlotGroup)[keyof typeof SemanticSlotGroup];

export const SemanticApiTerm = Object.freeze({
  Claim: 1,
  WorldFrame: 2,
  Boundary: 3,
  Answer: 4
} as const);

export type SemanticApiTerm =
  (typeof SemanticApiTerm)[keyof typeof SemanticApiTerm];

export const AnswerCommitmentKind = Object.freeze({
  SemanticTruth: 1,
  BoundaryFrontier: 2
} as const);

export type AnswerCommitmentKind =
  (typeof AnswerCommitmentKind)[keyof typeof AnswerCommitmentKind];

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

const READ_MODES: Readonly<Record<SemanticReadMode, SemanticReadModeRef>> = Object.freeze({
  [SemanticReadMode.Observe]: Object.freeze({ kind: SemanticReadMode.Observe }),
  [SemanticReadMode.Explain]: Object.freeze({ kind: SemanticReadMode.Explain }),
  [SemanticReadMode.Locate]: Object.freeze({ kind: SemanticReadMode.Locate }),
  [SemanticReadMode.Complete]: Object.freeze({ kind: SemanticReadMode.Complete }),
  [SemanticReadMode.Audit]: Object.freeze({ kind: SemanticReadMode.Audit })
});

const INQUIRY_EPISODES: Readonly<Record<SemanticInquiryEpisode, SemanticInquiryEpisodeRef>> = Object.freeze({
  [SemanticInquiryEpisode.CurrentWorldRead]: Object.freeze({
    kind: SemanticInquiryEpisode.CurrentWorldRead
  }),
  [SemanticInquiryEpisode.BoundaryFrontier]: Object.freeze({
    kind: SemanticInquiryEpisode.BoundaryFrontier
  })
});

const SLOT_GROUPS: Readonly<Record<SemanticSlotGroup, SemanticSlotGroupRef>> = Object.freeze({
  [SemanticSlotGroup.Summary]: Object.freeze({ kind: SemanticSlotGroup.Summary }),
  [SemanticSlotGroup.Explanation]: Object.freeze({ kind: SemanticSlotGroup.Explanation }),
  [SemanticSlotGroup.Boundary]: Object.freeze({ kind: SemanticSlotGroup.Boundary })
});

const API_TERMS: Readonly<Record<SemanticApiTerm, SemanticApiTermRef>> = Object.freeze({
  [SemanticApiTerm.Claim]: Object.freeze({ kind: SemanticApiTerm.Claim }),
  [SemanticApiTerm.WorldFrame]: Object.freeze({ kind: SemanticApiTerm.WorldFrame }),
  [SemanticApiTerm.Boundary]: Object.freeze({ kind: SemanticApiTerm.Boundary }),
  [SemanticApiTerm.Answer]: Object.freeze({ kind: SemanticApiTerm.Answer })
});

const ANSWER_COMMITMENTS: Readonly<Record<AnswerCommitmentKind, AnswerCommitment>> = Object.freeze({
  [AnswerCommitmentKind.SemanticTruth]: Object.freeze({
    kind: AnswerCommitmentKind.SemanticTruth
  }),
  [AnswerCommitmentKind.BoundaryFrontier]: Object.freeze({
    kind: AnswerCommitmentKind.BoundaryFrontier
  })
});

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
