import { InquiryOutcomeKind } from '../inquiry/answer.js';
import {
  SemanticRuntimeAnswerClosure,
  SemanticRuntimeAnswerOutcome,
} from './contracts.js';

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

export function semanticClosureForInquiry(
  outcome: InquiryOutcomeKind,
): SemanticRuntimeAnswerClosure {
  switch (outcome) {
    case InquiryOutcomeKind.Hit:
    case InquiryOutcomeKind.Miss:
      return SemanticRuntimeAnswerClosure.Complete;
    case InquiryOutcomeKind.Partial:
    case InquiryOutcomeKind.Open:
      return SemanticRuntimeAnswerClosure.Open;
    case InquiryOutcomeKind.Ambiguous:
      return SemanticRuntimeAnswerClosure.Ambiguous;
    case InquiryOutcomeKind.Reroute:
      return SemanticRuntimeAnswerClosure.Reroute;
    case InquiryOutcomeKind.Unsupported:
      return SemanticRuntimeAnswerClosure.Unsupported;
  }
}
