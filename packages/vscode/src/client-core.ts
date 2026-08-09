import type { LanguageClient, LanguageClientOptions } from "vscode-languageclient/node";
import {
  DidChangeWatchedFilesNotification,
  FileChangeType,
} from "vscode-languageserver-protocol";
import type {
  Disposable,
  Event,
  EventEmitter,
  ExtensionContext,
  FileSystemWatcher,
  Uri,
  WorkspaceFolder,
} from "vscode";
import { AureliaProtocolRequest } from "@aurelia-ls/language-server/protocol";
import type {
  AnalysisChangedPayload,
  AureliaInitializeOptions,
  WorkspaceStatusParams,
  WorkspaceStatusResponse,
} from "@aurelia-ls/language-server/protocol";
import type { AureliaWorkspaceIdentity } from "./types.js";
import { createMiddleware } from "./client-middleware.js";
import { type ClientLogger } from "./log.js";
import type { VscodeApi } from "./vscode-api.js";
import {
  AureliaActivationMode,
  globalActivationTopologyOwner,
  isWorkspaceNativeProjectConfigurationUri,
  type WorkspaceActivationAdmission,
  WorkspaceActivationEvidenceKind,
  orderWorkspaceAdmissions,
  readWorkspaceActivationAdmission,
  readWorkspaceActivationTopology,
  workspaceFolderContainsUri,
  workspaceFolderKey,
  workspaceStatusConfirmsSessionRetention,
} from "./workspace-activation.js";
import { documentUriIdentityKey } from "./core/uri-identity.js";

export interface AureliaLanguageClientSession {
  readonly workspace: AureliaWorkspaceIdentity;
  readonly folder: WorkspaceFolder;
  readonly client: LanguageClient;
  readonly activationMode: AureliaActivationMode;
  readonly activationEvidence: WorkspaceActivationEvidenceKind;
  readonly nativeProjectConfigurationUris: readonly Uri[];
  readonly status: WorkspaceStatusResponse | null;
  readonly excludedFolders: readonly WorkspaceFolder[];
  readonly projectRootHintFolders: readonly WorkspaceFolder[];
  readonly fileEvents: readonly FileSystemWatcher[];
}

export type LanguageClientFactory = (
  id: string,
  name: string,
  serverModule: string,
  clientOptions: LanguageClientOptions,
) => LanguageClient;

export interface AureliaLanguageClientOptions {
  readonly createClient: LanguageClientFactory;
}

interface ReconcileOptions {
  readonly reconfirmExisting?: boolean;
}

interface RejectedSessionWitness {
  readonly workspaceKey: string;
  readonly client: LanguageClient;
  readonly fingerprint: string;
  readonly nativeProjectConfigurationUris: readonly Uri[];
  readonly projectRootHintFolders: readonly WorkspaceFolder[];
}

interface ReconcileScope {
  readonly workspaceKeys: ReadonlySet<string>;
  readonly rejectedSession: RejectedSessionWitness;
}

interface LifecycleIntent {
  readonly generation: number;
  readonly invalidated: Promise<void>;
  invalidate(): void;
}

interface PendingTopologyChange {
  readonly uri: Uri;
  readonly type: FileChangeType;
}

type LifecycleAwaitResult<T> =
  | { readonly status: "completed"; readonly value: T }
  | { readonly status: "invalidated" };

const SCRIPT_LANGUAGE_IDS = new Set([
  "typescript",
  "typescriptreact",
  "javascript",
  "javascriptreact",
]);

const ANALYZED_DOCUMENT_LANGUAGE_IDS = [
  "html",
  "typescript",
  "typescriptreact",
  "javascript",
  "javascriptreact",
  "css",
] as const;

// vscode-languageclient defaults to two seconds, which is shorter than one cold
// semantic-runtime compilation. Session reconciliation does not wait on this
// process deadline; extension deactivation does, and therefore remains bounded.
const LANGUAGE_SERVER_SHUTDOWN_TIMEOUT_MS = 30_000;

async function fileExists(vscode: VscodeApi, p: string): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(p));
    return true;
  } catch {
    return false;
  }
}

