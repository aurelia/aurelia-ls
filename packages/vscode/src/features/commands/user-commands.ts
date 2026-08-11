import type {
  ResourceInventoryItem,
  ResourceProject,
  RuntimeAnswerTransport,
  TemplateResourceAvailabilityItem,
  TemplateResourceScopeCandidate,
} from "@aurelia-ls/language-server/protocol";
import type { QuickPickItem, QuickPickItemKind, TextEditor } from "vscode";
import { createHash } from "node:crypto";
import type { ClientFeature } from "../../core/feature.js";
import {
  type ExtensionHostObservationValue,
} from "../../extension-host-observation.js";
import {
  emitResourceDiscoveryHostObservation,
  nextResourceDiscoveryHostObservationId,
} from "../../resource-discovery-host-control.js";
import { AureliaCommand } from "../../product-contract.js";
import type { ClientLogger } from "../../log.js";
import type {
  AureliaWorkspaceIdentity,
  RelatedFileCandidate,
  ResourceInventorySnapshot,
  ResourceNavigationRequest,
  TemplateResourceAvailabilitySnapshot,
} from "../../types.js";
import type { VscodeApi } from "../../vscode-api.js";
import {
  isResourceNavigationSnapshotChangedError,
  openResourceNavigation,
} from "../resource-discovery/navigation.js";
import {
  preferredResourceSource,
  resourceAvailabilityReasonLabel,
  resourceCollisionScentMap,
  resourceKindPresentation,
  resourceOriginLabel,
  resourceProjectRootScent,
  resourceProjectRootScentMap,
  resourceProjectShapeLabel,
  resourceQuickPickDetail,
  resourceSourceLocationScent,
  sourceLabel,
  type ResourceCollisionScentCandidate,
} from "../resource-discovery/presentation.js";
import {
  ResourceQuickPickTitleActionKind,
  showResourceQuickPick,
  type ResourceQuickPickModel,
  type ResourceQuickPickTitleAction,
} from "../resource-discovery/quick-pick.js";

interface InventoryQuickPickItem extends QuickPickItem {
  readonly navigation: ResourceNavigationRequest;
}

interface InventoryResourceRow {
  readonly workspace: AureliaWorkspaceIdentity;
  readonly fingerprint: string;
  readonly project: ResourceProject;
  readonly resource: ResourceInventoryItem;
}

type AvailabilityQuickPickItem =
  | (QuickPickItem & { readonly selectionKind: "project"; readonly project: ResourceProject })
  | (QuickPickItem & { readonly selectionKind: "template"; readonly template: TemplateResourceScopeCandidate })
  | (QuickPickItem & {
      readonly selectionKind: "resource";
      readonly row: TemplateResourceAvailabilityItem;
      readonly availabilitySelection: Required<AvailabilityRequestSelection> & { readonly workspaceKey: string };
    })
  | (QuickPickItem & { readonly selectionKind: "separator"; readonly kind: QuickPickItemKind });

type AvailabilityResourceQuickPickItem = Extract<AvailabilityQuickPickItem, { selectionKind: "resource" }>;

interface AvailabilityRequestSelection {
  readonly projectKey?: string;
  readonly templateResourceScopeIdentityKey?: string;
}

type CurrentAvailabilityResolution =
  | { readonly kind: "available"; readonly rowCount: number; readonly navigation: ResourceNavigationRequest }
  | { readonly kind: "removed"; readonly rowCount: number }
  | { readonly kind: "restart"; readonly rowCount: number }
  | { readonly kind: "source-unavailable"; readonly rowCount: number }
  | { readonly kind: "unsupported"; readonly rowCount: number };

type GoToAvailableResourceObservationPhase =
  | "command-start"
  | "initial-request-start"
  | "initial-request-response"
  | "initial-request-failed"
  | "fresh-request-start"
  | "fresh-request-response"
  | "fresh-request-failed"
  | "availability-selection"
  | "revalidation"
  | "recovery-presented"
  | "recovery-choice"
  | "output-requested"
  | "cancelled"
  | "navigation-start"
  | "navigation-stale-retry"
  | "refused"
  | "navigation-complete"
  | "navigation-failed";

function observeGoToAvailableResource(
  observationId: string | undefined,
  phase: GoToAvailableResourceObservationPhase,
  detail: Readonly<Record<string, ExtensionHostObservationValue>> = {},
): void {
  if (observationId == null) return;
  try {
    emitResourceDiscoveryHostObservation({
      source: "go-to-available-resource",
      observationId,
      phase,
      ...detail,
    });
  } catch {
    // Acceptance observations must never affect the product transaction.
  }
}

function observePreparedGoToAvailableResource(
  observationId: string | undefined,
  phase: GoToAvailableResourceObservationPhase,
  prepare: () => Readonly<Record<string, ExtensionHostObservationValue>>,
): void {
  const detail = prepareGoToAvailableResourceObservation(observationId, prepare);
  if (detail != null) observeGoToAvailableResource(observationId, phase, detail);
}

