import {
  ClaimTruthStatusKind,
  ClaimOutcomeKind,
  ClaimQualifierKind
} from "../../model/claims/claim-model.js";
import {
  ClosureStatusKind,
  SemanticRuntimeSurfaceKind
} from "../../model/semantic-runtime-handles.js";
import type { QuestionRoute } from "../../query/framing/question-route.js";
import type { RuntimeWorldContextHandoff } from "../../runtime/handoff/world-context-handoff.js";
import type {
  PublishedSubstrateClaim,
  SemanticClaimPayload,
  SubstrateClaimRef
} from "../../substrate/claims/substrate-claim-ref.js";
import type { LineageRef } from "../../substrate/lineage/lineage-ref.js";

export interface EvaluatorExecutionPlan {
  readonly questionRoute: QuestionRoute;
  readonly worldContext: RuntimeWorldContextHandoff;
  readonly claimRef: SubstrateClaimRef;
  readonly publishedClaim?: PublishedSubstrateClaim;
  readonly lineageRef?: LineageRef;
}

export interface PublishedEvaluatorResult {
  readonly claimRef: SubstrateClaimRef;
  readonly truthStatus?: ClaimTruthStatusKind;
  readonly outcome: ClaimOutcomeKind;
  readonly qualifier: ClaimQualifierKind;
  readonly closureStatus: ClosureStatusKind;
  readonly lineageRef?: LineageRef;
  readonly surface: SemanticRuntimeSurfaceKind.EvaluatorReadPort;
  readonly payload?: SemanticClaimPayload;
}

export class EvaluatorReadPort {
  public runPublishedEvaluators(
    plan: EvaluatorExecutionPlan
  ): PublishedEvaluatorResult {
    if (plan.publishedClaim === undefined) {
      return {
        claimRef: plan.claimRef,
        outcome: ClaimOutcomeKind.ConsumerSilence,
        qualifier: ClaimQualifierKind.None,
        closureStatus: ClosureStatusKind.Open,
        lineageRef: plan.lineageRef,
        surface: SemanticRuntimeSurfaceKind.EvaluatorReadPort
      };
    }

    return {
      claimRef: plan.claimRef,
      truthStatus: plan.publishedClaim.truthStatus,
      outcome: plan.publishedClaim.outcome,
      qualifier: plan.publishedClaim.qualifier,
      closureStatus: plan.publishedClaim.closureStatus,
      lineageRef: plan.lineageRef,
      surface: SemanticRuntimeSurfaceKind.EvaluatorReadPort,
      payload: plan.publishedClaim.payload
    };
  }
}
