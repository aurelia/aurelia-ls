import type {
  ResourceInventoryItem,
  ResourceProject,
  TemplateResourceAvailabilityItem,
  TemplateResourceScopeCandidate,
} from "@aurelia-ls/language-server/protocol";
import type { CancellationToken, QuickPickItem, TextEditor } from "vscode";
import type { ClientFeature } from "../../core/feature.js";
import { AureliaCommand } from "../../product-contract.js";
import type {
  AureliaWorkspaceIdentity,
  RelatedFileCandidate,
  ResourceInventorySnapshot,
  ResourceNavigationRequest,
  TemplateResourceAvailabilitySnapshot,
} from "../../types.js";
import type { VscodeApi } from "../../vscode-api.js";
import { openResourceNavigation } from "../resource-discovery/navigation.js";
import {
  resourceKindPresentation,
  resourceOriginLabel,
  resourceQuickPickDetail,
  sourceLabel,
} from "../resource-discovery/presentation.js";
import {
  showResourceQuickPick,
  type ResourceQuickPickModel,
} from "../resource-discovery/quick-pick.js";

interface InventoryQuickPickItem extends QuickPickItem {
  readonly navigation: ResourceNavigationRequest;
}

type AvailabilityQuickPickItem = QuickPickItem & (
  | { readonly selectionKind: "project"; readonly project: ResourceProject }
  | { readonly selectionKind: "template"; readonly template: TemplateResourceScopeCandidate }
  | { readonly selectionKind: "resource"; readonly row: TemplateResourceAvailabilityItem; readonly navigation: ResourceNavigationRequest }
);

type AvailabilityResourceQuickPickItem = Extract<AvailabilityQuickPickItem, { selectionKind: "resource" }>;

interface AvailabilityRequestSelection {
  readonly projectKey?: string;
  readonly templateResourceScopeIdentityKey?: string;
}

