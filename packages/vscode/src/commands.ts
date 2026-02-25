import type { ExtensionContext, TextEditor } from "vscode";
import type { ObservabilityService } from "./core/observability.js";
import type { QueryClient } from "./core/query-client.js";
import { QueryPolicies } from "./core/query-policy.js";
import { type VirtualDocProvider } from "./virtual-docs.js";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";
import type {
  DiagnosticsSnapshotItem,
  DiagnosticsSnapshotResponse,
  MappingEntry,
  OverlayBuildArtifactShape,
  OverlayResponse,
} from "./types.js";

function activeEditor(vscode: VscodeApi): TextEditor | null {
  return vscode.window.activeTextEditor ?? null;
}

function extractOverlayArtifact(response: OverlayResponse | null | undefined): OverlayBuildArtifactShape | null {
  if (!response) return null;
  const artifact = response.artifact ?? response.overlay ?? null;
  if (!artifact?.overlay?.path || typeof artifact.overlay.text !== "string") return null;
  return artifact;
}

function spanLabel(span: MappingEntry["overlaySpan"]  ): string {
  if (!span) return "[-,-)";
  return `[${span.start},${span.end})`;
}

function formatMappingEntries(entries: readonly MappingEntry[]): string {
  return entries
    .map((entry, i) => `${i + 1}. expr=${entry.exprId ?? "<unknown>"} overlay=${spanLabel(entry.overlaySpan)} html=${spanLabel(entry.htmlSpan)}`)
    .join("\n");
}

