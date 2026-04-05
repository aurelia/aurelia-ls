import type { BoundaryOutcome } from "../boundaries/boundary-router.js";
import type { SemanticQueryPlan } from "../query/routing/query-planner.js";
import type { RuntimeReuseAdmission } from "../runtime/invalidation/invalidation-coordinator.js";
import type { TrustBundle } from "../runtime/trust/trust-bundle.js";
import type { SemanticAnswer } from "./semantic-answer.js";

export interface SemanticAnswerAssembler {
  assembleSemanticAnswer(
    plan: SemanticQueryPlan,
    boundaryOutcome: BoundaryOutcome,
    trustBundle: TrustBundle,
    reuseAdmission: RuntimeReuseAdmission
  ): SemanticAnswer;
}

export function mergeBoundaryConsequence(boundaryOutcome: BoundaryOutcome): BoundaryOutcome {
  return boundaryOutcome;
}

export function assembleSemanticAnswer(
  plan: SemanticQueryPlan,
  boundaryOutcome: BoundaryOutcome,
  trustBundle: TrustBundle,
  reuseAdmission: RuntimeReuseAdmission
): SemanticAnswer {
  const mergedBoundaryOutcome = mergeBoundaryConsequence(boundaryOutcome);

  return Object.freeze({
    questionRoute: plan.query.questionRoute,
    worldFrame: plan.query.worldFrame,
    boundaryOutcome: mergedBoundaryOutcome,
    closureStatus: trustBundle.closureStatus,
    mayReuse: reuseAdmission.mayReuse
  });
}
