import type { ViewColumn } from "vscode";
import type { LspFacade } from "../../core/lsp-facade.js";
import type { ClientLogger } from "../../log.js";
import type { ResourceNavigationRequest } from "../../types.js";
import type { VscodeApi } from "../../vscode-api.js";

export async function openResourceNavigation(
  vscode: VscodeApi,
  lsp: LspFacade,
  logger: ClientLogger,
  request: ResourceNavigationRequest,
  viewColumn?: ViewColumn,
): Promise<boolean> {
  const inventory = await lsp.getResourceInventory({ workspaceKey: request.workspaceKey });
  const workspace = inventory?.workspaces.find((candidate) => candidate.key === request.workspaceKey);
  if (workspace == null || workspace.status === "error") {
    vscode.window.showInformationMessage("The Aurelia resource project is no longer available. Refresh and try again.");
    return false;
  }
  const project = workspace.response.projects.find((candidate) =>
    candidate.project.projectKey === request.projectKey
  );
  if (project == null || project.status === "error") {
    vscode.window.showInformationMessage("The Aurelia resource project could not be refreshed. Try again after analysis settles.");
    return false;
  }
  const resource = project.resources.find((candidate) => candidate.identityKey === request.resourceIdentityKey);
  if (resource == null) {
    vscode.window.showInformationMessage("That Aurelia resource no longer exists in the current analysis.");
    return false;
  }
  const navigation = request.role === "resource"
    ? resource.navigation
    : request.role === "alias"
      ? resource.aliases.find((alias) => alias.identityKey === request.childIdentityKey)?.navigation
      : resource.bindables.find((bindable) => bindable.identityKey === request.childIdentityKey)?.navigation;
  if (navigation == null) {
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
    ...(viewColumn == null ? {} : { viewColumn }),
    selection: new vscode.Range(
      new vscode.Position(location.range.start.line, location.range.start.character),
      new vscode.Position(location.range.end.line, location.range.end.character),
    ),
  });
  return true;
}
