import { ClaimHomeKind } from "../../model/claims/claim-model.js";
import type { ClaimRouteRef } from "../../model/claims/claim-model.js";
import {
  getQuestionRouteAuthoredOccurrenceTarget,
  getQuestionRouteClaimRoute,
  type QuestionRoute
} from "../../query/framing/question-route.js";
import type { WorldFrameHandle } from "../../workspace/handoff/current-world-context.js";
import { createSubstrateClaimRef, type SubstrateClaimRef } from "../claims/substrate-claim-ref.js";

export interface SubstrateLookupTarget {
  readonly claimRoute: ClaimRouteRef;
  readonly localIdentity?: string;
}

export function createSubstrateLookupTarget(
  questionRoute: QuestionRoute
): SubstrateLookupTarget {
  const claimRoute = getQuestionRouteClaimRoute(questionRoute);
  const authoredOccurrenceTarget = getQuestionRouteAuthoredOccurrenceTarget(
    questionRoute
  );

  return {
    claimRoute,
    localIdentity: claimRoute.home === ClaimHomeKind.AuthoredOccurrenceBasis &&
      authoredOccurrenceTarget !== undefined
      ? `${authoredOccurrenceTarget.templateSourceRef}:${authoredOccurrenceTarget.offset}`
      : undefined
  };
}

export class ClaimHomeIndex {
  public resolveClaimRef(
    target: SubstrateLookupTarget,
    worldFrameHandle: WorldFrameHandle
  ): SubstrateClaimRef {
    return createSubstrateClaimRef(
      target.claimRoute.home,
      worldFrameHandle.version,
      target.localIdentity
    );
  }
}
