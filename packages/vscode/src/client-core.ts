import type {
  CloseAction,
  ErrorAction,
  ErrorHandler,
  LanguageClient,
  LanguageClientOptions,
  State,
  StateChangeEvent,
} from "vscode-languageclient/node";
import {
  DidChangeWatchedFilesNotification,
  FileChangeType,
  LSPErrorCodes,
} from "vscode-languageserver-protocol";
import type {
  Disposable,
  Event,
  EventEmitter,
  ExtensionContext,
  FileSystemWatcher,
  TextDocument,
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
  /** Manager-owned server-process incarnation; advances when one LanguageClient restarts its Worker. */
  readonly incarnation: number;
  /** Provider publication state; unavailable retains only bounded recovery/support identity for a retired client. */
  readonly availability: "active" | "restarting" | "unavailable";
}

export interface AureliaSupportIdentityProjector {
  (kind: string, value: string): string;
}

export interface AureliaLanguageClientSupportSessionState {
  readonly workspaceId: string;
  readonly publication: "published" | "transitioning-only";
  readonly activationMode: AureliaActivationMode;
  readonly activationEvidence: WorkspaceActivationEvidenceKind;
  readonly availability: AureliaLanguageClientSession["availability"];
  readonly incarnation: number;
  readonly clientState: "stopped" | "running" | "starting" | "start-failed" | "unknown";
  readonly nativeProjectConfigurationCount: number;
  readonly excludedFolderCount: number;
  readonly projectRootHintCount: number;
  readonly status: null | {
    readonly fingerprintId: string;
    readonly projectAnalysisCounts: WorkspaceStatusResponse["projectAnalysisCounts"];
    readonly nativeProjectConfigurationCount: number;
    readonly nativeProjectConfigurationDiagnosticCount: number;
  };
  readonly recovery: {
    readonly phase: "healthy" | "restarting" | "stabilizing" | "backoff" | "attempting" | "circuit-open";
    readonly consecutiveFailureCount: number;
    readonly automaticRetryScheduled: boolean;
  };
}

export interface AureliaLanguageClientSupportState {
  readonly status: "available";
  readonly lifecycle: {
    readonly startConsumed: boolean;
    readonly started: boolean;
    readonly acceptingRequests: boolean;
    readonly stopping: boolean;
    readonly lifecycleGeneration: number;
    readonly pendingGlobalReconciliation: boolean;
    readonly pendingTopologyChangeCount: number;
    readonly retiringClientCount: number;
    readonly transitioningClientCount: number;
  };
  readonly sessionCount: number;
  readonly sessions: readonly AureliaLanguageClientSupportSessionState[];
}

/** Whether a document has an active, temporarily unpublished, or absent Aurelia session owner. */
export enum AureliaSemanticSessionState {
  Active = "active",
  Transitioning = "transitioning",
  Unavailable = "unavailable",
  Unowned = "unowned",
}

interface TransitioningSemanticSessionScope {
  readonly session: AureliaLanguageClientSession;
  count: number;
}

export type LanguageClientFactory = (
  id: string,
  name: string,
  serverModule: string,
  clientOptions: LanguageClientOptions,
) => LanguageClient;

/** Default Worker transport backstop used when initialization cannot settle enough for LanguageClient.stop(). */
export const AURELIA_LANGUAGE_CLIENT_FORCE_TERMINATE = Symbol("aurelia.language-client.force-terminate");

type ForceTerminableLanguageClient = LanguageClient & {
  readonly [AURELIA_LANGUAGE_CLIENT_FORCE_TERMINATE]?: () => Promise<unknown>;
};

interface ClientRestartControl {
  retiring: boolean;
  automaticRestartUsed: boolean;
  allowAutomaticRestart: () => boolean;
  delegate: ErrorHandler | null;
  handler: ErrorHandler;
}

type WorkspaceRecoveryPhase = "restarting" | "stabilizing" | "backoff" | "attempting" | "circuit-open";

interface WorkspaceRecoveryState {
  session: AureliaLanguageClientSession;
  consecutiveFailureCount: number;
  lastFailureAt: number;
  phase: WorkspaceRecoveryPhase;
  retryNotBefore: number;
  timer: ReturnType<typeof setTimeout> | null;
}

class AureliaLanguageClientStartError extends Error {
  constructor(
    readonly unavailableSession: AureliaLanguageClientSession,
    cause: unknown,
  ) {
    super(`Aurelia language-client session failed while starting: ${errorMessage(cause)}`, { cause });
    this.name = "AureliaLanguageClientStartError";
  }
}

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
  readonly rejectedSession?: RejectedSessionWitness;
}

interface LifecycleIntent {
  readonly generation: number;
  readonly invalidated: Promise<void>;
  invalidate(): void;
}

