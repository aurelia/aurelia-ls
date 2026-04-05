import type { ClaimRouteRef } from "../model/claims/claim-model.js";
import type { WorldFrameHandle } from "../workspace/handoff/current-world-context.js";
import type { PublishedSubstrateClaim, SubstrateClaimRef } from "./claims/substrate-claim-ref.js";
import { type ClaimHomeIndex, createClaimHomeIndex } from "./indexes/claim-home-index.js";
import type { LineageRef } from "./lineage/lineage-ref.js";
import {
  EMPTY_SUBSTRATE_STORAGE,
  type SubstrateStorage
} from "./storage/substrate-storage.js";

export interface SubstrateLookupPlan {
  readonly claimRoute: ClaimRouteRef;
  readonly worldFrameHandle: WorldFrameHandle;
}

export interface SubstrateReadResult {
  readonly claimRef: SubstrateClaimRef;
  readonly publishedClaim?: PublishedSubstrateClaim;
  readonly lineageRef?: LineageRef;
}

export interface SubstrateReader {
  readSubstrateClaim(plan: SubstrateLookupPlan): SubstrateReadResult;
  lookupLineage(ref: SubstrateClaimRef): LineageRef | undefined;
}

class DefaultSubstrateReader implements SubstrateReader {
  readonly #storage: SubstrateStorage;
  readonly #claimHomeIndex: ClaimHomeIndex;

  public constructor(storage: SubstrateStorage, claimHomeIndex: ClaimHomeIndex) {
    this.#storage = storage;
    this.#claimHomeIndex = claimHomeIndex;
  }

  public readSubstrateClaim(plan: SubstrateLookupPlan): SubstrateReadResult {
    const claimRef = this.#claimHomeIndex.resolveClaimRef(
      plan.claimRoute,
      plan.worldFrameHandle
    );

    return {
      claimRef,
      publishedClaim: this.#storage.readPublishedClaim(claimRef),
      lineageRef: this.#storage.readLineage(claimRef)
    };
  }

  public lookupLineage(ref: SubstrateClaimRef): LineageRef | undefined {
    return this.#storage.readLineage(ref);
  }
}

export function createSubstrateReader(
  storage: SubstrateStorage = EMPTY_SUBSTRATE_STORAGE,
  claimHomeIndex: ClaimHomeIndex = createClaimHomeIndex()
): SubstrateReader {
  return new DefaultSubstrateReader(storage, claimHomeIndex);
}

export function readSubstrateClaim(
  reader: SubstrateReader,
  plan: SubstrateLookupPlan
): SubstrateReadResult {
  return reader.readSubstrateClaim(plan);
}

export function lookupLineage(
  reader: SubstrateReader,
  ref: SubstrateClaimRef
): LineageRef | undefined {
  return reader.lookupLineage(ref);
}
