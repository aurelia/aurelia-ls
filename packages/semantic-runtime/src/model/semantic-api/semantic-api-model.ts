export const enum SemanticReadMode {
  Observe = 1,
  Explain = 2,
  Locate = 3,
  Complete = 4,
  Audit = 5
}

export const enum SemanticInquiryEpisode {
  OrientAndLocalize = 1,
  BoundedClosureExplanation = 2,
  GoverningAnchorJump = 3,
  InventoryAndAuditSweep = 4,
  TransformOrRemediateHandoff = 5
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
  Lookup = 1,
  Enumerate = 2,
  Explain = 3,
  Lineage = 4,
  Handoff = 5
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
  [SemanticInquiryEpisode.OrientAndLocalize]: {
    kind: SemanticInquiryEpisode.OrientAndLocalize
  },
  [SemanticInquiryEpisode.BoundedClosureExplanation]: {
    kind: SemanticInquiryEpisode.BoundedClosureExplanation
  },
  [SemanticInquiryEpisode.GoverningAnchorJump]: {
    kind: SemanticInquiryEpisode.GoverningAnchorJump
  },
  [SemanticInquiryEpisode.InventoryAndAuditSweep]: {
    kind: SemanticInquiryEpisode.InventoryAndAuditSweep
  },
  [SemanticInquiryEpisode.TransformOrRemediateHandoff]: {
    kind: SemanticInquiryEpisode.TransformOrRemediateHandoff
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
  [AnswerCommitmentKind.Lookup]: {
    kind: AnswerCommitmentKind.Lookup
  },
  [AnswerCommitmentKind.Enumerate]: {
    kind: AnswerCommitmentKind.Enumerate
  },
  [AnswerCommitmentKind.Explain]: {
    kind: AnswerCommitmentKind.Explain
  },
  [AnswerCommitmentKind.Lineage]: {
    kind: AnswerCommitmentKind.Lineage
  },
  [AnswerCommitmentKind.Handoff]: {
    kind: AnswerCommitmentKind.Handoff
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

export function getAnswerCommitmentForReadMode(
  readMode: SemanticReadMode
): AnswerCommitment {
  switch (readMode) {
    case SemanticReadMode.Observe:
      return getAnswerCommitment(AnswerCommitmentKind.Lookup);
    case SemanticReadMode.Explain:
      return getAnswerCommitment(AnswerCommitmentKind.Explain);
    case SemanticReadMode.Locate:
      return getAnswerCommitment(AnswerCommitmentKind.Lineage);
    case SemanticReadMode.Audit:
      return getAnswerCommitment(AnswerCommitmentKind.Enumerate);
    case SemanticReadMode.Complete:
      return getAnswerCommitment(AnswerCommitmentKind.Handoff);
  }
}
