import type { ClaimHomeKind } from "../../model/claims/claim-model.js";

export interface LineageRef {
  readonly home: ClaimHomeKind;
  readonly publicationVersion: number;
  readonly worldVersion: number;
  readonly localIdentity?: string;
}

export function createLineageRef(
  home: ClaimHomeKind,
  worldVersion: number,
  localIdentity?: string
): LineageRef {
  return {
    home,
    publicationVersion: worldVersion,
    worldVersion,
    localIdentity
  };
}