async function uriIsDirectory(vscode: VscodeApi, uri: Uri): Promise<boolean> {
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    return (stat.type & vscode.FileType.Directory) !== 0;
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
  readonly #createClient: LanguageClientFactory;
  #context: ExtensionContext | null = null;
  #serverModule: Promise<string> | null = null;
  #lifecycle: Disposable | null = null;
  readonly #sessionsChanged: EventEmitter<readonly AureliaLanguageClientSession[]>;
  readonly onDidChangeSessions: Event<readonly AureliaLanguageClientSession[]>;
  #transitionTail: Promise<void> = Promise.resolve();
  readonly #retirements = new Map<LanguageClient, Promise<void>>();
  #lifecycleIntent = createLifecycleIntent(0);
  #pendingTopologyChanges = new Map<string, PendingTopologyChange>();
  #acceptingLifecycleRequests = false;
  #startConsumed = false;
  #stopRequest: Promise<void> | null = null;
  #started = false;
  #sourceAdmissionTimer: ReturnType<typeof setTimeout> | null = null;
  readonly #latestTopologyFingerprintByClient = new Map<LanguageClient, string>();

  constructor(
    logger: ClientLogger,
    vscode: VscodeApi,
    options: AureliaLanguageClientOptions,
  ) {
    this.#logger = logger;
    this.#vscode = vscode;
    this.#createClient = options.createClient;
    this.#sessionsChanged = new vscode.EventEmitter<readonly AureliaLanguageClientSession[]>();
    this.onDidChangeSessions = this.#sessionsChanged.event;
  }

  get sessions(): readonly AureliaLanguageClientSession[] {
    return [...this.#sessions.values()]
      .sort((left, right) => left.workspace.uri.localeCompare(right.workspace.uri));
  }

  get hasSessions(): boolean {
    return this.#sessions.size > 0;
  }

  clientForUri(uri: string | Uri): LanguageClient | undefined {
    return this.sessionForUri(uri)?.client;
  }

  sessionForUri(uri: string | Uri): AureliaLanguageClientSession | undefined {
    const target = typeof uri === "string" ? this.#vscode.Uri.parse(uri) : uri;
    return this.sessions
      .filter((session) =>
        workspaceFolderContainsUri(session.folder, target)
        && !session.excludedFolders.some((folder) => workspaceFolderContainsUri(folder, target))
      )
      .sort((left, right) => right.folder.uri.fsPath.length - left.folder.uri.fsPath.length)[0];
  }

  async start(context: ExtensionContext): Promise<void> {
    if (this.#startConsumed || this.#stopRequest != null) {
      throw new Error("Aurelia language-client ownership may start only once.");
    }
    this.#startConsumed = true;
    this.#acceptingLifecycleRequests = true;
    this.#advanceLifecycleIntent();
    const intent = this.#lifecycleIntent;
    await this.#enqueueTransition(async () => {
      if (!this.#isCurrentLifecycle(intent)) return;
      this.#context = context;
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

  /** Reconfirm one settled semantic topology before consumers query a possibly withdrawing session. */
  async reconfirmSessionTopology(
    observedSession: AureliaLanguageClientSession,
    payload: AnalysisChangedPayload,
  ): Promise<boolean> {
    if (payload.changeKind !== "topology") return true;
    if (!this.#acceptingLifecycleRequests) return false;
    this.#latestTopologyFingerprintByClient.set(observedSession.client, payload.fingerprint);
    const intent = this.#lifecycleIntent;
    let shouldDispatch = false;
    await this.#enqueueTransition(async () => {
      if (!this.#isCurrentLifecycle(intent)) return;
      const current = this.#sessions.get(observedSession.workspace.key);
      if (current?.client !== observedSession.client) return;
      if (this.#latestTopologyFingerprintByClient.get(current.client) !== payload.fingerprint) return;
      if (current.activationMode === AureliaActivationMode.On || current.status?.fingerprint === payload.fingerprint) {
        shouldDispatch = true;
        return;
      }

      const candidatesResult = await this.#awaitLifecycle(
        this.#refreshNativeProjectConfigurationCandidates(current),
        intent,
      );
      if (candidatesResult.status === "invalidated") return;
      const nativeProjectConfigurationUris = candidatesResult.value;
      if (this.#latestTopologyFingerprintByClient.get(current.client) !== payload.fingerprint) return;
      const statusResult = await this.#awaitLifecycle(
        readWorkspaceStatus(
          current.client,
          this.#logger,
          current.workspace.uri,
          nativeProjectConfigurationUris,
        ),
        intent,
      );
      if (statusResult.status === "invalidated" || !this.#isCurrentLifecycle(intent)) return;
      if (this.#latestTopologyFingerprintByClient.get(current.client) !== payload.fingerprint) return;
      const status = statusResult.value;
      if (status == null) {
        this.#replaceSessionMetadata(current, nativeProjectConfigurationUris, null);
        shouldDispatch = true;
        return;
      }
      if (status.fingerprint !== payload.fingerprint) {
        return;
      }
      if (workspaceStatusConfirmsSessionRetention(this.#vscode, status, nativeProjectConfigurationUris)) {
        this.#replaceSessionMetadata(current, nativeProjectConfigurationUris, status);
        shouldDispatch = true;
        return;
      }

      this.#replaceSessionMetadata(current, nativeProjectConfigurationUris, status);
      const workspaceKeys = containmentConnectedWorkspaceKeys(
        this.#vscode.workspace.workspaceFolders ?? [],
        current.folder,
      );
      await this.#reconcileSessions(false, intent, {
        workspaceKeys,
        rejectedSession: {
          workspaceKey: current.workspace.key,
          client: current.client,
          fingerprint: payload.fingerprint,
          nativeProjectConfigurationUris,
          projectRootHintFolders: current.projectRootHintFolders,
        },
      });
    });
    return shouldDispatch;
  }

  stop(): Promise<void> {
    return this.#stopRequest ??= this.#runStop();
  }

  async #runStop(): Promise<void> {
    if (!this.#acceptingLifecycleRequests && !this.#started) return;
    this.#acceptingLifecycleRequests = false;
    this.#advanceLifecycleIntent();
    this.#started = false;
    if (this.#sourceAdmissionTimer != null) {
      clearTimeout(this.#sourceAdmissionTimer);
      this.#sourceAdmissionTimer = null;
    }
    this.#lifecycle?.dispose();
    this.#lifecycle = null;
    this.#pendingTopologyChanges.clear();
    this.#latestTopologyFingerprintByClient.clear();
    const sessions = this.sessions;
    this.#publishSessions(new Map());
    for (const session of sessions) {
      void this.#retireSession(session);
    }
    await this.#enqueueTransition(async () => {
      await this.#drainRetirements();
      this.#sessionsChanged.dispose();
      this.#logger.log("[client] stopped");
    });
  }

  #ensureLifecycleStarted(): void {
    if (this.#started) return;
    const lifecycle: Disposable[] = [];
    try {
      this.#installLifecycleListeners(lifecycle);
      this.#lifecycle = this.#vscode.Disposable.from(...lifecycle);
      this.#started = true;
    } catch (error) {
      this.#vscode.Disposable.from(...lifecycle).dispose();
      this.#lifecycle = null;
      this.#started = false;
      throw error;
    }
  }

  #installLifecycleListeners(lifecycle: Disposable[]): void {
    const packageWatcher = this.#vscode.workspace.createFileSystemWatcher("**/package.json");
    lifecycle.push(packageWatcher);
    lifecycle.push(packageWatcher.onDidCreate((uri) => {
      this.#handlePackageChange(uri, FileChangeType.Created);
    }));
    lifecycle.push(packageWatcher.onDidChange((uri) => {
      this.#handlePackageChange(uri, FileChangeType.Changed);
    }));
    lifecycle.push(packageWatcher.onDidDelete((uri) => {
      this.#handlePackageChange(uri, FileChangeType.Deleted);
    }));
    const projectConfigurationWatcher = this.#vscode.workspace.createFileSystemWatcher("**/aurelia.project.json");
    lifecycle.push(projectConfigurationWatcher);
    lifecycle.push(projectConfigurationWatcher.onDidCreate((uri) => {
      this.#handleProjectConfigurationChange(uri, FileChangeType.Created);
    }));
    lifecycle.push(projectConfigurationWatcher.onDidChange((uri) => {
      this.#handleProjectConfigurationChange(uri, FileChangeType.Changed);
    }));
    lifecycle.push(projectConfigurationWatcher.onDidDelete((uri) => {
      this.#handleProjectConfigurationChange(uri, FileChangeType.Deleted);
    }));
    lifecycle.push(this.#vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.#requestReconcile({ reconfirmExisting: true });
    }));
    lifecycle.push(this.#vscode.workspace.onDidOpenTextDocument((document) => {
      if (
        SCRIPT_LANGUAGE_IDS.has(document.languageId)
        && !this.#isDisabledUri(document.uri)
        && this.sessionForUri(document.uri) == null
      ) {
        this.#scheduleSourceAdmission();
      }
    }));
    lifecycle.push(this.#vscode.workspace.onDidSaveTextDocument((document) => {
      const session = this.sessionForUri(document.uri);
      if (
        SCRIPT_LANGUAGE_IDS.has(document.languageId)
        && !this.#isDisabledUri(document.uri)
        && (session == null || session.activationEvidence === WorkspaceActivationEvidenceKind.OpenSourceDocument)
      ) {
        this.#scheduleSourceAdmission();
      }
    }));
    lifecycle.push(this.#vscode.workspace.onDidCloseTextDocument((document) => {
      if (
        SCRIPT_LANGUAGE_IDS.has(document.languageId)
        && !this.#isDisabledUri(document.uri)
        && this.sessionForUri(document.uri)?.activationEvidence === WorkspaceActivationEvidenceKind.OpenSourceDocument
      ) {
        this.#scheduleSourceAdmission();
      }
    }));
  }

  #handlePackageChange(uri: Uri, changeType: FileChangeType): void {
    const topology = readWorkspaceActivationTopology(this.#vscode);
    if (
      globalActivationTopologyOwner(topology, uri) == null
      || !this.#acceptingLifecycleRequests
    ) return;
    this.#pendingTopologyChanges.set(uri.toString(), { uri, type: changeType });
    this.#requestReconcile({ reconfirmExisting: true });
  }

  #handleProjectConfigurationChange(uri: Uri, changeType: FileChangeType): void {
    const topology = readWorkspaceActivationTopology(this.#vscode);
    if (
      globalActivationTopologyOwner(topology, uri) == null
      || !this.#acceptingLifecycleRequests
    ) return;
    this.#pendingTopologyChanges.set(uri.toString(), { uri, type: changeType });
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

  #isDisabledUri(uri: Uri): boolean {
    return readWorkspaceActivationTopology(this.#vscode).isDisabled(uri);
  }

  async #runReconcile(reconfirmExisting: boolean, intent: LifecycleIntent): Promise<void> {
    const topologyChanges = new Map(this.#pendingTopologyChanges);
    const delivered = await this.#notifyTopologyChanges(topologyChanges, intent);
    if (!this.#isCurrentLifecycle(intent)) return;
    await this.#reconcileSessions(reconfirmExisting || topologyChanges.size > 0, intent);
    if (!delivered || !this.#isCurrentLifecycle(intent)) return;
    for (const [key, change] of topologyChanges) {
      if (this.#pendingTopologyChanges.get(key) === change) {
        this.#pendingTopologyChanges.delete(key);
      }
    }
  }

  async #notifyTopologyChanges(
    topologyChanges: ReadonlyMap<string, PendingTopologyChange>,
    intent: LifecycleIntent,
  ): Promise<boolean> {
    const bySession = new Map<AureliaLanguageClientSession, PendingTopologyChange[]>();
    for (const change of topologyChanges.values()) {
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
          session.client.sendNotification(DidChangeWatchedFilesNotification.type.method, {
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
        this.#logger.warn(`[client] project topology notification failed for ${session.workspace.uri}: ${errorMessage(error)}`);
      }
    }
    return delivered;
  }

  async #reconcileSessions(
    reconfirmExisting: boolean,
    intent: LifecycleIntent,
    scope: ReconcileScope | null = null,
  ): Promise<void> {
    const previousSessions = new Map(this.#sessions);
    const allFolders = this.#vscode.workspace.workspaceFolders ?? [];
    const folders = scope == null
      ? allFolders
      : allFolders.filter((folder) => scope.workspaceKeys.has(workspaceFolderKey(folder)));
    const topology = readWorkspaceActivationTopology(this.#vscode);
    const admissions: WorkspaceActivationAdmission[] = [];

    for (const folder of folders) {
      const key = workspaceFolderKey(folder);
      const existing = previousSessions.get(key);
      const mode = topology.modeFor(folder);
      let admission: WorkspaceActivationAdmission | null = null;
      if (!topology.isDisabled(folder.uri)) {
        try {
          const result = await this.#awaitLifecycle(
            readWorkspaceActivationAdmission(this.#vscode, folder, topology.excludedFoldersFor(folder)),
            intent,
          );
          if (result.status === "invalidated") return;
          admission = result.value;
        } catch (error) {
          this.#logger.warn(`[client] activation preflight failed for ${key}: ${errorMessage(error)}`);
        }
      }
      if (!this.#isCurrentLifecycle(intent)) return;
      if (admission != null) {
        admissions.push(admission);
      } else if (existing != null && !topology.isDisabled(folder.uri)) {
        // Once semantic-runtime has confirmed a source-only workspace, keep the
        // session long enough to let that authority re-evaluate future changes.
        admissions.push({
          folder,
          mode,
          evidence: existing.activationEvidence,
          nativeProjectConfigurationUris: existing.nativeProjectConfigurationUris,
        });
      }
    }

    const nextSessions = new Map(previousSessions);
    const createdSessions: AureliaLanguageClientSession[] = [];
    const retireActiveSession = (session: AureliaLanguageClientSession): void => {
      if (nextSessions.get(session.workspace.key)?.client === session.client) {
        nextSessions.delete(session.workspace.key);
        this.#publishSessions(new Map(nextSessions));
      }
      void this.#retireSession(session);
    };

    const admissionKeys = new Set(admissions.map((admission) => workspaceFolderKey(admission.folder)));
    for (const session of previousSessions.values()) {
      if (scope != null && !scope.workspaceKeys.has(session.workspace.key)) continue;
      if (!admissionKeys.has(session.workspace.key)) {
        retireActiveSession(session);
      }
    }

    const accepted: WorkspaceActivationAdmission[] = [];
    for (const admission of orderWorkspaceAdmissions(admissions)) {
      if (accepted.some((owner) => workspaceFolderContainsUri(owner.folder, admission.folder.uri))) {
        continue;
      }
      const key = workspaceFolderKey(admission.folder);
      const excludedFolders = topology.excludedFoldersFor(admission.folder);
      const projectRootHintFoldersResult = await this.#awaitLifecycle(
        this.#liveProjectRootHintFolders(topology, admission.folder),
        intent,
      );
      if (projectRootHintFoldersResult.status === "invalidated") {
        for (const created of createdSessions) void this.#retireSession(created);
        return;
      }
      const projectRootHintFolders = projectRootHintFoldersResult.value;
      if (
        scope?.rejectedSession.workspaceKey === key
        && scope.rejectedSession.client === nextSessions.get(key)?.client
        && admission.mode === AureliaActivationMode.Auto
        && sameUris(
          scope.rejectedSession.nativeProjectConfigurationUris,
          admission.nativeProjectConfigurationUris,
        )
        && sameWorkspaceFolders(
          scope.rejectedSession.projectRootHintFolders,
          projectRootHintFolders,
        )
      ) {
        const rejected = nextSessions.get(key);
        if (rejected != null) retireActiveSession(rejected);
        continue;
      }
      // An outer root wins disjoint ownership. Withdraw any currently active
      // descendants before the outer candidate starts; if semantic confirmation
      // rejects it, the ordered pass can admit those descendants again.
      for (const owned of [...nextSessions.values()]) {
        if (
          owned.workspace.key !== key
          && workspaceFolderContainsUri(admission.folder, owned.folder.uri)
        ) {
          retireActiveSession(owned);
        }
      }

      let session = nextSessions.get(key);
      if (
        session != null
        && (
          !sameWorkspaceFolders(session.excludedFolders, excludedFolders)
          || !sameWorkspaceFolders(session.projectRootHintFolders, projectRootHintFolders)
        )
      ) {
        retireActiveSession(session);
        session = undefined;
      }
      if (session == null) {
        try {
          session = await this.#createStartedSession(
            admission,
            excludedFolders,
            projectRootHintFolders,
            intent,
          ) ?? undefined;
        } catch (error) {
          this.#logger.warn(`[client] failed to start ${key}: ${errorMessage(error)}`);
        }
        if (session != null) createdSessions.push(session);
        if (!this.#isCurrentLifecycle(intent)) {
          for (const created of createdSessions) void this.#retireSession(created);
          return;
        }
        if (session == null) continue;
      } else if (reconfirmExisting && admission.mode === AureliaActivationMode.Auto) {
        const statusResult = await this.#awaitLifecycle(
          readWorkspaceStatus(
            session.client,
            this.#logger,
            session.workspace.uri,
            admission.nativeProjectConfigurationUris,
          ),
          intent,
        );
        if (statusResult.status === "invalidated" || !this.#isCurrentLifecycle(intent)) {
          for (const created of createdSessions) void this.#retireSession(created);
          return;
        }
        const status = statusResult.value;
        if (
          status != null
          && !workspaceStatusConfirmsSessionRetention(
            this.#vscode,
            status,
            admission.nativeProjectConfigurationUris,
          )
        ) {
          retireActiveSession(session);
          continue;
        }
        if (status != null && status !== session.status) {
          session = { ...session, status };
        }
      }
      if (
        session.activationMode !== admission.mode
        || session.activationEvidence !== admission.evidence
        || !sameUris(session.nativeProjectConfigurationUris, admission.nativeProjectConfigurationUris)
      ) {
        session = {
          ...session,
          activationMode: admission.mode,
          activationEvidence: admission.evidence,
          nativeProjectConfigurationUris: admission.nativeProjectConfigurationUris,
        };
      }
      nextSessions.set(key, session);
      this.#publishSessions(new Map(nextSessions));
      accepted.push(admission);
    }

    const acceptedKeys = new Set(accepted.map((admission) => workspaceFolderKey(admission.folder)));
    for (const session of [...nextSessions.values()]) {
      if (scope != null && !scope.workspaceKeys.has(session.workspace.key)) continue;
      if (!acceptedKeys.has(session.workspace.key)) {
        retireActiveSession(session);
      }
    }
  }

  async #createStartedSession(
    admission: WorkspaceActivationAdmission,
    excludedFolders: readonly WorkspaceFolder[],
    projectRootHintFolders: readonly WorkspaceFolder[],
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
    const fileEvents = this.#createSessionWatchers(admission.folder);
    let client: LanguageClient | undefined;
    const middlewareClient = {
      get client() {
        return client;
      },
    };
    const clientOptions: LanguageClientOptions = {
      workspaceFolder: admission.folder,
      // LSP document filters and VS Code filesystem watchers have no subtractive
      // subtree form. Keep their registration coarse, then send the immutable
      // boundary to the server, which rejects excluded events and requests before
      // semantic-runtime work. Client-side commands use sessionForUri as the same gate.
      documentSelector: workspaceDocumentSelector(admission.folder),
      initializationOptions: {
        excludedWorkspaceRootUris: excludedFolders.map((folder) => folder.uri.toString()),
        projectRootHintUris: projectRootHintFolders.map((folder) => folder.uri.toString()),
        projectConfigurationParserDiagnostics: "client",
      } satisfies AureliaInitializeOptions,
      synchronize: { fileEvents },
      // The server requests one standard pull refresh after its semantic source
      // generation settles. An additional client pull on every didChange races
      // that refresh, cancels the expensive first request, and repeats the same
      // analysis. VS Code still owns open/focus priority, cancellation, and the
      // diagnostic collection itself.
      diagnosticPullOptions: { onChange: false, onFocus: true },
      middleware: createMiddleware(
        this.#vscode,
        this.#logger,
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
        Promise.resolve(this.#createClient(
          `aurelia-ls:${key}`,
          `Aurelia Language Server (${admission.folder.name})`,
          serverModule,
          clientOptions,
        )),
        intent,
      );
      if (clientResult.status === "invalidated") {
        disposeWatchers(fileEvents, this.#logger, workspace.uri);
        return null;
      }
      client = clientResult.value;
      const start = client.start();
      const startResult = await this.#awaitLifecycle(start, intent);
      if (startResult.status === "invalidated") {
        this.#retireAfterStart(client, start, fileEvents, workspace.uri);
        return null;
      }
      let status: WorkspaceStatusResponse | null = null;
      if (admission.mode === AureliaActivationMode.Auto) {
        const statusResult = await this.#awaitLifecycle(
          readWorkspaceStatus(
            client,
            this.#logger,
            workspace.uri,
            admission.nativeProjectConfigurationUris,
          ),
          intent,
        );
        if (statusResult.status === "invalidated") {
          disposeWatchers(fileEvents, this.#logger, workspace.uri);
          void this.#retireClient(client, workspace.uri);
          return null;
        }
        status = statusResult.value;
      }
      if (
        admission.mode === AureliaActivationMode.Auto
        && !workspaceStatusConfirmsSessionRetention(
          this.#vscode,
          status,
          admission.nativeProjectConfigurationUris,
        )
      ) {
        this.#logger.log(`[client] semantic project shape did not confirm candidate workspace ${workspace.uri}`);
        disposeWatchers(fileEvents, this.#logger, workspace.uri);
        void this.#retireClient(client, workspace.uri);
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
        nativeProjectConfigurationUris: admission.nativeProjectConfigurationUris,
        status,
        excludedFolders,
        projectRootHintFolders,
        fileEvents,
      };
    } catch (error) {
      if (client != null) {
        void this.#retireClient(client, workspace.uri);
      }
      disposeWatchers(fileEvents, this.#logger, workspace.uri);
      throw error;
    }
  }

  async #liveProjectRootHintFolders(
    topology: ReturnType<typeof readWorkspaceActivationTopology>,
    owner: WorkspaceFolder,
  ): Promise<readonly WorkspaceFolder[]> {
    const candidates = topology.projectRootHintFoldersFor(owner);
    const existence = await Promise.all(candidates.map(async (folder) => ({
      folder,
      exists: await uriIsDirectory(this.#vscode, folder.uri),
    })));
    return existence.filter((entry) => entry.exists).map((entry) => entry.folder);
  }

  #createSessionWatchers(folder: WorkspaceFolder): FileSystemWatcher[] {
    return [
      "**/*.{html,css,json,ts,tsx,js,jsx,mts,cts,mjs,cjs}",
    ].map((glob) => this.#vscode.workspace.createFileSystemWatcher(
      new this.#vscode.RelativePattern(folder, glob),
    ));
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
    workspaceUri: string,
  ): void {
    disposeWatchers(fileEvents, this.#logger, workspaceUri);
    // vscode-languageclient cannot stop while initialization is in flight.
    // Attach retirement to that owned start instead of blocking extension
    // shutdown on a third-party promise that may never settle.
    void start
      .then(
        () => this.#retireClient(client, workspaceUri),
        () => undefined,
      )
      .finally(() => {
        disposeWatchers(fileEvents, this.#logger, workspaceUri);
      });
  }

  #retireSession(session: AureliaLanguageClientSession): Promise<void> {
    this.#latestTopologyFingerprintByClient.delete(session.client);
    disposeWatchers(session.fileEvents, this.#logger, session.workspace.uri);
    return this.#retireClient(session.client, session.workspace.uri);
  }

  #retireClient(client: LanguageClient, workspaceUri: string): Promise<void> {
    const existing = this.#retirements.get(client);
    if (existing != null) return existing;
    const retirement = stopClient(client, this.#logger, workspaceUri)
      .finally(() => {
        if (this.#retirements.get(client) === retirement) {
          this.#retirements.delete(client);
        }
      });
    this.#retirements.set(client, retirement);
    return retirement;
  }

  async #drainRetirements(): Promise<void> {
    while (this.#retirements.size > 0) {
      await Promise.all([...this.#retirements.values()]);
    }
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
    this.#sessionsChanged.fire(this.sessions);
  }

  #replaceSessionMetadata(
    session: AureliaLanguageClientSession,
    nativeProjectConfigurationUris: readonly Uri[],
    status: WorkspaceStatusResponse | null,
  ): void {
    if (this.#sessions.get(session.workspace.key)?.client !== session.client) return;
    this.#sessions.set(session.workspace.key, {
      ...session,
      nativeProjectConfigurationUris,
      status: status ?? session.status,
    });
  }

  async #refreshNativeProjectConfigurationCandidates(
    session: AureliaLanguageClientSession,
  ): Promise<readonly Uri[]> {
    const openConfigurations = this.#vscode.workspace.textDocuments
      .map((document) => document.uri)
      .filter((uri) => isWorkspaceNativeProjectConfigurationUri(session.folder, uri));
    const known = [...openConfigurations, ...session.nativeProjectConfigurationUris]
      .filter((uri) => !session.excludedFolders.some((excluded) => workspaceFolderContainsUri(excluded, uri)));
    const openKeys = new Set(openConfigurations
      .map((uri) => documentUriIdentityKey(this.#vscode, uri))
      .filter((key): key is string => key != null));
    const retained = await Promise.all(known.map(async (uri) => {
      const key = documentUriIdentityKey(this.#vscode, uri);
      if (key != null && openKeys.has(key)) return uri;
      try {
        await this.#vscode.workspace.fs.stat(uri);
        return uri;
      } catch {
        return null;
      }
    }));
    const byIdentity = new Map<string, Uri>();
    for (const uri of retained) {
      if (uri == null) continue;
      const key = documentUriIdentityKey(this.#vscode, uri);
      if (key != null && !byIdentity.has(key)) byIdentity.set(key, uri);
    }
    return [...byIdentity.values()].sort((left, right) => left.toString().localeCompare(right.toString()));
  }
}

function workspaceDocumentSelector(
  folder: WorkspaceFolder,
): LanguageClientOptions["documentSelector"] {
  // LanguageClientOptions uses protocol document selectors, not VS Code's
  // structurally similar RelativePattern. The client converts this URI-backed
  // protocol shape into a real vscode.RelativePattern before registration.
  const workspacePattern = { baseUri: folder.uri.toString(), pattern: "**/*" };
  const projectConfigurationPattern = {
    baseUri: folder.uri.toString(),
    pattern: "**/aurelia.project.json",
  };
  return [...ANALYZED_DOCUMENT_LANGUAGE_IDS.map((language) => ({
    scheme: folder.uri.scheme,
    language,
    pattern: workspacePattern,
  })), {
    scheme: folder.uri.scheme,
    language: "jsonc",
    pattern: projectConfigurationPattern,
  }, {
    scheme: folder.uri.scheme,
    language: "json",
    pattern: projectConfigurationPattern,
  }];
}

async function readWorkspaceStatus(
  client: LanguageClient,
  logger: ClientLogger,
  workspaceUri: string,
  nativeProjectConfigurationUris: readonly Uri[],
): Promise<WorkspaceStatusResponse | null> {
  try {
    return await client.sendRequest<WorkspaceStatusResponse | null>(
      AureliaProtocolRequest.WorkspaceStatus,
      {
        nativeProjectConfigurationUris: nativeProjectConfigurationUris.map((uri) => uri.toString()),
      } satisfies WorkspaceStatusParams,
    );
  } catch (error) {
    // Initial admission fails closed on null; an established session may keep
    // running through a transient reconfirmation failure.
    logger.warn(`[client] workspace status unavailable for ${workspaceUri}: ${errorMessage(error)}`);
    return null;
  }
}

async function stopClient(
  client: LanguageClient,
  logger: ClientLogger,
  workspaceUri: string,
): Promise<void> {
  try {
    await client.stop(LANGUAGE_SERVER_SHUTDOWN_TIMEOUT_MS);
  } catch (error) {
    // Retire every independent workspace even when one server has already failed.
    logger.warn(`[client] failed to stop ${workspaceUri}: ${errorMessage(error)}`);
  }
}

function disposeWatchers(
  watchers: readonly FileSystemWatcher[],
  logger?: ClientLogger,
  workspaceUri?: string,
): void {
  for (const watcher of watchers) {
    try {
      watcher.dispose();
    } catch (error) {
      logger?.warn(
        `[client] failed to dispose a file watcher${workspaceUri == null ? "" : ` for ${workspaceUri}`}: ${errorMessage(error)}`,
      );
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

function sameWorkspaceFolders(
  left: readonly WorkspaceFolder[],
  right: readonly WorkspaceFolder[],
): boolean {
  return left.length === right.length
    && left.every((folder, index) => workspaceFolderKey(folder) === workspaceFolderKey(right[index]!));
}

function containmentConnectedWorkspaceKeys(
  folders: readonly WorkspaceFolder[],
  origin: WorkspaceFolder,
): ReadonlySet<string> {
  const connected = new Map<string, WorkspaceFolder>([[workspaceFolderKey(origin), origin]]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of folders) {
      const key = workspaceFolderKey(folder);
      if (connected.has(key)) continue;
      if ([...connected.values()].some((candidate) =>
        workspaceFolderContainsUri(candidate, folder.uri)
        || workspaceFolderContainsUri(folder, candidate.uri)
      )) {
        connected.set(key, folder);
        changed = true;
      }
    }
  }
  return new Set(connected.keys());
}

function sameUris(left: readonly Uri[], right: readonly Uri[]): boolean {
  return left.length === right.length
    && left.every((uri, index) => uri.toString() === right[index]!.toString());
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
