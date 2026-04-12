import {
  ClaimHomeKind,
  createClaimRoute,
  type ClaimRouteRef
} from "../../model/claims/claim-model.js";
import {
  getAnswerCommitmentForReadMode,
  SemanticInquiryEpisode,
  SemanticReadMode,
  type AnswerCommitment
} from "../../model/semantic-api/semantic-api-model.js";
import {
  createQuestionRoute,
  getQuestionRouteAuthoredOccurrenceTarget,
  getQuestionRouteClaimRoute,
  type QuestionRoute
} from "../framing/question-route.js";
import { normalizeWorldFrame, type WorldFrame } from "../framing/world-frame.js";

export interface SemanticQuery {
  readonly questionRoute: QuestionRoute;
  readonly worldFrame: WorldFrame;
}

export interface SemanticQueryPlan {
  readonly query: SemanticQuery;
  readonly answerCommitment: AnswerCommitment;
}

export function planSemanticQuery(query: SemanticQuery): SemanticQueryPlan {
  const normalizedWorldFrame = normalizeWorldFrame(query.worldFrame);
  const questionRoute = composeQuestionRoute(query.questionRoute);

  return {
    query: {
      questionRoute,
      worldFrame: normalizedWorldFrame
    },
    answerCommitment: getAnswerCommitmentForReadMode(questionRoute.readMode)
  };
}

export class SemanticQueryPlanner {
  public plan(query: SemanticQuery): SemanticQueryPlan {
    return planSemanticQuery(query);
  }
}

function composeQuestionRoute(questionRoute: QuestionRoute): QuestionRoute {
  const claimRoute = composeClaimRoute(questionRoute);
  const currentClaimRoute = getQuestionRouteClaimRoute(questionRoute);

  if (claimRoute.home === currentClaimRoute.home) {
    return questionRoute;
  }

  return createQuestionRoute(
    claimRoute,
    {
      kind: questionRoute.kind,
      inquiryEpisode: questionRoute.inquiryEpisode,
      readMode: questionRoute.readMode,
      boundaryRoute: questionRoute.boundaryRoute,
      authoredOccurrenceTarget: getQuestionRouteAuthoredOccurrenceTarget(
        questionRoute
      )
    }
  );
}

function composeClaimRoute(questionRoute: QuestionRoute): ClaimRouteRef {
  const currentClaimRoute = getQuestionRouteClaimRoute(questionRoute);
  const authoredOccurrenceTarget = getQuestionRouteAuthoredOccurrenceTarget(
    questionRoute
  );
  if (
    authoredOccurrenceTarget === undefined ||
    questionRoute.boundaryRoute !== undefined ||
    questionRoute.readMode !== SemanticReadMode.Explain ||
    questionRoute.inquiryEpisode !==
      SemanticInquiryEpisode.BoundedClosureExplanation
  ) {
    return currentClaimRoute;
  }

  return createClaimRoute(ClaimHomeKind.AnchoredSupport);
}
