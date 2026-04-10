import type { BoundaryOutcome } from "../boundaries/boundary-router.js";
import { BoundaryRouteKind } from "../model/boundary-routes/boundary-routes.js";
import {
  getClaimTruthStatus,
  ClaimOutcomeKind,
  ClaimQualifierKind,
  ClaimBoundaryKind,
  getClaimBoundary,
  getClaimQualifier
} from "../model/claims/claim-model.js";
import type { SemanticQueryPlan } from "../query/routing/query-planner.js";
import type { RuntimeReuseAdmission } from "../runtime/invalidation/invalidation-coordinator.js";
import type { RuntimeInvalidationPlan } from "../runtime/invalidation/invalidation-coordinator.js";
import type { RuntimeWorldContextHandoff } from "../runtime/handoff/world-context-handoff.js";
import type { TrustBundle } from "../runtime/trust/trust-bundle.js";
import type { PublishedEvaluatorResult } from "../evaluators/kernel/evaluator-read-port.js";
import { createSemanticClaimPayload } from "../substrate/claims/substrate-claim-ref.js";
import { createSubstrateClaimRef } from "../substrate/claims/substrate-claim-ref.js";
import type { SemanticAnswer } from "./semantic-answer.js";
import { getQuestionRouteClaimRoute } from "../query/framing/question-route.js";
import { BoundaryOutcomeKind } from "../boundaries/consequence-basis/boundary-consequence-basis.js";

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
    const claimRoute = getQuestionRouteClaimRoute(plan.query.questionRoute);
    const claimRef = evaluation?.claimRef ?? createSubstrateClaimRef(
      claimRoute.home,
      worldContext.worldFrameHandle.version
    );
    const outcome = evaluation?.outcome ??
      classifyBoundaryOutcome(boundaryOutcome) ??
      ClaimOutcomeKind.ConsumerSilence;
    const qualifier = evaluation?.qualifier ?? ClaimQualifierKind.None;
    const boundaryRefs = mergeBoundaryConsequence(
      boundaryOutcome,
      plan.query.questionRoute.boundaryRoute
    );

    return {
      questionRoute: plan.query.questionRoute,
      worldFrame: plan.query.worldFrame,
      answerCommitment: plan.answerCommitment,
      truthStatus: evaluation?.truthStatus === undefined
        ? undefined
        : getClaimTruthStatus(evaluation.truthStatus),
      outcome,
      qualificationRefs: [getClaimQualifier(qualifier)],
      boundaryRefs,
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
      payload: createSemanticClaimPayload(
        {
          currentWorldSummary: evaluation?.payload?.currentWorldSummary,
          currentWorldPublication: evaluation?.payload?.currentWorldPublication,
          authoredOccurrenceBasis: evaluation?.payload?.authoredOccurrenceBasis
        }
      )
    };
  }
}

export function assembleSemanticAnswer(
  plan: SemanticQueryPlan,
  worldContext: RuntimeWorldContextHandoff,
  boundaryOutcome: BoundaryOutcome | undefined,
  evaluation: PublishedEvaluatorResult | undefined,
  trustBundle: TrustBundle,
  invalidationPlan: RuntimeInvalidationPlan,
  reuseAdmission: RuntimeReuseAdmission
): SemanticAnswer {
  return new SemanticAnswerAssembler().assemble(
    plan,
    worldContext,
    boundaryOutcome,
    evaluation,
    trustBundle,
    invalidationPlan,
    reuseAdmission
  );
}

export function mergeBoundaryConsequence(
  boundaryOutcome: BoundaryOutcome | undefined,
  boundaryRoute: BoundaryRouteKind | undefined
): readonly ReturnType<typeof getClaimBoundary>[] {
  const effectiveBoundaryRoute = boundaryOutcome?.route ?? boundaryRoute;
  return effectiveBoundaryRoute === undefined
    ? []
    : [getClaimBoundary(toClaimBoundaryKind(effectiveBoundaryRoute))];
}

function classifyBoundaryOutcome(
  boundaryOutcome: BoundaryOutcome | undefined
): ClaimOutcomeKind | undefined {
  if (boundaryOutcome === undefined) {
    return undefined;
  }

  return boundaryOutcome.kind === BoundaryOutcomeKind.RouteToOwner
    ? ClaimOutcomeKind.ExternalOwnerReroute
    : ClaimOutcomeKind.ConsumerRefusal;
}

function toClaimBoundaryKind(
  boundaryRoute: BoundaryRouteKind
): ClaimBoundaryKind {
  switch (boundaryRoute) {
    case BoundaryRouteKind.TypedEnrichment:
      return ClaimBoundaryKind.TypedEnrichment;
    case BoundaryRouteKind.CandidateDiscovery:
      return ClaimBoundaryKind.CandidateDiscovery;
    case BoundaryRouteKind.ProtocolProjection:
      return ClaimBoundaryKind.ProtocolProjection;
    case BoundaryRouteKind.WorkspaceAuthoring:
      return ClaimBoundaryKind.WorkspaceAuthoring;
  }
}
