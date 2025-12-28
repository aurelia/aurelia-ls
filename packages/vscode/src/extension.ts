import { ClientLogger } from "./log.js";
import { StatusService } from "./status.js";
import { registerCommands } from "./commands.js";
import { VirtualDocProvider } from "./virtual-docs.js";
import type { OverlayReadyPayload } from "./types.js";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";
import type { AureliaLanguageClient } from "./client-core.js";
import type { ExtensionContext } from "vscode";

let client: AureliaLanguageClient | undefined;
let status: StatusService | undefined;
let logger: ClientLogger | undefined;
let virtualDocs: VirtualDocProvider | undefined;

let AureliaLanguageClientCtor: ((logger: ClientLogger, vscode: VscodeApi) => AureliaLanguageClient) | null = null;

async function createLanguageClient(logger: ClientLogger, vscode: VscodeApi): Promise<AureliaLanguageClient> {
  // Lazy import so tests can load extension.ts without pulling in vscode-languageclient (which requires the VS Code runtime).
  if (AureliaLanguageClientCtor === null) {
    const mod = await import("./client-core.js");
    const Ctor = mod.AureliaLanguageClient;
    AureliaLanguageClientCtor = (l, v) => new Ctor(l, v);
  }
  return AureliaLanguageClientCtor(logger, vscode);
}

export interface ActivationServices {
  vscode?: VscodeApi;
  logger?: ClientLogger;
  status?: StatusService;
  virtualDocs?: VirtualDocProvider;
  languageClient?: AureliaLanguageClient;
}

export async function activate(context: ExtensionContext, services: ActivationServices = {}) {
  const vscode = services.vscode ?? getVscodeApi();
  logger = services.logger ?? new ClientLogger("Aurelia LS (Client)", vscode);
  status = services.status ?? new StatusService(vscode);
  virtualDocs = services.virtualDocs ?? new VirtualDocProvider(vscode);
  client = services.languageClient ?? (await createLanguageClient(logger, vscode));

  const lsp = await client.start(context);

  // Register overlay virtual docs
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(VirtualDocProvider.scheme, virtualDocs));

  // Commands
  registerCommands(context, lsp, virtualDocs, logger, vscode);

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
  status = undefined;
  try {
    await client?.stop();
  } catch {
    /* ignore */
  }
  client = undefined;
  virtualDocs = undefined;
  logger = undefined;
}