function prepareGoToAvailableResourceObservation<T>(
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

function activeEditor(vscode: VscodeApi): TextEditor | null {
  return vscode.window.activeTextEditor ?? null;
}

function activeEditorMatches(
  vscode: VscodeApi,
  uri: string,
  position: { readonly line: number; readonly character: number },
): boolean {
  const current = vscode.window.activeTextEditor;
  return current != null
    && current.document.uri.toString() === uri
    && current.selection.active.line === position.line
    && current.selection.active.character === position.character;
}

export const UserCommandsFeature: ClientFeature = {
  id: "commands.user",
  activate: (ctx, own) => {
    const lsp = ctx.lsp;
    const vscode = ctx.vscode;
    const errors = ctx.errors;

    const run = <T>(id: string, fn: () => Promise<T>) =>
      errors.capture(`command.${id}`, fn, { context: { command: id } });

    own(vscode.commands.registerCommand(AureliaCommand.OpenResource, (request: ResourceNavigationRequest) =>
      run("openResource", async () => {
        while (true) {
          try {
            return await openResourceNavigation(vscode, lsp, ctx.logger, request);
          } catch (error) {
            const recovery = await recoverResourceDiscoveryFailure(
              vscode,
              ctx.logger,
              "Aurelia couldn't open the selected resource.",
              error,
            );
            if (recovery !== "retry") return false;
          }
        }
      })));

    own(vscode.commands.registerCommand(AureliaCommand.GoToResource, () =>
      run("goToResource", async () => {
        while (true) {
          let outcome;
          try {
            outcome = await showResourceQuickPick(
              vscode,
              "Go to Aurelia Resource",
              async (token) => inventoryQuickPickModel(await lsp.getResourceInventory({}, token)),
              false,
              undefined,
              (action) => handleResourceQuickPickTitleAction(ctx.logger, action),
            );
          } catch (error) {
            const recovery = await recoverResourceDiscoveryFailure(
              vscode,
              ctx.logger,
              "Aurelia resource discovery couldn't load the active workspaces.",
              error,
            );
            if (recovery === "retry") continue;
            return;
          }
          if (outcome.status !== "selected") return;
          while (true) {
            try {
              await openResourceNavigation(vscode, lsp, ctx.logger, outcome.value.navigation);
              return;
            } catch (error) {
              const recovery = await recoverResourceDiscoveryFailure(
                vscode,
                ctx.logger,
                "Aurelia couldn't open the selected resource.",
                error,
              );
              if (recovery !== "retry") return;
            }
          }
        }
      })));

    own(vscode.commands.registerCommand(AureliaCommand.GoToAvailableResource, () =>
      run("goToAvailableResource", async () => {
        const observationId = nextResourceDiscoveryHostObservationId("go-to-available-resource");
        const editor = activeEditor(vscode);
        if (editor == null) {
          vscode.window.showInformationMessage("Open an analyzed Aurelia template to see its available resources.");
          return;
        }
        const uri = editor.document.uri.toString();
        const activePosition = editor.selection.active;
        const position = { line: activePosition.line, character: activePosition.character };
        observePreparedGoToAvailableResource(observationId, "command-start", () => ({
          character: position.character,
          documentName: editor.document.uri.path.split("/").at(-1) ?? "",
          languageId: editor.document.languageId,
          line: position.line,
        }));
        const history: AvailabilityRequestSelection[] = [];
        let selection: AvailabilityRequestSelection = {};
        let modelOrdinal = 0;

        availabilityFlow: while (true) {
          const currentSelection = selection;
          let outcome;
          try {
            outcome = await showResourceQuickPick(
              vscode,
              "Go to Resource Available to Active Template",
              async (token) => {
                observeGoToAvailableResource(observationId, "initial-request-start");
                try {
                  const response = await lsp.getTemplateResourceAvailability(
                    uri,
                    position,
                    currentSelection.projectKey,
                    currentSelection.templateResourceScopeIdentityKey,
                    token,
                  );
                  const model = availabilityQuickPickModel(
                    response,
                    currentSelection,
                    vscode.QuickPickItemKind.Separator,
                  );
                  observePreparedGoToAvailableResource(
                    observationId,
                    "initial-request-response",
                    () => availabilityObservationDetails(
                      response,
                      selectableAvailabilityItemCount(model.items),
                    ),
                  );
                  return model;
                } catch (error) {
                  observeGoToAvailableResource(observationId, "initial-request-failed", { status: "failed" });
                  throw error;
                }
              },
              history.length > 0,
              observationId,
              (action) => {
                observeGoToAvailableResource(observationId, "output-requested", { origin: "quick-pick-title" });
                handleResourceQuickPickTitleAction(ctx.logger, action);
              },
              ++modelOrdinal,
            );
          } catch (error) {
            const recovery = await recoverResourceDiscoveryFailure(
              vscode,
              ctx.logger,
              "Aurelia resource discovery couldn't load resources for the active template.",
              error,
              (phase, detail) => observeGoToAvailableResource(observationId, phase, detail),
            );
            if (recovery === "retry") continue;
            return;
          }
          if (outcome.status === "cancelled") {
            observeGoToAvailableResource(observationId, "cancelled", { stage: "selection" });
            return;
          }
          if (outcome.status === "back") {
            observeGoToAvailableResource(observationId, "availability-selection", { selectionKind: "back" });
            selection = history.pop() ?? {};
            continue;
          }
          if (outcome.value.selectionKind === "project") {
            const selectedProject = outcome.value.project;
            observePreparedGoToAvailableResource(observationId, "availability-selection", () => ({
              selectionKind: "project",
              projectKey: selectedProject.projectKey,
            }));
            history.push(currentSelection);
            selection = { projectKey: selectedProject.projectKey };
            continue;
          }
          if (outcome.value.selectionKind === "template") {
            const selectedTemplate = outcome.value.template;
            observePreparedGoToAvailableResource(observationId, "availability-selection", () => ({
              selectionKind: "template",
              templateName: selectedTemplate.definitionName,
              templateScopeIdentity: selectedTemplate.scopeIdentityKey,
            }));
            history.push(currentSelection);
            selection = {
              ...currentSelection,
              templateResourceScopeIdentityKey: selectedTemplate.scopeIdentityKey,
            };
            continue;
          }
          if (outcome.value.selectionKind === "separator") continue;
          const selectedResource = outcome.value;
          observePreparedGoToAvailableResource(observationId, "availability-selection", () => ({
            selectionKind: "resource",
            resourceName: selectedResource.row.resource.name,
            resourceIdentity: selectedResource.row.resource.identityKey,
            projectKey: selectedResource.availabilitySelection.projectKey,
            templateScopeIdentity: selectedResource.availabilitySelection.templateResourceScopeIdentityKey,
          }));

          let navigationSnapshotEvidence: {
            readonly currentFingerprint: string | null;
            readonly resourcePresence: "present" | "absent" | "unconfirmed";
          } | null = null;
          while (true) {
            observeGoToAvailableResource(observationId, "fresh-request-start");
            let current: CurrentAvailabilityResolution;
            let freshResponse: TemplateResourceAvailabilitySnapshot | null = null;
            try {
              freshResponse = await lsp.getTemplateResourceAvailability(
                uri,
                position,
                selectedResource.availabilitySelection.projectKey,
                selectedResource.availabilitySelection.templateResourceScopeIdentityKey,
              );
              current = currentAvailabilityResolution(freshResponse, selectedResource);
            } catch (error) {
              observeGoToAvailableResource(observationId, "fresh-request-failed", { status: "failed" });
              const recovery = await recoverResourceDiscoveryFailure(
                vscode,
                ctx.logger,
                "Aurelia resource discovery couldn't refresh resources for the active template.",
                error,
                (phase, detail) => observeGoToAvailableResource(observationId, phase, detail),
              );
              if (recovery === "retry") continue;
              return;
            }
            observePreparedGoToAvailableResource(
              observationId,
              "fresh-request-response",
              () => ({
                count: current.rowCount,
                fingerprint: freshResponse?.fingerprint ?? null,
                status: current.kind,
                ...availabilityPostDecisionObservationDetails(freshResponse),
              }),
            );
            observePreparedGoToAvailableResource(
              observationId,
              "revalidation",
              () => ({
                editorUnchanged: activeEditorMatches(vscode, uri, position),
                fingerprint: freshResponse?.fingerprint ?? null,
                outcome: current.kind,
                rowCount: current.rowCount,
              }),
            );
            switch (current.kind) {
              case "restart":
                history.length = 0;
                selection = {};
                continue availabilityFlow;
              case "unsupported": {
                const message = "Resource discovery is not supported for the current template.";
                observeGoToAvailableResource(observationId, "recovery-presented", {
                  actionCount: 1,
                  message,
                  outputActionLabel: "Open Aurelia Output",
                  retryActionLabel: null,
                });
                const action = await vscode.window.showInformationMessage(
                  message,
                  "Open Aurelia Output",
                );
                observeGoToAvailableResource(observationId, "recovery-choice", {
                  choice: action ?? "dismissed",
                });
                if (action === "Open Aurelia Output") ctx.logger.show(true);
                if (action === "Open Aurelia Output") {
                  observeGoToAvailableResource(observationId, "output-requested", { origin: "unsupported" });
                }
                return;
              }
              case "removed": {
                const message = "That resource is no longer available to the current template scope.";
                vscode.window.showInformationMessage(message);
                observePreparedGoToAvailableResource(observationId, "refused", () => {
                  const currentFingerprint = freshResponse?.fingerprint ?? null;
                  const authenticatedSnapshotEvidence = navigationSnapshotEvidence?.currentFingerprint != null
                    && currentFingerprint != null
                    && navigationSnapshotEvidence.currentFingerprint === currentFingerprint
                    ? navigationSnapshotEvidence
                    : null;
                  const category = authenticatedSnapshotEvidence?.resourcePresence === "present"
                    ? "availability-changed"
                    : authenticatedSnapshotEvidence?.resourcePresence === "absent"
                      ? "resource-removed"
                      : "unconfirmed";
                  return {
                    category,
                    currentFingerprint: currentFingerprint
                      ?? navigationSnapshotEvidence?.currentFingerprint
                      ?? null,
                    editorUnchanged: activeEditorMatches(vscode, uri, position),
                    message,
                    resourcePresence: authenticatedSnapshotEvidence?.resourcePresence ?? "unconfirmed",
                  };
                });
                return;
              }
              case "source-unavailable":
                vscode.window.showInformationMessage(
                  "That resource is available to the current template, but its source location is unavailable.",
                );
                return;
              case "available":
                break;
            }
            observeGoToAvailableResource(observationId, "navigation-start");
            try {
              const opened = await openResourceNavigation(vscode, lsp, ctx.logger, current.navigation);
              observeGoToAvailableResource(observationId, "navigation-complete", {
                status: opened ? "opened" : "not-opened",
              });
              return;
            } catch (error) {
              if (isResourceNavigationSnapshotChangedError(error)) {
                navigationSnapshotEvidence = prepareGoToAvailableResourceObservation(
                  observationId,
                  () => ({
                    currentFingerprint: error.currentFingerprint,
                    resourcePresence: error.resourcePresence,
                  }),
                ) ?? null;
                observePreparedGoToAvailableResource(
                  observationId,
                  "navigation-stale-retry",
                  () => ({
                    currentFingerprint: navigationSnapshotEvidence?.currentFingerprint ?? null,
                    resourcePresence: navigationSnapshotEvidence?.resourcePresence ?? "unconfirmed",
                    status: "stale",
                  }),
                );
                continue;
              }
              observeGoToAvailableResource(observationId, "navigation-failed", { status: "failed" });
              const recovery = await recoverResourceDiscoveryFailure(
                vscode,
                ctx.logger,
                "Aurelia couldn't open the selected resource.",
                error,
                (phase, detail) => observeGoToAvailableResource(observationId, phase, detail),
              );
              if (recovery === "retry") continue;
              return;
            }
          }
        }
      })));

    own(vscode.commands.registerCommand(AureliaCommand.OpenRelatedFile, () =>
      run("openRelatedFile", async () => {
        const editor = activeEditor(vscode);
        if (editor == null) {
          vscode.window.showInformationMessage("No active editor");
          return;
        }
        const uri = editor.document.uri.toString();
        const candidates = await lsp.getRelatedFiles(uri);
        if (candidates.length === 0) {
          vscode.window.showInformationMessage("No related Aurelia file found");
          return;
        }

        const related = candidates.length === 1
          ? candidates[0]
          : await pickRelatedFile(vscode, candidates);
        if (related == null) return;

        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(related.uri));
        await vscode.window.showTextDocument(doc);
      })));
  },
};

