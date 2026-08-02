/** Client-owned contribution identifiers mirrored by package.json and guarded by a manifest contract test. */
export const AureliaCommand = {
  FindResource: "aurelia.findResource",
  ShowAvailableResources: "aurelia.showAvailableResources",
  OpenRelatedFile: "aurelia.openRelatedFile",
  RefreshResourceExplorer: "aurelia.refreshResourceExplorer",
} as const;

export const AureliaView = {
  ResourceExplorer: "aureliaResourceExplorer",
} as const;
