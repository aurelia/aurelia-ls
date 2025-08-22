import * as vscode from "vscode";
import { LanguageClient, TransportKind } from "vscode-languageclient/node.js";
import type { LanguageClientOptions, ServerOptions } from "vscode-languageclient/node.js";
import * as fs from "node:fs";

let client: LanguageClient | undefined;
const out = vscode.window.createOutputChannel("Aurelia LS (Client)");

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
  });

  // Command: Show Generated Overlay
  context.subscriptions.push(
    vscode.commands.registerCommand("aurelia.showOverlay", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) { vscode.window.showInformationMessage("No active editor"); return; }
      const uri = editor.document.uri.toString();
      out.appendLine(`[client] aurelia.showOverlay → request for ${uri}`);
      try {
        const result = await client!.sendRequest<{ overlayPath: string; text: string } | null>(
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
  try { await client?.stop(); } catch { /* ignore */ }
}
