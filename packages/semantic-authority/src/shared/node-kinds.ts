export const NODE_KIND_TAGS = [
  "resource-identity",
  "field-fact",
  "bindable-identity",
  "bindable-trait",
  "admission",
  "reachability",
  "position-classification",
  "correctness-finding",
  "open-boundary",
  "witness",
  "completeness-witness",
  "governed-semantic",
  "observation",
  "reference-entry",
  "bridge-artifact",
] as const;

export type NodeKindTag = (typeof NODE_KIND_TAGS)[number];
