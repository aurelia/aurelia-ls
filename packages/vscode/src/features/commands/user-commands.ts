/**
 * User-facing Aurelia commands — always available when the extension is active.
 *
 * These commands produce rewards for end-user developers:
 * - Diagnostics Report → Teaching + Revelation
 * - Inspect at Cursor → Revelation
 *
 */
import type { QuickPickItem, TextEditor } from "vscode";
import type { ClientFeature } from "../../core/feature.js";
import { DisposableStore } from "../../core/disposables.js";
import type { VscodeApi } from "../../vscode-api.js";
import type {
  DiagnosticsSnapshotItem,
  DiagnosticsSnapshotResponse,
  InspectEntityResponse,
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

function resourceGroup(resource: { readonly package?: string | null; readonly origin?: string | null }): string {
  if (resource.package != null) return "package";
  if (resource.origin === "framework" || resource.origin === "builtin" || resource.origin === "config") {
    return "framework";
  }
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
  const surfaceEntries = Object.entries(diagnostics.bySurface).sort(([a], [b]) => a.localeCompare(b));
  const lspDiags = diagnostics.bySurface["lsp"] ?? [];
  const totalCounts = countSeverities(lspDiags);

  const lines: string[] = ["# Aurelia Diagnostics Report", ""];

  lines.push(`**File:** \`${snapshot.uri}\``);
  lines.push(`**Analysis:** ${snapshot.answer.result}; selection=${snapshot.answer.selection}; coverage=${snapshot.answer.coverage}`);
  lines.push(`**Evidence:** ${diagnostics.raw.length} raw row${diagnostics.raw.length === 1 ? "" : "s"}; ${totalCounts.total} presented issue${totalCounts.total === 1 ? "" : "s"}`);
  lines.push("");

  if (totalCounts.total === 0) {
    lines.push(snapshot.answer.coverage === "complete"
      ? "No diagnostics. Analysis is clean for the declared semantic basis."
      : "No diagnostics were presented, but analysis coverage is not complete.");
    lines.push("");
  }

  if (totalCounts.total > 0) {
    const parts: string[] = [];
    if (totalCounts.error > 0) parts.push(`${totalCounts.error} error${totalCounts.error > 1 ? "s" : ""}`);
    if (totalCounts.warning > 0) parts.push(`${totalCounts.warning} warning${totalCounts.warning > 1 ? "s" : ""}`);
    if (totalCounts.info > 0) parts.push(`${totalCounts.info} info`);
    lines.push(`## Active (${parts.join(", ")})`, "");

    for (const diag of lspDiags) {
      const severity = diag.severity ?? "unknown";
      const icon = severity === "error" ? "x" : severity === "warning" ? "!" : "i";
      lines.push(`- \\[${icon}\\] **${diag.code}**: ${diag.message}`);
      if (diag.category) lines.push(`  - Category: ${diag.category}`);
      if (diag.actionability && diag.actionability !== "none") lines.push(`  - Fix: ${diag.actionability}`);
    }
    lines.push("");
  }

  for (const [surface, items] of surfaceEntries) {
    if (surface === "lsp" || items.length === 0) continue;
    lines.push(`## Surface: ${surface} (${items.length})`, "");
    for (const diag of items) {
      lines.push(`- **${diag.code}**: ${diag.message}`);
    }
    lines.push("");
  }

  lines.push(`## Raw Evidence (${diagnostics.raw.length})`, "");
  if (diagnostics.raw.length === 0) {
    lines.push("No raw diagnostic rows.");
  } else {
    for (const diagnostic of diagnostics.raw) {
      const status = diagnostic.status == null ? "" : ` [${diagnostic.status}]`;
      lines.push(`- **${diagnostic.code}**${status}: ${diagnostic.message}`);
    }
  }

  return lines.join("\n");
}

function formatInspectEntityReport(
  entity: NonNullable<InspectEntityResponse>,
  position: { line: number; character: number },
): string {
  const lines: string[] = ["# Aurelia Inspect", ""];
  lines.push(`**Position:** line ${position.line + 1}, character ${position.character + 1}`);
  lines.push(`**Entity:** \`${entity.entityKind}\``);
  if (entity.expressionLabel) lines.push(`**Expression:** \`${entity.expressionLabel}\``);
  lines.push("");
  lines.push("## Confidence", "");
  lines.push("| Signal | Level |");
  lines.push("|--------|-------|");
  lines.push(`| Resource | ${entity.confidence.resource} |`);
  lines.push(`| Type | ${entity.confidence.type} |`);
  lines.push(`| Scope | ${entity.confidence.scope} |`);
  lines.push(`| Expression | ${entity.confidence.expression} |`);
  lines.push(`| Overall | ${entity.confidence.composite} |`);

  const detailEntries = Object.entries(entity.detail).filter(([key]) => key !== "kind");
  if (detailEntries.length > 0) {
    lines.push("", "## Detail", "");
    for (const [key, value] of detailEntries) {
      lines.push(`- **${key}:** ${formatDetailValue(value)}`);
    }
  }

  return lines.join("\n");
}

function formatDetailValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return `\`${JSON.stringify(value)}\``;
  } catch {
    return String(value);
  }
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
      vscode.commands.registerCommand("aurelia.diagnosticsReport", () => {
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

    // "Aurelia: Inspect at Cursor" — open source-linked runtime facts.
    store.add(
      vscode.commands.registerCommand("aurelia.inspectAtCursor", () => {
        return run("inspectAtCursor", async () => {
          const editor = activeEditor(vscode);
          if (!editor) {
            vscode.window.showInformationMessage("No active editor");
            return;
          }
          const uri = editor.document.uri.toString();
          const position = editor.selection.active;

          const entity = await lsp.inspectEntity(uri, position);

          if (entity) {
            const doc = await vscode.workspace.openTextDocument({
              language: "markdown",
              content: formatInspectEntityReport(entity, position),
            });
            await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
            return;
          }

          vscode.window.showInformationMessage("No Aurelia semantic fact at this position");
        });
      }),
    );

    // "Aurelia: Find Resource" — quick-pick search across all known resources
    store.add(
      vscode.commands.registerCommand("aurelia.findResource", () => {
        return run("findResource", async () => {
          const response = await lsp.getResources();
          if (!response || response.resources.length === 0) {
            vscode.window.showInformationMessage("No resources available");
            return;
          }

          type ResourceQuickPickItem = QuickPickItem & { resourceFile?: string };

          const items: ResourceQuickPickItem[] = response.resources.map((r) => {
            const kindLabel = RESOURCE_KIND_LABELS[r.kind] ?? r.kind;
            const originIcon = RESOURCE_GROUP_ICONS[resourceGroup(r)] ?? "";
            const detailParts: string[] = [];
            if (r.definition?.targetName != null && r.definition.targetName !== r.name) {
              detailParts.push(r.definition.targetName);
            }
            if (r.definition != null && r.definition.declarationModes.length > 0) {
              detailParts.push(r.definition.declarationModes.join(", "));
            }
            if (r.package != null) detailParts.push(r.package);
            if (r.bindables.length > 0) {
              detailParts.push(`${r.bindables.length} bindable${r.bindables.length === 1 ? "" : "s"}`);
            }

            return {
              label: `${originIcon} ${r.name}`,
              description: kindLabel,
              detail: detailParts.join(" · "),
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
      vscode.commands.registerCommand("aurelia.showAvailableResources", () => {
        return run("showAvailableResources", async () => {
          const editor = activeEditor(vscode);
          if (!editor) {
            vscode.window.showInformationMessage("No active editor");
            return;
          }
          const uri = editor.document.uri.toString();

          const response = await lsp.getScopeResources(uri);
          if (!response || response.resources.length === 0) {
            vscode.window.showInformationMessage("No Aurelia resources available in this scope");
            return;
          }

          type ScopeQuickPickItem = QuickPickItem & { resourceFile?: string };

          const items: ScopeQuickPickItem[] = response.resources.map((r) => {
            const kindLabel = RESOURCE_KIND_LABELS[r.kind] ?? r.kind;
            const originIcon = RESOURCE_GROUP_ICONS[resourceGroup(r)] ?? "";
            const scopeTag = r.scope === "local" ? "$(lock) local" : "";
            const detailParts: string[] = [];
            if (r.className) detailParts.push(r.className);
            if (r.package) detailParts.push(r.package);
            if (r.bindableCount > 0) detailParts.push(`${r.bindableCount} bindable${r.bindableCount === 1 ? "" : "s"}`);
            if (scopeTag) detailParts.push(scopeTag);

            return {
              label: `${originIcon} ${r.name}`,
              description: kindLabel,
              detail: detailParts.join(" · "),
              resourceFile: r.file,
            };
          });

          const title = response.scopeLabel
            ? `Resources in scope: ${response.scopeLabel}`
            : "Available resources";

          const picked = await vscode.window.showQuickPick(items, {
            placeHolder: `${response.resources.length} resources available in this template`,
            title,
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
      vscode.commands.registerCommand("aurelia.openRelatedFile", () => {
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
