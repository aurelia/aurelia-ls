import {
  createWorldContextHandoff,
  type WorldContextHandoff
} from "../../runtime/handoff/world-context-handoff.js";
import type { QuestionRoute } from "../framing/question-route.js";
import type { WorldFrame } from "../framing/world-frame.js";

export interface SemanticQuery {
  readonly questionRoute: QuestionRoute;
  readonly worldFrame: WorldFrame;
}

export interface SemanticQueryPlan {
  readonly query: SemanticQuery;
  readonly worldContext: WorldContextHandoff;
}

export interface SemanticQueryPlanner {
  planSemanticQuery(query: SemanticQuery): SemanticQueryPlan;
}

export function planSemanticQuery(query: SemanticQuery): SemanticQueryPlan {
  return Object.freeze({
    query,
    worldContext: createWorldContextHandoff(query.questionRoute, query.worldFrame)
  });
}
