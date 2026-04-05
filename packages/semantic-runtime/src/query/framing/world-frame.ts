export const enum WorldFrameKind {
  Consulted = 1,
  Current = 2,
  Runtime = 3
}

export interface WorldFrame {
  readonly kind: WorldFrameKind;
  readonly version: number;
}

export function normalizeWorldFrame(worldFrame: WorldFrame): WorldFrame {
  return {
    kind: worldFrame.kind,
    version: worldFrame.version
  };
}

export function createWorldFrame(
  version: number,
  kind: WorldFrameKind = WorldFrameKind.Current
): WorldFrame {
  return normalizeWorldFrame({
    kind,
    version
  });
}
