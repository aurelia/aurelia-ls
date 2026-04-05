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

export class RuntimeInvalidationCoordinator {
  public plan(rereadPlan: RereadPlan): RuntimeInvalidationPlan {
    return {
      triggerMask: rereadPlan.trigger.kindMask,
      shouldInvalidate: rereadPlan.shouldReread
    };
  }

  public admitReuse(plan: RuntimeInvalidationPlan): RuntimeReuseAdmission {
    return {
      mayReuse: !plan.shouldInvalidate || plan.triggerMask === InvalidationTriggerKind.None
    };
  }
}