interface PendingTopologyChange {
  readonly uri: Uri;
  readonly type: FileChangeType;
  readonly workspaceKeys: ReadonlySet<string>;
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

const TEMPLATE_LANGUAGE_IDS = new Set(["html", "aurelia-html"]);

const ANALYZED_DOCUMENT_LANGUAGE_IDS = [
  "html",
  "aurelia-html",
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
const LANGUAGE_SERVER_START_TIMEOUT_MS = 30_000;
const LANGUAGE_CLIENT_RESTART_GRACE_MS = 250;
// One isolated failure keeps vscode-languageclient's in-place restart. A second rapid failure replaces the client
// after a short backoff; the third opens a circuit. The open circuit has no timer and can be retried only by fresh
// Aurelia source activity, with failed user-triggered attempts throttled so an OOM cannot become a process loop.
const LANGUAGE_CLIENT_FAILURE_WINDOW_MS = 60_000;
const LANGUAGE_CLIENT_STABILITY_RESET_MS = 60_000;
const LANGUAGE_CLIENT_REPLACEMENT_BACKOFF_MS = 2_000;
const LANGUAGE_CLIENT_CIRCUIT_FAILURE_COUNT = 3;
const LANGUAGE_CLIENT_CIRCUIT_RETRY_THROTTLE_MS = 10_000;
const WORKSPACE_STATUS_STALE_RETRY_LIMIT = 2;
// Keep the runtime module free of a vscode-languageclient value import so the
// client core remains testable outside the Extension Host. These are the
// stable public State enum values from vscode-languageclient 10.x.
const LANGUAGE_CLIENT_STATE_STOPPED: State = 1;
const LANGUAGE_CLIENT_STATE_RUNNING: State = 2;
const LANGUAGE_CLIENT_STATE_STARTING: State = 3;
const LANGUAGE_CLIENT_STATE_START_FAILED: State = 4;
const LANGUAGE_CLIENT_ERROR_CONTINUE: ErrorAction = 1;
const LANGUAGE_CLIENT_CLOSE_DO_NOT_RESTART: CloseAction = 1;
const LANGUAGE_CLIENT_CLOSE_RESTART: CloseAction = 2;

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
  readonly #clientStateSubscriptions = new Map<LanguageClient, Disposable>();
  readonly #clientRestartControls = new WeakMap<LanguageClient, ClientRestartControl>();
  readonly #stoppedClientRecoveryTimers = new Map<LanguageClient, ReturnType<typeof setTimeout>>();
  readonly #startingClientRecoveryTimers = new Map<LanguageClient, ReturnType<typeof setTimeout>>();
  readonly #workspaceRecoveries = new Map<string, WorkspaceRecoveryState>();
  readonly #recordedClientFailures = new WeakSet<LanguageClient>();
  #lifecycleIntent = createLifecycleIntent(0);
  #pendingTopologyChanges = new Map<string, PendingTopologyChange>();
  // A global request dominates later topology-only requests until one current
  // pass completes, so watcher churn cannot narrow away a workspace/policy change.
  #pendingGlobalReconciliation = false;
  #acceptingLifecycleRequests = false;
  #startConsumed = false;
  #stopRequest: Promise<void> | null = null;
  #started = false;
  #sourceAdmissionTimer: ReturnType<typeof setTimeout> | null = null;
  readonly #latestTopologyFingerprintByClient = new Map<LanguageClient, string>();
  readonly #transitioningSemanticScopes = new Map<LanguageClient, TransitioningSemanticSessionScope>();

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
      .filter((session) => session.availability === "active")
      .sort((left, right) => left.workspace.uri.localeCompare(right.workspace.uri));
  }

  /** Bounded client-owned lifecycle facts for a user-created privacy projection. */
  supportState(identify: AureliaSupportIdentityProjector): AureliaLanguageClientSupportState {
    const supportSessions = new Map<LanguageClient, {
      readonly session: AureliaLanguageClientSession;
      readonly publication: AureliaLanguageClientSupportSessionState["publication"];
    }>();
    for (const session of this.#sessions.values()) {
      supportSessions.set(session.client, { session, publication: "published" });
    }
    for (const entry of this.#transitioningSemanticScopes.values()) {
      if (!supportSessions.has(entry.session.client)) {
        supportSessions.set(entry.session.client, {
          session: entry.session,
          publication: "transitioning-only",
        });
      }
    }
    const sessions = [...supportSessions.values()].map(({
      session,
      publication,
    }): AureliaLanguageClientSupportSessionState => {
      const recovery = this.#workspaceRecoveries.get(session.workspace.key);
      return {
        workspaceId: identify("workspace", session.workspace.uri),
        publication,
        activationMode: session.activationMode,
        activationEvidence: session.activationEvidence,
        availability: session.availability,
        incarnation: session.incarnation,
        clientState: languageClientStateLabel(session.client.state),
        nativeProjectConfigurationCount: session.nativeProjectConfigurationUris.length,
        excludedFolderCount: session.excludedFolders.length,
        projectRootHintCount: session.projectRootHintFolders.length,
        status: session.status == null
          ? null
          : {
              fingerprintId: identify("semantic-fingerprint", session.status.fingerprint),
              projectAnalysisCounts: session.status.projectAnalysisCounts.map((row) => ({ ...row })),
              nativeProjectConfigurationCount: session.status.nativeProjectConfigurations.rows.length,
              nativeProjectConfigurationDiagnosticCount:
                session.status.nativeProjectConfigurations.rows.reduce(
                  (count, row) => count + row.diagnosticCount,
                  0,
                ),
            },
        recovery: {
          phase: recovery?.phase ?? "healthy",
          consecutiveFailureCount: Math.min(
            recovery?.consecutiveFailureCount ?? 0,
            LANGUAGE_CLIENT_CIRCUIT_FAILURE_COUNT,
          ),
          automaticRetryScheduled: recovery?.timer != null && recovery.phase === "backoff",
        },
      };
    }).sort((left, right) => left.workspaceId.localeCompare(right.workspaceId));
    return Object.freeze({
      status: "available",
      lifecycle: Object.freeze({
        startConsumed: this.#startConsumed,
        started: this.#started,
        acceptingRequests: this.#acceptingLifecycleRequests,
        stopping: this.#stopRequest != null,
        lifecycleGeneration: this.#lifecycleIntent.generation,
        pendingGlobalReconciliation: this.#pendingGlobalReconciliation,
        pendingTopologyChangeCount: this.#pendingTopologyChanges.size,
        retiringClientCount: this.#retirements.size,
        transitioningClientCount: this.#transitioningSemanticScopes.size,
      }),
      sessionCount: sessions.length,
      sessions: Object.freeze(sessions.map((session) => Object.freeze(session))),
    });
  }