function activeEditor(vscode: VscodeApi): TextEditor | null {
  return vscode.window.activeTextEditor ?? null;
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
      run("openResource", () => openResourceNavigation(vscode, lsp, ctx.logger, request))));

    own(vscode.commands.registerCommand(AureliaCommand.GoToResource, () =>
      run("goToResource", async () => {
        const outcome = await showResourceQuickPick(
          vscode,
          "Go to Aurelia Resource",
          async (token) => inventoryQuickPickModel(await lsp.getResourceInventory({}, token)),
        );
        if (outcome.status !== "selected") return;
        await openResourceNavigation(vscode, lsp, ctx.logger, outcome.value.navigation);
      })));

    own(vscode.commands.registerCommand(AureliaCommand.GoToAvailableResource, () =>
      run("goToAvailableResource", async () => {
        const editor = activeEditor(vscode);
        if (editor == null) {
          vscode.window.showInformationMessage("Open an analyzed Aurelia template to see its available resources.");
          return;
        }
        const uri = editor.document.uri.toString();
        const position = editor.selection.active;
        const history: AvailabilityRequestSelection[] = [];
        let selection: AvailabilityRequestSelection = {};

        while (true) {
          const currentSelection = selection;
          const outcome = await showResourceQuickPick(
            vscode,
            "Go to Resource Available to Active Template",
            async (token) => availabilityQuickPickModel(
              await lsp.getTemplateResourceAvailability(
                uri,
                position,
                currentSelection.projectKey,
                currentSelection.templateResourceScopeIdentityKey,
                token,
              ),
            ),
            history.length > 0,
          );
          if (outcome.status === "cancelled") return;
          if (outcome.status === "back") {
            selection = history.pop() ?? {};
            continue;
          }
          if (outcome.value.selectionKind === "project") {
            history.push(currentSelection);
            selection = { projectKey: outcome.value.project.projectKey };
            continue;
          }
          if (outcome.value.selectionKind === "template") {
            history.push(currentSelection);
            selection = {
              ...currentSelection,
              templateResourceScopeIdentityKey: outcome.value.template.scopeIdentityKey,
            };
            continue;
          }
          const selectedResource = outcome.value;

          const fresh = await lsp.getTemplateResourceAvailability(
            uri,
            position,
            currentSelection.projectKey,
            currentSelection.templateResourceScopeIdentityKey,
          );
          const stillAvailable = fresh == null
            ? null
            : exactAvailabilityRows(fresh).find((row) =>
              row.resource.identityKey === selectedResource.row.resource.identityKey
            ) ?? null;
          if (stillAvailable == null) {
            vscode.window.showInformationMessage(
              "That resource is no longer available to the current template scope.",
            );
            return;
          }
          await openResourceNavigation(vscode, lsp, ctx.logger, {
            ...selectedResource.navigation,
            fingerprint: fresh!.fingerprint,
          });
          return;
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
  const items: InventoryQuickPickItem[] = [];
  let failed = 0;
  let incomplete = 0;
  let readyProjects = 0;
  for (const workspace of response.workspaces) {
    if (workspace.status === "error") {
      failed += 1;
      continue;
    }
    for (const projectResult of workspace.response.projects) {
      if (projectResult.status === "error") {
        failed += 1;
        continue;
      }
      readyProjects += 1;
      if (projectResult.answer.result !== "answered" || projectResult.answer.coverage !== "complete") {
        incomplete += 1;
      }
      for (const resource of projectResult.resources) {
        if (resource.navigation.state !== "available") continue;
        items.push(inventoryQuickPickItem(
          workspace,
          workspace.response.fingerprint,
          projectResult.project,
          resource,
          response.workspaces.length > 1 || workspace.response.projects.length > 1,
        ));
      }
    }
  }
  if (readyProjects === 0 && failed > 0) {
    throw new Error("Aurelia resource analysis failed for every active project.");
  }
  items.sort((left, right) =>
    left.label.localeCompare(right.label)
    || (left.description ?? "").localeCompare(right.description ?? "")
    || left.navigation.resourceIdentityKey.localeCompare(right.navigation.resourceIdentityKey)
  );
  const partial = failed > 0 || incomplete > 0;
  return {
    title: `Go to Aurelia Resource${partial ? " — incomplete" : ""}`,
    placeholder: items.length === 0
      ? "No navigable supported resources were discovered"
      : "Search by resource, alias, bindable, kind, project, package, or source",
    items,
  };
}

function inventoryQuickPickItem(
  workspace: AureliaWorkspaceIdentity,
  fingerprint: string,
  project: ResourceProject,
  resource: ResourceInventoryItem,
  includeOwner: boolean,
): InventoryQuickPickItem {
  const kind = resourceKindPresentation(resource.kind);
  return {
    label: resource.name,
    description: `${kind.singular} · ${resourceOriginLabel(resource)}`,
    detail: resourceQuickPickDetail(resource, project, workspace, includeOwner),
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
): ResourceQuickPickModel<AvailabilityQuickPickItem> {
  if (response == null) {
    return {
      title: "Go to Resource Available to Active Template",
      placeholder: "Open an analyzed Aurelia template to see its available resources",
      items: [],
    };
  }
  const selection = response.projectSelection;
  if (selection.status === "absent") {
    return {
      title: "Go to Resource Available to Active Template",
      placeholder: "No analyzed Aurelia project owns this template cursor",
      items: [],
    };
  }
  if (selection.status === "ambiguous") {
    return {
      title: "Choose the Aurelia project for this template",
      placeholder: "This document belongs to more than one analyzed project",
      items: [...selection.candidates]
        .sort((left, right) => left.projectKey.localeCompare(right.projectKey) || left.rootUri.localeCompare(right.rootUri))
        .map((project) => ({
          label: project.projectKey,
          description: project.shapeKind,
          detail: project.rootUri,
          selectionKind: "project" as const,
          project,
        })),
    };
  }
  if (selection.answer.result !== "answered") {
    return {
      title: "Resources for the active template are unavailable",
      placeholder: selection.answer.summary,
      items: [],
    };
  }
  if (selection.answer.selection === "ambiguous") {
    return {
      title: "Choose the Aurelia template scope",
      placeholder: "The cursor belongs to more than one equally specific template scope",
      items: [...selection.templateCandidates]
        .sort((left, right) =>
          left.definitionName.localeCompare(right.definitionName)
          || left.scopeIdentityKey.localeCompare(right.scopeIdentityKey)
        )
        .map((template) => ({
          label: template.definitionName,
          description: template.compilationLane === "authoring" ? "authoring template" : "application template",
          detail: sourceLabel(template.source) ?? "Exact template source unavailable",
          selectionKind: "template" as const,
          template,
        })),
    };
  }
  if (selection.answer.selection !== "exact" || selection.selectedTemplate == null) {
    return {
      title: "Go to Resource Available to Active Template",
      placeholder: selection.answer.summary,
      items: [],
    };
  }

  const items: AvailabilityResourceQuickPickItem[] = selection.resources
    .filter((row) => row.resource.navigation.state === "available")
    .map((row): AvailabilityResourceQuickPickItem => ({
      label: row.resource.name,
      description: `${row.state === "open" ? "availability uncertain · " : ""}${resourceKindPresentation(row.resource.kind).singular} · ${resourceOriginLabel(row.resource)}`,
      detail: [
        sourceLabel(row.availabilitySource) == null ? null : `available through ${sourceLabel(row.availabilitySource)}`,
        resourceQuickPickDetail(row.resource, selection.project, response.workspace, false),
      ].filter((value): value is string => value != null && value.length > 0).join(" · "),
      selectionKind: "resource",
      row,
      navigation: {
        workspaceKey: response.workspace.key,
        fingerprint: response.fingerprint,
        projectKey: selection.project.projectKey,
        resourceIdentityKey: row.resource.identityKey,
        role: "resource",
      },
    }))
    .sort((left, right) =>
      (left.row.state === right.row.state ? 0 : left.row.state === "available" ? -1 : 1)
      || left.label.localeCompare(right.label)
      || left.row.resource.identityKey.localeCompare(right.row.resource.identityKey)
    );
  const incomplete = selection.answer.coverage !== "complete";
  return {
    title: `Resources available to ${selection.selectedTemplate.definitionName}${incomplete ? " — incomplete" : ""}`,
    placeholder: items.length === 0
      ? `No navigable supported resources are available to ${selection.selectedTemplate.definitionName}`
      : "Search resources available to this exact template scope",
    items,
  };
}

function exactAvailabilityRows(
  response: TemplateResourceAvailabilitySnapshot,
): readonly TemplateResourceAvailabilityItem[] {
  const selection = response.projectSelection;
  return selection.status === "exact"
    && selection.answer.result === "answered"
    && selection.answer.selection === "exact"
    ? selection.resources
    : [];
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
