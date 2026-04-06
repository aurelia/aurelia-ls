import type { ClaimRouteRef } from "../../model/claims/claim-model.js";
import type { AuthoredOccurrenceTarget } from "./authored-occurrence-target.js";

export const enum QuestionFocusKind {
  ClaimRoute = 1,
  AuthoredOccurrence = 2
}

export interface QuestionFocusRef {
  readonly kind: QuestionFocusKind;
  readonly claimRoute: ClaimRouteRef;
  readonly authoredOccurrenceTarget?: AuthoredOccurrenceTarget;
}

export function createQuestionFocusRef(
  claimRoute: ClaimRouteRef,
  authoredOccurrenceTarget?: AuthoredOccurrenceTarget
): QuestionFocusRef {
  return {
    kind: authoredOccurrenceTarget === undefined
      ? QuestionFocusKind.ClaimRoute
      : QuestionFocusKind.AuthoredOccurrence,
    claimRoute,
    authoredOccurrenceTarget
  };
}
