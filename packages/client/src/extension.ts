import * as vscode from "vscode";
import { LanguageClient, TransportKind } from "vscode-languageclient/node.js";
import type { LanguageClientOptions, ServerOptions } from "vscode-languageclient/node.js";
import * as fs from "node:fs";

let client: LanguageClient | undefined;
const out = vscode.window.createOutputChannel("Aurelia LS (Client)");
let status: vscode.StatusBarItem | undefined;

function fileExists(p: string): boolean {
  try { fs.statSync(p); return true; } catch { return false; }
}

function resolveServerModule(context: vscode.ExtensionContext): string {
  // Power-user override
  const override = process.env.AURELIA_LS_SERVER_PATH;
  if (override && fileExists(override)) {
    out.appendLine(`[client] using server override: ${override}`);
    return override;
  }

  // Try common dev/build layouts
  const candidates = [
    // when server bundle is shipped inside the extension (packaged scenario)
    vscode.Uri.joinPath(context.extensionUri, "dist", "server", "main.js").fsPath,
    // monorepo dev: compiled TS output
    vscode.Uri.joinPath(context.extensionUri, "..", "server", "out", "main.js").fsPath,
    // alternative bundling layout
    vscode.Uri.joinPath(context.extensionUri, "..", "server", "dist", "main.js").fsPath,
    vscode.Uri.joinPath(context.extensionUri, "..", "server", "build", "main.js").fsPath,
  ];

  for (const p of candidates) {
    if (fileExists(p)) {
      out.appendLine(`[client] resolved server module: ${p}`);
      return p;
    }
  }

  const msg = `Cannot locate server module. Tried:\n${candidates.map(c => `- ${c}`).join("\n")}`;
  out.appendLine(`[client] ${msg}`);
  throw new Error(msg);
}

export async function activate(context: vscode.ExtensionContext) {
  out.appendLine("[client] activate");
  status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  status.text = "Aurelia: idle";
  status.command = "aurelia.showOverlay";
  status.show();
  context.subscriptions.push(status);

  const serverModule = resolveServerModule(context);

  const serverOptions: ServerOptions = {
    run:   { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: { execArgv: ["--inspect=6009"] } },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ pattern: "**/*.html" }],
    synchronize: {},
  };

  client = new LanguageClient("aurelia-ls", "Aurelia Language Server", serverOptions, clientOptions);

  await client.start();
  out.appendLine("[client] started");

  context.subscriptions.push({
    dispose: () => {
      out.appendLine("[client] dispose → stop()");
      void client?.stop();
    },
  });

  // Server notifications
  client.onNotification("aurelia/overlayReady", (payload: any) => {
    out.appendLine(
      `[client] overlayReady: ${JSON.stringify({
        uri: payload?.uri,
        overlayPath: payload?.overlayPath,
        calls: payload?.calls,
        diags: payload?.diags,
      })}`
    );
    if (status) {
      const diags = typeof payload?.diags === "number" ? payload.diags : "?";
      const calls = typeof payload?.calls === "number" ? payload.calls : "?";
      status.text = `Aurelia: overlay ready (calls ${calls}, diags ${diags})`;
      status.tooltip = payload?.uri ?? undefined;
    }
  });

  // Command: Show Generated Overlay
  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showOverlay", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showInformationMessage("No active editor"); return; }
      const uri = editor.document.uri.toString();
      out.appendLine(`[client] aurelia.showOverlay → request for ${uri}`);
      try {
        const result = await client!.sendRequest<{ overlayPath: string; text: string; calls?: any[] } | null>(
          "aurelia/getOverlay",
          { uri }
        );
        if (!result) {
          vscode.window.showInformationMessage("No overlay found for this document");
          out.appendLine(`[client] aurelia.showOverlay: result=null`);
          return;
        }
        out.appendLine(`[client] aurelia.showOverlay: ${result.overlayPath} len=${result.text.length}`);
        const doc = await vscode.workspace.openTextDocument({ language: "typescript", content: result.text });
        await vscode.window.showTextDocument(doc, { preview: true });
      } catch (e: any) {
        out.appendLine(`[client] aurelia.showOverlay error: ${e?.message || e}`);
        vscode.window.showErrorMessage(`Show Generated Overlay failed: ${e?.message || e}`);
      }
    })
  );

  // Command: Show Overlay Mapping
  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showOverlayMapping", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showInformationMessage("No active editor"); return; }
      const uri = editor.document.uri.toString();
      out.appendLine(`[client] aurelia.showOverlayMapping → request for ${uri}`);
      try {
        const result = await client!.sendRequest<{ overlayPath: string; text: string; calls?: any[] } | null>(
          "aurelia/getOverlay",
          { uri }
        );
        if (!result?.calls?.length) {
          vscode.window.showInformationMessage("No overlay mapping available for this document");
          return;
        }
        const lines = result.calls.map((c: any, i: number) =>
          `${i + 1}. expr=${c.exprId} overlay=[${c.overlayStart},${c.overlayEnd}) html=[${c.htmlStart},${c.htmlEnd})`
        );
        const body = [`Overlay: ${result.overlayPath}`, "", ...lines].join("\n");
        const doc = await vscode.workspace.openTextDocument({ language: "markdown", content: `# Overlay Mapping\n\n${body}` });
        await vscode.window.showTextDocument(doc, { preview: true });
      } catch (e: any) {
        out.appendLine(`[client] aurelia.showOverlayMapping error: ${e?.message || e}`);
        vscode.window.showErrorMessage(`Show Overlay Mapping failed: ${e?.message || e}`);
      }
    })
  );

  // Command: Show SSR preview (HTML + manifest)
  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showSsrPreview", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showInformationMessage("No active editor"); return; }
      const uri = editor.document.uri.toString();
      out.appendLine(`[client] aurelia.showSsrPreview → request for ${uri}`);
      try {
        const result = await client!.sendRequest<{
          htmlPath: string; htmlText: string; manifestPath: string; manifestText: string;
        } | null>("aurelia/getSsr", { uri });
        if (!result) {
          vscode.window.showInformationMessage("No SSR output for this document");
          return;
        }
        const htmlDoc = await vscode.workspace.openTextDocument({ language: "html", content: result.htmlText });
        await vscode.window.showTextDocument(htmlDoc, { preview: true });
        const manifestDoc = await vscode.workspace.openTextDocument({ language: "json", content: result.manifestText });
        await vscode.window.showTextDocument(manifestDoc, { preview: true, viewColumn: vscode.ViewColumn.Beside });
        out.appendLine(`[client] SSR preview opened: ${result.htmlPath} / ${result.manifestPath}`);
      } catch (e: any) {
        out.appendLine(`[client] aurelia.showSsrPreview error: ${e?.message || e}`);
        vscode.window.showErrorMessage(`Show SSR Preview failed: ${e?.message || e}`);
      }
    })
  );

  // Command: Dump LS state → client output channel
  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.dumpState", async () => {
      out.appendLine("[client] aurelia.dumpState");
      try {
        const state = await client!.sendRequest<any>("aurelia/dumpState");
        out.appendLine(JSON.stringify(state, null, 2));
        vscode.window.showInformationMessage("Dumped state to 'Aurelia LS (Client)' output.");
      } catch (e: any) {
        out.appendLine(`[client] dumpState error: ${e?.message || e}`);
      }
    })
  );
}

export async function deactivate() {
  out.appendLine("[client] deactivate");
  status?.dispose();
  try { await client?.stop(); } catch { /* ignore */ }
}