function inventoryQuickPickModel(
  response: ResourceInventorySnapshot | null,
): ResourceQuickPickModel<InventoryQuickPickItem> {
  if (response == null) {
    return {
      title: "Go to Aurelia Resource",
      placeholder: "No active Aurelia workspace",
      items: [],
    };
  }
  const rows: InventoryResourceRow[] = [];
  const failures: string[] = [];
  let incomplete = 0;
  let unsupported = 0;
  let answeredProjects = 0;
  for (const workspace of response.workspaces) {
    if (workspace.status === "error") {
      failures.push(`workspace ${workspace.key}: ${workspace.error}`);
      continue;
    }
    for (const projectResult of workspace.response.projects) {
      if (projectResult.status === "error") {
        failures.push(`project ${projectResult.project.projectKey}: ${projectResult.message}`);
        continue;
      }
      switch (projectResult.answer.result) {
        case "failed":
        case "invalid":
          failures.push(resourceAnswerFailureDetail(
            `project ${projectResult.project.projectKey}`,
            projectResult.answer,
          ));
          continue;
        case "unsupported":
          unsupported += 1;
          continue;
        case "answered":
          answeredProjects += 1;
          if (projectResult.answer.coverage !== "complete") incomplete += 1;
          break;
      }
      for (const resource of projectResult.resources) {
        if (resource.navigation.state !== "available") continue;
        rows.push({
          workspace,
          fingerprint: workspace.response.fingerprint,
          project: projectResult.project,
          resource,
        });
      }
    }
  }
  if (answeredProjects === 0 && failures.length > 0) {
    throw new Error(`Aurelia resource analysis did not produce a current answer. ${failures.join("; ")}`);
  }
  if (answeredProjects === 0 && unsupported > 0) {
    return {
      title: "Aurelia resource discovery isn't supported for the active projects",
      placeholder: "No supported Aurelia resource inventory is available for these projects",
      items: [],
      titleActions: [ResourceQuickPickTitleActionKind.OpenOutput],
    };
  }
  if (answeredProjects === 0) {
    return {
      title: "Go to Aurelia Resource",
      placeholder: "No analyzed Aurelia project is available for resource discovery",
      items: [],
    };
  }
  const projectRoots = rows.map((row) => row.project.rootUri);
  const collisionScents = resourceCollisionScentMap(rows.map((row): ResourceCollisionScentCandidate<InventoryResourceRow> => ({
    token: row.resource.name,
    roleLabel: resourceKindPresentation(row.resource.kind).singular,
    projectLabel: `${row.workspace.name} · ${row.project.projectKey} · ${resourceProjectRootScent(row.project.rootUri, projectRoots)}`,
    source: preferredResourceSource(row.resource),
    stableKey: `${row.workspace.key}:${row.project.projectKey}:${row.resource.identityKey}`,
    value: row,
  })));
  const items = rows.map((row) => inventoryQuickPickItem(
    row.workspace,
    row.fingerprint,
    row.project,
    row.resource,
    collisionScents.get(row),
  ));
  items.sort((left, right) =>
    left.label.localeCompare(right.label)
    || (left.description ?? "").localeCompare(right.description ?? "")
    || left.navigation.resourceIdentityKey.localeCompare(right.navigation.resourceIdentityKey)
  );
  const partial = failures.length > 0 || unsupported > 0 || incomplete > 0;
  return {
    title: `Go to Aurelia Resource${partial ? " — incomplete" : ""}`,
    placeholder: items.length === 0
      ? partial
        ? "No navigable supported resources are known; discovery is incomplete"
        : "No navigable supported resources were discovered"
      : "Search by resource, alias, bindable, kind, project, package, or source",
    items,
    ...(partial ? { titleActions: [ResourceQuickPickTitleActionKind.OpenOutput] } : {}),
  };
}

