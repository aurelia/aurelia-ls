export const WorldFrameKind = Object.freeze({
  Current: 1,
  Snapshot: 2
} as const);

export type WorldFrameKind =
  (typeof WorldFrameKind)[keyof typeof WorldFrameKind];

export interface WorldFrame {
  readonly kind: WorldFrameKind;
  readonly version: number;
}

export function createWorldFrame(
  version: number,
  kind: WorldFrameKind = WorldFrameKind.Current
): WorldFrame {
  return Object.freeze({
    kind,
    version
  });
}
