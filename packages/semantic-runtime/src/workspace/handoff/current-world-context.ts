import type { WorldFrame } from "../../query/framing/world-frame.js";

export const RescanReasonKind = Object.freeze({
  None: 0,
  WorkspaceChanged: 1 << 0,
  BoundaryPlanChanged: 1 << 1,
  WorldFrameShifted: 1 << 2
} as const);

export type RescanReasonKind =
  (typeof RescanReasonKind)[keyof typeof RescanReasonKind];

export interface WorldFrameHandle {
  readonly kind: WorldFrame["kind"];
  readonly version: number;
}

export interface WorldSnapshotSummary {
  readonly kind: WorldFrame["kind"];
  readonly version: number;
  readonly publishedClaimCount: number;
  readonly consultedPackageCount: number;
}

export interface RescanBasis {
  readonly reasonMask: RescanReasonKind;
}

export interface CurrentWorldContext {
  readonly worldFrameHandle: WorldFrameHandle;
  readonly snapshotSummary: WorldSnapshotSummary;
  readonly rescanBasis: RescanBasis;
}

export interface CurrentWorldContextSeed {
  readonly publishedClaimCount?: number;
  readonly consultedPackageCount?: number;
  readonly rescanReasonMask?: RescanReasonKind;
}

export interface CurrentWorldContextPort {
  publishCurrentWorldContext(worldFrame: WorldFrame): CurrentWorldContext;
}

class DefaultCurrentWorldContextPort implements CurrentWorldContextPort {
  readonly #seed: CurrentWorldContextSeed;

  public constructor(seed: CurrentWorldContextSeed) {
    this.#seed = seed;
  }

  public publishCurrentWorldContext(worldFrame: WorldFrame): CurrentWorldContext {
    return Object.freeze({
      worldFrameHandle: Object.freeze({
        kind: worldFrame.kind,
        version: worldFrame.version
      }),
      snapshotSummary: Object.freeze({
        kind: worldFrame.kind,
        version: worldFrame.version,
        publishedClaimCount: this.#seed.publishedClaimCount ?? 0,
        consultedPackageCount: this.#seed.consultedPackageCount ?? 0
      }),
      rescanBasis: Object.freeze({
        reasonMask: this.#seed.rescanReasonMask ?? RescanReasonKind.None
      })
    });
  }
}

const EMPTY_CURRENT_WORLD_CONTEXT_SEED: CurrentWorldContextSeed = Object.freeze({});

export function createCurrentWorldContextPort(
  seed: CurrentWorldContextSeed = EMPTY_CURRENT_WORLD_CONTEXT_SEED
): CurrentWorldContextPort {
  return new DefaultCurrentWorldContextPort(seed);
}
