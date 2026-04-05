import type { ClaimRouteRef } from "../../model/claims/claim-model.js";
import {
  SemanticInquiryEpisode,
  SemanticReadMode,
  type SemanticInquiryEpisode as SemanticInquiryEpisodeValue,
  type SemanticReadMode as SemanticReadModeValue
} from "../../model/semantic-api/semantic-api-model.js";
import type { BoundaryRouteKind } from "../../model/boundary-routes/boundary-routes.js";

export const QuestionRouteKind = Object.freeze({
  ReadSemanticAnswer: 1
} as const);

export type QuestionRouteKind =
  (typeof QuestionRouteKind)[keyof typeof QuestionRouteKind];

export interface QuestionRoute {
  readonly kind: QuestionRouteKind;
  readonly claimRoute: ClaimRouteRef;
  readonly inquiryEpisode: SemanticInquiryEpisodeValue;
  readonly readMode: SemanticReadModeValue;
  readonly boundaryRoute?: BoundaryRouteKind;
}

export function createQuestionRoute(
  claimRoute: ClaimRouteRef,
  options?: {
    readonly kind?: QuestionRouteKind;
    readonly inquiryEpisode?: SemanticInquiryEpisodeValue;
    readonly readMode?: SemanticReadModeValue;
    readonly boundaryRoute?: BoundaryRouteKind;
  }
): QuestionRoute {
  return Object.freeze({
    kind: options?.kind ?? QuestionRouteKind.ReadSemanticAnswer,
    claimRoute,
    inquiryEpisode: options?.inquiryEpisode ?? SemanticInquiryEpisode.CurrentWorldRead,
    readMode: options?.readMode ?? SemanticReadMode.Explain,
    boundaryRoute: options?.boundaryRoute
  });
}
