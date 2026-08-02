/** Client-owned contribution identifiers mirrored by package.json and guarded by a manifest contract test. */
export const AureliaCommand = {
  GoToResource: "aurelia.goToResource",
  GoToAvailableResource: "aurelia.goToAvailableResource",
  OpenResource: "aurelia.openResource",
  OpenRelatedFile: "aurelia.openRelatedFile",
  RefreshResourceExplorer: "aurelia.refreshResourceExplorer",
} as const;

export const AureliaView = {
  ResourceExplorer: "aureliaResourceExplorer",
} as const;
