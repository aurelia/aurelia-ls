import type { ClaimRouteRef } from "../../model/claims/claim-model.js";
import {
  SemanticInquiryEpisode,
  SemanticReadMode
} from "../../model/semantic-api/semantic-api-model.js";
import type { BoundaryRouteKind } from "../../model/boundary-routes/boundary-routes.js";

export const enum QuestionRouteKind {
  ReadSemanticAnswer = 1
}

export interface QuestionRoute {
  readonly kind: QuestionRouteKind;
  readonly claimRoute: ClaimRouteRef;
  readonly inquiryEpisode: SemanticInquiryEpisode;
  readonly readMode: SemanticReadMode;
  readonly boundaryRoute?: BoundaryRouteKind;
}

export function createQuestionRoute(
  claimRoute: ClaimRouteRef,
  options?: {
    readonly kind?: QuestionRouteKind;
    readonly inquiryEpisode?: SemanticInquiryEpisode;
    readonly readMode?: SemanticReadMode;
    readonly boundaryRoute?: BoundaryRouteKind;
  }
): QuestionRoute {
  return {
    kind: options?.kind ?? QuestionRouteKind.ReadSemanticAnswer,
    claimRoute,
    inquiryEpisode: options?.inquiryEpisode ?? SemanticInquiryEpisode.CurrentWorldRead,
    readMode: options?.readMode ?? SemanticReadMode.Explain,
    boundaryRoute: options?.boundaryRoute
  };
}
