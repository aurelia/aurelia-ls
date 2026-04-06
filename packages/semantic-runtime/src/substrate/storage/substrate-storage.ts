import type { ClaimHomeKind } from "../../model/claims/claim-model.js";
import {
  ClaimOutcomeKind,
  ClaimQualifierKind
} from "../../model/claims/claim-model.js";
import { ClosureStatusKind } from "../../model/semantic-runtime-handles.js";
import {
  createSubstrateClaimRef,
  type CurrentWorldSummaryValue,
  type PublishedSubstrateClaim,
  type SubstrateClaimRef
} from "../claims/substrate-claim-ref.js";
import { createLineageRef, type LineageRef } from "../lineage/lineage-ref.js";
import type { CurrentWorldPublication } from "../../workspace/snapshots/current-world-publication.js";
import type { AuthoredOccurrenceBasis } from "../../syntax/occurrences/authored-occurrence-basis.js";

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
      keyForClaim(claim.ref),
      claim
    ] as const);
    const lineageEntries = claims.map((claim) => [
      keyForClaim(claim.ref),
      createLineageRef(claim.ref.home, claim.ref.worldVersion)
    ] as const);

    this.#claims = new Map(claimEntries);
    this.#lineage = new Map(lineageEntries);
  }

  public readPublishedClaim(ref: SubstrateClaimRef): PublishedSubstrateClaim | undefined {
    return this.#claims.get(keyForClaim(ref));
  }

  public readLineage(ref: SubstrateClaimRef): LineageRef | undefined {
    return this.#lineage.get(keyForClaim(ref));
  }
}

export const EMPTY_SUBSTRATE_STORAGE: SubstrateStorage = new EmptySubstrateStorage();

export function createCurrentWorldSummaryClaim(
  home: ClaimHomeKind,
  worldVersion: number,
  summary: CurrentWorldSummaryValue,
  publication?: CurrentWorldPublication
): PublishedSubstrateClaim {
  return {
    ref: createSubstrateClaimRef(home, worldVersion),
    outcome: publication?.claimOutcome ?? ClaimOutcomeKind.Present,
    qualifier: publication?.claimQualifier ?? ClaimQualifierKind.None,
    closureStatus: publication?.closureStatus ?? ClosureStatusKind.Closed,
    currentWorldSummary: summary,
    currentWorldPublication: publication
  };
}

export function createAuthoredOccurrenceBasisClaim(
  home: ClaimHomeKind,
  worldVersion: number,
  localIdentity: string | undefined,
  summary: CurrentWorldSummaryValue,
  publication: CurrentWorldPublication,
  outcome: ClaimOutcomeKind,
  qualifier: ClaimQualifierKind,
  closureStatus: ClosureStatusKind,
  authoredOccurrenceBasis?: AuthoredOccurrenceBasis
): PublishedSubstrateClaim {
  return {
    ref: createSubstrateClaimRef(home, worldVersion, localIdentity),
    outcome,
    qualifier,
    closureStatus,
    currentWorldSummary: summary,
    currentWorldPublication: publication,
    authoredOccurrenceBasis
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

function keyForClaim(ref: SubstrateClaimRef): string {
  return `${ref.home}:${ref.worldVersion}:${ref.localIdentity ?? "root"}`;
}
