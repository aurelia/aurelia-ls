export const WorldFrameKind = Object.freeze({
  Consulted: 1,
  Current: 2,
  Runtime: 3
} as const);

export type WorldFrameKind =
  (typeof WorldFrameKind)[keyof typeof WorldFrameKind];

export interface WorldFrame {
  readonly kind: WorldFrameKind;
  readonly version: number;
}

export function normalizeWorldFrame(worldFrame: WorldFrame): WorldFrame {
  return Object.freeze({
    kind: worldFrame.kind,
    version: worldFrame.version
  });
}

export function createWorldFrame(
  version: number,
  kind: WorldFrameKind = WorldFrameKind.Current
): WorldFrame {
  return normalizeWorldFrame(
    Object.freeze({
      kind,
      version
    })
  );
}
