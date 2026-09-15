import type {
  ResourceInventoryItem,
  ResourceNavigationTarget,
} from "@aurelia-ls/language-server/protocol";
import type { LspFacade } from "../../core/lsp-facade.js";
import type { ClientLogger } from "../../log.js";
import type { ResourceNavigationRequest } from "../../types.js";
import type { VscodeApi } from "../../vscode-api.js";
import {
  emitResourceDiscoveryHostObservation,
  nextResourceDiscoveryHostObservationId,
} from "../../resource-discovery-host-control.js";

export class ResourceNavigationSnapshotChangedError extends Error {
  readonly code = "AURELIA_RESOURCE_SNAPSHOT_CHANGED";
  readonly currentFingerprint: string | null;
  readonly resourcePresence: "present" | "absent" | "unconfirmed";

  constructor(evidence: {
    readonly currentFingerprint: string | null;
    readonly resourcePresence: "present" | "absent" | "unconfirmed";
  }) {
    super("The proved Aurelia resource snapshot changed before navigation.");
    this.name = "ResourceNavigationSnapshotChangedError";
    this.currentFingerprint = evidence.currentFingerprint;
    this.resourcePresence = evidence.resourcePresence;
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
  const observationId = nextResourceDiscoveryHostObservationId("resource-navigation");
  const editorBefore = prepareNavigationObservation(observationId, () => activeEditorFact(vscode));
  const observe = (
    phase: string,
    prepare: () => Readonly<Record<string, string | number | boolean | null | undefined>> = () => ({}),
  ): void => {
    if (observationId == null) return;
    try {
      emitResourceDiscoveryHostObservation({
        source: "resource-navigation",
        observationId,
        phase,
        requestedFingerprint: request.fingerprint,
        resourceIdentity: request.resourceIdentityKey,
        childIdentity: request.childIdentityKey ?? null,
        role: request.role,
        placement: request.placement ?? "preview",
        ...prepare(),
      });
    } catch {
      // Acceptance observations must never affect resource navigation.
    }
  };
  const refuse = (
    category: string,
    currentFingerprint: () => string | null,
    message: string | null = null,
  ): void => {
    if (observationId == null || editorBefore == null) return;
    observe("refused", () => ({
      category,
      currentFingerprint: currentFingerprint(),
      editorUnchanged: sameEditorFact(editorBefore, activeEditorFact(vscode)),
      message,
    }));
  };
  observe("start", () => ({ workspaceKey: request.workspaceKey, projectKey: request.projectKey }));
  let inventory;
  try {
    inventory = await lsp.getResourceInventory({
      workspaceKey: request.workspaceKey,
      projectKey: request.projectKey,
    });
  } catch (error) {
    refuse("inventory-request-failed", () => null);
    throw error;
  }
  const workspace = inventory?.workspaces.find((candidate) => candidate.key === request.workspaceKey);
  if (workspace == null) {
    if (request.currentness === "strict-snapshot") {
      refuse("snapshot-changed", () => null);
      throw new ResourceNavigationSnapshotChangedError({
        currentFingerprint: null,
        resourcePresence: "unconfirmed",
      });
    }
    const message = "The Aurelia resource project is no longer available. Refresh and try again.";
    refuse("workspace-retired", () => null, message);
    vscode.window.showInformationMessage(message);
    return false;
  }
  if (workspace.status === "error") {
    refuse("workspace-error", () => null);
    throw new Error(`Aurelia resource workspace refresh failed: ${workspace.error}`);
  }
  if (
    request.currentness === "strict-snapshot"
    && workspace.response.fingerprint !== request.fingerprint
  ) {
    const projectAtF2 = workspace.response.projects.find((candidate) =>
      candidate.project.projectKey === request.projectKey
    );
    const resourcePresence = projectAtF2?.status === "ready"
      && projectAtF2.answer.result === "answered"
      ? projectAtF2.resources.some((candidate) => candidate.identityKey === request.resourceIdentityKey)
        ? "present" as const
        : projectAtF2.answer.coverage === "complete"
          ? "absent" as const
          : "unconfirmed" as const
      : "unconfirmed" as const;
    refuse("snapshot-changed", () => workspace.response.fingerprint);
    throw new ResourceNavigationSnapshotChangedError({
      currentFingerprint: workspace.response.fingerprint,
      resourcePresence,
    });
  }
  const project = workspace.response.projects.find((candidate) =>
    candidate.project.projectKey === request.projectKey
  );
  if (project == null) {
    const message = "The Aurelia resource project is no longer available. Refresh and try again.";
    refuse("project-retired", () => workspace.response.fingerprint, message);
    vscode.window.showInformationMessage(message);
    return false;
  }
  if (project.status === "error") {
    refuse("project-error", () => workspace.response.fingerprint);
    throw new Error(`Aurelia resource project refresh failed: ${project.message}`);
  }
  switch (project.answer.result) {
    case "failed":
    case "invalid":
      refuse(`project-${project.answer.result}`, () => workspace.response.fingerprint);
      throw new Error(`Aurelia resource project returned ${project.answer.result}: ${project.answer.summary}`);
    case "unsupported":
      {
        const message = "Resource navigation isn't supported for this Aurelia project.";
        refuse("unsupported", () => workspace.response.fingerprint, message);
        vscode.window.showInformationMessage(message);
      }
      return false;
    case "answered":
      break;
  }
  const resource = project.resources.find((candidate) => candidate.identityKey === request.resourceIdentityKey);
  if (resource == null) {
    if (project.answer.coverage !== "complete") {
      refuse("resource-unconfirmed", () => workspace.response.fingerprint);
      throw new Error(
        `Aurelia resource identity could not be confirmed because discovery coverage is ${project.answer.coverage}.`,
      );
    }
    const message = "That Aurelia resource no longer exists in the current analysis.";
    refuse("resource-removed", () => workspace.response.fingerprint, message);
    vscode.window.showInformationMessage(message);
    return false;
  }
  const navigation = currentNavigation(resource, request);
  if (navigation == null) {
    if (project.answer.coverage !== "complete" || resource.metadataState !== "full-definition") {
      refuse("detail-unconfirmed", () => workspace.response.fingerprint);
      throw new Error(
        `Aurelia resource detail could not be confirmed because discovery coverage is ${project.answer.coverage}`
        + ` and metadata is ${resource.metadataState}.`,
      );
    }
    const message = "That Aurelia resource detail no longer exists in the current analysis.";
    refuse("detail-removed", () => workspace.response.fingerprint, message);
    vscode.window.showInformationMessage(message);
    return false;
  }
  if (navigation.state === "unavailable") {
    const message = `Source location unavailable for ${resource.name}.`;
    refuse("source-unavailable", () => workspace.response.fingerprint, message);
    vscode.window.showInformationMessage(message);
    return false;
  }
  if (workspace.response.fingerprint !== request.fingerprint) {
    logger.debug("resourceNavigation.snapshot.refreshed", {
      resource: resource.identityKey,
      previous: request.fingerprint,
      current: workspace.response.fingerprint,
    });
    observe("refreshed", () => ({ currentFingerprint: workspace.response.fingerprint }));
  }
  const location = navigation.location;
  try {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(location.uri));
    await vscode.window.showTextDocument(document, {
      preview: true,
      ...(request.placement === "beside" ? { viewColumn: vscode.ViewColumn.Beside } : {}),
      selection: new vscode.Range(
        new vscode.Position(location.range.start.line, location.range.start.character),
        new vscode.Position(location.range.end.line, location.range.end.character),
      ),
    });
  } catch (error) {
    refuse("editor-open-failed", () => workspace.response.fingerprint);
    throw error;
  }
  observe("opened", () => ({
    currentFingerprint: workspace.response.fingerprint,
    uri: location.uri,
    startLine: location.range.start.line,
    startCharacter: location.range.start.character,
    endLine: location.range.end.line,
    endCharacter: location.range.end.character,
  }));
  return true;
}

function prepareNavigationObservation<T>(
  observationId: string | undefined,
  prepare: () => T,
): T | undefined {
  if (observationId == null) return undefined;
  try {
    return prepare();
  } catch {
    return undefined;
  }
}

interface ActiveEditorFact {
  readonly uri: string | null;
  readonly line: number | null;
  readonly character: number | null;
}

function activeEditorFact(vscode: VscodeApi): ActiveEditorFact {
  const editor = vscode.window.activeTextEditor;
  if (editor == null) return { uri: null, line: null, character: null };
  return {
    uri: editor.document.uri.toString(),
    line: editor.selection.active.line,
    character: editor.selection.active.character,
  };
}

function sameEditorFact(left: ActiveEditorFact, right: ActiveEditorFact): boolean {
  return left.uri === right.uri && left.line === right.line && left.character === right.character;
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
