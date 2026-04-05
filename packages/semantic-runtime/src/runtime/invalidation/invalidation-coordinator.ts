import {
  InvalidationTriggerKind,
  type RereadPlan
} from "../reread/reread-plan.js";

export interface RuntimeInvalidationPlan {
  readonly triggerMask: InvalidationTriggerKind;
  readonly shouldInvalidate: boolean;
}

export interface RuntimeReuseAdmission {
  readonly mayReuse: boolean;
}

export interface InvalidationCoordinator {
  planInvalidation(rereadPlan: RereadPlan): RuntimeInvalidationPlan;
  admitReuse(plan: RuntimeInvalidationPlan): RuntimeReuseAdmission;
}

export function planInvalidation(rereadPlan: RereadPlan): RuntimeInvalidationPlan {
  return {
    triggerMask: rereadPlan.trigger.kindMask,
    shouldInvalidate: rereadPlan.shouldReread
  };
}

export function admitRuntimeReuse(
  plan: RuntimeInvalidationPlan
): RuntimeReuseAdmission {
  return {
    mayReuse: !plan.shouldInvalidate || plan.triggerMask === InvalidationTriggerKind.None
  };
}
