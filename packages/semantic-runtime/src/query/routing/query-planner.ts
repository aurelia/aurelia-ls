import {
  getAnswerCommitment,
  AnswerCommitmentKind,
  type AnswerCommitment
} from "../../model/semantic-api/semantic-api-model.js";
import type { QuestionRoute } from "../framing/question-route.js";
import { normalizeWorldFrame, type WorldFrame } from "../framing/world-frame.js";

export interface SemanticQuery {
  readonly questionRoute: QuestionRoute;
  readonly worldFrame: WorldFrame;
}

export interface SemanticQueryPlan {
  readonly query: SemanticQuery;
  readonly answerCommitment: AnswerCommitment;
}

export interface SemanticQueryPlanner {
  planSemanticQuery(query: SemanticQuery): SemanticQueryPlan;
}

export function planSemanticQuery(query: SemanticQuery): SemanticQueryPlan {
  const normalizedWorldFrame = normalizeWorldFrame(query.worldFrame);
  const answerCommitmentKind = query.questionRoute.boundaryRoute === undefined
    ? AnswerCommitmentKind.SemanticTruth
    : AnswerCommitmentKind.BoundaryFrontier;

  return {
    query: {
      questionRoute: query.questionRoute,
      worldFrame: normalizedWorldFrame
    },
    answerCommitment: getAnswerCommitment(answerCommitmentKind)
  };
}