function inventoryQuickPickItem(
  workspace: AureliaWorkspaceIdentity,
  fingerprint: string,
  project: ResourceProject,
  resource: ResourceInventoryItem,
  collisionScent?: string,
): InventoryQuickPickItem {
  const kind = resourceKindPresentation(resource.kind);
  const detail = resourceQuickPickDetail(resource, project, workspace, true);
  return {
    label: resource.name,
    description: [kind.singular, resourceOriginLabel(resource), collisionScent]
      .filter((value): value is string => value != null)
      .join(" · "),
    detail: [detail, collisionScent == null ? null : `distinguished by ${collisionScent}`]
      .filter((value): value is string => value != null && value.length > 0)
      .join(" · "),
    navigation: {
      workspaceKey: workspace.key,
      fingerprint,
      projectKey: project.projectKey,
      resourceIdentityKey: resource.identityKey,
      role: "resource",
    },
  };
}

function availabilityQuickPickModel(
  response: TemplateResourceAvailabilitySnapshot | null,
  requestSelection: AvailabilityRequestSelection,
  separatorKind: QuickPickItemKind,
): ResourceQuickPickModel<AvailabilityQuickPickItem> {
  if (response == null) {
    return {
      title: "Go to Resource Available to Active Template",
      placeholder: "Open an analyzed Aurelia template to see its available resources",
      items: [],
      ...availabilityFlowPosition(requestSelection, "resource"),
    };
  }
  const selection = response.projectSelection;
  if (selection.status === "absent") {
    return {
      title: "Go to Resource Available to Active Template",
      placeholder: "No analyzed Aurelia project owns this template cursor",
      items: [],
      ...availabilityFlowPosition(requestSelection, "resource"),
    };
  }
  if (selection.status === "ambiguous") {
    if (selection.candidates.length === 0) {
      throw new Error("Project availability was ambiguous without any selectable projects.");
    }
    const projectRootScents = resourceProjectRootScentMap(selection.candidates.map((project) => ({
      rootUri: project.rootUri,
      stableKey: [project.projectKey, project.shapeKind, project.analysisKind, project.sourceFiles].join(":"),
      value: project,
    })));
    return {
      title: "Choose the Aurelia project for this template",
      placeholder: "This document belongs to more than one analyzed project",
      items: [...selection.candidates]
        .sort((left, right) => left.projectKey.localeCompare(right.projectKey) || left.rootUri.localeCompare(right.rootUri))
        .map((project) => ({
          label: project.projectKey,
          description: resourceProjectShapeLabel(project.shapeKind),
          detail: projectRootScents.get(project),
          selectionKind: "project" as const,
          project,
        })),
      ...availabilityFlowPosition(requestSelection, "project"),
    };
  }
  switch (selection.answer.result) {
    case "failed":
    case "invalid":
      throw resourceAnswerFailure("active template availability", selection.answer);
    case "unsupported":
      return availabilityStateModel(
        "Resource discovery isn't supported for this template",
        "Aurelia can't inspect available resources for this template",
        requestSelection,
        true,
      );
    case "answered":
      break;
  }

  let selectedTemplate: TemplateResourceScopeCandidate;
  switch (selection.answer.selection) {
    case "ambiguous":
      if (selection.templateCandidates.length === 0) {
        throw new Error("Template availability was ambiguous without any selectable templates.");
      }
      {
        const templateScents = resourceCollisionScentMap(selection.templateCandidates.map((template) => ({
          token: template.definitionName,
          roleLabel: template.compilationLane === "authoring" ? "authoring template" : "application template",
          projectLabel: `${selection.project.projectKey} · ${resourceProjectRootScent(
            selection.project.rootUri,
            [selection.project.rootUri],
          )}`,
          source: template.source,
          stableKey: template.scopeIdentityKey,
          value: template,
        })));
      return {
        title: "Choose the Aurelia template",
        placeholder: "The cursor belongs to more than one equally specific template",
        items: [...selection.templateCandidates]
          .sort((left, right) =>
            left.definitionName.localeCompare(right.definitionName)
            || left.scopeIdentityKey.localeCompare(right.scopeIdentityKey)
          )
          .map((template) => {
            const role = template.compilationLane === "authoring" ? "authoring template" : "application template";
            const collisionScent = templateScents.get(template);
            const ownerContext = templateOwnerContext(selection.project, template);
            return {
              label: template.definitionName,
              description: [role, collisionScent == null ? null : `distinguished by ${collisionScent}`]
                .filter((value): value is string => value != null)
                .join(" · "),
              detail: ownerContext,
              selectionKind: "template" as const,
              template,
            };
          }),
        ...availabilityFlowPosition(requestSelection, "template"),
      };
      }
    case "absent":
      return requestSelection.templateResourceScopeIdentityKey == null
        ? availabilityStateModel(
            "No Aurelia template at the cursor",
            "Move the cursor into an analyzed Aurelia template and try again",
            requestSelection,
          )
        : availabilityStateModel(
            "The selected Aurelia template is no longer available",
            "Go Back and choose a current template, or run the command again",
            requestSelection,
          );
    case "not-applicable":
      return availabilityStateModel(
        "Resource availability doesn't apply at this cursor",
        "Open an analyzed Aurelia template and try again",
        requestSelection,
      );
    case "rerouted":
      return availabilityStateModel(
        "This template needs a different Aurelia project",
        requestSelection.projectKey == null
          ? "Run the command again from an analyzed template in the intended project"
          : "Go Back and choose a current project, or run the command again",
        requestSelection,
      );
    case "exact":
      if (selection.selectedTemplate == null) {
        throw new Error("Template availability selected an exact result without a template.");
      }
      selectedTemplate = selection.selectedTemplate;
      break;
  }

  const navigableRows = selection.resources.filter((row) => row.resource.navigation.state === "available");
  const collisionScents = resourceCollisionScentMap(navigableRows.map(
    (row): ResourceCollisionScentCandidate<TemplateResourceAvailabilityItem> => ({
      token: row.resource.name,
      roleLabel: resourceKindPresentation(row.resource.kind).singular,
      projectLabel: `${response.workspace.name} · ${selection.project.projectKey} · ${resourceProjectRootScent(
        selection.project.rootUri,
        [selection.project.rootUri],
      )}`,
      source: preferredResourceSource(row.resource),
      stableKey: row.resource.identityKey,
      value: row,
    }),
  ));
  const resourceItems: AvailabilityResourceQuickPickItem[] = navigableRows
    .map((row): AvailabilityResourceQuickPickItem => {
      const availabilitySource = sourceLabel(row.availabilitySource);
      const availabilityState = availabilityRowIsOpen(row) ? "availability uncertain" : "available";
      const visibilityReason = resourceAvailabilityReasonLabel(row.visibilityKind);
      const visibleState = availabilityState === visibilityReason
        ? availabilityState
        : `${availabilityState} · ${visibilityReason}`;
      const collisionScent = collisionScents.get(row);
      const detail = [
        availabilitySource == null ? null : `available through ${availabilitySource}`,
        resourceQuickPickDetail(row.resource, selection.project, response.workspace, true),
        collisionScent == null ? null : `distinguished by ${collisionScent}`,
      ].filter((value): value is string => value != null && value.length > 0).join(" · ");
      return {
        label: row.resource.name,
        description: [
          visibleState,
          resourceKindPresentation(row.resource.kind).singular,
          resourceOriginLabel(row.resource),
          collisionScent,
        ].filter((value): value is string => value != null).join(" · "),
        detail,
        selectionKind: "resource",
        row,
        availabilitySelection: {
          workspaceKey: response.workspace.key,
          projectKey: selection.project.projectKey,
          templateResourceScopeIdentityKey: selectedTemplate.scopeIdentityKey,
        },
      };
    })
    .sort((left, right) =>
      (availabilityRowIsOpen(left.row) === availabilityRowIsOpen(right.row)
        ? 0
        : availabilityRowIsOpen(left.row) ? 1 : -1)
      || left.label.localeCompare(right.label)
      || left.row.resource.identityKey.localeCompare(right.row.resource.identityKey)
    );
  const availableItems = resourceItems.filter((item) => !availabilityRowIsOpen(item.row));
  const openItems = resourceItems.filter((item) => availabilityRowIsOpen(item.row));
  const items: AvailabilityQuickPickItem[] = [
    ...availableItems,
    ...(openItems.length === 0 ? [] : [{
      kind: separatorKind,
      label: "Availability uncertain",
      selectionKind: "separator" as const,
    }]),
    ...openItems,
  ];
  const incomplete = selection.answer.coverage !== "complete" || openItems.length > 0;
  const selectedTemplateContext = templateOwnerContext(selection.project, selectedTemplate);
  return {
    title: `Resources available to ${selectedTemplate.definitionName} — ${selectedTemplateContext}${incomplete ? " — incomplete" : ""}`,
    placeholder: items.length === 0
      ? incomplete
        ? `No navigable supported resource rows are currently known; discovery is incomplete for ${selectedTemplate.definitionName}`
        : `No navigable supported resources are available to ${selectedTemplate.definitionName}`
      : "Search resources available to this exact template scope",
    items,
    ...(incomplete ? { titleActions: [ResourceQuickPickTitleActionKind.OpenOutput] } : {}),
    ...availabilityFlowPosition(requestSelection, "resource"),
  };
}

