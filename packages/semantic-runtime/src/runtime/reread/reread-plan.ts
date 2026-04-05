import type { SemanticQuery } from "../../query/routing/query-planner.js";

export const enum InvalidationTriggerKind {
  None = 0,
  WorldVersionChanged = 1 << 0,
  BoundaryOutcomeChanged = 1 << 1
}

export interface InvalidationTrigger {
  readonly kindMask: InvalidationTriggerKind;
}

export interface RereadPlan {
  readonly shouldReread: boolean;
  readonly trigger: InvalidationTrigger;
}

export interface RereadPlanner {
  planReread(query: SemanticQuery): RereadPlan;
}

export function planReread(_query: SemanticQuery): RereadPlan {
  return {
    shouldReread: false,
    trigger: {
      kindMask: InvalidationTriggerKind.None
    }
  };
}
