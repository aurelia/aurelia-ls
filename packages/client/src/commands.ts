import type { ExtensionContext, TextEditor } from "vscode";
import type { LanguageClient } from "vscode-languageclient/node.js";
import { type VirtualDocProvider } from "./virtual-docs.js";
import { type ClientLogger } from "./log.js";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";
import type {
  MappingEntry,
  MappingResponse,
  OverlayBuildArtifactShape,
  OverlayResponse,
  SsrResponse,
  TemplateInfoResponse,
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
  client: LanguageClient,
  virtualDocs: VirtualDocProvider,
  logger: ClientLogger,
  vscode: VscodeApi = getVscodeApi(),
) {
  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showOverlay", async () => {
      const editor = activeEditor(vscode);
      if (!editor) {
        vscode.window.showInformationMessage("No active editor");
        return;
      }
      const uri = editor.document.uri.toString();
      logger.log(`[client] aurelia.showOverlay request for ${uri}`);
      try {
        const overlay = extractOverlayArtifact(await client.sendRequest<OverlayResponse>("aurelia/getOverlay", { uri }));
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
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error(`[client] aurelia.showOverlay error: ${message}`);
        vscode.window.showErrorMessage(`Show Generated Overlay failed: ${message}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showOverlayMapping", async () => {
      const editor = activeEditor(vscode);
      if (!editor) {
        vscode.window.showInformationMessage("No active editor");
        return;
      }
      const uri = editor.document.uri.toString();
      logger.log(`[client] aurelia.showOverlayMapping request for ${uri}`);
      try {
        const mapping = await client.sendRequest<MappingResponse | null>("aurelia/getMapping", { uri });
        const overlayLabel = mapping?.overlayPath ?? "<overlay unavailable>";
        const mappingEntries = mapping?.mapping?.entries ?? [];
        if (mappingEntries.length) {
          const body = [`Overlay: ${overlayLabel}`, "", formatMappingEntries(mappingEntries)].join("\n");
          const doc = await vscode.workspace.openTextDocument({ language: "markdown", content: `# Mapping Artifact\n\n${body}` });
          await vscode.window.showTextDocument(doc, { preview: true });
          return;
        }

        const overlay = extractOverlayArtifact(await client.sendRequest<OverlayResponse>("aurelia/getOverlay", { uri }));
        if (overlay?.calls?.length) {
          const body = [`Overlay: ${overlay.overlay.path}`, "", formatCalls(overlay.calls)].join("\n");
          const doc = await vscode.workspace.openTextDocument({ language: "markdown", content: `# Overlay Mapping\n\n${body}` });
          await vscode.window.showTextDocument(doc, { preview: true });
          return;
        }

        vscode.window.showInformationMessage("No overlay mapping available for this document");
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error(`[client] aurelia.showOverlayMapping error: ${message}`);
        vscode.window.showErrorMessage(`Show Overlay Mapping failed: ${message}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showTemplateInfo", async () => {
      const editor = activeEditor(vscode);
      if (!editor) {
        vscode.window.showInformationMessage("No active editor");
        return;
      }
      const uri = editor.document.uri.toString();
      const position = editor.selection.active;
      logger.log(`[client] aurelia.showTemplateInfo request for ${uri} @ ${position.line}:${position.character}`);
      try {
        const result = await client.sendRequest<TemplateInfoResponse | null>("aurelia/queryAtPosition", { uri, position });
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
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error(`[client] aurelia.showTemplateInfo error: ${message}`);
        vscode.window.showErrorMessage(`Show Template Info failed: ${message}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showSsrPreview", async () => {
      const editor = activeEditor(vscode);
      if (!editor) {
        vscode.window.showInformationMessage("No active editor");
        return;
      }
      const uri = editor.document.uri.toString();
      logger.log(`[client] aurelia.showSsrPreview request for ${uri}`);
      try {
        const response = await client.sendRequest<SsrResponse>("aurelia/getSsr", { uri });
        const ssr = response?.artifact ?? response?.ssr ?? null;
        if (!ssr) {
          vscode.window.showInformationMessage("No SSR output for this document");
          return;
        }
        const htmlDoc = await vscode.workspace.openTextDocument({ language: "html", content: ssr.html.text });
        await vscode.window.showTextDocument(htmlDoc, { preview: true });
        const manifestDoc = await vscode.workspace.openTextDocument({ language: "json", content: ssr.manifest.text });
        await vscode.window.showTextDocument(manifestDoc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
        logger.log(`[client] SSR preview opened: ${ssr.html.path} / ${ssr.manifest.path}`);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error(`[client] aurelia.showSsrPreview error: ${message}`);
        vscode.window.showErrorMessage(`Show SSR Preview failed: ${message}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.dumpState", async () => {
      logger.log("[client] aurelia.dumpState");
      try {
        const state = await client.sendRequest<unknown>("aurelia/dumpState");
        logger.log(JSON.stringify(state, null, 2));
        vscode.window.showInformationMessage("Dumped state to 'Aurelia LS (Client)' output.");
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error(`[client] dumpState error: ${message}`);
      }
    }),
  );
}
