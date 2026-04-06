import type { ClaimRouteRef } from "../../model/claims/claim-model.js";
import {
  SemanticInquiryEpisode,
  SemanticReadMode
} from "../../model/semantic-api/semantic-api-model.js";
import type { BoundaryRouteKind } from "../../model/boundary-routes/boundary-routes.js";
import type { AuthoredOccurrenceTarget } from "./authored-occurrence-target.js";

export const enum QuestionRouteKind {
  ReadSemanticAnswer = 1,
  ReadAuthoredOccurrence = 2
}

export interface QuestionRoute {
  readonly kind: QuestionRouteKind;
  readonly claimRoute: ClaimRouteRef;
  readonly inquiryEpisode: SemanticInquiryEpisode;
  readonly readMode: SemanticReadMode;
  readonly boundaryRoute?: BoundaryRouteKind;
  readonly authoredOccurrenceTarget?: AuthoredOccurrenceTarget;
}

export function createQuestionRoute(
  claimRoute: ClaimRouteRef,
  options?: {
    readonly kind?: QuestionRouteKind;
    readonly inquiryEpisode?: SemanticInquiryEpisode;
    readonly readMode?: SemanticReadMode;
    readonly boundaryRoute?: BoundaryRouteKind;
    readonly authoredOccurrenceTarget?: AuthoredOccurrenceTarget;
  }
): QuestionRoute {
  const kind = options?.kind ??
    (options?.authoredOccurrenceTarget === undefined
      ? QuestionRouteKind.ReadSemanticAnswer
      : QuestionRouteKind.ReadAuthoredOccurrence);
  return {
    kind,
    claimRoute,
    inquiryEpisode: options?.inquiryEpisode ??
      (kind === QuestionRouteKind.ReadAuthoredOccurrence
        ? SemanticInquiryEpisode.AuthoredOccurrenceRead
        : SemanticInquiryEpisode.CurrentWorldRead),
    readMode: options?.readMode ?? SemanticReadMode.Explain,
    boundaryRoute: options?.boundaryRoute,
    authoredOccurrenceTarget: options?.authoredOccurrenceTarget
  };
}
