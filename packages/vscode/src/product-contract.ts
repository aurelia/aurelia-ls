/** Client-owned contribution identifiers mirrored by package.json and guarded by a manifest contract test. */
export const AureliaCommand = {
  GoToResource: "aurelia.goToResource",
  GoToAvailableResource: "aurelia.goToAvailableResource",
  OpenResource: "aurelia.openResource",
  OpenResourceDeclaration: "aurelia.openResourceDeclaration",
  OpenResourceImplementation: "aurelia.openResourceImplementation",
  OpenResourceToSide: "aurelia.openResourceToSide",
  OpenAureliaOutput: "aurelia.openAureliaOutput",
  OpenRelatedFile: "aurelia.openRelatedFile",
  RefreshResourceExplorer: "aurelia.refreshResourceExplorer",
  RetryResourceProject: "aurelia.retryResourceProject",
} as const;

export const AureliaContext = {
  ResourceExplorerHasIssues: "aurelia.resourceExplorerHasIssues",
} as const;

export const AureliaView = {
  ResourceExplorer: "aureliaResourceExplorer",
} as const;
