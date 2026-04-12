import type { BoundaryOutcome } from "../boundaries/boundary-router.js";
import { BoundaryRouteKind } from "../model/boundary-routes/boundary-routes.js";
import {
  getClaimTruthStatus,
  ClaimOutcomeKind,
  ClaimTruthStatusKind,
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
import {
  createCurrentWorldSummaryValueFromSnapshot,
  createSemanticClaimPayload
} from "../substrate/claims/substrate-claim-ref.js";
import { createSubstrateClaimRef } from "../substrate/claims/substrate-claim-ref.js";
import {
  SemanticClosureBasis,
  SemanticClosureFrontierKind,
  SemanticClosureRetreatKind,
  SemanticDependencyKind,
  SemanticGoverningAnchorKind,
  SemanticGoverningAnchorRef,
  collectSemanticGoverningAnchorRefStrings,
  createRecordedSemanticClosureReference,
  createUnavailableSemanticClosureReference,
  type SemanticAnswer
} from "./semantic-answer.js";
import { getQuestionRouteClaimRoute } from "../query/framing/question-route.js";
import { BoundaryOutcomeKind } from "../boundaries/consequence-basis/boundary-consequence-basis.js";
import { WorldParticipationFrontierKind } from "../workspace/registration/consulted-world.js";

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
    const currentWorldPublication = selectCurrentWorldPublication(
      worldContext,
      evaluation
    );
    const boundaryRefs = mergeBoundaryConsequence(
      boundaryOutcome,
      plan.query.questionRoute.boundaryRoute
    );
    const governingAnchorRefs = toSemanticGoverningAnchorRefs(
      boundaryOutcome?.governingAnchorRefs ??
        collectSemanticGoverningAnchorRefStrings(
          currentWorldPublication,
          worldContext.worldFrameHandle
        )
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
      closureBasis: buildSemanticClosureBasis(
        currentWorldPublication,
        evaluation,
        boundaryOutcome,
        outcome
      ),
      governingAnchorRefs,
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
          currentWorldSummary: evaluation?.payload?.currentWorldSummary ??
            createCurrentWorldSummaryValueFromSnapshot(worldContext.snapshotSummary),
          currentWorldPublication,
          authoredOccurrenceBasis: evaluation?.payload?.authoredOccurrenceBasis,
          anchoredSupportBasis: evaluation?.payload?.anchoredSupportBasis
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

function buildSemanticClosureBasis(
  currentWorldPublication: ReturnType<typeof selectCurrentWorldPublication>,
  evaluation: PublishedEvaluatorResult | undefined,
  boundaryOutcome: BoundaryOutcome | undefined,
  outcome: ClaimOutcomeKind
): SemanticClosureBasis {
  const frontier = deriveSemanticClosureFrontierKind(
    currentWorldPublication?.frontier,
    evaluation?.truthStatus
  );

  return new SemanticClosureBasis(
    currentWorldPublication?.declarationWitnessRef === undefined
      ? createUnavailableSemanticClosureReference()
      : createRecordedSemanticClosureReference(
          currentWorldPublication.declarationWitnessRef
        ),
    currentWorldPublication?.closureRef === undefined
      ? createUnavailableSemanticClosureReference()
      : createRecordedSemanticClosureReference(
          currentWorldPublication.closureRef
        ),
    frontier,
    deriveSemanticClosureRetreatKind(
      frontier,
      boundaryOutcome,
      outcome
    ),
    deriveSemanticDependencyKind(
      currentWorldPublication?.frontier,
      boundaryOutcome
    )
  );
}

function selectCurrentWorldPublication(
  worldContext: RuntimeWorldContextHandoff,
  evaluation: PublishedEvaluatorResult | undefined
) {
  return evaluation?.payload?.currentWorldPublication ??
    worldContext.currentWorldPublication;
}

function deriveSemanticClosureFrontierKind(
  frontier: WorldParticipationFrontierKind | undefined,
  truthStatus: PublishedEvaluatorResult["truthStatus"]
): SemanticClosureFrontierKind {
  switch (frontier) {
    case WorldParticipationFrontierKind.ClosedBaseline:
      return SemanticClosureFrontierKind.ClosedBaseline;
    case WorldParticipationFrontierKind.CurrentWorldSensitive:
      return SemanticClosureFrontierKind.CurrentWorldSensitive;
    case WorldParticipationFrontierKind.WorldQualified:
      return SemanticClosureFrontierKind.WorldQualified;
    case WorldParticipationFrontierKind.TerminalOpen:
      return SemanticClosureFrontierKind.TerminalOpen;
    case WorldParticipationFrontierKind.OpenPlaceholder:
      return SemanticClosureFrontierKind.OpenPlaceholder;
  }

  switch (truthStatus) {
    case undefined:
      return SemanticClosureFrontierKind.Unknown;
    case ClaimTruthStatusKind.ClosedBaseline:
      return SemanticClosureFrontierKind.ClosedBaseline;
    case ClaimTruthStatusKind.CurrentWorldSensitive:
      return SemanticClosureFrontierKind.CurrentWorldSensitive;
    case ClaimTruthStatusKind.WorldQualified:
      return SemanticClosureFrontierKind.WorldQualified;
    case ClaimTruthStatusKind.TerminalOpen:
      return SemanticClosureFrontierKind.TerminalOpen;
    case ClaimTruthStatusKind.OpenPlaceholder:
      return SemanticClosureFrontierKind.OpenPlaceholder;
  }
}

function deriveSemanticClosureRetreatKind(
  frontier: SemanticClosureFrontierKind,
  boundaryOutcome: BoundaryOutcome | undefined,
  outcome: ClaimOutcomeKind
): SemanticClosureRetreatKind {
  if (outcome === ClaimOutcomeKind.RetreatedOrReopened) {
    return SemanticClosureRetreatKind.WithdrawnSupportRetreat;
  }

  if (
    boundaryOutcome !== undefined ||
    frontier === SemanticClosureFrontierKind.TerminalOpen
  ) {
    return SemanticClosureRetreatKind.BlockedDependencyBoundary;
  }

  return frontier === SemanticClosureFrontierKind.OpenPlaceholder
    ? SemanticClosureRetreatKind.PlaceholderCarryForward
    : SemanticClosureRetreatKind.None;
}

function deriveSemanticDependencyKind(
  frontier: WorldParticipationFrontierKind | undefined,
  boundaryOutcome: BoundaryOutcome | undefined
): SemanticDependencyKind {
  if (boundaryOutcome !== undefined) {
    return SemanticDependencyKind.AffectedSurfaceReference;
  }

  if (frontier === undefined) {
    return SemanticDependencyKind.KernelReadoutIngress;
  }

  return frontier === WorldParticipationFrontierKind.ClosedBaseline
    ? SemanticDependencyKind.BasisPublicationIngress
    : SemanticDependencyKind.QualificationPublicationIngress;
}

function toSemanticGoverningAnchorRefs(
  refs: readonly string[]
): readonly SemanticGoverningAnchorRef[] {
  return refs.map(
    (ref) => new SemanticGoverningAnchorRef(
      SemanticGoverningAnchorKind.GoverningOrigin,
      ref
    )
  );
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
