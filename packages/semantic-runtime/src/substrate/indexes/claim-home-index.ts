import type { ClaimRouteRef } from "../../model/claims/claim-model.js";
import type { WorldFrameHandle } from "../../workspace/handoff/current-world-context.js";
import { createSubstrateClaimRef, type SubstrateClaimRef } from "../claims/substrate-claim-ref.js";

export interface ClaimHomeIndex {
  resolveClaimRef(
    route: ClaimRouteRef,
    worldFrameHandle: WorldFrameHandle
  ): SubstrateClaimRef;
}

class DefaultClaimHomeIndex implements ClaimHomeIndex {
  public resolveClaimRef(
    route: ClaimRouteRef,
    worldFrameHandle: WorldFrameHandle
  ): SubstrateClaimRef {
    return createSubstrateClaimRef(route.home, worldFrameHandle.version);
  }
}

const DEFAULT_CLAIM_HOME_INDEX = new DefaultClaimHomeIndex();

export function createClaimHomeIndex(): ClaimHomeIndex {
  return DEFAULT_CLAIM_HOME_INDEX;
}
