import type { ClaimRouteRef } from "../../model/claims/claim-model.js";
import type { WorldFrameHandle } from "../../workspace/handoff/current-world-context.js";
import { createSubstrateClaimRef, type SubstrateClaimRef } from "../claims/substrate-claim-ref.js";

export class ClaimHomeIndex {
  public resolveClaimRef(
    route: ClaimRouteRef,
    worldFrameHandle: WorldFrameHandle
  ): SubstrateClaimRef {
    return createSubstrateClaimRef(route.home, worldFrameHandle.version);
  }
}
