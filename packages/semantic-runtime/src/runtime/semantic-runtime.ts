import { SemanticAnswerAssembler } from "../answers/answer-assembler.js";
import type { SemanticAnswer } from "../answers/semantic-answer.js";
import type { BoundaryOutcome } from "../boundaries/boundary-router.js";
import { BoundaryRouter } from "../boundaries/boundary-router.js";
import { getBoundaryRoute } from "../model/boundary-routes/boundary-routes.js";
import { SemanticRuntimeSurfaceKind } from "../model/semantic-runtime-handles.js";
import { SemanticQueryPlanner, type SemanticQuery } from "../query/routing/query-planner.js";
import { createRuntimeWorldContextHandoff } from "./handoff/world-context-handoff.js";
import {
  SemanticRuntimeTraceEventKind,
  type SemanticRuntimeIntrospection,
  type SemanticRuntimeTraceCaptureRequest,
  type SemanticRuntimeTraceEvent
} from "./introspection/runtime-introspection.js";
import { planRuntimeBoot, type RuntimeBootPort } from "./boot/runtime-boot-plan.js";
import { RuntimeInvalidationCoordinator } from "./invalidation/invalidation-coordinator.js";
import { RereadPlanner } from "./reread/reread-plan.js";
import { createTrustBundle } from "./trust/trust-bundle.js";
import type { CurrentWorldContextPort } from "../workspace/handoff/current-world-context.js";
import type { SubstrateReader } from "../substrate/substrate-reader.js";
import type { EvaluatorReadPort } from "../evaluators/kernel/evaluator-read-port.js";
import {
  TypedEnrichmentOutcome,
  TypedEnrichmentOutcomeKind,
  TypedEnrichmentPort,
  TypedEnrichmentRequest,
  TypedUnavailabilityReasonKind
} from "../typescript/typed-enrichment/typed-enrichment-port.js";
import { BoundaryOutcomeKind } from "../boundaries/consequence-basis/boundary-consequence-basis.js";

export class SemanticRuntime {
  public readonly surface = SemanticRuntimeSurfaceKind.SemanticRuntime;

  readonly #boundaryRouter: BoundaryRouter;
  readonly #introspection: SemanticRuntimeIntrospection;
  readonly #currentWorldContextPort: CurrentWorldContextPort;
  readonly #substrateReader: SubstrateReader;
  readonly #evaluatorReadPort: EvaluatorReadPort;
  readonly #typedEnrichmentPort: TypedEnrichmentPort;
  readonly #queryPlanner = new SemanticQueryPlanner();
  readonly #answerAssembler = new SemanticAnswerAssembler();
  readonly #rereadPlanner = new RereadPlanner();
  readonly #invalidationCoordinator = new RuntimeInvalidationCoordinator();

