import type { ClaimHomeKind } from "../../model/claims/claim-model.js";

export interface LineageRef {
  readonly home: ClaimHomeKind;
  readonly publicationVersion: number;
  readonly worldVersion: number;
}

export function createLineageRef(
  home: ClaimHomeKind,
  worldVersion: number
): LineageRef {
  return Object.freeze({
    home,
    publicationVersion: worldVersion,
    worldVersion
  });
}