function availabilityRowIsOpen(row: TemplateResourceAvailabilityItem): boolean {
  return row.state === "open" || row.visibilityKind === "open";
}

function templateOwnerContext(
  project: ResourceProject,
  template: TemplateResourceScopeCandidate,
): string {
  const root = resourceProjectRootScent(project.rootUri, [project.rootUri]);
  return `${project.projectKey} · ${root} · ${resourceSourceLocationScent(template.source)}`;
}

function availabilityStateModel(
  title: string,
  placeholder: string,
  requestSelection: AvailabilityRequestSelection,
  showOutput = false,
): ResourceQuickPickModel<AvailabilityQuickPickItem> {
  return {
    title,
    placeholder,
    items: [],
    ...(showOutput ? { titleActions: [ResourceQuickPickTitleActionKind.OpenOutput] } : {}),
    ...availabilityFlowPosition(requestSelection, "resource"),
  };
}

function availabilityFlowPosition(
  requestSelection: AvailabilityRequestSelection,
  stage: "project" | "template" | "resource",
): { readonly step: number; readonly totalSteps: number } {
  switch (stage) {
    case "project":
      return { step: 1, totalSteps: 2 };
    case "template": {
      const step = requestSelection.projectKey == null ? 1 : 2;
      return { step, totalSteps: step + 1 };
    }
    case "resource": {
      const step = 1
        + (requestSelection.projectKey == null ? 0 : 1)
        + (requestSelection.templateResourceScopeIdentityKey == null ? 0 : 1);
      return { step, totalSteps: step };
    }
  }
}

