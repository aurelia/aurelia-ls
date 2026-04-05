import type {
  ClaimHomeKind,
  ClaimOutcomeKind,
  ClaimQualifierKind
} from "../../model/claims/claim-model.js";
import type { ClosureStatusKind } from "../../model/semantic-runtime-handles.js";
import type { CurrentWorldPublication } from "../../workspace/snapshots/current-world-publication.js";

export interface SubstrateClaimRef {
  readonly home: ClaimHomeKind;
  readonly worldVersion: number;
}

export interface CurrentWorldSummaryValue {
  readonly publishedClaimCount: number;
  readonly consultedPackageCount: number;
  readonly recognizedResourceCount: number;
  readonly admittedResourceCount: number;
  readonly activeResourceCount: number;
}

export interface PublishedSubstrateClaim {
  readonly ref: SubstrateClaimRef;
  readonly outcome: ClaimOutcomeKind;
  readonly qualifier: ClaimQualifierKind;
  readonly closureStatus: ClosureStatusKind;
  readonly currentWorldSummary?: CurrentWorldSummaryValue;
  readonly currentWorldPublication?: CurrentWorldPublication;
}

export function createSubstrateClaimRef(
  home: ClaimHomeKind,
  worldVersion: number
): SubstrateClaimRef {
  return {
    home,
    worldVersion
  };
}
