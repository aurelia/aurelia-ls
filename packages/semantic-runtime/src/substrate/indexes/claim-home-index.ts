import { ClaimHomeKind } from "../../model/claims/claim-model.js";
import type { ClaimRouteRef } from "../../model/claims/claim-model.js";
import type { QuestionRoute } from "../../query/framing/question-route.js";
import type { WorldFrameHandle } from "../../workspace/handoff/current-world-context.js";
import { createSubstrateClaimRef, type SubstrateClaimRef } from "../claims/substrate-claim-ref.js";

type ClaimIdentityRoute = Pick<QuestionRoute, "claimRoute" | "authoredOccurrenceTarget"> |
  { readonly claimRoute: ClaimRouteRef };

export class ClaimHomeIndex {
  public resolveClaimRef(
    route: ClaimIdentityRoute,
    worldFrameHandle: WorldFrameHandle
  ): SubstrateClaimRef {
    const authoredOccurrenceTarget = "authoredOccurrenceTarget" in route
      ? route.authoredOccurrenceTarget
      : undefined;
    return createSubstrateClaimRef(
      route.claimRoute.home,
      worldFrameHandle.version,
      route.claimRoute.home === ClaimHomeKind.AuthoredOccurrenceBasis &&
        authoredOccurrenceTarget !== undefined
        ? `${authoredOccurrenceTarget.templateSourceRef}:${authoredOccurrenceTarget.offset}`
        : undefined
    );
  }
}
