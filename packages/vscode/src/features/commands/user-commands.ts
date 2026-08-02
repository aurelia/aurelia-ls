/** User-facing Aurelia commands registered while at least one semantic workspace is owned. */
import type { QuickPickItem, TextEditor } from "vscode";
import type { ClientFeature } from "../../core/feature.js";
import { DisposableStore } from "../../core/disposables.js";
import { AureliaCommand } from "../../product-contract.js";
import type { VscodeApi } from "../../vscode-api.js";
import type {
  DiagnosticsSnapshotItem,
  DiagnosticsSnapshotResponse,
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
  "name" | "kind" | "aliases" | "bindables" | "definition" | "visibility" | "file" | "package" | "origin"
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

type SeverityCounts = { total: number; error: number; warning: number; info: number; unknown: number };

function countSeverities(items: readonly DiagnosticsSnapshotItem[]): SeverityCounts {
  return items.reduce(
    (acc, diag) => {
      acc.total += 1;
      if (diag.severity === "error" || diag.severity === "warning" || diag.severity === "info") {
        acc[diag.severity] += 1;
      } else {
        acc.unknown += 1;
      }
      return acc;
    },
    { total: 0, error: 0, warning: 0, info: 0, unknown: 0 },
  );
}

function formatDiagnosticsReport(snapshot: DiagnosticsSnapshotResponse): string {
  const diagnostics = snapshot.diagnostics;
  const lspDiags = diagnostics.bySurface["lsp"] ?? [];
  const totalCounts = countSeverities(lspDiags);

  const lines: string[] = ["# Aurelia Diagnostics Report", ""];

  lines.push(`**File:** \`${snapshot.uri}\``);
  lines.push(`**Analysis:** ${snapshot.answer.summary}`);
  lines.push(`**State:** result=${snapshot.answer.result}; selection=${snapshot.answer.selection}; coverage=${snapshot.answer.coverage}`);
  if (snapshot.answer.analysisDepth != null) {
    lines.push(`**Depth:** ${snapshot.answer.analysisDepth}`);
  }
  lines.push(`**Evidence:** ${diagnostics.raw.length} raw row${diagnostics.raw.length === 1 ? "" : "s"}; ${totalCounts.total} presented issue${totalCounts.total === 1 ? "" : "s"}`);
  lines.push("");

  if (totalCounts.total === 0) {
    lines.push(snapshot.answer.coverage === "complete"
      ? "No diagnostics. Analysis is clean for the declared semantic basis."
      : "No diagnostics were presented, but analysis coverage is not complete.");
    lines.push("");
  }

  const presentation = diagnostics.presentation;
  if (presentation != null) {
    lines.push(`## Presented Diagnostics (${presentation.primaryCount})`, "");
    lines.push(
      presentation.complete
        ? `${presentation.rawRowCount} raw rows were grouped into ${presentation.primaryCount} primary diagnostics and ${presentation.contextualCount} contextual rows.`
        : "Diagnostic grouping is incomplete for the current semantic basis.",
      "",
    );
    for (const group of presentation.groups) {
      const primary = group.primary.diagnostic;
      if (primary == null) {
        lines.push(`### Unmapped presentation row`, "", `Group: \`${group.groupKey}\``, "");
        continue;
      }
      appendDiagnostic(lines, primary, "###");
      if (group.subject != null) {
        const subjectName = group.subject.subjectName == null ? "" : ` ${group.subject.subjectName}`;
        lines.push(`Subject: ${group.subject.subjectKind}${subjectName}${formatLocation(group.subject)}`);
      }
      if (group.related.length > 0) {
        lines.push("", "Context:");
        for (const related of group.related) {
          if (related.diagnostic == null) continue;
          lines.push(`- ${related.relation ?? "related"}: **${related.diagnostic.code}** - ${related.diagnostic.message}${formatLocation(related.diagnostic)}`);
        }
      }
      lines.push("");
    }
  } else if (totalCounts.total > 0) {
    const parts: string[] = [];
    if (totalCounts.error > 0) parts.push(`${totalCounts.error} error${totalCounts.error > 1 ? "s" : ""}`);
    if (totalCounts.warning > 0) parts.push(`${totalCounts.warning} warning${totalCounts.warning > 1 ? "s" : ""}`);
    if (totalCounts.info > 0) parts.push(`${totalCounts.info} info`);
    lines.push(`## Presented Diagnostics (${parts.join(", ")})`, "");

    for (const diag of lspDiags) {
      appendDiagnostic(lines, diag, "###");
      lines.push("");
    }
  }

  lines.push(`## Raw Evidence (${diagnostics.raw.length})`, "");
  if (diagnostics.raw.length === 0) {
    lines.push("No raw diagnostic rows.");
  } else {
    for (const diagnostic of diagnostics.raw) {
      const status = diagnostic.status == null ? "" : ` [${diagnostic.status}]`;
      lines.push(`### ${diagnostic.code}${status}`, "", diagnostic.message);
      appendDiagnosticFacts(lines, diagnostic);
      lines.push("");
    }
  }

  const continuations = snapshot.answer.continuations ?? [];
  if (continuations.length > 0) {
    lines.push(`## Follow-up Analysis (${continuations.length})`, "");
    for (const continuation of continuations) {
      const target = continuation.targetQueryKind ?? continuation.targetAppBuilderQueryKind ?? continuation.kind;
      lines.push(`- **${target}:** ${continuation.rationale}`);
      if (continuation.cost != null) lines.push(`  - Cost: ${continuation.cost}`);
      for (const blocker of continuation.blockers) lines.push(`  - Blocked: ${blocker}`);
    }
  }

  return lines.join("\n");
}

function appendDiagnostic(lines: string[], diagnostic: DiagnosticsSnapshotItem, heading: string): void {
  lines.push(`${heading} ${diagnostic.code}`, "", diagnostic.message);
  appendDiagnosticFacts(lines, diagnostic);
}

function appendDiagnosticFacts(lines: string[], diagnostic: DiagnosticsSnapshotItem): void {
  const facts = [
    diagnostic.severity == null ? null : `Severity: ${diagnostic.severity}`,
    diagnostic.category == null ? null : `Category: ${diagnostic.category}`,
    diagnostic.actionability == null || diagnostic.actionability === "none"
      ? null
      : `Actionability: ${diagnostic.actionability}`,
    diagnostic.stage == null ? null : `Stage: ${diagnostic.stage}`,
  ].filter((fact): fact is string => fact != null);
  if (facts.length > 0) lines.push("", facts.join(" | "));
  const location = formatLocation(diagnostic);
  if (location !== "") lines.push(`Source${location}`);
  for (const related of diagnostic.related ?? []) {
    lines.push(`- Related: ${related.message}${formatLocation(related)}`);
  }
  for (const issue of diagnostic.issues ?? []) {
    const field = issue.field == null ? "" : ` (${issue.field})`;
    lines.push(`- Evidence: ${issue.kind}${field} - ${issue.message}`);
  }
  if (diagnostic.data != null && Object.keys(diagnostic.data).length > 0) {
    lines.push("", "```json", JSON.stringify(diagnostic.data, null, 2), "```");
  }
}

function formatLocation(value: { readonly uri?: string; readonly span?: { readonly start: number; readonly end: number } }): string {
  if (value.uri == null && value.span == null) return "";
  const uri = value.uri ?? "current document";
  const span = value.span == null ? "" : `@${value.span.start}..${value.span.end}`;
  return `: \`${uri}${span}\``;
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
  activate: (ctx) => {
    const store = new DisposableStore();
    const lsp = ctx.lsp;
    const vscode = ctx.vscode;
    const errors = ctx.errors;

    const run = <T>(id: string, fn: () => Promise<T>) =>
      errors.capture(`command.${id}`, fn, { context: { command: id } });

    // "Aurelia: Diagnostics Report" — the human-readable diagnostics view
    store.add(
      vscode.commands.registerCommand(AureliaCommand.DiagnosticsReport, () => {
        return run("diagnosticsReport", async () => {
          const editor = activeEditor(vscode);
          if (!editor) {
            vscode.window.showInformationMessage("No active editor");
            return;
          }
          const uri = editor.document.uri.toString();
          const snapshot = await lsp.getDiagnostics(uri);
          if (!snapshot) {
            vscode.window.showInformationMessage("No diagnostics available for this document");
            return;
          }
          const report = formatDiagnosticsReport(snapshot);
          const doc = await vscode.workspace.openTextDocument({
            language: "markdown",
            content: report,
          });
          await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
        });
      }),
    );

    // "Aurelia: Find Resource" — quick-pick search across all known resources
    store.add(
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

          type ResourceQuickPickItem = QuickPickItem & { resourceFile?: string };

          const items: ResourceQuickPickItem[] = response.resources.map((r) => {
            const kindLabel = RESOURCE_KIND_LABELS[r.kind] ?? r.kind;
            const originIcon = RESOURCE_GROUP_ICONS[resourceGroup(r)] ?? "";
            return {
              label: `${originIcon} ${r.name}`,
              description: kindLabel,
              detail: resourceDetail(r, showWorkspace ? r.workspace.name : undefined),
              resourceFile: r.file ?? undefined,
            };
          });

          const picked = await vscode.window.showQuickPick(items, {
            placeHolder: "Search Aurelia resources by name, kind, or package...",
            matchOnDescription: true,
            matchOnDetail: true,
          });

          if (picked?.resourceFile) {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(picked.resourceFile));
            await vscode.window.showTextDocument(doc);
          }
        });
      }),
    );

    // "Aurelia: Show Available Resources" — what's visible in the current template's scope
    store.add(
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

          type ScopeQuickPickItem = QuickPickItem & { resourceFile?: string };

          const items: ScopeQuickPickItem[] = response.resources.map((r) => {
            const kindLabel = RESOURCE_KIND_LABELS[r.kind] ?? r.kind;
            const originIcon = RESOURCE_GROUP_ICONS[resourceGroup(r)] ?? "";
            return {
              label: `${originIcon} ${r.name}`,
              description: kindLabel,
              detail: resourceDetail(r),
              resourceFile: r.file ?? undefined,
            };
          });

          const picked = await vscode.window.showQuickPick(items, {
            placeHolder: `${response.resources.length} resources available in this template`,
            title: `Resources in scope: ${response.scopeLabel}`,
            matchOnDescription: true,
            matchOnDetail: true,
          });

          if (picked?.resourceFile) {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(picked.resourceFile));
            await vscode.window.showTextDocument(doc);
          }
        });
      }),
    );

    // "Aurelia: Open Related File" — toggle between component class and template
    store.add(
      vscode.commands.registerCommand(AureliaCommand.OpenRelatedFile, () => {
        return run("openRelatedFile", async () => {
          const editor = activeEditor(vscode);
          if (!editor) {
            vscode.window.showInformationMessage("No active editor");
            return;
          }
          const uri = editor.document.uri.toString();
          const related = await lsp.getRelatedFile(uri);
          if (!related) {
            vscode.window.showInformationMessage("No related Aurelia file found");
            return;
          }

          const targetUri = related.uri.startsWith("file://")
            ? vscode.Uri.parse(related.uri)
            : vscode.Uri.file(related.uri);
          const doc = await vscode.workspace.openTextDocument(targetUri);
          await vscode.window.showTextDocument(doc);
        });
      }),
    );

    return store;
  },
};
