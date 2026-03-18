export const EDGE_CLASSES = [
  "support",
  "completeness",
  "context-admission",
  "reachability-scope",
  "bridge-mapping",
] as const;

export type EdgeClass = (typeof EDGE_CLASSES)[number];
