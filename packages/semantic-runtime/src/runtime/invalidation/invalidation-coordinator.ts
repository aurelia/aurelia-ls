import {
  InvalidationTriggerKind,
  type InvalidationTriggerKind as InvalidationTriggerKindValue,
  type RereadPlan
} from "../reread/reread-plan.js";

export interface RuntimeInvalidationPlan {
  readonly triggerMask: InvalidationTriggerKindValue;
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
  return Object.freeze({
    triggerMask: rereadPlan.trigger.kindMask,
    shouldInvalidate: rereadPlan.shouldReread
  });
}

export function admitRuntimeReuse(
  plan: RuntimeInvalidationPlan
): RuntimeReuseAdmission {
  return Object.freeze({
    mayReuse: !plan.shouldInvalidate || plan.triggerMask === InvalidationTriggerKind.None
  });
}
