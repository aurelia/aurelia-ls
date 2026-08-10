import type {
  ResourceInventoryItem,
  ResourceNavigationTarget,
} from "@aurelia-ls/language-server/protocol";
import type { LspFacade } from "../../core/lsp-facade.js";
import type { ClientLogger } from "../../log.js";
import type { ResourceNavigationRequest } from "../../types.js";
import type { VscodeApi } from "../../vscode-api.js";

export class ResourceNavigationSnapshotChangedError extends Error {
  readonly code = "AURELIA_RESOURCE_SNAPSHOT_CHANGED";

  constructor() {
    super("The proved Aurelia resource snapshot changed before navigation.");
    this.name = "ResourceNavigationSnapshotChangedError";
  }
}

export function isResourceNavigationSnapshotChangedError(
  error: unknown,
): error is ResourceNavigationSnapshotChangedError {
  return error instanceof ResourceNavigationSnapshotChangedError;
}

export async function openResourceNavigation(
  vscode: VscodeApi,
  lsp: LspFacade,
  logger: ClientLogger,
  request: ResourceNavigationRequest,
): Promise<boolean> {
  const inventory = await lsp.getResourceInventory({ workspaceKey: request.workspaceKey });
  const workspace = inventory?.workspaces.find((candidate) => candidate.key === request.workspaceKey);
  if (workspace == null) {
    if (request.currentness === "strict-snapshot") throw new ResourceNavigationSnapshotChangedError();
    vscode.window.showInformationMessage("The Aurelia resource project is no longer available. Refresh and try again.");
    return false;
  }
  if (workspace.status === "error") {
    throw new Error(`Aurelia resource workspace refresh failed: ${workspace.error}`);
  }
  if (
    request.currentness === "strict-snapshot"
    && workspace.response.fingerprint !== request.fingerprint
  ) {
    throw new ResourceNavigationSnapshotChangedError();
  }
  const project = workspace.response.projects.find((candidate) =>
    candidate.project.projectKey === request.projectKey
  );
  if (project == null) {
    vscode.window.showInformationMessage("The Aurelia resource project is no longer available. Refresh and try again.");
    return false;
  }
  if (project.status === "error") {
    throw new Error(`Aurelia resource project refresh failed: ${project.message}`);
  }
  switch (project.answer.result) {
    case "failed":
    case "invalid":
      throw new Error(`Aurelia resource project returned ${project.answer.result}: ${project.answer.summary}`);
    case "unsupported":
      vscode.window.showInformationMessage("Resource navigation isn't supported for this Aurelia project.");
      return false;
    case "answered":
      break;
  }
  const resource = project.resources.find((candidate) => candidate.identityKey === request.resourceIdentityKey);
  if (resource == null) {
    if (project.answer.coverage !== "complete") {
      throw new Error(
        `Aurelia resource identity could not be confirmed because discovery coverage is ${project.answer.coverage}.`,
      );
    }
    vscode.window.showInformationMessage("That Aurelia resource no longer exists in the current analysis.");
    return false;
  }
  const navigation = currentNavigation(resource, request);
  if (navigation == null) {
    if (project.answer.coverage !== "complete" || resource.metadataState !== "full-definition") {
      throw new Error(
        `Aurelia resource detail could not be confirmed because discovery coverage is ${project.answer.coverage}`
        + ` and metadata is ${resource.metadataState}.`,
      );
    }
    vscode.window.showInformationMessage("That Aurelia resource detail no longer exists in the current analysis.");
    return false;
  }
  if (navigation.state === "unavailable") {
    vscode.window.showInformationMessage(`Source location unavailable for ${resource.name}.`);
    return false;
  }
  if (workspace.response.fingerprint !== request.fingerprint) {
    logger.debug("resourceNavigation.snapshot.refreshed", {
      resource: resource.identityKey,
      previous: request.fingerprint,
      current: workspace.response.fingerprint,
    });
  }
  const location = navigation.location;
  const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(location.uri));
  await vscode.window.showTextDocument(document, {
    preview: true,
    ...(request.placement === "beside" ? { viewColumn: vscode.ViewColumn.Beside } : {}),
    selection: new vscode.Range(
      new vscode.Position(location.range.start.line, location.range.start.character),
      new vscode.Position(location.range.end.line, location.range.end.character),
    ),
  });
  return true;
}

function currentNavigation(
  resource: ResourceInventoryItem,
  request: ResourceNavigationRequest,
): ResourceNavigationTarget | undefined {
  switch (request.role) {
    case "resource":
      return resource.navigation;
    case "implementation":
      return sourceNavigation(resource.sources.implementation);
    case "alias":
      return resource.aliases.find((alias) => alias.identityKey === request.childIdentityKey)?.navigation;
    case "bindable":
      return resource.bindables.find((bindable) => bindable.identityKey === request.childIdentityKey)?.navigation;
  }
}

function sourceNavigation(
  source: ResourceInventoryItem["sources"]["implementation"],
): ResourceNavigationTarget | undefined {
  switch (source.state) {
    case "available":
      return source;
    case "unavailable":
      return source;
    case "absent":
      return undefined;
  }
}
