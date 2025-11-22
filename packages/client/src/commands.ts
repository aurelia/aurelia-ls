import * as vscode from "vscode";
import type { LanguageClient } from "vscode-languageclient/node.js";
import { VirtualDocProvider } from "./virtual-docs.js";
import { ClientLogger } from "./log.js";

export function registerCommands(
  context: vscode.ExtensionContext,
  client: LanguageClient,
  virtualDocs: VirtualDocProvider,
  logger: ClientLogger,
) {
  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showOverlay", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showInformationMessage("No active editor"); return; }
      const uri = editor.document.uri.toString();
      logger.log(`[client] aurelia.showOverlay request for ${uri}`);
      try {
        const result = await client.sendRequest<{ overlayPath: string; text: string; calls?: any[] } | null>(
          "aurelia/getOverlay",
          { uri },
        );
        if (!result) {
          vscode.window.showInformationMessage("No overlay found for this document");
          return;
        }
        const vUri = virtualDocs.makeUri(result.overlayPath);
        virtualDocs.update(vUri, result.text);
        const doc = await vscode.workspace.openTextDocument(vUri.with({ path: vUri.path + ".ts", scheme: "untitled" }));
        await vscode.window.showTextDocument(doc, { preview: true });
      } catch (e: any) {
        logger.error(`[client] aurelia.showOverlay error: ${e?.message ?? e}`);
        vscode.window.showErrorMessage(`Show Generated Overlay failed: ${e?.message ?? e}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showOverlayMapping", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showInformationMessage("No active editor"); return; }
      const uri = editor.document.uri.toString();
      logger.log(`[client] aurelia.showOverlayMapping request for ${uri}`);
      try {
        const mapping = await client.sendRequest<{ overlayPath: string; mapping: { entries: any[] } } | null>(
          "aurelia/getMapping",
          { uri },
        );
        const overlayFallback = mapping?.mapping?.entries?.length
          ? null
          : await client.sendRequest<{ overlayPath: string; text: string; calls?: any[] } | null>("aurelia/getOverlay", { uri });

        if (mapping?.mapping?.entries?.length) {
          const rows = mapping.mapping.entries.map((entry: any, i: number) =>
            `${i + 1}. expr=${entry.exprId} overlay=[${entry.overlaySpan?.start},${entry.overlaySpan?.end}) html=[${entry.htmlSpan?.start},${entry.htmlSpan?.end})`,
          );
          const body = [`Overlay: ${mapping.overlayPath}`, "", ...rows].join("\n");
          const doc = await vscode.workspace.openTextDocument({ language: "markdown", content: `# Mapping Artifact\n\n${body}` });
          await vscode.window.showTextDocument(doc, { preview: true });
          return;
        }

        if (overlayFallback?.calls?.length) {
          const lines = overlayFallback.calls.map((c: any, i: number) =>
            `${i + 1}. expr=${c.exprId} overlay=[${c.overlayStart},${c.overlayEnd}) html=[${c.htmlStart},${c.htmlEnd})`,
          );
          const body = [`Overlay: ${overlayFallback.overlayPath}`, "", ...lines].join("\n");
          const doc = await vscode.workspace.openTextDocument({ language: "markdown", content: `# Overlay Mapping\n\n${body}` });
          await vscode.window.showTextDocument(doc, { preview: true });
          return;
        }
        vscode.window.showInformationMessage("No overlay mapping available for this document");
      } catch (e: any) {
        logger.error(`[client] aurelia.showOverlayMapping error: ${e?.message ?? e}`);
        vscode.window.showErrorMessage(`Show Overlay Mapping failed: ${e?.message ?? e}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showTemplateInfo", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showInformationMessage("No active editor"); return; }
      const uri = editor.document.uri.toString();
      const position = editor.selection.active;
      logger.log(`[client] aurelia.showTemplateInfo request for ${uri} @ ${position.line}:${position.character}`);
      try {
        const result = await client.sendRequest<any>("aurelia/queryAtPosition", { uri, position });
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
      } catch (e: any) {
        logger.error(`[client] aurelia.showTemplateInfo error: ${e?.message ?? e}`);
        vscode.window.showErrorMessage(`Show Template Info failed: ${e?.message ?? e}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showSsrPreview", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showInformationMessage("No active editor"); return; }
      const uri = editor.document.uri.toString();
      logger.log(`[client] aurelia.showSsrPreview request for ${uri}`);
      try {
        const result = await client.sendRequest<{ htmlPath: string; htmlText: string; manifestPath: string; manifestText: string } | null>(
          "aurelia/getSsr",
          { uri },
        );
        if (!result) {
          vscode.window.showInformationMessage("No SSR output for this document");
          return;
        }
        const htmlDoc = await vscode.workspace.openTextDocument({ language: "html", content: result.htmlText });
        await vscode.window.showTextDocument(htmlDoc, { preview: true });
        const manifestDoc = await vscode.workspace.openTextDocument({ language: "json", content: result.manifestText });
        await vscode.window.showTextDocument(manifestDoc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
        logger.log(`[client] SSR preview opened: ${result.htmlPath} / ${result.manifestPath}`);
      } catch (e: any) {
        logger.error(`[client] aurelia.showSsrPreview error: ${e?.message ?? e}`);
        vscode.window.showErrorMessage(`Show SSR Preview failed: ${e?.message ?? e}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.dumpState", async () => {
      logger.log("[client] aurelia.dumpState");
      try {
        const state = await client.sendRequest<any>("aurelia/dumpState");
        logger.log(JSON.stringify(state, null, 2));
        vscode.window.showInformationMessage("Dumped state to 'Aurelia LS (Client)' output.");
      } catch (e: any) {
        logger.error(`[client] dumpState error: ${e?.message ?? e}`);
      }
    }),
  );
}