  get hasSessions(): boolean {
    return this.sessions.length > 0;
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

  semanticSessionStateForUri(uri: string | Uri): AureliaSemanticSessionState {
    if (this.sessionForUri(uri) != null) {
      return AureliaSemanticSessionState.Active;
    }
    const target = typeof uri === "string" ? this.#vscode.Uri.parse(uri) : uri;
    const unavailable = [...this.#sessions.values()]
      .filter((session) =>
        session.availability === "unavailable"
        && workspaceFolderContainsUri(session.folder, target)
        && !session.excludedFolders.some((folder) => workspaceFolderContainsUri(folder, target))
      )
      .sort((left, right) => right.folder.uri.fsPath.length - left.folder.uri.fsPath.length)[0];
    if (unavailable != null) {
      return AureliaSemanticSessionState.Unavailable;
    }
    const transitioningSessions = new Map<LanguageClient, AureliaLanguageClientSession>();
    for (const session of this.#sessions.values()) {
      if (session.availability === "restarting") transitioningSessions.set(session.client, session);
    }
    for (const entry of this.#transitioningSemanticScopes.values()) {
      transitioningSessions.set(entry.session.client, entry.session);
    }
    const transitioning = [...transitioningSessions.values()]
      .filter((session) =>
        workspaceFolderContainsUri(session.folder, target)
        && !session.excludedFolders.some((folder) => workspaceFolderContainsUri(folder, target))
      )
      .sort((left, right) => right.folder.uri.fsPath.length - left.folder.uri.fsPath.length)[0];
    return transitioning == null
      ? AureliaSemanticSessionState.Unowned
      : AureliaSemanticSessionState.Transitioning;
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
    this.#pendingGlobalReconciliation = true;
    return this.#enqueueReconcile(options);
  }

  #enqueueReconcile(options: ReconcileOptions = {}): Promise<void> {
    if (!this.#acceptingLifecycleRequests) return Promise.resolve();
    const releaseTransitionScopes = this.#retainTransitioningSemanticScopes();
    const intent = this.#advanceLifecycleIntent();
    return this.#enqueueTransition(async () => {
      try {
        if (!this.#isCurrentLifecycle(intent)) return;
        const scope = this.#pendingGlobalReconciliation
          ? null
          : topologyReconcileScope(this.#pendingTopologyChanges);
        await this.#runReconcile(options.reconfirmExisting === true, intent, scope);
        if (this.#isCurrentLifecycle(intent)) {
          this.#pendingGlobalReconciliation = false;
        }
      } finally {
        releaseTransitionScopes();
      }
    });
  }

  #retainTransitioningSemanticScopes(): () => void {
    const sessions = new Map<LanguageClient, AureliaLanguageClientSession>();
    for (const session of this.#sessions.values()) {
      sessions.set(session.client, session);
    }
    for (const entry of this.#transitioningSemanticScopes.values()) {
      sessions.set(entry.session.client, entry.session);
    }
    for (const session of sessions.values()) {
      const entry = this.#transitioningSemanticScopes.get(session.client);
      if (entry == null) {
        this.#transitioningSemanticScopes.set(session.client, { session, count: 1 });
      } else {
        entry.count += 1;
      }
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const session of sessions.values()) {
        const entry = this.#transitioningSemanticScopes.get(session.client);
        if (entry == null) continue;
        entry.count -= 1;
        if (entry.count === 0) {
          this.#transitioningSemanticScopes.delete(session.client);
        }
      }
    };
  }

