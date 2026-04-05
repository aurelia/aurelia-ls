import type { BoundaryRouteKind } from "../../model/boundary-routes/boundary-routes.js";

export const QuestionRouteKind = Object.freeze({
  ReadSemanticAnswer: 1
} as const);

export type QuestionRouteKind =
  (typeof QuestionRouteKind)[keyof typeof QuestionRouteKind];

export interface QuestionRoute {
  readonly kind: QuestionRouteKind;
  readonly boundaryRoute: BoundaryRouteKind;
}

export function createQuestionRoute(
  boundaryRoute: BoundaryRouteKind,
  kind: QuestionRouteKind = QuestionRouteKind.ReadSemanticAnswer
): QuestionRoute {
  return Object.freeze({
    kind,
    boundaryRoute
  });
}
