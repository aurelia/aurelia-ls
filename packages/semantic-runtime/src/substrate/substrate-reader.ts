import type { ClaimRouteRef } from "../model/claims/claim-model.js";
import type { WorldFrameHandle } from "../workspace/handoff/current-world-context.js";
import type { TypeScriptWorldConstruction } from "../workspace/registration/typescript-world-construction.js";
import type { PublishedSubstrateClaim, SubstrateClaimRef } from "./claims/substrate-claim-ref.js";
import { ClaimHomeIndex } from "./indexes/claim-home-index.js";
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

export class SubstrateReader {
  readonly #storage: SubstrateStorage;
  readonly #claimHomeIndex: ClaimHomeIndex;
  readonly #worldConstruction?: TypeScriptWorldConstruction;

  public constructor(
    storage: SubstrateStorage = EMPTY_SUBSTRATE_STORAGE,
    claimHomeIndex: ClaimHomeIndex = new ClaimHomeIndex(),
    worldConstruction?: TypeScriptWorldConstruction
  ) {
    this.#storage = storage;
    this.#claimHomeIndex = claimHomeIndex;
    this.#worldConstruction = worldConstruction;
  }

  public readSubstrateClaim(plan: SubstrateLookupPlan): SubstrateReadResult {
    const claimRef = this.#claimHomeIndex.resolveClaimRef(
      plan.claimRoute,
      plan.worldFrameHandle
    );

    return {
      claimRef,
      publishedClaim: this.#storage.readPublishedClaim(claimRef) ??
        this.#worldConstruction?.readPublishedClaim(
          plan.claimRoute,
          plan.worldFrameHandle.version
        ),
      lineageRef: this.#storage.readLineage(claimRef) ??
        this.#worldConstruction?.readLineage(claimRef)
    };
  }

  public lookupLineage(ref: SubstrateClaimRef): LineageRef | undefined {
    return this.#storage.readLineage(ref) ?? this.#worldConstruction?.readLineage(ref);
  }
}