  /** Reconfirm one settled semantic topology before consumers query a possibly withdrawing session. */
  async reconfirmSessionTopology(
    observedSession: AureliaLanguageClientSession,
    payload: AnalysisChangedPayload,
  ): Promise<boolean> {
    if (payload.changeKind !== "topology") return true;
    if (!this.#acceptingLifecycleRequests) return false;
    const releaseTransitionScopes = this.#retainTransitioningSemanticScopes();
    this.#latestTopologyFingerprintByClient.set(observedSession.client, payload.fingerprint);
    const intent = this.#lifecycleIntent;
    let shouldDispatch = false;
    try {
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
    } finally {
      releaseTransitionScopes();
    }
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
    this.#pendingGlobalReconciliation = false;
    this.#latestTopologyFingerprintByClient.clear();
    for (const recovery of this.#workspaceRecoveries.values()) {
      if (recovery.timer != null) clearTimeout(recovery.timer);
    }
    this.#workspaceRecoveries.clear();
    const sessions = [...this.#sessions.values()];
    this.#publishSessions(new Map());
    for (const session of sessions) {
      if (session.availability !== "unavailable") {
        void this.#retireSession(session);
      }
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
      this.#requestUnavailableRecoveryForDocument(document);
      if (
        SCRIPT_LANGUAGE_IDS.has(document.languageId)
        && !this.#isDisabledUri(document.uri)
        && this.sessionForUri(document.uri) == null
      ) {
        this.#scheduleSourceAdmission();
      }
    }));
    lifecycle.push(this.#vscode.workspace.onDidChangeTextDocument((event) => {
      this.#requestUnavailableRecoveryForDocument(event.document);
    }));
    lifecycle.push(this.#vscode.workspace.onDidSaveTextDocument((document) => {
      this.#requestUnavailableRecoveryForDocument(document);
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
    const owner = globalActivationTopologyOwner(topology, uri);
    if (owner == null || !this.#acceptingLifecycleRequests) return;
    this.#pendingTopologyChanges.set(uri.toString(), {
      uri,
      type: changeType,
      workspaceKeys: containmentConnectedWorkspaceKeys(topology.folders, owner),
    });
    this.#requestTopologyReconcile({ reconfirmExisting: true });
  }

  #handleProjectConfigurationChange(uri: Uri, changeType: FileChangeType): void {
    const topology = readWorkspaceActivationTopology(this.#vscode);
    const owner = globalActivationTopologyOwner(topology, uri);
    if (owner == null || !this.#acceptingLifecycleRequests) return;
    this.#pendingTopologyChanges.set(uri.toString(), {
      uri,
      type: changeType,
      workspaceKeys: containmentConnectedWorkspaceKeys(topology.folders, owner),
    });
    this.#requestTopologyReconcile({ reconfirmExisting: true });
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

  #requestUnavailableRecoveryForDocument(document: Pick<TextDocument, "languageId" | "uri">): void {
    if (
      (!TEMPLATE_LANGUAGE_IDS.has(document.languageId) && !SCRIPT_LANGUAGE_IDS.has(document.languageId))
      || this.#isDisabledUri(document.uri)
    ) {
      return;
    }
    const session = this.#unavailableSessionForUri(document.uri);
    if (session == null) return;
    this.#armWorkspaceRecovery(session.workspace.key, "source document activity");
  }

  #unavailableSessionForUri(uri: Uri): AureliaLanguageClientSession | null {
    return [...this.#sessions.values()]
      .filter((session) =>
        session.availability === "unavailable"
        && workspaceFolderContainsUri(session.folder, uri)
        && !session.excludedFolders.some((folder) => workspaceFolderContainsUri(folder, uri))
      )
      .sort((left, right) => right.folder.uri.fsPath.length - left.folder.uri.fsPath.length)[0]
      ?? null;
  }

  #isDisabledUri(uri: Uri): boolean {
    return readWorkspaceActivationTopology(this.#vscode).isDisabled(uri);
  }

  async #runReconcile(
    reconfirmExisting: boolean,
    intent: LifecycleIntent,
    scope: ReconcileScope | null = null,
  ): Promise<void> {
    const topologyChanges = new Map(this.#pendingTopologyChanges);
    const delivered = await this.#notifyTopologyChanges(topologyChanges, intent);
    if (!this.#isCurrentLifecycle(intent)) return;
    await this.#reconcileSessions(reconfirmExisting || topologyChanges.size > 0, intent, scope);
    if (!this.#isCurrentLifecycle(intent)) return;
    for (const [key, change] of topologyChanges) {
      if (delivered.has(key) && this.#pendingTopologyChanges.get(key) === change) {
        this.#pendingTopologyChanges.delete(key);
      }
    }
  }

  async #notifyTopologyChanges(
    topologyChanges: ReadonlyMap<string, PendingTopologyChange>,
    intent: LifecycleIntent,
  ): Promise<ReadonlySet<string>> {
    const bySession = new Map<AureliaLanguageClientSession, Array<readonly [string, PendingTopologyChange]>>();
    const delivered = new Set<string>();
    for (const [key, change] of topologyChanges) {
      const session = this.sessionForUri(change.uri);
      if (session == null) {
        // A newly admitted server starts from the current host state, so no
        // retiring or absent process needs this historical notification.
        delivered.add(key);
        continue;
      }
      const changes = bySession.get(session) ?? [];
      changes.push([key, change]);
      bySession.set(session, changes);
    }
    for (const [session, entries] of bySession) {
      try {
        const result = await this.#awaitLifecycle(
          session.client.sendNotification(DidChangeWatchedFilesNotification.type.method, {
            changes: entries.map(([, change]) => ({
              uri: change.uri.toString(),
              type: change.type,
            })),
          }),
          intent,
        );
        if (result.status === "invalidated") return delivered;
        for (const [key] of entries) delivered.add(key);
      } catch (error) {
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
    const rollbackCreatedSessions = (): void => {
      // Stop can clear the authoritative publication while an invalidated await
      // unwinds, so never reconstruct live state from this pass's older snapshot.
      const publishedSessions = new Map(this.#sessions);
      let publishedStateChanged = false;
      for (const created of createdSessions) {
        if (nextSessions.get(created.workspace.key)?.client === created.client) {
          nextSessions.delete(created.workspace.key);
        }
        if (publishedSessions.get(created.workspace.key)?.client === created.client) {
          publishedSessions.delete(created.workspace.key);
          publishedStateChanged = true;
        }
      }
      if (publishedStateChanged) {
        // A reconcile publishes each admitted root as soon as it is usable. If a
        // newer lifecycle intent invalidates a later await, withdraw every client
        // created by this pass before stopping it so the queued pass cannot inherit
        // a retired client as an established session.
        this.#publishSessions(publishedSessions);
      }
      for (const created of createdSessions) void this.#retireSession(created);
    };
    const retireActiveSession = (session: AureliaLanguageClientSession): void => {
      if (nextSessions.get(session.workspace.key)?.client === session.client) {
        nextSessions.delete(session.workspace.key);
        this.#publishSessions(new Map(nextSessions));
      }
      this.#clearWorkspaceRecovery(session.workspace.key);
      if (session.availability !== "unavailable") {
        void this.#retireSession(session);
      }
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
        rollbackCreatedSessions();
        return;
      }
      const projectRootHintFolders = projectRootHintFoldersResult.value;
      if (
        scope?.rejectedSession?.workspaceKey === key
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
      const unavailableSession = session?.availability === "unavailable" ? session : null;
      if (session?.availability === "restarting") {
        accepted.push(admission);
        continue;
      }
      if (unavailableSession != null) {
        const recovery = this.#workspaceRecoveries.get(key);
        if (recovery?.phase !== "attempting") {
          accepted.push(admission);
          continue;
        }
        session = undefined;
      }
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
        let recoveryStartFailed = false;
        try {
          session = await this.#createStartedSession(
            admission,
            excludedFolders,
            projectRootHintFolders,
            intent,
          ) ?? undefined;
        } catch (error) {
          if (error instanceof AureliaLanguageClientStartError) {
            recoveryStartFailed = true;
            const failedSession = {
              ...error.unavailableSession,
              incarnation: (unavailableSession?.incarnation ?? 0) + 1,
            };
            accepted.push(admission);
            this.#recordWorkspaceFailure(failedSession);
            nextSessions.set(key, this.#publishUnavailableSession(failedSession, false));
          }
          this.#logger.warn(`[client] failed to start ${key}: ${errorMessage(error)}`);
        }
        if (session != null) createdSessions.push(session);
        if (!this.#isCurrentLifecycle(intent)) {
          rollbackCreatedSessions();
          return;
        }
        if (session == null) {
          if (unavailableSession != null && !recoveryStartFailed) {
            nextSessions.delete(key);
            this.#clearWorkspaceRecovery(key);
            this.#publishSessions(new Map(nextSessions));
          }
          continue;
        }
        if (unavailableSession != null) {
          session = {
            ...session,
            incarnation: unavailableSession.incarnation + 1,
          };
        }
        this.#markWorkspaceRunning(session);
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
          rollbackCreatedSessions();
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
    let start: Promise<void> | undefined;
    let startCompleted = false;
    const key = workspaceFolderKey(admission.folder);
    const restartControl = createClientRestartControl(() =>
      this.#workspaceMayUseAutomaticRestart(key));
    const middlewareClient = {
      get client() {
        return client;
      },
      currentIncarnation: (candidate: LanguageClient, uri?: string): number | null => {
        const session = uri == null
          ? this.sessions.find((entry) => entry.client === candidate)
          : this.sessionForUri(uri);
        return session?.client === candidate ? session.incarnation : null;
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
        typeScriptProgramDiagnostics: "client",
      } satisfies AureliaInitializeOptions,
      synchronize: { fileEvents },
      // The server requests one standard pull refresh after its semantic source
      // generation settles. An additional client pull on every didChange races
      // that refresh, cancels the expensive first request, and repeats the same
      // analysis. VS Code still owns open/focus priority, cancellation, and the
      // diagnostic collection itself.
      diagnosticPullOptions: { onChange: false, onFocus: true },
      errorHandler: restartControl.handler,
      middleware: createMiddleware(
        this.#vscode,
        this.#logger,
        middlewareClient,
      ),
    };
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
      restartControl.delegate = typeof client.createDefaultErrorHandler === "function"
        ? client.createDefaultErrorHandler()
        : fallbackClientErrorHandler();
      this.#clientRestartControls.set(client, restartControl);
      start = client.start();
      const startResult = await this.#awaitLifecycle(boundedClientStart(start), intent);
      if (startResult.status === "invalidated") {
        this.#retireAfterStart(client, start, fileEvents, workspace.uri);
        return null;
      }
      startCompleted = true;
      this.#observeClientState(client);
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
      const session: AureliaLanguageClientSession = {
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
        incarnation: 1,
        availability: "active",
      };
      return session;
    } catch (error) {
      const unavailableSession: AureliaLanguageClientSession | null = client == null
        ? null
        : {
            workspace,
            folder: admission.folder,
            client,
            activationMode: admission.mode,
            activationEvidence: admission.evidence,
            nativeProjectConfigurationUris: admission.nativeProjectConfigurationUris,
            status: null,
            excludedFolders,
            projectRootHintFolders,
            fileEvents: [],
            incarnation: 1,
            availability: "unavailable",
          };
      if (client != null) {
        if (start != null && !startCompleted) {
          this.#retireAfterStart(client, start, fileEvents, workspace.uri, 0);
        } else {
          void this.#retireClient(client, workspace.uri);
        }
      }
      disposeWatchers(fileEvents, this.#logger, workspace.uri);
      if (unavailableSession != null) {
        throw new AureliaLanguageClientStartError(unavailableSession, error);
      }
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

  #workspaceMayUseAutomaticRestart(workspaceKey: string): boolean {
    const recovery = this.#workspaceRecoveries.get(workspaceKey);
    if (recovery == null) return true;
    const withinFailureWindow = Date.now() - recovery.lastFailureAt <= LANGUAGE_CLIENT_FAILURE_WINDOW_MS;
    const nextFailureCount = withinFailureWindow
      ? recovery.consecutiveFailureCount + 1
      : 1;
    return nextFailureCount < 2;
  }

  #recordWorkspaceFailure(session: AureliaLanguageClientSession): WorkspaceRecoveryState {
    const now = Date.now();
    const existing = this.#workspaceRecoveries.get(session.workspace.key);
    if (existing?.timer != null) clearTimeout(existing.timer);
    const consecutiveFailureCount = existing != null
      && now - existing.lastFailureAt <= LANGUAGE_CLIENT_FAILURE_WINDOW_MS
        ? existing.consecutiveFailureCount + 1
        : 1;
    const recovery: WorkspaceRecoveryState = {
      session,
      consecutiveFailureCount,
      lastFailureAt: now,
      phase: "restarting",
      retryNotBefore: 0,
      timer: null,
    };
    this.#workspaceRecoveries.set(session.workspace.key, recovery);
    return recovery;
  }

  #markWorkspaceRunning(session: AureliaLanguageClientSession): void {
    const recovery = this.#workspaceRecoveries.get(session.workspace.key);
    if (recovery == null) return;
    if (recovery.timer != null) clearTimeout(recovery.timer);
    recovery.session = session;
    recovery.phase = "stabilizing";
    recovery.retryNotBefore = 0;
    const timer = setTimeout(() => {
      if (
        this.#workspaceRecoveries.get(session.workspace.key) !== recovery
        || this.#sessions.get(session.workspace.key)?.client !== session.client
        || this.#sessions.get(session.workspace.key)?.availability !== "active"
      ) {
        return;
      }
      recovery.timer = null;
      this.#workspaceRecoveries.delete(session.workspace.key);
      const restartControl = this.#clientRestartControls.get(session.client);
      if (restartControl != null) restartControl.automaticRestartUsed = false;
    }, LANGUAGE_CLIENT_STABILITY_RESET_MS);
    timer.unref?.();
    recovery.timer = timer;
  }

  #publishUnavailableSession(
    failedSession: AureliaLanguageClientSession,
    retireClient: boolean,
  ): AureliaLanguageClientSession {
    const recovery = this.#workspaceRecoveries.get(failedSession.workspace.key)
      ?? this.#recordWorkspaceFailure(failedSession);
    const unavailable: AureliaLanguageClientSession = {
      ...failedSession,
      availability: "unavailable",
    };
    recovery.session = unavailable;
    const next = new Map(this.#sessions);
    next.set(unavailable.workspace.key, unavailable);
    this.#publishSessions(next);
    if (retireClient) {
      void this.#retireSession(failedSession);
    }

    if (recovery.consecutiveFailureCount >= LANGUAGE_CLIENT_CIRCUIT_FAILURE_COUNT) {
      recovery.phase = "circuit-open";
      recovery.retryNotBefore = recovery.consecutiveFailureCount === LANGUAGE_CLIENT_CIRCUIT_FAILURE_COUNT
        ? Date.now()
        : Date.now() + LANGUAGE_CLIENT_CIRCUIT_RETRY_THROTTLE_MS;
      this.#logger.error(
        `[client] server unavailable for ${unavailable.workspace.uri} after `
        + `${recovery.consecutiveFailureCount} rapid failures; edit or reopen an Aurelia source to retry`,
      );
      return unavailable;
    }

    const delay = recovery.consecutiveFailureCount === 1
      ? 0
      : LANGUAGE_CLIENT_REPLACEMENT_BACKOFF_MS;
    if (delay === 0) {
      this.#logger.info(`[client] replacing unavailable server for ${unavailable.workspace.uri}`);
    } else {
      this.#logger.warn(
        `[client] server unavailable for ${unavailable.workspace.uri}; retrying in ${delay}ms`,
      );
    }
    recovery.phase = "backoff";
    recovery.retryNotBefore = Date.now() + delay;
    const timer = setTimeout(() => {
      if (this.#workspaceRecoveries.get(unavailable.workspace.key) !== recovery) return;
      recovery.timer = null;
      this.#armWorkspaceRecovery(unavailable.workspace.key, "bounded automatic recovery");
    }, delay);
    timer.unref?.();
    recovery.timer = timer;
    return unavailable;
  }

  #armWorkspaceRecovery(workspaceKey: string, reason: string): void {
    if (!this.#acceptingLifecycleRequests) return;
    const recovery = this.#workspaceRecoveries.get(workspaceKey);
    const session = this.#sessions.get(workspaceKey);
    if (
      recovery == null
      || session?.availability !== "unavailable"
      || recovery.phase === "attempting"
      || Date.now() < recovery.retryNotBefore
    ) {
      return;
    }
    if (recovery.timer != null) clearTimeout(recovery.timer);
    recovery.timer = null;
    recovery.phase = "attempting";
    recovery.retryNotBefore = 0;
    recovery.session = session;
    const next = new Map(this.#sessions);
    next.set(workspaceKey, { ...session });
    this.#publishSessions(next);
    this.#logger.info(`[client] retrying unavailable server for ${session.workspace.uri} (${reason})`);
    this.#requestReconcile({ reconfirmExisting: true });
  }

  #clearWorkspaceRecovery(workspaceKey: string): void {
    const recovery = this.#workspaceRecoveries.get(workspaceKey);
    if (recovery?.timer != null) clearTimeout(recovery.timer);
    this.#workspaceRecoveries.delete(workspaceKey);
  }

  #requestReconcile(options: ReconcileOptions): void {
    void this.reconcile(options).catch((error) => {
      this.#logger.warn(`[client] workspace reconciliation failed: ${errorMessage(error)}`);
    });
  }

  #requestTopologyReconcile(options: ReconcileOptions): void {
    void this.#enqueueReconcile(options).catch((error) => {
      this.#logger.warn(`[client] workspace reconciliation failed: ${errorMessage(error)}`);
    });
  }

  #retireAfterStart(
    client: LanguageClient,
    start: Promise<void>,
    fileEvents: readonly FileSystemWatcher[],
    workspaceUri: string,
    forceAfterMilliseconds = LANGUAGE_SERVER_START_TIMEOUT_MS,
  ): void {
    this.#markClientRetiring(client);
    disposeWatchers(fileEvents, this.#logger, workspaceUri);
    // vscode-languageclient cannot stop while initialization is in flight.
    // Attach retirement to that owned start instead of blocking extension
    // shutdown on a third-party promise that may never settle.
    const forceTimer = setTimeout(() => {
      const terminate = (client as ForceTerminableLanguageClient)[AURELIA_LANGUAGE_CLIENT_FORCE_TERMINATE];
      if (terminate == null) return;
      this.#logger.warn(`[client] force-terminating an unresponsive starting server for ${workspaceUri}`);
      void terminate().catch((error: unknown) => {
        this.#logger.warn(`[client] failed to force-terminate ${workspaceUri}: ${errorMessage(error)}`);
      });
    }, forceAfterMilliseconds);
    forceTimer.unref?.();
    void start
      .then(
        () => this.#retireClient(client, workspaceUri),
        () => undefined,
      )
      .finally(() => {
        clearTimeout(forceTimer);
        disposeWatchers(fileEvents, this.#logger, workspaceUri);
      });
  }

  #retireSession(session: AureliaLanguageClientSession): Promise<void> {
    this.#latestTopologyFingerprintByClient.delete(session.client);
    this.#disposeClientStateObservation(session.client);
    disposeWatchers(session.fileEvents, this.#logger, session.workspace.uri);
    return this.#retireClient(session.client, session.workspace.uri);
  }

  #observeClientState(client: LanguageClient): void {
    if (this.#clientStateSubscriptions.has(client)) return;
    const subscription = client.onDidChangeState((event) => {
      this.#handleClientStateChange(client, event);
    });
    this.#clientStateSubscriptions.set(client, subscription);
  }

  #handleClientStateChange(client: LanguageClient, event: StateChangeEvent): void {
    if (
      event.newState === LANGUAGE_CLIENT_STATE_STOPPED
      || event.newState === LANGUAGE_CLIENT_STATE_START_FAILED
    ) {
      this.#clearStartingClientRecovery(client);
      const session = this.#sessionForClient(client);
      if (session == null) return;
      // Session publication is an independent lifecycle writer. Invalidate any
      // reconcile snapshot captured before this server-process transition so it
      // cannot republish the stopped incarnation after an awaited status read.
      this.#advanceLifecycleIntent();
      this.#latestTopologyFingerprintByClient.delete(client);
      let restartingSession = session;
      if (session.availability === "active") {
        const next = new Map(this.#sessions);
        restartingSession = {
          ...session,
          incarnation: session.incarnation + 1,
          availability: "restarting",
        };
        next.set(session.workspace.key, restartingSession);
        this.#logger.warn(`[client] server connection stopped for ${session.workspace.uri}; semantic state is re-proving`);
        this.#publishSessions(next);
      }
      if (!this.#recordedClientFailures.has(client)) {
        this.#recordedClientFailures.add(client);
        this.#recordWorkspaceFailure(restartingSession);
      }
      this.#scheduleStoppedClientRecovery(client);
      return;
    }
    if (event.newState === LANGUAGE_CLIENT_STATE_STARTING) {
      this.#clearStoppedClientRecovery(client);
      this.#scheduleStartingClientRecovery(client);
      return;
    }
    if (event.newState !== LANGUAGE_CLIENT_STATE_RUNNING) return;
    this.#recordedClientFailures.delete(client);
    this.#clearStoppedClientRecovery(client);
    this.#clearStartingClientRecovery(client);
    const session = this.#sessionForClient(client);
    if (session?.availability !== "restarting") return;
    this.#advanceLifecycleIntent();
    const next = new Map(this.#sessions);
    const activeSession: AureliaLanguageClientSession = { ...session, availability: "active" };
    next.set(session.workspace.key, activeSession);
    this.#logger.log(`[client] server connection restarted for ${session.workspace.uri}; semantic incarnation ${session.incarnation} is active`);
    this.#publishSessions(next);
    this.#markWorkspaceRunning(activeSession);
    // The replacement Worker starts from current host inputs, but its original
    // initialization boundary may have become obsolete during downtime.
    this.#requestReconcile({ reconfirmExisting: true });
  }

  #scheduleStoppedClientRecovery(client: LanguageClient): void {
    this.#clearStoppedClientRecovery(client);
    const timer = setTimeout(() => {
      if (this.#stoppedClientRecoveryTimers.get(client) !== timer) return;
      this.#stoppedClientRecoveryTimers.delete(client);
      const session = this.#sessionForClient(client);
      if (
        session?.availability !== "restarting"
        || client.state === LANGUAGE_CLIENT_STATE_STARTING
        || client.state === LANGUAGE_CLIENT_STATE_RUNNING
      ) {
        return;
      }
      this.#publishUnavailableSession(session, true);
    }, LANGUAGE_CLIENT_RESTART_GRACE_MS);
    this.#stoppedClientRecoveryTimers.set(client, timer);
  }

  #clearStoppedClientRecovery(client: LanguageClient): void {
    const timer = this.#stoppedClientRecoveryTimers.get(client);
    if (timer == null) return;
    clearTimeout(timer);
    this.#stoppedClientRecoveryTimers.delete(client);
  }

  #scheduleStartingClientRecovery(client: LanguageClient): void {
    this.#clearStartingClientRecovery(client);
    const timer = setTimeout(() => {
      if (this.#startingClientRecoveryTimers.get(client) !== timer) return;
      this.#startingClientRecoveryTimers.delete(client);
      const session = this.#sessionForClient(client);
      if (
        session?.availability !== "restarting"
        || client.state !== LANGUAGE_CLIENT_STATE_STARTING
      ) {
        return;
      }
      this.#publishUnavailableSession(session, true);
    }, LANGUAGE_SERVER_START_TIMEOUT_MS);
    timer.unref?.();
    this.#startingClientRecoveryTimers.set(client, timer);
  }

  #clearStartingClientRecovery(client: LanguageClient): void {
    const timer = this.#startingClientRecoveryTimers.get(client);
    if (timer == null) return;
    clearTimeout(timer);
    this.#startingClientRecoveryTimers.delete(client);
  }

  #disposeClientStateObservation(client: LanguageClient): void {
    this.#clearStoppedClientRecovery(client);
    this.#clearStartingClientRecovery(client);
    const subscription = this.#clientStateSubscriptions.get(client);
    this.#clientStateSubscriptions.delete(client);
    try {
      subscription?.dispose();
    } catch (error) {
      this.#logger.warn(`[client] failed to dispose language-client state observation: ${errorMessage(error)}`);
    }
  }

  #sessionForClient(client: LanguageClient): AureliaLanguageClientSession | undefined {
    return [...this.#sessions.values()].find((session) => session.client === client);
  }

  #retireClient(client: LanguageClient, workspaceUri: string): Promise<void> {
    const existing = this.#retirements.get(client);
    if (existing != null) return existing;
    this.#markClientRetiring(client);
    this.#disposeClientStateObservation(client);
    const terminate = (client as ForceTerminableLanguageClient)[AURELIA_LANGUAGE_CLIENT_FORCE_TERMINATE];
    let forceStarting: Promise<unknown> = Promise.resolve();
    if (client.state === LANGUAGE_CLIENT_STATE_STARTING && terminate != null) {
      this.#logger.warn(`[client] force-terminating an unresponsive starting server for ${workspaceUri}`);
      forceStarting = terminate().catch((error: unknown) => {
        this.#logger.warn(`[client] failed to force-terminate starting server ${workspaceUri}: ${errorMessage(error)}`);
      });
    }
    const retirement = forceStarting
      .then(() => stopClient(client, this.#logger, workspaceUri))
      .finally(() => {
        if (this.#retirements.get(client) === retirement) {
          this.#retirements.delete(client);
        }
      });
    this.#retirements.set(client, retirement);
    return retirement;
  }

  #markClientRetiring(client: LanguageClient): void {
    const control = this.#clientRestartControls.get(client);
    if (control != null) control.retiring = true;
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
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await client.sendRequest<WorkspaceStatusResponse | null>(
        AureliaProtocolRequest.WorkspaceStatus,
        {
          nativeProjectConfigurationUris: nativeProjectConfigurationUris.map((uri) => uri.toString()),
        } satisfies WorkspaceStatusParams,
      );
    } catch (error) {
      if (isContentModifiedError(error)) {
        if (attempt < WORKSPACE_STATUS_STALE_RETRY_LIMIT) {
          logger.log(`[client] workspace status changed during read for ${workspaceUri}; retrying (${attempt + 2}/${WORKSPACE_STATUS_STALE_RETRY_LIMIT + 1})`);
          continue;
        }
        // Do not launder managed currentness into ordinary unavailability: an
        // established session must not publish the older topology fingerprint.
        throw error;
      }
      // Initial admission fails closed on null; an established session may keep
      // running through a genuine transient transport failure.
      logger.warn(`[client] workspace status unavailable for ${workspaceUri}: ${errorMessage(error)}`);
      return null;
    }
  }
}

