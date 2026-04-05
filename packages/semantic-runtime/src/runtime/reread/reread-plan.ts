import type { SemanticQuery } from "../../query/routing/query-planner.js";

export const InvalidationTriggerKind = Object.freeze({
  None: 0,
  WorldVersionChanged: 1 << 0,
  BoundaryOutcomeChanged: 1 << 1
} as const);

export type InvalidationTriggerKind =
  (typeof InvalidationTriggerKind)[keyof typeof InvalidationTriggerKind];

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
  return Object.freeze({
    shouldReread: false,
    trigger: Object.freeze({
      kindMask: InvalidationTriggerKind.None
    })
  });
}
