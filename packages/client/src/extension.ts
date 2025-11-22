import * as vscode from "vscode";
import { AureliaLanguageClient } from "./client-core.js";
import { ClientLogger } from "./log.js";
import { StatusService } from "./status.js";
import { registerCommands } from "./commands.js";
import { VirtualDocProvider } from "./virtual-docs.js";
import type { OverlayReadyPayload } from "./types.js";

let client: AureliaLanguageClient | undefined;
let status: StatusService | undefined;
let logger: ClientLogger | undefined;
let virtualDocs: VirtualDocProvider | undefined;

export async function activate(context: vscode.ExtensionContext) {
  logger = new ClientLogger("Aurelia LS (Client)");
  status = new StatusService();
  virtualDocs = new VirtualDocProvider();
  client = new AureliaLanguageClient(logger);

  const lsp = await client.start(context);

  // Register overlay virtual docs
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(VirtualDocProvider.scheme, virtualDocs));

  // Commands
  registerCommands(context, lsp, virtualDocs, logger);

  // Notifications
  lsp.onNotification("aurelia/overlayReady", (payload: OverlayReadyPayload) => {
    logger?.log(
      `[client] overlayReady: ${JSON.stringify({
        uri: payload?.uri,
        overlayPath: payload?.overlayPath,
        calls: payload?.calls,
        diags: payload?.diags,
      })}`,
    );
    status?.overlayReady(payload);
  });

  context.subscriptions.push({
    dispose: () => {
      status?.dispose();
      void client?.stop();
    },
  });
}

export async function deactivate() {
  status?.dispose();
  try {
    await client?.stop();
  } catch {
    /* ignore */
  }
}