async function boundedClientStart(start: Promise<void>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Aurelia language server did not initialize within ${LANGUAGE_SERVER_START_TIMEOUT_MS}ms.`));
    }, LANGUAGE_SERVER_START_TIMEOUT_MS);
    timer.unref?.();
  });
  try {
    await Promise.race([start, timeout]);
  } finally {
    if (timer != null) clearTimeout(timer);
  }
}

function isContentModifiedError(error: unknown): boolean {
  try {
    return error != null
      && typeof error === "object"
      && "code" in error
      && error.code === LSPErrorCodes.ContentModified;
  } catch {
    return false;
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

function languageClientStateLabel(
  state: State,
): AureliaLanguageClientSupportSessionState["clientState"] {
  switch (state) {
    case LANGUAGE_CLIENT_STATE_STOPPED:
      return "stopped";
    case LANGUAGE_CLIENT_STATE_RUNNING:
      return "running";
    case LANGUAGE_CLIENT_STATE_STARTING:
      return "starting";
    case LANGUAGE_CLIENT_STATE_START_FAILED:
      return "start-failed";
    default:
      return "unknown";
  }
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

function topologyReconcileScope(
  changes: ReadonlyMap<string, PendingTopologyChange>,
): ReconcileScope {
  const workspaceKeys = new Set<string>();
  for (const change of changes.values()) {
    for (const key of change.workspaceKeys) workspaceKeys.add(key);
  }
  return { workspaceKeys };
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

function createClientRestartControl(
  allowAutomaticRestart: () => boolean,
): ClientRestartControl {
  const control: ClientRestartControl = {
    retiring: false,
    automaticRestartUsed: false,
    allowAutomaticRestart,
    delegate: null,
    handler: fallbackClientErrorHandler(),
  };
  const handler: ErrorHandler = {
    error: (error, message, count) => control.delegate?.error(error, message, count)
      ?? { action: LANGUAGE_CLIENT_ERROR_CONTINUE },
    closed: () => {
      if (control.retiring) {
        return {
          action: LANGUAGE_CLIENT_CLOSE_DO_NOT_RESTART,
          handled: true,
          message: "Aurelia language-client retirement closed its server transport.",
        };
      }
      if (control.automaticRestartUsed || !control.allowAutomaticRestart()) {
        return {
          action: LANGUAGE_CLIENT_CLOSE_DO_NOT_RESTART,
          handled: true,
          message: "Aurelia bounded automatic Worker restart to prevent a repeated failure loop.",
        };
      }
      control.automaticRestartUsed = true;
      return control.delegate?.closed()
        ?? { action: LANGUAGE_CLIENT_CLOSE_RESTART };
    },
  };
  control.handler = handler;
  return control;
}

function fallbackClientErrorHandler(): ErrorHandler {
  return {
    error: () => ({ action: LANGUAGE_CLIENT_ERROR_CONTINUE }),
    closed: () => ({ action: LANGUAGE_CLIENT_CLOSE_RESTART }),
  };
}
