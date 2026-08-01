import type { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from "vscode-languageclient/node";
import type {
  ExtensionContext,
  FileSystemWatcher,
  SemanticTokens,
  TextDocument,
  Uri,
  WorkspaceFolder,
} from "vscode";
import type { WorkspaceStatusResponse } from "@aurelia-ls/language-server/protocol";
import type { AureliaWorkspaceIdentity } from "./types.js";
import { createMiddleware, type DiagnosticsUxState, type InlineUxState } from "./client-middleware.js";
import { DisposableStore, type DisposableLike } from "./core/disposables.js";
import { SimpleEmitter, type Listener } from "./core/events.js";
import { type ClientLogger } from "./log.js";
import { getVscodeApi, type VscodeApi } from "./vscode-api.js";
import {
  AureliaActivationMode,
  isWorkspaceProjectManifestUri,
  type WorkspaceActivationAdmission,
  WorkspaceActivationEvidenceKind,
  orderWorkspaceAdmissions,
  readWorkspaceActivationAdmission,
  readWorkspaceActivationMode,
  workspaceFolderContainsUri,
  workspaceFolderKey,
  workspaceStatusConfirmsAurelia,
} from "./workspace-activation.js";

export interface AureliaLanguageClientSession {
  readonly workspace: AureliaWorkspaceIdentity;
  readonly folder: WorkspaceFolder;
  readonly client: LanguageClient;
  readonly activationMode: AureliaActivationMode;
  readonly activationEvidence: WorkspaceActivationEvidenceKind;
  readonly status: WorkspaceStatusResponse | null;
  readonly fileEvents: readonly FileSystemWatcher[];
}

type LanguageClientFactory = (
  id: string,
  name: string,
  serverOptions: ServerOptions,
  clientOptions: LanguageClientOptions,
) => LanguageClient;

export interface AureliaLanguageClientOptions {
  readonly createClient?: LanguageClientFactory;
}

interface ReconcileOptions {
  readonly reconfirmExisting?: boolean;
}

const SOURCE_LANGUAGE_IDS = new Set([
  "typescript",
  "typescriptreact",
  "javascript",
  "javascriptreact",
]);

// vscode-languageclient declares IPC as TransportKind.ipc = 1. Keeping the
// protocol value here lets candidate detection stay host-independent; the real
// client module is loaded only after a workspace has passed preflight.
const IPC_TRANSPORT = 1 as TransportKind;

// LSP FileChangeType values. The manager owns package-manifest watching so it
// can order topology invalidation before semantic workspace confirmation.
const enum LspFileChangeType {
  Created = 1,
  Changed = 2,
  Deleted = 3,
}

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

/** Owns one language-client/server session for each disjoint active VS Code workspace root. */
export class AureliaLanguageClient {
  #sessions = new Map<string, AureliaLanguageClientSession>();
  #logger: ClientLogger;
  #vscode: VscodeApi;
  #createClient: LanguageClientFactory | null;
  #serverEnv: Record<string, string> | null = null;
  #diagnosticsUx: DiagnosticsUxState = { enabled: false };
  #inlineUx: InlineUxState = { enabled: false, onSemanticTokens: null };
  #inlayHintsEnabled = true;
  #context: ExtensionContext | null = null;
  #serverModule: Promise<string> | null = null;
  #lifecycle: DisposableStore | null = null;
  #sessionsChanged = new SimpleEmitter<readonly AureliaLanguageClientSession[]>();
  #started = false;
  #reconciling = false;
  #reconcilePending = false;
  #reconfirmPending = false;
  #sourceAdmissionTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    logger: ClientLogger,
    vscode: VscodeApi = getVscodeApi(),
    options: AureliaLanguageClientOptions = {},
  ) {
    this.#logger = logger;
    this.#vscode = vscode;
    this.#createClient = options.createClient ?? null;
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

  get sessions(): readonly AureliaLanguageClientSession[] {
    return [...this.#sessions.values()]
      .sort((left, right) => left.workspace.uri.localeCompare(right.workspace.uri));
  }

  get hasSessions(): boolean {
    return this.#sessions.size > 0;
  }

  onDidChangeSessions(listener: Listener<readonly AureliaLanguageClientSession[]>): DisposableLike {
    return this.#sessionsChanged.on(listener);
  }

  clientForUri(uri: string | Uri): LanguageClient | undefined {
    return this.sessionForUri(uri)?.client;
  }

  sessionForUri(uri: string | Uri): AureliaLanguageClientSession | undefined {
    const target = typeof uri === "string" ? this.#vscode.Uri.parse(uri) : uri;
    return this.sessions
      .filter((session) => workspaceFolderContainsUri(session.folder, target))
      .sort((left, right) => right.folder.uri.fsPath.length - left.folder.uri.fsPath.length)[0];
  }

  async start(
    context: ExtensionContext,
    options: { serverEnv?: Record<string, string> } = {},
  ): Promise<void> {
    this.#context = context;
    if (options.serverEnv) {
      this.#serverEnv = options.serverEnv;
    }
    if (!this.#started) {
      this.#started = true;
      this.#lifecycle = new DisposableStore();
      this.#installLifecycleListeners();
    }
    await this.reconcile();
  }

  async reconcile(options: ReconcileOptions = {}): Promise<void> {
    if (!this.#started) {
      return;
    }
    this.#reconcilePending = true;
    this.#reconfirmPending ||= options.reconfirmExisting === true;
    if (this.#reconciling) {
      return;
    }
    this.#reconciling = true;
    try {
      while (this.#reconcilePending) {
        this.#reconcilePending = false;
        const reconfirmExisting = this.#reconfirmPending;
        this.#reconfirmPending = false;
        await this.#reconcileSessions(reconfirmExisting);
      }
    } finally {
      this.#reconciling = false;
    }
  }

  async restart(
    context: ExtensionContext,
    options: { serverEnv?: Record<string, string> } = {},
  ): Promise<void> {
    this.#context = context;
    if (options.serverEnv) {
      this.#serverEnv = options.serverEnv;
    }
    let changed = false;
    for (const existing of this.sessions) {
      try {
        const replacement = await this.#createStartedSession({
          folder: existing.folder,
          mode: existing.activationMode,
          evidence: existing.activationEvidence,
        });
        if (replacement == null) {
          continue;
        }
        this.#sessions.set(existing.workspace.key, replacement);
        await stopSession(existing);
        changed = true;
      } catch (error) {
        this.#logger.warn(`[client] restart failed for ${existing.workspace.uri}: ${errorMessage(error)}`);
      }
    }
    if (changed) {
      this.#emitSessionsChanged();
    }
  }

  async stop(): Promise<void> {
    this.#started = false;
    if (this.#sourceAdmissionTimer != null) {
      clearTimeout(this.#sourceAdmissionTimer);
      this.#sourceAdmissionTimer = null;
    }
    this.#lifecycle?.dispose();
    this.#lifecycle = null;
    const sessions = this.sessions;
    this.#sessions.clear();
    await Promise.all(sessions.map(stopSession));
    if (sessions.length > 0) {
      this.#emitSessionsChanged();
    }
    this.#logger.log("[client] stopped");
  }

  #installLifecycleListeners(): void {
    const lifecycle = this.#lifecycle;
    if (lifecycle == null) {
      throw new Error("Cannot install workspace listeners before the client manager starts.");
    }
    const packageWatcher = this.#vscode.workspace.createFileSystemWatcher("**/package.json");
    lifecycle.add(packageWatcher.onDidCreate((uri) => {
      void this.#handlePackageChange(uri, LspFileChangeType.Created);
    }));
    lifecycle.add(packageWatcher.onDidChange((uri) => {
      void this.#handlePackageChange(uri, LspFileChangeType.Changed);
    }));
    lifecycle.add(packageWatcher.onDidDelete((uri) => {
      void this.#handlePackageChange(uri, LspFileChangeType.Deleted);
    }));
    lifecycle.add(packageWatcher);
    lifecycle.add(this.#vscode.workspace.onDidChangeWorkspaceFolders(() => {
      void this.reconcile({ reconfirmExisting: true });
    }));
    lifecycle.add(this.#vscode.workspace.onDidOpenTextDocument((document) => {
      if (SOURCE_LANGUAGE_IDS.has(document.languageId) && this.sessionForUri(document.uri) == null) {
        this.#scheduleSourceAdmission();
      }
    }));
    lifecycle.add(this.#vscode.workspace.onDidSaveTextDocument((document) => {
      const session = this.sessionForUri(document.uri);
      if (
        SOURCE_LANGUAGE_IDS.has(document.languageId)
        && (session == null || session.activationEvidence === WorkspaceActivationEvidenceKind.OpenSourceDocument)
      ) {
        this.#scheduleSourceAdmission();
      }
    }));
    lifecycle.add(this.#vscode.workspace.onDidCloseTextDocument((document) => {
      if (
        SOURCE_LANGUAGE_IDS.has(document.languageId)
        && this.sessionForUri(document.uri)?.activationEvidence === WorkspaceActivationEvidenceKind.OpenSourceDocument
      ) {
        this.#scheduleSourceAdmission();
      }
    }));
  }

  async #handlePackageChange(uri: Uri, changeType: LspFileChangeType): Promise<void> {
    if (!isWorkspaceProjectManifestUri(uri)) {
      return;
    }
    const session = this.sessionForUri(uri);
    if (session != null) {
      try {
        // Do not also put package.json in the session synchronize watchers.
        // Sending this standard notification here guarantees its topology
        // invalidation is ordered before the status request on the same client.
        await session.client.sendNotification("workspace/didChangeWatchedFiles", {
          changes: [{ uri: uri.toString(), type: changeType }],
        });
      } catch (error) {
        this.#logger.warn(`[client] package topology notification failed for ${uri.toString()}: ${errorMessage(error)}`);
      }
    }
    await this.reconcile({ reconfirmExisting: true });
  }

  #scheduleSourceAdmission(): void {
    if (this.#sourceAdmissionTimer != null) {
      clearTimeout(this.#sourceAdmissionTimer);
    }
    this.#sourceAdmissionTimer = setTimeout(() => {
      this.#sourceAdmissionTimer = null;
      void this.reconcile({ reconfirmExisting: true });
    }, 300);
  }

  async #reconcileSessions(reconfirmExisting: boolean): Promise<void> {
    const folders = this.#vscode.workspace.workspaceFolders ?? [];
    const folderKeys = new Set(folders.map(workspaceFolderKey));
    const admissions: WorkspaceActivationAdmission[] = [];

    for (const folder of folders) {
      const key = workspaceFolderKey(folder);
      const existing = this.#sessions.get(key);
      const mode = readWorkspaceActivationMode(this.#vscode, folder);
      let admission: WorkspaceActivationAdmission | null = null;
      try {
        admission = await readWorkspaceActivationAdmission(this.#vscode, folder);
      } catch (error) {
        this.#logger.warn(`[client] activation preflight failed for ${key}: ${errorMessage(error)}`);
      }
      if (admission != null) {
        admissions.push(admission);
      } else if (existing != null && mode !== AureliaActivationMode.Off) {
        // Once semantic-runtime has confirmed a source-only workspace, keep the
        // session long enough to let that authority re-evaluate future changes.
        admissions.push({
          folder,
          mode,
          evidence: existing.activationEvidence,
        });
      }
    }

    const accepted: WorkspaceActivationAdmission[] = [];
    let changed = false;
    for (const admission of orderWorkspaceAdmissions(admissions)) {
      if (accepted.some((owner) => workspaceFolderContainsUri(owner.folder, admission.folder.uri))) {
        continue;
      }
      const key = workspaceFolderKey(admission.folder);
      let session = this.#sessions.get(key);
      if (session == null) {
        try {
          session = await this.#createStartedSession(admission) ?? undefined;
        } catch (error) {
          this.#logger.warn(`[client] failed to start ${key}: ${errorMessage(error)}`);
        }
        if (session == null) {
          continue;
        }
        this.#sessions.set(key, session);
        changed = true;
      } else if (reconfirmExisting && admission.mode === AureliaActivationMode.Auto) {
        const status = await readWorkspaceStatus(session.client, this.#logger, session.workspace.uri);
        if (status != null && !workspaceStatusConfirmsAurelia(status)) {
          this.#sessions.delete(key);
          await stopSession(session);
          changed = true;
          continue;
        }
        if (status != null && status !== session.status) {
          session = { ...session, status };
          this.#sessions.set(key, session);
        }
      }
      if (
        session.activationMode !== admission.mode
        || session.activationEvidence !== admission.evidence
      ) {
        session = {
          ...session,
          activationMode: admission.mode,
          activationEvidence: admission.evidence,
        };
        this.#sessions.set(key, session);
      }
      accepted.push(admission);
    }

    const acceptedKeys = new Set(accepted.map((admission) => workspaceFolderKey(admission.folder)));
    for (const session of this.sessions) {
      if (!folderKeys.has(session.workspace.key) || !acceptedKeys.has(session.workspace.key)) {
        this.#sessions.delete(session.workspace.key);
        await stopSession(session);
        changed = true;
      }
    }
    if (changed) {
      this.#emitSessionsChanged();
    }
  }

  async #createStartedSession(
    admission: WorkspaceActivationAdmission,
  ): Promise<AureliaLanguageClientSession | null> {
    const context = this.#context;
    if (context == null) {
      throw new Error("Cannot create an Aurelia workspace session before extension activation.");
    }
    this.#serverModule ??= resolveServerModule(context, this.#logger, this.#vscode);
    const serverModule = await this.#serverModule;
    const execOptions = this.#serverEnv ? { env: { ...process.env, ...this.#serverEnv } } : undefined;
    const serverOptions: ServerOptions = {
      run: { module: serverModule, transport: IPC_TRANSPORT, options: execOptions },
      debug: {
        module: serverModule,
        transport: IPC_TRANSPORT,
        options: execOptions
          ? { ...execOptions, execArgv: ["--inspect=6009"] }
          : { execArgv: ["--inspect=6009"] },
      },
    };
    const fileEvents = this.#createSessionWatchers(admission.folder);
    let client: LanguageClient | undefined;
    const owner = this;
    const middlewareClient = {
      get client() {
        return client;
      },
      get inlayHintsEnabled() {
        return owner.#inlayHintsEnabled;
      },
    };
    const clientOptions: LanguageClientOptions = {
      workspaceFolder: admission.folder,
      documentSelector: workspaceDocumentSelector(admission.folder),
      synchronize: { fileEvents },
      middleware: createMiddleware(
        this.#vscode,
        this.#logger,
        this.#diagnosticsUx,
        this.#inlineUx,
        middlewareClient,
      ),
    };
    const key = workspaceFolderKey(admission.folder);
    const workspace: AureliaWorkspaceIdentity = {
      key,
      name: admission.folder.name,
      uri: admission.folder.uri.toString(),
    };
    try {
      client = await this.#newLanguageClient(
        `aurelia-ls:${key}`,
        `Aurelia Language Server (${admission.folder.name})`,
        serverOptions,
        clientOptions,
      );
      await client.start();
      const status = admission.mode === AureliaActivationMode.Auto
        ? await readWorkspaceStatus(client, this.#logger, workspace.uri)
        : null;
      if (admission.mode === AureliaActivationMode.Auto && !workspaceStatusConfirmsAurelia(status)) {
        this.#logger.log(`[client] semantic project shape did not confirm candidate workspace ${workspace.uri}`);
        await client.stop().catch(() => {});
        disposeWatchers(fileEvents);
        return null;
      }
      this.#logger.log(
        `[client] started ${workspace.uri} from ${admission.evidence}`,
      );
      return {
        workspace,
        folder: admission.folder,
        client,
        activationMode: admission.mode,
        activationEvidence: admission.evidence,
        status,
        fileEvents,
      };
    } catch (error) {
      if (client != null) {
        await client.stop().catch(() => {});
      }
      disposeWatchers(fileEvents);
      throw error;
    }
  }

  #createSessionWatchers(folder: WorkspaceFolder): FileSystemWatcher[] {
    return [
      "**/tsconfig.json",
      "**/tsconfig.*.json",
      "**/jsconfig.json",
      "**/*.html",
      "**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}",
    ].map((glob) => this.#vscode.workspace.createFileSystemWatcher(
      new this.#vscode.RelativePattern(folder, glob),
    ));
  }

  async #newLanguageClient(
    id: string,
    name: string,
    serverOptions: ServerOptions,
    clientOptions: LanguageClientOptions,
  ): Promise<LanguageClient> {
    this.#createClient ??= await import("vscode-languageclient/node")
      .then(({ LanguageClient: Client }) => (
        clientId: string,
        clientName: string,
        options: ServerOptions,
        languageOptions: LanguageClientOptions,
      ) => new Client(clientId, clientName, options, languageOptions));
    const createClient = this.#createClient;
    if (createClient == null) {
      throw new Error("vscode-languageclient did not provide a LanguageClient constructor.");
    }
    return createClient(id, name, serverOptions, clientOptions);
  }

  #emitSessionsChanged(): void {
    this.#sessionsChanged.emit(this.sessions);
  }
}

