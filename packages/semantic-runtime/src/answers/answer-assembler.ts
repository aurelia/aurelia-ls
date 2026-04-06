import type { BoundaryOutcome } from "../boundaries/boundary-router.js";
import {
  ClaimOutcomeKind,
  ClaimQualifierKind
} from "../model/claims/claim-model.js";
import type { SemanticQueryPlan } from "../query/routing/query-planner.js";
import type { RuntimeReuseAdmission } from "../runtime/invalidation/invalidation-coordinator.js";
import type { RuntimeInvalidationPlan } from "../runtime/invalidation/invalidation-coordinator.js";
import type { RuntimeWorldContextHandoff } from "../runtime/handoff/world-context-handoff.js";
import type { TrustBundle } from "../runtime/trust/trust-bundle.js";
import type { PublishedEvaluatorResult } from "../evaluators/kernel/evaluator-read-port.js";
import { createSubstrateClaimRef } from "../substrate/claims/substrate-claim-ref.js";
import type { SemanticAnswer } from "./semantic-answer.js";

export class SemanticAnswerAssembler {
  public assemble(
    plan: SemanticQueryPlan,
    worldContext: RuntimeWorldContextHandoff,
    boundaryOutcome: BoundaryOutcome | undefined,
    evaluation: PublishedEvaluatorResult | undefined,
    trustBundle: TrustBundle,
    invalidationPlan: RuntimeInvalidationPlan,
    reuseAdmission: RuntimeReuseAdmission
  ): SemanticAnswer {
    const claimRef = evaluation?.claimRef ?? createSubstrateClaimRef(
      plan.query.questionRoute.claimRoute.home,
      worldContext.worldFrameHandle.version
    );
    const outcome = evaluation?.outcome ?? ClaimOutcomeKind.BoundaryDeferred;
    const qualification = evaluation?.qualifier ?? ClaimQualifierKind.BoundaryQualified;

    return {
      questionRoute: plan.query.questionRoute,
      worldFrame: plan.query.worldFrame,
      answerCommitment: plan.answerCommitment,
      outcome,
      qualification,
      closureStatus: trustBundle.closureStatus,
      provenance: {
        surface: trustBundle.governingSurface,
        claimRef,
        worldFrameHandle: worldContext.worldFrameHandle,
        lineageRef: evaluation?.lineageRef
      },
      deltaBasis: {
        worldVersion: worldContext.worldFrameHandle.version,
        mayReuse: reuseAdmission.mayReuse,
        triggerMask: invalidationPlan.triggerMask
      },
      boundaryOutcome,
      currentWorldSummary: evaluation?.currentWorldSummary,
      currentWorldPublication: evaluation?.currentWorldPublication,
      authoredOccurrenceBasis: evaluation?.authoredOccurrenceBasis
    };
  }
}
