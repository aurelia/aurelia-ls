import type {
  ClaimHomeKind,
  ClaimOutcomeKind,
  ClaimQualifierKind
} from "../../model/claims/claim-model.js";
import type { ClosureStatusKind } from "../../model/semantic-runtime-handles.js";

export interface SubstrateClaimRef {
  readonly home: ClaimHomeKind;
  readonly worldVersion: number;
}

export interface CurrentWorldSummaryValue {
  readonly publishedClaimCount: number;
  readonly consultedPackageCount: number;
}

export interface PublishedSubstrateClaim {
  readonly ref: SubstrateClaimRef;
  readonly outcome: ClaimOutcomeKind;
  readonly qualifier: ClaimQualifierKind;
  readonly closureStatus: ClosureStatusKind;
  readonly currentWorldSummary?: CurrentWorldSummaryValue;
}

export function createSubstrateClaimRef(
  home: ClaimHomeKind,
  worldVersion: number
): SubstrateClaimRef {
  return Object.freeze({
    home,
    worldVersion
  });
}
