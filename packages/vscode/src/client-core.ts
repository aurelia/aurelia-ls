import { LanguageClient, TransportKind } from "vscode-languageclient/node";
import type { LanguageClientOptions, ServerOptions } from "vscode-languageclient/node";
import { type ClientLogger } from "./log.js";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";
import type { ExtensionContext, SemanticTokens, TextDocument } from "vscode";
import { createMiddleware, type DiagnosticsUxState, type InlineUxState } from "./client-middleware.js";

async function fileExists(vscode: VscodeApi, p: string): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(p));
    return true;
  } catch {
    return false;
  }
}

async function resolveServerModule(context: ExtensionContext, logger: ClientLogger, vscode: VscodeApi): Promise<string> {
  const override = process.env.AURELIA_LS_SERVER_PATH;
  if (override) {
    if (await fileExists(vscode, override)) {
      logger.log(`[client] using server override: ${override}`);
      return override;
    }
    logger.warn(`[client] override set but not found: ${override}`);
  }
  const candidates = [
    // Bundled (production) - .cjs to avoid ESM/CJS conflict
    vscode.Uri.joinPath(context.extensionUri, "dist", "server", "main.cjs").fsPath,
    // Development (unbundled)
    vscode.Uri.joinPath(context.extensionUri, "..", "language-server", "out", "main.js").fsPath,
  ];
  for (const p of candidates) {
    if (await fileExists(vscode, p)) {
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
  #vscode: VscodeApi;
  #serverEnv: Record<string, string> | null = null;
  #diagnosticsUx: DiagnosticsUxState = { enabled: false };
  #inlineUx: InlineUxState = { enabled: false, onSemanticTokens: null };
  #inlayHintsEnabled = true;

  constructor(logger: ClientLogger, vscode: VscodeApi = getVscodeApi()) {
    this.#logger = logger;
    this.#vscode = vscode;
  }

  setServerEnv(env: Record<string, string> | null): void {
    this.#serverEnv = env;
  }

  setDiagnosticsUxEnabled(enabled: boolean): void {
    this.#diagnosticsUx.enabled = enabled;
  }

  setInlineUxEnabled(enabled: boolean): void {
    this.#inlineUx.enabled = enabled;
  }

  get inlayHintsEnabled(): boolean {
    return this.#inlayHintsEnabled;
  }

  setInlayHintsEnabled(enabled: boolean): void {
    this.#inlayHintsEnabled = enabled;
  }

  setInlineUxSemanticTokensConsumer(
    consumer: ((document: TextDocument, tokens: SemanticTokens) => void) | null,
  ): void {
    this.#inlineUx.onSemanticTokens = consumer;
  }

  async start(context: ExtensionContext, options: { serverEnv?: Record<string, string> } = {}): Promise<LanguageClient> {
    if (this.#client) return this.#client;
    const serverModule = await resolveServerModule(context, this.#logger, this.#vscode);
    if (options.serverEnv) {
      this.#serverEnv = options.serverEnv;
    }
    const serverEnv = options.serverEnv ?? this.#serverEnv;
    const execOptions = serverEnv ? { env: { ...process.env, ...serverEnv } } : undefined;

    const serverOptions: ServerOptions = {
      run: { module: serverModule, transport: TransportKind.ipc, options: execOptions },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: execOptions
          ? { ...execOptions, execArgv: ["--inspect=6009"] }
          : { execArgv: ["--inspect=6009"] },
      },
    };

    const fileEvents = [
      this.#vscode.workspace.createFileSystemWatcher("**/tsconfig.json"),
      this.#vscode.workspace.createFileSystemWatcher("**/tsconfig.*.json"),
      this.#vscode.workspace.createFileSystemWatcher("**/jsconfig.json"),
      // Watch authored source files that can change Aurelia app facts even when
      // they are not open LSP documents.
      this.#vscode.workspace.createFileSystemWatcher("**/*.html"),
      this.#vscode.workspace.createFileSystemWatcher("**/*.ts"),
      this.#vscode.workspace.createFileSystemWatcher("**/*.js"),
    ];

    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: "file", language: "html" },
        { scheme: "untitled", language: "html" },
        { scheme: "file", language: "typescript" },
        { scheme: "file", language: "javascript" },
      ],
      synchronize: { fileEvents },
      middleware: createMiddleware(this.#vscode, this.#logger, this.#diagnosticsUx, this.#inlineUx, this),
    };

    const client = new LanguageClient("aurelia-ls", "Aurelia Language Server", serverOptions, clientOptions);
    await client.start();
    this.#client = client;
    this.#logger.log("[client] started");
    return client;
  }

  async restart(context: ExtensionContext, options: { serverEnv?: Record<string, string> } = {}): Promise<LanguageClient> {
    const existing = this.#client;
    this.#client = undefined;
    try {
      const started = await this.start(context, options);
      if (existing) {
        try { await existing.stop(); } catch {}
      }
      return started;
    } catch (err) {
      this.#client = existing;
      throw err;
    }
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