function workspaceDocumentSelector(
  folder: WorkspaceFolder,
): LanguageClientOptions["documentSelector"] {
  // LanguageClientOptions uses protocol document selectors, not VS Code's
  // structurally similar RelativePattern. The client converts this URI-backed
  // protocol shape into a real vscode.RelativePattern before registration.
  const pattern = { baseUri: folder.uri.toString(), pattern: "**/*" };
  return [
    { scheme: folder.uri.scheme, language: "html", pattern },
    { scheme: folder.uri.scheme, language: "typescript", pattern },
    { scheme: folder.uri.scheme, language: "typescriptreact", pattern },
    { scheme: folder.uri.scheme, language: "javascript", pattern },
    { scheme: folder.uri.scheme, language: "javascriptreact", pattern },
  ];
}

async function readWorkspaceStatus(
  client: LanguageClient,
  logger: ClientLogger,
  workspaceUri: string,
): Promise<WorkspaceStatusResponse | null> {
  try {
    return await client.sendRequest<WorkspaceStatusResponse | null>("aurelia/workspaceStatus");
  } catch (error) {
    // Initial admission fails closed on null; an established session may keep
    // running through a transient reconfirmation failure.
    logger.warn(`[client] workspace status unavailable for ${workspaceUri}: ${errorMessage(error)}`);
    return null;
  }
}

async function stopSession(session: AureliaLanguageClientSession): Promise<void> {
  try {
    await session.client.stop();
  } catch {
    // Extension shutdown/restart must continue across an already-failed server.
  }
  disposeWatchers(session.fileEvents);
}

function disposeWatchers(watchers: readonly FileSystemWatcher[]): void {
  for (const watcher of watchers) {
    try {
      watcher.dispose();
    } catch {
      // Best-effort shutdown after the owning language client has stopped.
    }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