function formatCalls(calls: NonNullable<OverlayBuildArtifactShape["calls"]>): string {
  return calls
    .map((call, i) => `${i + 1}. expr=${call.exprId} overlay=[${call.overlayStart},${call.overlayEnd}) html=${spanLabel(call.htmlSpan)}`)
    .join("\n");
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

function formatDiagSpan(span: DiagnosticsSnapshotItem["span"]): string {
  if (!span) return "[-,-)";
  const file = span.file ? `${span.file} ` : "";
  return `${file}[${span.start},${span.end})`;
}

function formatDiagData(data: DiagnosticsSnapshotItem["data"]): string | null {
  if (!data || Object.keys(data).length === 0) return null;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function formatDiagIssues(issues: DiagnosticsSnapshotItem["issues"]): string | null {
  if (!issues || issues.length === 0) return null;
  try {
    return JSON.stringify(issues, null, 2);
  } catch {
    return String(issues);
  }
}

function formatDiagRelated(related: DiagnosticsSnapshotItem["related"]): string | null {
  if (!related || related.length === 0) return null;
  try {
    return JSON.stringify(related, null, 2);
  } catch {
    return String(related);
  }
}

function formatDiagnosticBlock(
  diag: DiagnosticsSnapshotItem,
  index: number,
  fallbackUri: string,
  heading: string,
): string {
  const data = formatDiagData(diag.data);
  const related = formatDiagRelated(diag.related);
  const issues = formatDiagIssues(diag.issues);
  const lines = [
    `${heading} ${index}. ${diag.code}`,
    `- severity: ${diag.severity ?? "<unspecified>"}`,
    `- message: ${diag.message}`,
    `- impact: ${diag.impact ?? "<unspecified>"}`,
    `- actionability: ${diag.actionability ?? "<unspecified>"}`,
    `- category: ${diag.category ?? "<unspecified>"}`,
    `- status: ${diag.status ?? "<unspecified>"}`,
    `- stage: ${diag.stage ?? "<unspecified>"}`,
    `- source: ${diag.source ?? "aurelia"}`,
    `- uri: ${diag.uri ?? fallbackUri}`,
    `- span: ${formatDiagSpan(diag.span)}`,
  ];

  if (diag.surfaces?.length) {
    lines.push(`- surfaces: ${diag.surfaces.join(", ")}`);
  }
  if (diag.suppressed) {
    lines.push(`- suppressed: true`);
  }
  if (diag.suppressionReason) {
    lines.push(`- suppression reason: ${diag.suppressionReason}`);
  }
  if (data) {
    lines.push(`- data:`, "", "```json", data, "```");
  } else {
    lines.push(`- data: <none>`);
  }
  if (related) {
    lines.push(`- related:`, "", "```json", related, "```");
  } else {
    lines.push(`- related: <none>`);
  }
  if (issues) {
    lines.push(`- issues:`, "", "```json", issues, "```");
  } else {
    lines.push(`- issues: <none>`);
  }
  return lines.join("\n");
}

function formatDiagnosticsSnapshot(snapshot: DiagnosticsSnapshotResponse, fallbackUri: string): string {
  const uri = snapshot.uri ?? fallbackUri;
  const diagnostics = snapshot.diagnostics ?? { bySurface: {}, suppressed: [] };
  const surfaceEntries = Object.entries(diagnostics.bySurface ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const suppressed = diagnostics.suppressed ?? [];
  const totalCounts = countSeverities(surfaceEntries.flatMap(([, items]) => items));

  const header = [
    `URI: ${uri}`,
    `Fingerprint: ${snapshot.fingerprint ?? "<unknown>"}`,
    `Counts: total=${totalCounts.total} error=${totalCounts.error} warning=${totalCounts.warning} info=${totalCounts.info} unknown=${totalCounts.unknown}`,
    `Suppressed: ${suppressed.length}`,
  ].join("\n");

  if (!surfaceEntries.length && suppressed.length === 0) {
    return `# Diagnostics Snapshot\n\n${header}\n\nNo diagnostics reported.`;
  }

  const blocks: string[] = [];
  for (const [surface, items] of surfaceEntries) {
    if (items.length === 0) continue;
    const counts = countSeverities(items);
    const headerLines = [
      `## Surface: ${surface}`,
      `Counts: total=${counts.total} error=${counts.error} warning=${counts.warning} info=${counts.info} unknown=${counts.unknown}`,
    ];
    const itemsBlock = items.map((diag, index) => formatDiagnosticBlock(diag, index + 1, uri, "###")).join("\n\n");
    blocks.push(`${headerLines.join("\n")}\n\n${itemsBlock}`);
  }

  if (suppressed.length) {
    const counts = countSeverities(suppressed);
    const suppressedHeader = [
      `## Suppressed`,
      `Counts: total=${counts.total} error=${counts.error} warning=${counts.warning} info=${counts.info} unknown=${counts.unknown}`,
    ].join("\n");
    const suppressedBlocks = suppressed
      .map((diag, index) => formatDiagnosticBlock(diag, index + 1, uri, "###"))
      .join("\n\n");
    blocks.push(`${suppressedHeader}\n\n${suppressedBlocks}`);
  }

  return `# Diagnostics Snapshot\n\n${header}\n\n${blocks.join("\n\n")}`;
}

export function registerCommands(
  context: ExtensionContext,
  queries: QueryClient,
  virtualDocs: VirtualDocProvider,
  observability: ObservabilityService,
  vscode: VscodeApi = getVscodeApi(),
) {
  const logger = observability.logger.child("commands");
  const errors = observability.errors;
  const trace = observability.trace;

  const run = <T>(id: string, fn: () => Promise<T>) =>
    errors.capture(`command.${id}`, () => trace.spanAsync(`command.${id}`, fn), { context: { command: id } });

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showOverlay", () => {
      void run("showOverlay", async () => {
        const editor = activeEditor(vscode);
        if (!editor) {
          vscode.window.showInformationMessage("No active editor");
          return;
        }
        const uri = editor.document.uri.toString();
        logger.info("showOverlay.request", { uri });
        const overlay = extractOverlayArtifact(await queries.getOverlay(uri, QueryPolicies.overlay));
        if (!overlay) {
          vscode.window.showInformationMessage("No overlay found for this document");
          return;
        }
        const overlayPath =
          overlay.overlay.path.endsWith(".ts") || overlay.overlay.path.endsWith(".js")
            ? overlay.overlay.path
            : `${overlay.overlay.path}.ts`;
        const vUri = virtualDocs.makeUri(overlayPath, vscode);
        virtualDocs.update(vUri, overlay.overlay.text);
        const doc = await vscode.workspace.openTextDocument(vUri);
        await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
      });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showOverlayMapping", () => {
      void run("showOverlayMapping", async () => {
        const editor = activeEditor(vscode);
        if (!editor) {
          vscode.window.showInformationMessage("No active editor");
          return;
        }
        const uri = editor.document.uri.toString();
        logger.info("showOverlayMapping.request", { uri });
        const mapping = await queries.getMapping(uri, QueryPolicies.mapping);
        const overlayLabel = mapping?.overlayPath ?? "<overlay unavailable>";
        const mappingEntries = mapping?.mapping?.entries ?? [];
        if (mappingEntries.length) {
          const body = [`Overlay: ${overlayLabel}`, "", formatMappingEntries(mappingEntries)].join("\n");
          const doc = await vscode.workspace.openTextDocument({ language: "markdown", content: `# Mapping Artifact\n\n${body}` });
          await vscode.window.showTextDocument(doc, { preview: true });
          return;
        }

        const overlay = extractOverlayArtifact(await queries.getOverlay(uri, QueryPolicies.overlay));
        if (overlay?.calls?.length) {
          const body = [`Overlay: ${overlay.overlay.path}`, "", formatCalls(overlay.calls)].join("\n");
          const doc = await vscode.workspace.openTextDocument({ language: "markdown", content: `# Overlay Mapping\n\n${body}` });
          await vscode.window.showTextDocument(doc, { preview: true });
          return;
        }

        vscode.window.showInformationMessage("No overlay mapping available for this document");
      });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showTemplateInfo", () => {
      void run("showTemplateInfo", async () => {
        const editor = activeEditor(vscode);
        if (!editor) {
          vscode.window.showInformationMessage("No active editor");
          return;
        }
        const uri = editor.document.uri.toString();
        const position = editor.selection.active;
        logger.info("showTemplateInfo.request", { uri, line: position.line, character: position.character });
        const result = await queries.queryAtPosition(uri, position, {
          ...QueryPolicies.queryAtPosition,
          docVersion: editor.document.version,
        });
        if (!result) {
          vscode.window.showInformationMessage("No query info available for this document");
          return;
        }
        const lines = [
          `expr: ${result.expr?.exprId ?? "<none>"}`,
          `node: ${result.node?.kind ?? "<none>"}`,
          `controller: ${result.controller?.kind ?? "<none>"}`,
          `bindables: ${result.bindables?.length ?? 0}`,
          `mapping entries: ${result.mappingSize ?? "?"}`,
        ];
        const doc = await vscode.workspace.openTextDocument({ language: "markdown", content: `# Template Info\n\n${lines.join("\n")}` });
        await vscode.window.showTextDocument(doc, { preview: true });
      });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showSsrPreview", () => {
      void run("showSsrPreview", async () => {
        const editor = activeEditor(vscode);
        if (!editor) {
          vscode.window.showInformationMessage("No active editor");
          return;
        }
        const uri = editor.document.uri.toString();
        logger.info("showSsrPreview.request", { uri });
        const response = await queries.getSsr(uri, QueryPolicies.ssr);
        const ssr = response?.artifact ?? response?.ssr ?? null;
        if (!ssr) {
          vscode.window.showInformationMessage("No SSR output for this document");
          return;
        }
        const htmlDoc = await vscode.workspace.openTextDocument({ language: "html", content: ssr.html.text });
        await vscode.window.showTextDocument(htmlDoc, { preview: true });
        const manifestDoc = await vscode.workspace.openTextDocument({ language: "json", content: ssr.manifest.text });
        await vscode.window.showTextDocument(manifestDoc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
        logger.info("showSsrPreview.opened", { html: ssr.html.path, manifest: ssr.manifest.path });
      });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showDiagnosticsSnapshot", () => {
      void run("showDiagnosticsSnapshot", async () => {
        const editor = activeEditor(vscode);
        if (!editor) {
          vscode.window.showInformationMessage("No active editor");
          return;
        }
        const uri = editor.document.uri.toString();
        logger.info("showDiagnosticsSnapshot.request", { uri });
        const snapshot = await queries.getDiagnostics(uri, QueryPolicies.diagnostics);
        if (!snapshot) {
          vscode.window.showInformationMessage("No diagnostics snapshot available for this document");
          return;
        }
        const doc = await vscode.workspace.openTextDocument({
          language: "markdown",
          content: formatDiagnosticsSnapshot(snapshot, uri),
        });
        await vscode.window.showTextDocument(doc, { preview: true });
      });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.dumpState", () => {
      void run("dumpState", async () => {
        logger.info("dumpState.request");
        const state = await queries.dumpState(QueryPolicies.dumpState);
        logger.write("debug", JSON.stringify(state, null, 2), undefined, { raw: true, force: true });
        vscode.window.showInformationMessage("Dumped state to 'Aurelia LS (Client)' output.");
      });
    }),
  );

  // "Aurelia: Show Suppressed Diagnostics" — diagnostics deflection §2 resolution.
  // Temporarily emits suppressed diagnostics at Hint severity with [suppressed] prefix.
  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showSuppressedDiagnostics", () => {
      void run("showSuppressedDiagnostics", async () => {
        const editor = activeEditor(vscode);
        if (!editor) {
          vscode.window.showInformationMessage("No active editor");
          return;
        }
        const uri = editor.document.uri.toString();
        logger.info("showSuppressedDiagnostics.request", { uri });
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
        const summary = suppressed
          .map((d) => `${d.code}: ${d.message}`)
          .join("\n");
        const doc = await vscode.workspace.openTextDocument({
          language: "markdown",
          content: `# Suppressed Diagnostics\n\n${suppressed.length} diagnostic(s) suppressed by confidence-based demotion.\n\n${summary}`,
        });
        await vscode.window.showTextDocument(doc, { preview: true });
      });
    }),
  );
}