function selectableAvailabilityItemCount(items: readonly AvailabilityQuickPickItem[]): number {
  return items.filter((item) => item.selectionKind !== "separator").length;
}

function handleResourceQuickPickTitleAction(
  logger: ClientLogger,
  action: ResourceQuickPickTitleAction,
): void {
  if (action === ResourceQuickPickTitleActionKind.OpenOutput) logger.show(true);
}

async function recoverResourceDiscoveryFailure(
  vscode: VscodeApi,
  logger: ClientLogger,
  message: string,
  error: unknown,
  observe?: (
    phase: "recovery-presented" | "recovery-choice" | "output-requested" | "cancelled",
    detail?: Readonly<Record<string, ExtensionHostObservationValue>>,
  ) => void,
): Promise<"retry" | "stop"> {
  if (isCancellationError(error)) {
    observe?.("cancelled", { stage: "request" });
    return "stop";
  }
  logger.error("resourceDiscovery.operation.failed", undefined, error);
  observe?.("recovery-presented", {
    actionCount: 2,
    message,
    outputActionLabel: "Open Aurelia Output",
    retryActionLabel: "Retry",
  });
  const action = await vscode.window.showErrorMessage(
    message,
    "Retry",
    "Open Aurelia Output",
  );
  observe?.("recovery-choice", { choice: action ?? "dismissed" });
  if (action === "Retry") return "retry";
  if (action === "Open Aurelia Output") {
    observe?.("output-requested", { origin: "recovery" });
    logger.show(true);
  }
  return "stop";
}

