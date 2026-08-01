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

interface LifecycleIntent {
  readonly generation: number;
  readonly invalidated: Promise<void>;
  invalidate(): void;
}

interface PendingPackageChange {
  readonly uri: Uri;
  readonly type: LspFileChangeType;
}

type LifecycleAwaitResult<T> =
  | { readonly status: "completed"; readonly value: T }
  | { readonly status: "invalidated" };

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
  #transitionTail: Promise<void> = Promise.resolve();
  #lifecycleIntent = createLifecycleIntent(0);
  #sessionGeneration = 0;
  #detachedRetirements = new Set<Promise<void>>();
  #pendingPackageChanges = new Map<string, PendingPackageChange>();
  #acceptingLifecycleRequests = false;
  #started = false;
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

  get sessionGeneration(): number {
    return this.#sessionGeneration;
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
    if (!this.#acceptingLifecycleRequests) {
      this.#acceptingLifecycleRequests = true;
      this.#advanceLifecycleIntent();
    }
    const intent = this.#lifecycleIntent;
    await this.#enqueueTransition(async () => {
      if (!this.#isCurrentLifecycle(intent)) return;
      this.#context = context;
      if (options.serverEnv) {
        this.#serverEnv = options.serverEnv;
      }
      this.#ensureLifecycleStarted();
      await this.#runReconcile(false, intent);
    });
  }

  reconcile(options: ReconcileOptions = {}): Promise<void> {
    if (!this.#acceptingLifecycleRequests) return Promise.resolve();
    const intent = this.#advanceLifecycleIntent();
    return this.#enqueueTransition(async () => {
      if (!this.#isCurrentLifecycle(intent)) return;
      await this.#runReconcile(options.reconfirmExisting === true, intent);
    });
  }

  async restart(
    context: ExtensionContext,
    options: { serverEnv?: Record<string, string> } = {},
  ): Promise<void> {
    if (!this.#acceptingLifecycleRequests) return;
    const intent = this.#advanceLifecycleIntent();
    await this.#enqueueTransition(async () => {
      if (!this.#isCurrentLifecycle(intent)) return;
      this.#context = context;
      if (options.serverEnv) {
        this.#serverEnv = options.serverEnv;
      }
      this.#ensureLifecycleStarted();
      await this.#restartSessions(intent);
      if (this.#isCurrentLifecycle(intent)) {
        await this.#runReconcile(false, intent);
      }
    });
  }

  async stop(): Promise<void> {
    this.#acceptingLifecycleRequests = false;
    this.#advanceLifecycleIntent();
    this.#started = false;
    if (this.#sourceAdmissionTimer != null) {
      clearTimeout(this.#sourceAdmissionTimer);
      this.#sourceAdmissionTimer = null;
    }
    this.#lifecycle?.dispose();
    this.#lifecycle = null;
    this.#pendingPackageChanges.clear();
    const sessions = this.sessions;
    this.#publishSessions(new Map());
    await this.#enqueueTransition(async () => {
      await Promise.all(sessions.map(stopSession));
      this.#logger.log("[client] stopped");
    });
  }

  #ensureLifecycleStarted(): void {
    if (this.#started) return;
    const lifecycle = new DisposableStore();
    try {
      this.#installLifecycleListeners(lifecycle);
      this.#lifecycle = lifecycle;
      this.#started = true;
    } catch (error) {
      lifecycle.dispose();
      this.#lifecycle = null;
      this.#started = false;
      throw error;
    }
  }

  #installLifecycleListeners(lifecycle: DisposableStore): void {
    const packageWatcher = this.#vscode.workspace.createFileSystemWatcher("**/package.json");
    lifecycle.add(packageWatcher);
    lifecycle.add(packageWatcher.onDidCreate((uri) => {
      this.#handlePackageChange(uri, LspFileChangeType.Created);
    }));
    lifecycle.add(packageWatcher.onDidChange((uri) => {
      this.#handlePackageChange(uri, LspFileChangeType.Changed);
    }));
    lifecycle.add(packageWatcher.onDidDelete((uri) => {
      this.#handlePackageChange(uri, LspFileChangeType.Deleted);
    }));
    lifecycle.add(this.#vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.#requestReconcile({ reconfirmExisting: true });
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

  #handlePackageChange(uri: Uri, changeType: LspFileChangeType): void {
    if (!isWorkspaceProjectManifestUri(uri) || !this.#acceptingLifecycleRequests) return;
    this.#pendingPackageChanges.set(uri.toString(), { uri, type: changeType });
    this.#requestReconcile({ reconfirmExisting: true });
  }

  #scheduleSourceAdmission(): void {
    if (this.#sourceAdmissionTimer != null) {
      clearTimeout(this.#sourceAdmissionTimer);
    }
    this.#sourceAdmissionTimer = setTimeout(() => {
      this.#sourceAdmissionTimer = null;
      this.#requestReconcile({ reconfirmExisting: true });
    }, 300);
  }

  async #runReconcile(reconfirmExisting: boolean, intent: LifecycleIntent): Promise<void> {
    const packageChanges = new Map(this.#pendingPackageChanges);
    const delivered = await this.#notifyPackageChanges(packageChanges, intent);
    if (!this.#isCurrentLifecycle(intent)) return;
    await this.#reconcileSessions(reconfirmExisting || packageChanges.size > 0, intent);
    if (!delivered || !this.#isCurrentLifecycle(intent)) return;
    for (const [key, change] of packageChanges) {
      if (this.#pendingPackageChanges.get(key) === change) {
        this.#pendingPackageChanges.delete(key);
      }
    }
  }

  async #notifyPackageChanges(
    packageChanges: ReadonlyMap<string, PendingPackageChange>,
    intent: LifecycleIntent,
  ): Promise<boolean> {
    const bySession = new Map<AureliaLanguageClientSession, PendingPackageChange[]>();
    for (const change of packageChanges.values()) {
      const session = this.sessionForUri(change.uri);
      if (session == null) continue;
      const changes = bySession.get(session) ?? [];
      changes.push(change);
      bySession.set(session, changes);
    }
    let delivered = true;
    for (const [session, changes] of bySession) {
      try {
        const result = await this.#awaitLifecycle(
          session.client.sendNotification("workspace/didChangeWatchedFiles", {
            changes: changes.map((change) => ({
              uri: change.uri.toString(),
              type: change.type,
            })),
          }),
          intent,
        );
        if (result.status === "invalidated") return false;
      } catch (error) {
        delivered = false;
        this.#logger.warn(`[client] package topology notification failed for ${session.workspace.uri}: ${errorMessage(error)}`);
      }
    }
    return delivered;
  }

  async #reconcileSessions(reconfirmExisting: boolean, intent: LifecycleIntent): Promise<void> {
    const previousSessions = new Map(this.#sessions);
    const nextSessions = new Map(previousSessions);
    const retiredSessions = new Set<AureliaLanguageClientSession>();
    const createdSessions = new Set<AureliaLanguageClientSession>();
    const folders = this.#vscode.workspace.workspaceFolders ?? [];
    const folderKeys = new Set(folders.map(workspaceFolderKey));
    const admissions: WorkspaceActivationAdmission[] = [];

    for (const folder of folders) {
      const key = workspaceFolderKey(folder);
      const existing = previousSessions.get(key);
      const mode = readWorkspaceActivationMode(this.#vscode, folder);
      let admission: WorkspaceActivationAdmission | null = null;
      try {
        const result = await this.#awaitLifecycle(
          readWorkspaceActivationAdmission(this.#vscode, folder),
          intent,
        );
        if (result.status === "invalidated") {
          await Promise.all([...createdSessions].map(stopSession));
          return;
        }
        admission = result.value;
      } catch (error) {
        this.#logger.warn(`[client] activation preflight failed for ${key}: ${errorMessage(error)}`);
      }
      if (!this.#isCurrentLifecycle(intent)) {
        await Promise.all([...createdSessions].map(stopSession));
        return;
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
    for (const admission of orderWorkspaceAdmissions(admissions)) {
      if (accepted.some((owner) => workspaceFolderContainsUri(owner.folder, admission.folder.uri))) {
        continue;
      }
      const key = workspaceFolderKey(admission.folder);
      let session = previousSessions.get(key);
      if (session == null) {
        try {
          session = await this.#createStartedSession(admission, intent) ?? undefined;
        } catch (error) {
          this.#logger.warn(`[client] failed to start ${key}: ${errorMessage(error)}`);
        }
        if (session != null) createdSessions.add(session);
        if (!this.#isCurrentLifecycle(intent)) {
          await Promise.all([...createdSessions].map(stopSession));
          return;
        }
        if (session == null) {
          continue;
        }
      } else if (reconfirmExisting && admission.mode === AureliaActivationMode.Auto) {
        const statusResult = await this.#awaitLifecycle(
          readWorkspaceStatus(session.client, this.#logger, session.workspace.uri),
          intent,
        );
        if (statusResult.status === "invalidated" || !this.#isCurrentLifecycle(intent)) {
          await Promise.all([...createdSessions].map(stopSession));
          return;
        }
        const status = statusResult.value;
        if (status != null && !workspaceStatusConfirmsAurelia(status)) {
          nextSessions.delete(key);
          retiredSessions.add(session);
          continue;
        }
        if (status != null && status !== session.status) {
          session = { ...session, status };
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
      }
      nextSessions.set(key, session);
      accepted.push(admission);
    }

    const acceptedKeys = new Set(accepted.map((admission) => workspaceFolderKey(admission.folder)));
    for (const session of previousSessions.values()) {
      if (!folderKeys.has(session.workspace.key) || !acceptedKeys.has(session.workspace.key)) {
        nextSessions.delete(session.workspace.key);
        retiredSessions.add(session);
      }
    }
    if (!this.#isCurrentLifecycle(intent)) {
      await Promise.all([...createdSessions].map(stopSession));
      return;
    }
    this.#publishSessions(nextSessions);
    await Promise.all([...retiredSessions].map(stopSession));
  }

  async #restartSessions(intent: LifecycleIntent): Promise<void> {
    for (const existing of this.sessions) {
      let replacement: AureliaLanguageClientSession | null = null;
      try {
        replacement = await this.#createStartedSession({
          folder: existing.folder,
          mode: existing.activationMode,
          evidence: existing.activationEvidence,
        }, intent);
      } catch (error) {
        this.#logger.warn(`[client] restart failed for ${existing.workspace.uri}: ${errorMessage(error)}`);
      }
      if (!this.#isCurrentLifecycle(intent)) {
        if (replacement != null) await stopSession(replacement);
        return;
      }
      if (replacement == null) continue;
      const nextSessions = new Map(this.#sessions);
      nextSessions.set(existing.workspace.key, replacement);
      this.#publishSessions(nextSessions);
      await stopSession(existing);
      if (!this.#isCurrentLifecycle(intent)) return;
    }
  }

  async #createStartedSession(
    admission: WorkspaceActivationAdmission,
    intent: LifecycleIntent,
  ): Promise<AureliaLanguageClientSession | null> {
    const context = this.#context;
    if (context == null) {
      throw new Error("Cannot create an Aurelia workspace session before extension activation.");
    }
    if (this.#serverModule == null) {
      const pending = resolveServerModule(context, this.#logger, this.#vscode);
      this.#serverModule = pending;
      void pending.catch(() => {
        if (this.#serverModule === pending) this.#serverModule = null;
      });
    }
    const serverModuleResult = await this.#awaitLifecycle(this.#serverModule, intent);
    if (serverModuleResult.status === "invalidated") return null;
    const serverModule = serverModuleResult.value;
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
      const clientResult = await this.#awaitLifecycle(
        this.#newLanguageClient(
          `aurelia-ls:${key}`,
          `Aurelia Language Server (${admission.folder.name})`,
          serverOptions,
          clientOptions,
        ),
        intent,
      );
      if (clientResult.status === "invalidated") {
        disposeWatchers(fileEvents);
        return null;
      }
      client = clientResult.value;
      const start = client.start();
      const startResult = await this.#awaitLifecycle(start, intent);
      if (startResult.status === "invalidated") {
        this.#retireAfterStart(client, start, fileEvents);
        return null;
      }
      let status: WorkspaceStatusResponse | null = null;
      if (admission.mode === AureliaActivationMode.Auto) {
        const statusResult = await this.#awaitLifecycle(
          readWorkspaceStatus(client, this.#logger, workspace.uri),
          intent,
        );
        if (statusResult.status === "invalidated") {
          await client.stop().catch(() => {});
          disposeWatchers(fileEvents);
          return null;
        }
        status = statusResult.value;
      }
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

  #requestReconcile(options: ReconcileOptions): void {
    void this.reconcile(options).catch((error) => {
      this.#logger.warn(`[client] workspace reconciliation failed: ${errorMessage(error)}`);
    });
  }

  #retireAfterStart(
    client: LanguageClient,
    start: Promise<void>,
    fileEvents: readonly FileSystemWatcher[],
  ): void {
    disposeWatchers(fileEvents);
    let retirement: Promise<void>;
    retirement = start
      .then(async () => {
        try {
          await client.stop();
        } catch (error) {
          this.#logger.warn(`[client] detached client retirement failed: ${errorMessage(error)}`);
        }
      }, () => {})
      .finally(() => {
        disposeWatchers(fileEvents);
        this.#detachedRetirements.delete(retirement);
      });
    this.#detachedRetirements.add(retirement);
  }

  #enqueueTransition(operation: () => Promise<void>): Promise<void> {
    const result = this.#transitionTail.then(operation, operation);
    this.#transitionTail = result.catch(() => {});
    return result;
  }

  #advanceLifecycleIntent(): LifecycleIntent {
    const previous = this.#lifecycleIntent;
    const next = createLifecycleIntent(previous.generation + 1);
    this.#lifecycleIntent = next;
    previous.invalidate();
    return next;
  }

  async #awaitLifecycle<T>(promise: Promise<T>, intent: LifecycleIntent): Promise<LifecycleAwaitResult<T>> {
    if (!this.#isCurrentLifecycle(intent)) return { status: "invalidated" };
    return Promise.race([
      promise.then((value): LifecycleAwaitResult<T> => ({ status: "completed", value })),
      intent.invalidated.then((): LifecycleAwaitResult<T> => ({ status: "invalidated" })),
    ]);
  }

  #isCurrentLifecycle(intent: LifecycleIntent): boolean {
    return this.#acceptingLifecycleRequests
      && intent === this.#lifecycleIntent;
  }

  #publishSessions(nextSessions: Map<string, AureliaLanguageClientSession>): void {
    if (sameSessions(this.#sessions, nextSessions)) return;
    this.#sessions = nextSessions;
    this.#sessionGeneration += 1;
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

function sameSessions(
  left: ReadonlyMap<string, AureliaLanguageClientSession>,
  right: ReadonlyMap<string, AureliaLanguageClientSession>,
): boolean {
  if (left.size !== right.size) return false;
  for (const [key, session] of left) {
    if (right.get(key) !== session) return false;
  }
  return true;
}

function createLifecycleIntent(generation: number): LifecycleIntent {
  let invalidated = false;
  let resolveInvalidation!: () => void;
  const invalidation = new Promise<void>((resolve) => {
    resolveInvalidation = resolve;
  });
  return {
    generation,
    invalidated: invalidation,
    invalidate() {
      if (invalidated) return;
      invalidated = true;
      resolveInvalidation();
    },
  };
}
