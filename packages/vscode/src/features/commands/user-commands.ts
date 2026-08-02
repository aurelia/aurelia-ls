/** Extension-lifetime commands that resolve active workspace ownership when invoked. */
import type { QuickPickItem, TextEditor } from "vscode";
import type { ClientFeature } from "../../core/feature.js";
import { AureliaCommand } from "../../product-contract.js";
import type { VscodeApi } from "../../vscode-api.js";
import type {
  RelatedFileCandidate,
  ResourceExplorerItem,
} from "../../types.js";

const RESOURCE_KIND_LABELS: Readonly<Record<string, string>> = {
  "custom-element": "element",
  "custom-attribute": "attribute",
  "template-controller": "template controller",
  "value-converter": "value converter",
  "binding-behavior": "binding behavior",
  "binding-command": "binding command",
  "attribute-pattern": "attribute pattern",
};

const RESOURCE_GROUP_ICONS: Readonly<Record<string, string>> = {
  project: "$(home)",
  package: "$(package)",
  framework: "$(library)",
  external: "$(question)",
};

type CommandResource = Pick<
  ResourceExplorerItem,
  "name" | "kind" | "aliases" | "bindables" | "definition" | "visibility" | "uri" | "package" | "origin"
> & {
  readonly workspace?: ResourceExplorerItem["workspace"];
};

function resourceGroup(resource: CommandResource): string {
  if (resource.package != null) return "package";
  if (resource.origin === "framework") return "framework";
  if (resource.origin === "external" || resource.origin === "unknown") return "external";
  return "project";
}

function activeEditor(vscode: VscodeApi): TextEditor | null {
  return vscode.window.activeTextEditor ?? null;
}

function resourceDetail(resource: CommandResource, workspaceName?: string): string {
  const parts: string[] = [];
  const targetName = resource.definition?.targetName;
  if (targetName != null && targetName !== resource.name) parts.push(targetName);
  if (resource.definition != null && resource.definition.declarationModes.length > 0) {
    parts.push(resource.definition.declarationModes.join(", "));
  }
  if (resource.aliases.length > 0) {
    parts.push(`${resource.aliases.length} alias${resource.aliases.length === 1 ? "" : "es"}`);
  }
  if (resource.bindables.length > 0) {
    parts.push(`${resource.bindables.length} bindable${resource.bindables.length === 1 ? "" : "s"}`);
  }
  const compilerWorlds = new Set(resource.visibility.map((row) => row.compilerWorld)).size;
  if (compilerWorlds > 0) parts.push(`${compilerWorlds} compiler world${compilerWorlds === 1 ? "" : "s"}`);
  if (resource.package != null) parts.push(resource.package);
  if (workspaceName != null) parts.push(workspaceName);
  return parts.join(" · ");
}

export const UserCommandsFeature: ClientFeature = {
  id: "commands.user",
  activate: (ctx, own) => {
    const lsp = ctx.lsp;
    const vscode = ctx.vscode;
    const errors = ctx.errors;

    const run = <T>(id: string, fn: () => Promise<T>) =>
      errors.capture(`command.${id}`, fn, { context: { command: id } });

    // "Aurelia: Find Resource" — quick-pick search across all known resources
    own(
      vscode.commands.registerCommand(AureliaCommand.FindResource, () => {
        return run("findResource", async () => {
          const response = await lsp.getResources();
          if (response == null) {
            vscode.window.showInformationMessage("No resources available");
            return;
          }
          const failedWorkspaces = response.workspaces.filter((workspace) => workspace.status === "error");
          if (response.resources.length === 0 && failedWorkspaces.length > 0) {
            throw new Error(`Resource analysis failed for ${failedWorkspaces.map((workspace) => workspace.name).join(", ")}.`);
          }
          if (response.resources.length === 0) {
            vscode.window.showInformationMessage("No resources available");
            return;
          }
          if (failedWorkspaces.length > 0) {
            vscode.window.showInformationMessage(
              `Resource results exclude ${failedWorkspaces.map((workspace) => workspace.name).join(", ")} because analysis failed.`,
            );
          }
          const showWorkspace = response.workspaces.length > 1;

          type ResourceQuickPickItem = QuickPickItem & { resourceUri?: string };

          const items: ResourceQuickPickItem[] = response.resources.map((r) => {
            const kindLabel = RESOURCE_KIND_LABELS[r.kind] ?? r.kind;
            const originIcon = RESOURCE_GROUP_ICONS[resourceGroup(r)] ?? "";
            return {
              label: `${originIcon} ${r.name}`,
              description: kindLabel,
              detail: resourceDetail(r, showWorkspace ? r.workspace.name : undefined),
              resourceUri: r.uri ?? undefined,
            };
          });

          const picked = await vscode.window.showQuickPick(items, {
            placeHolder: "Search Aurelia resources by name, kind, or package...",
            matchOnDescription: true,
            matchOnDetail: true,
          });

          if (picked?.resourceUri) {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(picked.resourceUri));
            await vscode.window.showTextDocument(doc);
          }
        });
      }),
    );

    // "Aurelia: Show Available Resources" — what's visible in the current template's scope
    own(
      vscode.commands.registerCommand(AureliaCommand.ShowAvailableResources, () => {
        return run("showAvailableResources", async () => {
          const editor = activeEditor(vscode);
          if (!editor) {
            vscode.window.showInformationMessage("No active editor");
            return;
          }
          const uri = editor.document.uri.toString();

          const response = await lsp.getScopeResources(uri);
          if (response == null || response.resources.length === 0) {
            vscode.window.showInformationMessage("No Aurelia resources available in this scope");
            return;
          }
          const incomplete = Object.values(response.evidence).some((answer) =>
            answer.result !== "answered" || answer.coverage !== "complete"
          );
          if (incomplete) {
            vscode.window.showInformationMessage("Available resource results are incomplete for this template.");
          }

          type ScopeQuickPickItem = QuickPickItem & { resourceUri?: string };

          const items: ScopeQuickPickItem[] = response.resources.map((r) => {
            const kindLabel = RESOURCE_KIND_LABELS[r.kind] ?? r.kind;
            const originIcon = RESOURCE_GROUP_ICONS[resourceGroup(r)] ?? "";
            return {
              label: `${originIcon} ${r.name}`,
              description: kindLabel,
              detail: resourceDetail(r),
              resourceUri: r.uri ?? undefined,
            };
          });

          const picked = await vscode.window.showQuickPick(items, {
            placeHolder: `${response.resources.length} resources available in this template`,
            title: `Resources in scope: ${response.scopeLabel}`,
            matchOnDescription: true,
            matchOnDetail: true,
          });

          if (picked?.resourceUri) {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(picked.resourceUri));
            await vscode.window.showTextDocument(doc);
          }
        });
      }),
    );

    // "Aurelia: Open Related File" — toggle between component class and template
    own(
      vscode.commands.registerCommand(AureliaCommand.OpenRelatedFile, () => {
        return run("openRelatedFile", async () => {
          const editor = activeEditor(vscode);
          if (!editor) {
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
        });
      }),
    );
  },
};

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
