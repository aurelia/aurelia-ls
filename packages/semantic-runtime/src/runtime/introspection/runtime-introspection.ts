import type { BoundaryOutcomeKind } from "../../boundaries/consequence-basis/boundary-consequence-basis.js";
import type { BoundaryRouteKind } from "../../model/boundary-routes/boundary-routes.js";
import type { ClaimHomeKind, ClaimOutcomeKind, ClaimQualifierKind } from "../../model/claims/claim-model.js";
import type {
  ClosureStatusKind,
  SemanticRuntimeSurfaceKind
} from "../../model/semantic-runtime-handles.js";
import type { SemanticInquiryEpisode, SemanticReadMode } from "../../model/semantic-api/semantic-api-model.js";
import type { QuestionRoute } from "../../query/framing/question-route.js";
import type { WorldFrame } from "../../query/framing/world-frame.js";
import type { InvalidationTriggerKind } from "../reread/reread-plan.js";
import type {
  TypedEnrichmentOutcomeKind,
  TypedOperationIntentKind,
  TypedUnavailabilityReasonKind
} from "../../typescript/typed-enrichment/typed-enrichment-port.js";

export const enum SemanticRuntimeTraceEventKind {
  RuntimeCreated = 1,
  QueryPlanned = 2,
  BoundaryOutcomeProduced = 3,
  WorldContextHandedOff = 4,
  SubstrateClaimRead = 5,
  EvaluatorResultPublished = 6,
  AnswerAssembled = 7,
  TypedEnrichmentRequested = 8,
  TypedEnrichmentProduced = 9
}

export interface SemanticRuntimeTraceCaptureRequest {
  readonly worldFrame?: WorldFrame;
  readonly questionRoute?: QuestionRoute;
  readonly boundaryRoute?: BoundaryRouteKind;
}

export interface SemanticRuntimeTraceEvent {
  readonly kind: SemanticRuntimeTraceEventKind;
  readonly surface: SemanticRuntimeSurfaceKind;
  readonly questionRouteKind?: QuestionRoute["kind"];
  readonly worldFrameKind?: WorldFrame["kind"];
  readonly worldVersion?: number;
  readonly claimHome?: ClaimHomeKind;
  readonly inquiryEpisode?: SemanticInquiryEpisode;
  readonly readMode?: SemanticReadMode;
  readonly boundaryRoute?: BoundaryRouteKind;
  readonly boundaryOutcomeKind?: BoundaryOutcomeKind;
  readonly claimOutcome?: ClaimOutcomeKind;
  readonly claimQualification?: ClaimQualifierKind;
  readonly closureStatus?: ClosureStatusKind;
  readonly publishedClaimCount?: number;
  readonly triggerMask?: InvalidationTriggerKind;
  readonly typedOperationIntent?: TypedOperationIntentKind;
  readonly typedOutcomeKind?: TypedEnrichmentOutcomeKind;
  readonly typedProjectGeneration?: number;
  readonly typedUnavailabilityReason?: TypedUnavailabilityReasonKind;
  readonly typedFileName?: string;
  readonly typedTargetPosition?: number;
}

export interface SemanticRuntimeIntrospection {
  readonly enabled: boolean;
  record(eventFactory: () => SemanticRuntimeTraceEvent): void;
  snapshot(request?: SemanticRuntimeTraceCaptureRequest): readonly SemanticRuntimeTraceEvent[];
}

class DormantSemanticRuntimeIntrospection implements SemanticRuntimeIntrospection {
  public readonly enabled = false;

  public record(_eventFactory: () => SemanticRuntimeTraceEvent): void {}

  public snapshot(_request?: SemanticRuntimeTraceCaptureRequest): readonly SemanticRuntimeTraceEvent[] {
    return [];
  }
}

class BufferedSemanticRuntimeIntrospection implements SemanticRuntimeIntrospection {
  public readonly enabled = true;

  readonly #events: SemanticRuntimeTraceEvent[] = [];

  public record(eventFactory: () => SemanticRuntimeTraceEvent): void {
    this.#events.push(eventFactory());
  }

  public snapshot(request?: SemanticRuntimeTraceCaptureRequest): readonly SemanticRuntimeTraceEvent[] {
    if (request === undefined) {
      return this.#events.slice();
    }

    return this.#events.filter((event) => matchesTraceRequest(event, request));
  }
}

function matchesTraceRequest(
  event: SemanticRuntimeTraceEvent,
  request: SemanticRuntimeTraceCaptureRequest
): boolean {
  if (request.boundaryRoute !== undefined && event.boundaryRoute !== request.boundaryRoute) {
    return false;
  }

  if (
    request.questionRoute !== undefined &&
    event.questionRouteKind !== undefined &&
    event.questionRouteKind !== request.questionRoute.kind
  ) {
    return false;
  }

  if (
    request.worldFrame !== undefined &&
    event.worldVersion !== undefined &&
    event.worldVersion !== request.worldFrame.version
  ) {
    return false;
  }

  if (
    request.worldFrame !== undefined &&
    event.worldFrameKind !== undefined &&
    event.worldFrameKind !== request.worldFrame.kind
  ) {
    return false;
  }

  return request.boundaryRoute !== undefined ||
    request.questionRoute !== undefined ||
    request.worldFrame !== undefined
    ? event.questionRouteKind !== undefined || event.worldFrameKind !== undefined || event.boundaryRoute !== undefined
    : true;
}

const DORMANT_INTROSPECTION = new DormantSemanticRuntimeIntrospection();

export function createDormantSemanticRuntimeIntrospection(): SemanticRuntimeIntrospection {
  return DORMANT_INTROSPECTION;
}

export function createBufferedSemanticRuntimeIntrospection(): SemanticRuntimeIntrospection {
  return new BufferedSemanticRuntimeIntrospection();
}
