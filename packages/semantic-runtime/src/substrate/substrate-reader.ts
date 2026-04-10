import type { ClaimRouteRef } from "../model/claims/claim-model.js";
import type { QuestionRoute } from "../query/framing/question-route.js";
import type { WorldFrameHandle } from "../workspace/handoff/current-world-context.js";
import type { WorldSnapshotSummary } from "../workspace/handoff/current-world-context.js";
import type { CurrentWorldPublication } from "../workspace/snapshots/current-world-publication.js";
import type { PublishedSubstrateClaim, SubstrateClaimRef } from "./claims/substrate-claim-ref.js";
import {
  CurrentWorldSubstrateClaimFactory,
  type CurrentWorldSubstrateReadContext
} from "./claims/current-world-substrate-claim-factory.js";
import {
  ClaimHomeIndex,
  createSubstrateLookupTarget,
  type SubstrateLookupTarget
} from "./indexes/claim-home-index.js";
import type { LineageRef } from "./lineage/lineage-ref.js";
import {
  EMPTY_SUBSTRATE_STORAGE,
  type SubstrateStorage
} from "./storage/substrate-storage.js";

export interface SubstrateLookupPlan {
  readonly lookupTarget: SubstrateLookupTarget;
  readonly worldFrameHandle: WorldFrameHandle;
  readonly readContext?: CurrentWorldSubstrateReadContext;
}

export interface SubstrateReadResult {
  readonly claimRef: SubstrateClaimRef;
  readonly publishedClaim?: PublishedSubstrateClaim;
  readonly lineageRef?: LineageRef;
}

export class SubstrateReader {
  readonly #storage: SubstrateStorage;
  readonly #claimHomeIndex: ClaimHomeIndex;
  readonly #currentWorldClaimFactory: CurrentWorldSubstrateClaimFactory;

  public constructor(
    storage: SubstrateStorage = EMPTY_SUBSTRATE_STORAGE,
    claimHomeIndex: ClaimHomeIndex = new ClaimHomeIndex(),
    currentWorldClaimFactory: CurrentWorldSubstrateClaimFactory = new CurrentWorldSubstrateClaimFactory()
  ) {
    this.#storage = storage;
    this.#claimHomeIndex = claimHomeIndex;
    this.#currentWorldClaimFactory = currentWorldClaimFactory;
  }

  public readSubstrateClaim(plan: SubstrateLookupPlan): SubstrateReadResult {
    const claimRef = this.#claimHomeIndex.resolveClaimRef(
      plan.lookupTarget,
      plan.worldFrameHandle
    );
    const publishedClaim = this.#storage.readPublishedClaim(claimRef) ??
      (
        plan.readContext === undefined
          ? undefined
          : this.#currentWorldClaimFactory.createPublishedClaim(
              claimRef,
              plan.readContext
            )
      );

    return {
      claimRef,
      publishedClaim,
      lineageRef: this.#storage.readLineage(claimRef) ??
        (
          plan.readContext === undefined
            ? undefined
            : this.#currentWorldClaimFactory.createLineage(
                claimRef,
                plan.readContext
              )
        )
    };
  }

  public lookupLineage(
    ref: SubstrateClaimRef,
    readContext?: CurrentWorldSubstrateReadContext
  ): LineageRef | undefined {
    return this.#storage.readLineage(ref) ??
      (
        readContext === undefined
          ? undefined
          : this.#currentWorldClaimFactory.createLineage(ref, readContext)
      );
  }
}

export function createSubstrateLookupPlan(
  claimRoute: ClaimRouteRef,
  worldFrameHandle: WorldFrameHandle
): SubstrateLookupPlan {
  return {
    lookupTarget: {
      claimRoute
    },
    worldFrameHandle
  };
}

export function createQuestionRouteSubstrateLookupPlan(
  questionRoute: QuestionRoute,
  worldFrameHandle: WorldFrameHandle,
  readContext?: {
    readonly snapshotSummary: WorldSnapshotSummary;
    readonly currentWorldPublication?: CurrentWorldPublication;
  }
): SubstrateLookupPlan {
  return {
    lookupTarget: createSubstrateLookupTarget(questionRoute),
    worldFrameHandle,
    readContext: readContext === undefined
      ? undefined
      : {
          questionRoute,
          snapshotSummary: readContext.snapshotSummary,
          currentWorldPublication: readContext.currentWorldPublication
        }
  };
}
