/**
 * User-facing Aurelia commands — always available when the extension is active.
 *
 * These commands produce rewards for end-user developers:
 * - Diagnostics Report → Teaching + Revelation
 * - Show Suppressed Diagnostics → Teaching + Earned Reassurance
 * - Inspect at Cursor → Revelation
 *
 * Debug/framework-developer commands remain in debug-commands.ts behind
 * the features.debugCommands gate.
 */
import type { TextEditor } from "vscode";
import type { FeatureModule } from "../../core/feature-graph.js";
import type { QueryClient } from "../../core/query-client.js";
import type { ObservabilityService } from "../../core/observability.js";
import { QueryPolicies } from "../../core/query-policy.js";
import { DisposableStore } from "../../core/disposables.js";
import type { VscodeApi } from "../../vscode-api.js";
import type {
  DiagnosticsSnapshotItem,
  DiagnosticsSnapshotResponse,
} from "../../types.js";

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

function formatDiagnosticsReport(snapshot: DiagnosticsSnapshotResponse, fallbackUri: string): string {
  const uri = snapshot.uri ?? fallbackUri;
  const diagnostics = snapshot.diagnostics ?? { bySurface: {}, suppressed: [] };
  const surfaceEntries = Object.entries(diagnostics.bySurface ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const suppressed = diagnostics.suppressed ?? [];
  const lspDiags = diagnostics.bySurface?.["lsp"] ?? [];
  const totalCounts = countSeverities(lspDiags);

  const lines: string[] = ["# Aurelia Diagnostics Report", ""];

  // Summary section
  lines.push(`**File:** \`${uri}\``);
  if (snapshot.fingerprint) lines.push(`**Analysis:** ${snapshot.fingerprint}`);
  lines.push("");

  if (totalCounts.total === 0 && suppressed.length === 0) {
    lines.push("No diagnostics. Analysis is clean.");
    return lines.join("\n");
  }

  // Active diagnostics
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

  // Suppressed diagnostics
  if (suppressed.length > 0) {
    lines.push(`## Suppressed (${suppressed.length})`, "");
    lines.push("These diagnostics were suppressed because analysis confidence is too low to assert them reliably.", "");
    for (const diag of suppressed) {
      lines.push(`- **${diag.code}**: ${diag.message}`);
      if (diag.suppressionReason) lines.push(`  - Reason: ${diag.suppressionReason}`);
    }
    lines.push("");
  }

  // Other surfaces (for framework developers — show if non-empty)
  for (const [surface, items] of surfaceEntries) {
    if (surface === "lsp" || items.length === 0) continue;
    lines.push(`## Surface: ${surface} (${items.length})`, "");
    for (const diag of items) {
      lines.push(`- **${diag.code}**: ${diag.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export const UserCommandsFeature: FeatureModule = {
  id: "commands.user",
  isEnabled: (ctx) => ctx.config.current.features.commands,
  activate: (ctx) => {
    const store = new DisposableStore();
    const queries = ctx.queries;
    const vscode = ctx.vscode;
    const logger = ctx.observability.logger.child("commands");
    const errors = ctx.observability.errors;
    const trace = ctx.observability.trace;

    const run = <T>(id: string, fn: () => Promise<T>) =>
      errors.capture(`command.${id}`, () => trace.spanAsync(`command.${id}`, fn), { context: { command: id } });

    // "Aurelia: Diagnostics Report" — the human-readable diagnostics view
    store.add(
      vscode.commands.registerCommand("aurelia.diagnosticsReport", () => {
        void run("diagnosticsReport", async () => {
          const editor = activeEditor(vscode);
          if (!editor) {
            vscode.window.showInformationMessage("No active editor");
            return;
          }
          const uri = editor.document.uri.toString();
          const snapshot = await queries.getDiagnostics(uri, QueryPolicies.diagnostics);
          if (!snapshot) {
            vscode.window.showInformationMessage("No diagnostics available for this document");
            return;
          }
          const doc = await vscode.workspace.openTextDocument({
            language: "markdown",
            content: formatDiagnosticsReport(snapshot, uri),
          });
          await vscode.window.showTextDocument(doc, { preview: true });
        });
      }),
    );

    // "Aurelia: Show Suppressed Diagnostics"
    store.add(
      vscode.commands.registerCommand("aurelia.showSuppressedDiagnostics", () => {
        void run("showSuppressedDiagnostics", async () => {
          const editor = activeEditor(vscode);
          if (!editor) {
            vscode.window.showInformationMessage("No active editor");
            return;
          }
          const uri = editor.document.uri.toString();
          const snapshot = await queries.getDiagnostics(uri, QueryPolicies.diagnostics);
          if (!snapshot) {
            vscode.window.showInformationMessage("No diagnostics available for this document");
            return;
          }
          const suppressed = snapshot.diagnostics?.suppressed ?? [];
          if (suppressed.length === 0) {
            vscode.window.showInformationMessage("No suppressed diagnostics for this document");
            return;
          }
          const lines = suppressed.map((d) => {
            const reason = d.suppressionReason ? ` — ${d.suppressionReason}` : "";
            return `- **${d.code}**: ${d.message}${reason}`;
          });
          const doc = await vscode.workspace.openTextDocument({
            language: "markdown",
            content: [
              "# Suppressed Diagnostics",
              "",
              `${suppressed.length} diagnostic(s) suppressed by confidence-based demotion.`,
              "These would fire at full severity if analysis confidence were higher.",
              "",
              ...lines,
            ].join("\n"),
          });
          await vscode.window.showTextDocument(doc, { preview: true });
        });
      }),
    );

    // "Aurelia: Inspect at Cursor" — show entity resolution as notification
    store.add(
      vscode.commands.registerCommand("aurelia.inspectAtCursor", () => {
        void run("inspectAtCursor", async () => {
          const editor = activeEditor(vscode);
          if (!editor) {
            vscode.window.showInformationMessage("No active editor");
            return;
          }
          const uri = editor.document.uri.toString();
          const position = editor.selection.active;

          const entity = await ctx.lsp.inspectEntity(uri, position);

          if (entity) {
            const parts: string[] = [`${entity.entityKind}`];
            if (entity.detail.name) parts[0] += `: ${entity.detail.name}`;
            parts.push(`confidence: ${entity.confidence.composite}`);
            if (entity.expressionLabel) parts.push(`expr: ${entity.expressionLabel}`);
            if (entity.detail.resourceKind) parts.push(`resource: ${entity.detail.resourceKind}`);
            if (entity.detail.className) parts.push(`class: ${entity.detail.className}`);

            const message = parts.join(" | ");
            const action = await vscode.window.showInformationMessage(message, "Show Details");
            if (action === "Show Details") {
              const lines: string[] = ["# Aurelia: Inspect at Cursor", ""];
              lines.push(`**Position:** line ${position.line + 1}, character ${position.character + 1}`);
              lines.push(`**Entity:** \`${entity.entityKind}\``);
              lines.push(`**Confidence:** ${entity.confidence.composite}`);
              lines.push("");
              lines.push("| Signal | Level |");
              lines.push("|--------|-------|");
              lines.push(`| Resource | ${entity.confidence.resource} |`);
              lines.push(`| Type | ${entity.confidence.type} |`);
              lines.push(`| Scope | ${entity.confidence.scope} |`);
              lines.push(`| Expression | ${entity.confidence.expression} |`);
              lines.push("");
              if (entity.expressionLabel) lines.push(`**Expression:** \`${entity.expressionLabel}\``);
              const detailEntries = Object.entries(entity.detail).filter(([k]) => k !== "kind");
              if (detailEntries.length > 0) {
                lines.push("", "## Detail", "");
                for (const [key, value] of detailEntries) {
                  lines.push(`- **${key}:** ${value ?? "\u2014"}`);
                }
              }
              logger.write("info", lines.join("\n"), undefined, { raw: true, force: true });
              vscode.commands.executeCommand("aurelia.observability.openOutput");
            }
            return;
          }

          // Fallback to legacy queryAtPosition
          const result = await queries.queryAtPosition(uri, position, {
            ...QueryPolicies.queryAtPosition,
            docVersion: editor.document.version,
          });
          if (!result) {
            vscode.window.showInformationMessage("No Aurelia analysis available at this position");
            return;
          }

          const parts: string[] = [];
          if (result.node?.kind) parts.push(`node: ${result.node.kind}`);
          if (result.controller?.kind) parts.push(`controller: ${result.controller.kind}`);
          if (result.expr?.exprId) parts.push(`expr: ${result.expr.exprId}`);
          if (result.bindables && Array.isArray(result.bindables)) parts.push(`${result.bindables.length} bindables`);
          vscode.window.showInformationMessage(parts.length > 0 ? parts.join(" | ") : "No Aurelia entity at this position");
        });
      }),
    );

    // "Aurelia: Find Resource" — quick-pick search across all known resources
    store.add(
      vscode.commands.registerCommand("aurelia.findResource", () => {
        void run("findResource", async () => {
          const response = await ctx.lsp.getResources();
          if (!response || response.resources.length === 0) {
            vscode.window.showInformationMessage("No resources available");
            return;
          }

          const KIND_LABELS: Record<string, string> = {
            "custom-element": "element",
            "custom-attribute": "attribute",
            "template-controller": "controller",
            "value-converter": "converter",
            "binding-behavior": "behavior",
          };

          const ORIGIN_ICONS: Record<string, string> = {
            project: "$(home)",
            package: "$(package)",
            framework: "$(library)",
          };

          type ResourceQuickPickItem = import("vscode").QuickPickItem & { resourceFile?: string };

          const items: ResourceQuickPickItem[] = response.resources.map((r) => {
            const kindLabel = KIND_LABELS[r.kind] ?? r.kind;
            const originIcon = ORIGIN_ICONS[r.origin] ?? "";
            const detailParts: string[] = [];
            if (r.className && r.className !== r.name) detailParts.push(r.className);
            if (r.declarationForm) detailParts.push(r.declarationForm);
            if (r.package) detailParts.push(r.package);
            if (r.bindableCount > 0) detailParts.push(`${r.bindableCount} bindable${r.bindableCount === 1 ? "" : "s"}`);
            if (r.gapCount > 0) detailParts.push(`${r.gapCount} gap${r.gapCount === 1 ? "" : "s"}`);

            return {
              label: `${originIcon} ${r.name}`,
              description: kindLabel,
              detail: detailParts.join(" · "),
              resourceFile: r.file,
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
        void run("showAvailableResources", async () => {
          const editor = activeEditor(vscode);
          if (!editor) {
            vscode.window.showInformationMessage("No active editor");
            return;
          }
          const uri = editor.document.uri.toString();

          const response = await ctx.lsp.getScopeResources(uri);
          if (!response || response.resources.length === 0) {
            vscode.window.showInformationMessage("No Aurelia resources available in this scope");
            return;
          }

          const KIND_LABELS: Record<string, string> = {
            "custom-element": "element",
            "custom-attribute": "attribute",
            "template-controller": "controller",
            "value-converter": "converter",
            "binding-behavior": "behavior",
          };

          const ORIGIN_ICONS: Record<string, string> = {
            project: "$(home)",
            package: "$(package)",
            framework: "$(library)",
          };

          type ScopeQuickPickItem = import("vscode").QuickPickItem & { resourceFile?: string };

          const items: ScopeQuickPickItem[] = response.resources.map((r) => {
            const kindLabel = KIND_LABELS[r.kind] ?? r.kind;
            const originIcon = ORIGIN_ICONS[r.origin] ?? "";
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
        void run("openRelatedFile", async () => {
          const editor = activeEditor(vscode);
          if (!editor) {
            vscode.window.showInformationMessage("No active editor");
            return;
          }
          const uri = editor.document.uri.toString();
          const related = await ctx.lsp.getRelatedFile(uri);
          if (!related) {
            vscode.window.showInformationMessage("No related Aurelia file found");
            return;
          }

          const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(related.uri));
          await vscode.window.showTextDocument(doc);
        });
      }),
    );

    return store;
  },
};
