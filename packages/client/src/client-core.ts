import * as vscode from "vscode";
import { LanguageClient, TransportKind } from "vscode-languageclient/node.js";
import type { LanguageClientOptions, ServerOptions } from "vscode-languageclient/node.js";
import { ClientLogger } from "./log.js";

async function fileExists(p: string): Promise<boolean> {
  try { await vscode.workspace.fs.stat(vscode.Uri.file(p)); return true; } catch { return false; }
}

async function resolveServerModule(context: vscode.ExtensionContext, logger: ClientLogger): Promise<string> {
  const override = process.env.AURELIA_LS_SERVER_PATH;
  if (override) {
    if (await fileExists(override)) {
      logger.log(`[client] using server override: ${override}`);
      return override;
    }
    logger.warn(`[client] override set but not found: ${override}`);
  }
  const candidates = [
    vscode.Uri.joinPath(context.extensionUri, "dist", "server", "main.js").fsPath,
    vscode.Uri.joinPath(context.extensionUri, "..", "server", "out", "main.js").fsPath,
    vscode.Uri.joinPath(context.extensionUri, "..", "server", "dist", "main.js").fsPath,
    vscode.Uri.joinPath(context.extensionUri, "..", "server", "build", "main.js").fsPath,
  ];
  for (const p of candidates) {
    if (await fileExists(p)) {
      logger.log(`[client] resolved server module: ${p}`);
      return p;
    }
  }
  const msg = `Cannot locate server module. Tried:\n${candidates.map((c) => `- ${c}`).join("\n")}`;
  logger.error(msg);
  throw new Error(msg);
}

export class AureliaLanguageClient {
  #client: LanguageClient | undefined;
  #logger: ClientLogger;

  constructor(logger: ClientLogger) {
    this.#logger = logger;
  }

  async start(context: vscode.ExtensionContext): Promise<LanguageClient> {
    if (this.#client) return this.#client;
    const serverModule = await resolveServerModule(context, this.#logger);

    const serverOptions: ServerOptions = {
      run: { module: serverModule, transport: TransportKind.ipc },
      debug: { module: serverModule, transport: TransportKind.ipc, options: { execArgv: ["--inspect=6009"] } },
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [{ pattern: "**/*.html" }],
      synchronize: {},
    };

    this.#client = new LanguageClient("aurelia-ls", "Aurelia Language Server", serverOptions, clientOptions);
    await this.#client.start();
    this.#logger.log("[client] started");
    return this.#client;
  }

  async stop(): Promise<void> {
    if (!this.#client) return;
    try { await this.#client.stop(); } catch {}
    this.#client = undefined;
    this.#logger.log("[client] stopped");
  }

  get client(): LanguageClient | undefined {
    return this.#client;
  }
}
