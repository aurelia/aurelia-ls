import type { AnswerBlockImportance } from './answer-document.js';
import type { InquiryEpisode, ReadMode } from './inquiry-model.js';
import { isPayloadReadMode } from './inquiry-model.js';

export interface AnswerRenderOrdering {
  readonly blockImportance: readonly AnswerBlockImportance[];
}

export interface AnswerRenderLimits {
  readonly summaryLineCount: number;
  readonly relatedRefCount: number;
  readonly blockCount: number;
  readonly listItemCount: number;
  readonly findingCount: number;
  readonly findingEvidenceCount: number;
  readonly witnessCount: number;
  readonly refListCount: number;
  readonly factCount: number;
}

export interface AnswerRenderPolicy {
  readonly limits: AnswerRenderLimits;
  readonly ordering: AnswerRenderOrdering;
}

export const DEFAULT_ANSWER_RENDER_ORDERING: AnswerRenderOrdering = {
  blockImportance: ['primary', 'supporting', 'detail'],
};

const SUMMARY_CARD_LIMITS: AnswerRenderLimits = {
  summaryLineCount: 3,
  relatedRefCount: 10,
  blockCount: 5,
  listItemCount: 5,
  findingCount: 5,
  findingEvidenceCount: 2,
  witnessCount: 3,
  refListCount: 6,
  factCount: 5,
};

const FOCUS_CARD_LIMITS: AnswerRenderLimits = {
  summaryLineCount: 4,
  relatedRefCount: 12,
  blockCount: 6,
  listItemCount: 6,
  findingCount: 6,
  findingEvidenceCount: 3,
  witnessCount: 4,
  refListCount: 8,
  factCount: 6,
};

const SUPPORTING_EVIDENCE_LIMITS: AnswerRenderLimits = {
  summaryLineCount: 5,
  relatedRefCount: 12,
  blockCount: 8,
  listItemCount: 8,
  findingCount: 8,
  findingEvidenceCount: 4,
  witnessCount: 5,
  refListCount: 10,
  factCount: 8,
};

const SNAPSHOT_LIMITS: AnswerRenderLimits = {
  summaryLineCount: 4,
  relatedRefCount: 14,
  blockCount: 10,
  listItemCount: 12,
  findingCount: 12,
  findingEvidenceCount: 8,
  witnessCount: 8,
  refListCount: 12,
  factCount: 12,
};

export function resolveAnswerRenderPolicy(
  readMode: ReadMode,
  inquiryEpisode: InquiryEpisode,
): AnswerRenderPolicy {
  return {
    limits: limitsForRenderPolicy(readMode, inquiryEpisode),
    ordering: DEFAULT_ANSWER_RENDER_ORDERING,
  };
}

function limitsForRenderPolicy(
  readMode: ReadMode,
  inquiryEpisode: InquiryEpisode,
): AnswerRenderLimits {
  const base = readMode === 'summary-card'
    ? SUMMARY_CARD_LIMITS
    : readMode === 'supporting-evidence'
      ? SUPPORTING_EVIDENCE_LIMITS
      : isPayloadReadMode(readMode)
        ? SNAPSHOT_LIMITS
        : FOCUS_CARD_LIMITS;

  if (inquiryEpisode === 'inventory-and-audit-sweep') {
    return {
      ...base,
      findingCount: Math.max(base.findingCount, 6),
      findingEvidenceCount: Math.max(base.findingEvidenceCount, 3),
    };
  }

  if (inquiryEpisode === 'bounded-closure-explanation') {
    return {
      ...base,
      witnessCount: Math.max(base.witnessCount, 4),
    };
  }

  return base;
}
