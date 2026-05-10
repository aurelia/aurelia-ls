import { InquiryOutcomeKind } from '../inquiry/answer.js';
import { SemanticRuntimeAnswerOutcome } from './contracts.js';

export function semanticOutcomeForInquiry(
  outcome: InquiryOutcomeKind,
): SemanticRuntimeAnswerOutcome {
  switch (outcome) {
    case InquiryOutcomeKind.Hit:
      return SemanticRuntimeAnswerOutcome.Hit;
    case InquiryOutcomeKind.Miss:
      return SemanticRuntimeAnswerOutcome.Miss;
    case InquiryOutcomeKind.Partial:
    case InquiryOutcomeKind.Open:
    case InquiryOutcomeKind.Ambiguous:
    case InquiryOutcomeKind.Reroute:
      return SemanticRuntimeAnswerOutcome.Partial;
    case InquiryOutcomeKind.Unsupported:
      return SemanticRuntimeAnswerOutcome.Unsupported;
  }
}