function isCancellationError(error: unknown): boolean {
  if (error == null || typeof error !== "object") return false;
  const candidate = error as { readonly code?: unknown; readonly name?: unknown };
  return candidate.code === -32800
    || candidate.code === -32802
    || candidate.name === "AbortError"
    || candidate.name === "Canceled"
    || candidate.name === "Cancelled"
    || candidate.name === "CancellationError";
}

function currentAvailabilityResolution(
  response: TemplateResourceAvailabilitySnapshot | null,
  selected: AvailabilityResourceQuickPickItem,
): CurrentAvailabilityResolution {
  if (response == null) return { kind: "restart", rowCount: 0 };
  const selection = response.projectSelection;
  if (selection.status !== "exact") return { kind: "restart", rowCount: 0 };
  switch (selection.answer.result) {
    case "failed":
    case "invalid":
      throw resourceAnswerFailure("fresh active template availability", selection.answer);
    case "unsupported":
      return { kind: "unsupported", rowCount: 0 };
    case "answered":
      break;
  }
  const rowCount = selection.resources.length;
  if (
    selection.answer.selection !== "exact"
    || selection.selectedTemplate == null
    || response.workspace.key !== selected.availabilitySelection.workspaceKey
    || selection.project.projectKey !== selected.availabilitySelection.projectKey
    || selection.selectedTemplate.scopeIdentityKey
      !== selected.availabilitySelection.templateResourceScopeIdentityKey
  ) {
    return { kind: "restart", rowCount };
  }
  const current = selection.resources.find((row) =>
    row.resource.identityKey === selected.row.resource.identityKey
  );
  if (current == null) {
    return selection.answer.coverage === "complete"
      ? { kind: "removed", rowCount }
      : { kind: "restart", rowCount };
  }
  if (
    current.state !== selected.row.state
    || current.visibilityKind !== selected.row.visibilityKind
  ) {
    return { kind: "restart", rowCount };
  }
  if (current.resource.navigation.state !== "available") {
    return { kind: "source-unavailable", rowCount };
  }
  return {
    kind: "available",
    rowCount,
    navigation: {
      workspaceKey: response.workspace.key,
      fingerprint: response.fingerprint,
      projectKey: selection.project.projectKey,
      resourceIdentityKey: current.resource.identityKey,
      role: "resource",
      currentness: "strict-snapshot",
    },
  };
}

