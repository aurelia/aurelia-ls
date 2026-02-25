/**
 * Debug commands — framework developer tools gated behind features.debugCommands.
 *
 * These commands expose compiler internals useful for framework development
 * and debugging the language server itself. They are NOT the user-facing
 * commands (those live in features/commands/user-commands.ts).
 */
import type { ExtensionContext, TextEditor } from "vscode";
import type { ObservabilityService } from "./core/observability.js";
import type { QueryClient } from "./core/query-client.js";
import { QueryPolicies } from "./core/query-policy.js";
import { type VirtualDocProvider } from "./virtual-docs.js";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";
import type {
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

  // "Aurelia Debug: Show Compiled Template" — shows the generated TS overlay
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
          vscode.window.showInformationMessage("No compiled template found for this document");
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

  // "Aurelia Debug: Show Overlay Mapping" — span mapping between template and overlay
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
          const doc = await vscode.workspace.openTextDocument({ language: "markdown", content: `# Overlay Mapping\n\n${body}` });
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

  // "Aurelia Debug: Dump Server State"
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
}