  public constructor(port: RuntimeBootPort) {
    const plan = planRuntimeBoot(port);
    this.#boundaryRouter = new BoundaryRouter(plan.boundaryPorts);
    this.#introspection = plan.introspection;
    this.#currentWorldContextPort = plan.currentWorldContextPort;
    this.#substrateReader = plan.substrateReader;
    this.#evaluatorReadPort = plan.evaluatorReadPort;
    this.#typedEnrichmentPort = plan.typedEnrichmentPort;

    this.#introspection.record(() => ({
      kind: SemanticRuntimeTraceEventKind.RuntimeCreated,
      surface: SemanticRuntimeSurfaceKind.SemanticRuntime
    }));
  }

  public readSemanticAnswer(query: SemanticQuery): SemanticAnswer {
    const plannedQuery = this.#queryPlanner.plan(query);
    const currentWorldContext = this.#currentWorldContextPort.publishCurrentWorldContext(
      plannedQuery.query.questionRoute,
      plannedQuery.query.worldFrame
    );
    const worldContext = createRuntimeWorldContextHandoff(
      plannedQuery.query.questionRoute,
      currentWorldContext
    );

    this.#introspection.record(() => ({
      kind: SemanticRuntimeTraceEventKind.QueryPlanned,
      surface: SemanticRuntimeSurfaceKind.SemanticRuntime,
      questionRouteKind: query.questionRoute.kind,
      worldFrameKind: query.worldFrame.kind,
      worldVersion: query.worldFrame.version,
      claimHome: query.questionRoute.claimRoute.home,
      inquiryEpisode: query.questionRoute.inquiryEpisode,
      readMode: query.questionRoute.readMode,
      boundaryRoute: query.questionRoute.boundaryRoute
    }));

    this.#introspection.record(() => ({
      kind: SemanticRuntimeTraceEventKind.WorldContextHandedOff,
      surface: SemanticRuntimeSurfaceKind.WorldContextHandoff,
      questionRouteKind: query.questionRoute.kind,
      worldFrameKind: worldContext.worldFrameHandle.kind,
      worldVersion: worldContext.worldFrameHandle.version,
      claimHome: query.questionRoute.claimRoute.home,
      boundaryRoute: query.questionRoute.boundaryRoute,
      publishedClaimCount: worldContext.snapshotSummary.publishedClaimCount,
      recognizedResourceCount: worldContext.snapshotSummary.recognizedResourceCount,
      admittedResourceCount: worldContext.snapshotSummary.admittedResourceCount,
      activeResourceCount: worldContext.snapshotSummary.activeResourceCount,
      underclosedResourceCount: worldContext.snapshotSummary.underclosedResourceCount
    }));

    const boundaryOutcome = query.questionRoute.boundaryRoute === undefined
      ? undefined
      : this.#boundaryRouter.routeBoundary(
          getBoundaryRoute(query.questionRoute.boundaryRoute)
        );
    const substrateRead = this.#substrateReader.readSubstrateClaim(
      {
        claimRoute: query.questionRoute.claimRoute,
        worldFrameHandle: worldContext.worldFrameHandle
      }
    );

    this.#introspection.record(() => ({
      kind: SemanticRuntimeTraceEventKind.SubstrateClaimRead,
      surface: SemanticRuntimeSurfaceKind.SubstrateReader,
      questionRouteKind: query.questionRoute.kind,
      worldFrameKind: worldContext.worldFrameHandle.kind,
      worldVersion: worldContext.worldFrameHandle.version,
      claimHome: substrateRead.claimRef.home,
      boundaryRoute: query.questionRoute.boundaryRoute,
      publishedClaimCount: substrateRead.publishedClaim?.currentWorldSummary?.publishedClaimCount,
      recognizedResourceCount: substrateRead.publishedClaim?.currentWorldSummary?.recognizedResourceCount,
      admittedResourceCount: substrateRead.publishedClaim?.currentWorldSummary?.admittedResourceCount,
      activeResourceCount: substrateRead.publishedClaim?.currentWorldSummary?.activeResourceCount,
      underclosedResourceCount: substrateRead.publishedClaim?.currentWorldSummary?.underclosedResourceCount
    }));

    const evaluation = boundaryOutcome === undefined
      ? this.#evaluatorReadPort.runPublishedEvaluators(
          {
            questionRoute: query.questionRoute,
            worldContext,
            claimRef: substrateRead.claimRef,
            publishedClaim: substrateRead.publishedClaim,
            lineageRef: substrateRead.lineageRef
          }
        )
      : undefined;
    const trustBundle = createTrustBundle(worldContext, evaluation, boundaryOutcome);
    const rereadPlan = this.#rereadPlanner.plan(query);
    const invalidationPlan = this.#invalidationCoordinator.plan(rereadPlan);
    const reuseAdmission = this.#invalidationCoordinator.admitReuse(invalidationPlan);

    if (boundaryOutcome !== undefined) {
      this.#introspection.record(() => ({
        kind: SemanticRuntimeTraceEventKind.BoundaryOutcomeProduced,
        surface: SemanticRuntimeSurfaceKind.BoundaryRouter,
        questionRouteKind: query.questionRoute.kind,
        worldFrameKind: query.worldFrame.kind,
        worldVersion: query.worldFrame.version,
        claimHome: query.questionRoute.claimRoute.home,
        boundaryRoute: boundaryOutcome.route,
        boundaryOutcomeKind: boundaryOutcome.kind,
        closureStatus: boundaryOutcome.closureStatus
      }));
    }

    if (evaluation !== undefined) {
      this.#introspection.record(() => ({
        kind: SemanticRuntimeTraceEventKind.EvaluatorResultPublished,
        surface: SemanticRuntimeSurfaceKind.EvaluatorReadPort,
        questionRouteKind: query.questionRoute.kind,
        worldFrameKind: query.worldFrame.kind,
        worldVersion: query.worldFrame.version,
        claimHome: evaluation.claimRef.home,
        boundaryRoute: query.questionRoute.boundaryRoute,
        claimOutcome: evaluation.outcome,
        claimQualification: evaluation.qualifier,
        closureStatus: evaluation.closureStatus,
        publishedClaimCount: evaluation.currentWorldSummary?.publishedClaimCount,
        recognizedResourceCount: evaluation.currentWorldSummary?.recognizedResourceCount,
        admittedResourceCount: evaluation.currentWorldSummary?.admittedResourceCount,
        activeResourceCount: evaluation.currentWorldSummary?.activeResourceCount,
        underclosedResourceCount: evaluation.currentWorldSummary?.underclosedResourceCount
      }));
    }

    const answer = this.#answerAssembler.assemble(
      plannedQuery,
      worldContext,
      boundaryOutcome,
      evaluation,
      trustBundle,
      invalidationPlan,
      reuseAdmission
    );

    this.#introspection.record(() => ({
      kind: SemanticRuntimeTraceEventKind.AnswerAssembled,
      surface: SemanticRuntimeSurfaceKind.AnswerAssembler,
      questionRouteKind: query.questionRoute.kind,
      worldFrameKind: query.worldFrame.kind,
      worldVersion: query.worldFrame.version,
      claimHome: answer.provenance.claimRef.home,
      claimOutcome: answer.outcome,
      claimQualification: answer.qualification,
      closureStatus: answer.closureStatus,
      boundaryRoute: query.questionRoute.boundaryRoute ?? answer.boundaryOutcome?.route,
      triggerMask: answer.deltaBasis.triggerMask,
      publishedClaimCount: answer.currentWorldSummary?.publishedClaimCount,
      recognizedResourceCount: answer.currentWorldSummary?.recognizedResourceCount,
      admittedResourceCount: answer.currentWorldSummary?.admittedResourceCount,
      activeResourceCount: answer.currentWorldSummary?.activeResourceCount,
      underclosedResourceCount: answer.currentWorldSummary?.underclosedResourceCount
    }));

    return answer;
  }

  public readTypedEnrichment(
    request: TypedEnrichmentRequest
  ): TypedEnrichmentOutcome {
    const currentWorldContext = this.#currentWorldContextPort.publishCurrentWorldContext(
      request.questionRoute,
      request.worldFrame
    );
    const worldContext = createRuntimeWorldContextHandoff(
      request.questionRoute,
      currentWorldContext
    );

    this.#introspection.record(() => ({
      kind: SemanticRuntimeTraceEventKind.TypedEnrichmentRequested,
      surface: SemanticRuntimeSurfaceKind.SemanticRuntime,
      questionRouteKind: request.questionRoute.kind,
      worldFrameKind: request.worldFrame.kind,
      worldVersion: request.worldFrame.version,
      claimHome: request.questionRoute.claimRoute.home,
      inquiryEpisode: request.questionRoute.inquiryEpisode,
      readMode: request.questionRoute.readMode,
      boundaryRoute: request.questionRoute.boundaryRoute,
      typedOperationIntent: request.intent,
      typedFileName: request.target.fileName,
      typedTargetPosition: request.target.position
    }));

    this.#introspection.record(() => ({
      kind: SemanticRuntimeTraceEventKind.WorldContextHandedOff,
      surface: SemanticRuntimeSurfaceKind.WorldContextHandoff,
      questionRouteKind: request.questionRoute.kind,
      worldFrameKind: worldContext.worldFrameHandle.kind,
      worldVersion: worldContext.worldFrameHandle.version,
      claimHome: request.questionRoute.claimRoute.home,
      boundaryRoute: request.questionRoute.boundaryRoute,
      publishedClaimCount: worldContext.snapshotSummary.publishedClaimCount,
      recognizedResourceCount: worldContext.snapshotSummary.recognizedResourceCount,
      admittedResourceCount: worldContext.snapshotSummary.admittedResourceCount,
      activeResourceCount: worldContext.snapshotSummary.activeResourceCount,
      underclosedResourceCount: worldContext.snapshotSummary.underclosedResourceCount
    }));

    let outcome = this.#typedEnrichmentPort.enrich(request, worldContext);
    if (
      outcome.kind === TypedEnrichmentOutcomeKind.RoutedToOwner &&
      outcome.boundaryRoute !== undefined
    ) {
      const boundaryOutcome = this.#boundaryRouter.routeBoundary(
        getBoundaryRoute(outcome.boundaryRoute)
      );
      outcome = applyBoundaryOutcome(
        outcome,
        boundaryOutcome
      );
    }

    this.#introspection.record(() => ({
      kind: SemanticRuntimeTraceEventKind.TypedEnrichmentProduced,
      surface: SemanticRuntimeSurfaceKind.TypedEnrichmentPort,
      questionRouteKind: request.questionRoute.kind,
      worldFrameKind: request.worldFrame.kind,
      worldVersion: request.worldFrame.version,
      claimHome: request.questionRoute.claimRoute.home,
      inquiryEpisode: request.questionRoute.inquiryEpisode,
      readMode: request.questionRoute.readMode,
      boundaryRoute: outcome.boundaryRoute,
      closureStatus: outcome.closureStatus,
      typedOperationIntent: request.intent,
      typedOutcomeKind: outcome.kind,
      typedProjectGeneration: outcome.projectGeneration,
      typedUnavailabilityReason: outcome.unavailabilityReason,
      typedFileName: request.target.fileName,
      typedTargetPosition: request.target.position
    }));

    return outcome;
  }

  public captureTrace(
    request?: SemanticRuntimeTraceCaptureRequest
  ): readonly SemanticRuntimeTraceEvent[] {
    return this.#introspection.snapshot(request);
  }
}

function applyBoundaryOutcome(
  outcome: TypedEnrichmentOutcome,
  boundaryOutcome: BoundaryOutcome
): TypedEnrichmentOutcome {
  if (boundaryOutcome.kind === BoundaryOutcomeKind.RouteToOwner) {
    return outcome.withBoundaryOutcome(boundaryOutcome);
  }

  return TypedEnrichmentOutcome.typedUnavailable(
    outcome.anchor,
    outcome.worldVersion,
    TypedUnavailabilityReasonKind.BoundaryOwnerUnavailable,
    outcome.projectGeneration,
    outcome.note,
    boundaryOutcome
  );
}