function resourceAnswerFailure(scope: string, answer: RuntimeAnswerTransport): Error {
  return new Error(resourceAnswerFailureDetail(scope, answer));
}

function resourceAnswerFailureDetail(scope: string, answer: RuntimeAnswerTransport): string {
  return `${scope} returned ${answer.result}: ${answer.summary}`;
}

function availabilityObservationDetails(
  response: TemplateResourceAvailabilitySnapshot | null,
  itemCount: number,
): {
  readonly count: number;
  readonly answerResult: string | null;
  readonly answerCoverage: string | null;
  readonly answerSelection: string | null;
  readonly selectedProjectKey: string | null;
  readonly selectedTemplateScopeIdentity: string | null;
  readonly templateCandidateCount: number | null;
  readonly soleTemplateCandidateScopeIdentity: string | null;
  readonly resourceIdentitySetSha256: string | null;
  readonly fingerprint: string | null;
  readonly projectSelection: string;
  readonly resourceCount: number;
  readonly status: string;
  readonly templateSelection: string;
} {
  const decision = availabilityPostDecisionObservationDetails(response);
  if (response == null) {
    return {
      count: itemCount,
      ...decision,
      fingerprint: null,
      projectSelection: "null",
      resourceCount: 0,
      status: "empty",
      templateSelection: "unavailable",
    };
  }
  const selection = response.projectSelection;
  if (selection.status !== "exact") {
    return {
      count: itemCount,
      ...decision,
      fingerprint: response.fingerprint,
      projectSelection: selection.status,
      resourceCount: 0,
      status: itemCount === 0 ? "empty" : "ready",
      templateSelection: "unavailable",
    };
  }
  if (selection.answer.result !== "answered") {
    return {
      count: itemCount,
      ...decision,
      fingerprint: response.fingerprint,
      projectSelection: "exact",
      resourceCount: 0,
      status: "empty",
      templateSelection: `answer:${selection.answer.result}`,
    };
  }
  return {
    count: itemCount,
    ...decision,
    fingerprint: response.fingerprint,
    projectSelection: "exact",
    resourceCount: selection.resources.length,
    status: itemCount === 0 ? "empty" : "ready",
    templateSelection: selection.answer.selection,
  };
}

function availabilityPostDecisionObservationDetails(
  response: TemplateResourceAvailabilitySnapshot | null,
): {
  readonly answerResult: string | null;
  readonly answerCoverage: string | null;
  readonly answerSelection: string | null;
  readonly selectedProjectKey: string | null;
  readonly selectedTemplateScopeIdentity: string | null;
  readonly templateCandidateCount: number | null;
  readonly soleTemplateCandidateScopeIdentity: string | null;
  readonly resourceIdentitySetSha256: string | null;
} {
  const selection = response?.projectSelection;
  if (selection?.status !== "exact") {
    return {
      answerResult: null,
      answerCoverage: null,
      answerSelection: null,
      selectedProjectKey: null,
      selectedTemplateScopeIdentity: null,
      templateCandidateCount: null,
      soleTemplateCandidateScopeIdentity: null,
      resourceIdentitySetSha256: null,
    };
  }
  return {
    answerResult: selection.answer.result,
    answerCoverage: selection.answer.coverage,
    answerSelection: selection.answer.selection,
    selectedProjectKey: selection.project.projectKey,
    selectedTemplateScopeIdentity: selection.selectedTemplate?.scopeIdentityKey ?? null,
    templateCandidateCount: selection.templateCandidates.length,
    soleTemplateCandidateScopeIdentity: selection.templateCandidates.length === 1
      ? selection.templateCandidates[0]!.scopeIdentityKey
      : null,
    resourceIdentitySetSha256: resourceIdentitySetSha256(
      selection.resources.map((row) => row.resource.identityKey),
    ),
  };
}

function resourceIdentitySetSha256(identityKeys: readonly string[]): string {
  const sorted = [...identityKeys].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0
  );
  const preimage = `aurelia-resource-identity-set/1\n${JSON.stringify(sorted)}`;
  return createHash("sha256").update(preimage, "utf8").digest("hex");
}

type RelatedFileQuickPickItem = QuickPickItem & {
  readonly candidate: RelatedFileCandidate;
};

async function pickRelatedFile(
  vscode: VscodeApi,
  candidates: readonly RelatedFileCandidate[],
): Promise<RelatedFileCandidate | null> {
  const items = candidates.map((candidate): RelatedFileQuickPickItem => {
    const target = vscode.Uri.parse(candidate.uri);
    const fileName = target.path.split("/").at(-1) ?? candidate.uri;
    return {
      label: `$(file-code) ${fileName}`,
      description: candidate.role === "component-template" ? "template" : "component",
      detail: `${candidate.className ?? candidate.elementName} (${candidate.elementName}) - ${target.fsPath}`,
      candidate,
    };
  });
  const picked = await vscode.window.showQuickPick(items, {
    title: "Open Related Aurelia File",
    placeHolder: "Choose a related component or template",
    matchOnDescription: true,
    matchOnDetail: true,
  });
  return picked?.candidate ?? null;
}
