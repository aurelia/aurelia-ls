import type { ClaimHomeKind } from "../../model/claims/claim-model.js";
import {
  ClaimTruthStatusKind,
  ClaimOutcomeKind,
  ClaimQualifierKind
} from "../../model/claims/claim-model.js";
import { ClosureStatusKind } from "../../model/semantic-runtime-handles.js";
import {
  AnchoredSupportBasis,
  createSemanticClaimPayload,
  createSubstrateClaimRef,
  createCurrentWorldSummaryValue,
  getSubstrateClaim,
  getSubstrateClaimKey,
  type CurrentWorldSummaryValueOptions,
  type PublishedSubstrateClaim,
  type SubstrateClaimRef
} from "../claims/substrate-claim-ref.js";
import { createLineageRef, type LineageRef } from "../lineage/lineage-ref.js";
import type { CurrentWorldPublication } from "../../workspace/snapshots/current-world-publication.js";
import type { AuthoredOccurrenceBasis } from "../../syntax/occurrences/authored-occurrence-basis.js";
import {
  deriveClaimOutcomeFromFrontier,
  deriveClaimQualifierFromFrontier,
  deriveClaimTruthStatusFromFrontier,
  deriveClosureStatusFromFrontier,
  deriveCurrentWorldSummaryFrontier
} from "../../workspace/snapshots/current-world-producer-basis.js";

export interface SubstrateStorage {
  readPublishedClaim(ref: SubstrateClaimRef): PublishedSubstrateClaim | undefined;
  readLineage(ref: SubstrateClaimRef): LineageRef | undefined;
}

class EmptySubstrateStorage implements SubstrateStorage {
  public readPublishedClaim(_ref: SubstrateClaimRef): PublishedSubstrateClaim | undefined {
    return undefined;
  }

  public readLineage(_ref: SubstrateClaimRef): LineageRef | undefined {
    return undefined;
  }
}

class InMemorySubstrateStorage implements SubstrateStorage {
  readonly #claims: ReadonlyMap<string, PublishedSubstrateClaim>;
  readonly #lineage: ReadonlyMap<string, LineageRef>;

  public constructor(claims: readonly PublishedSubstrateClaim[]) {
    const claimEntries = claims.map((claim) => [
      getSubstrateClaimKey(claim.ref),
      claim
    ] as const);
    const lineageEntries = claims.map((claim) => [
      getSubstrateClaimKey(claim.ref),
      createLineageRef(claim.ref.home, claim.ref.worldVersion)
    ] as const);

    this.#claims = new Map(claimEntries);
    this.#lineage = new Map(lineageEntries);
  }

  public readPublishedClaim(ref: SubstrateClaimRef): PublishedSubstrateClaim | undefined {
    return getSubstrateClaim(this.#claims, ref);
  }

  public readLineage(ref: SubstrateClaimRef): LineageRef | undefined {
    return this.#lineage.get(getSubstrateClaimKey(ref));
  }
}

export const EMPTY_SUBSTRATE_STORAGE: SubstrateStorage = new EmptySubstrateStorage();

export function createCurrentWorldSummaryClaim(
  home: ClaimHomeKind,
  worldVersion: number,
  summary: CurrentWorldSummaryValueOptions,
  publication?: CurrentWorldPublication
): PublishedSubstrateClaim {
  const currentWorldSummary = createCurrentWorldSummaryValue(summary);
  const frontier = publication?.frontier ??
    deriveCurrentWorldSummaryFrontier(currentWorldSummary);

  return {
    ref: createSubstrateClaimRef(home, worldVersion),
    truthStatus: publication?.claimTruthStatus ?? deriveClaimTruthStatusFromFrontier(frontier),
    outcome: publication?.claimOutcome ?? deriveClaimOutcomeFromFrontier(frontier),
    qualifier: publication?.claimQualifier ?? deriveClaimQualifierFromFrontier(frontier),
    closureStatus: publication?.closureStatus ?? deriveClosureStatusFromFrontier(frontier),
    payload: createSemanticClaimPayload(
      {
        currentWorldSummary,
        currentWorldPublication: publication
      }
    )
  };
}

export function createAuthoredOccurrenceBasisClaim(
  home: ClaimHomeKind,
  worldVersion: number,
  localIdentity: string | undefined,
  summary: CurrentWorldSummaryValueOptions,
  publication: CurrentWorldPublication,
  truthStatus: ClaimTruthStatusKind | undefined,
  outcome: ClaimOutcomeKind,
  qualifier: ClaimQualifierKind,
  closureStatus: ClosureStatusKind,
  authoredOccurrenceBasis?: AuthoredOccurrenceBasis
): PublishedSubstrateClaim {
  const currentWorldSummary = createCurrentWorldSummaryValue(summary);

  return {
    ref: createSubstrateClaimRef(home, worldVersion, localIdentity),
    truthStatus,
    outcome,
    qualifier,
    closureStatus,
    payload: createSemanticClaimPayload(
      {
        currentWorldSummary,
        currentWorldPublication: publication,
        authoredOccurrenceBasis
      }
    )
  };
}

export function createAnchoredSupportClaim(
  home: ClaimHomeKind,
  worldVersion: number,
  localIdentity: string | undefined,
  summary: CurrentWorldSummaryValueOptions,
  publication: CurrentWorldPublication,
  truthStatus: ClaimTruthStatusKind | undefined,
  outcome: ClaimOutcomeKind,
  qualifier: ClaimQualifierKind,
  closureStatus: ClosureStatusKind,
  anchoredSupportBasis?: AnchoredSupportBasis
): PublishedSubstrateClaim {
  const currentWorldSummary = createCurrentWorldSummaryValue(summary);

  return {
    ref: createSubstrateClaimRef(home, worldVersion, localIdentity),
    truthStatus,
    outcome,
    qualifier,
    closureStatus,
    payload: createSemanticClaimPayload(
      {
        currentWorldSummary,
        currentWorldPublication: publication,
        anchoredSupportBasis
      }
    )
  };
}

export function createInMemorySubstrateStorage(
  claims: readonly PublishedSubstrateClaim[] = []
): SubstrateStorage {
  if (claims.length === 0) {
    return EMPTY_SUBSTRATE_STORAGE;
  }

  return new InMemorySubstrateStorage(claims);
}
