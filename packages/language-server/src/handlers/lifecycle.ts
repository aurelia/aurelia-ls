/**
 * LSP lifecycle handlers: initialize, document events, configuration changes
 */
import {
  ManagedSemanticWorkspaceOperationStaleError,
  SemanticSourceWorldCurrentnessKind,
} from "@aurelia-ls/semantic-runtime";
import {
  TextDocumentSyncKind,
  FileChangeType,
  DidChangeConfigurationNotification,
  ErrorCodes,
  ResponseError,
  type InitializeParams,
  type InitializeResult,
  type DidChangeWatchedFilesParams,
  type FileEvent,
} from "vscode-languageserver/node";
import path from "node:path";
import type { ServerContext } from "../context.js";
import { AureliaProtocolNotification } from "../protocol.js";
import type {
  AnalysisChangedPayload,
  AureliaInitializeOptions,
} from "../protocol.js";
import { isAnalyzedSourceDocumentUri } from "../utils/document-kind.js";
import {
  isSemanticRuntimeLspRequestAborted,
  type SemanticRuntimeLspGeneration,
} from "../runtime/semantic-runtime-session.js";
import { SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";

/** Quiet period before publishing workspace-wide derived analysis. */
const ANALYSIS_REFRESH_DEBOUNCE_MS = 300;

interface LifecycleRefreshState {
  readonly tasks: Set<Promise<unknown>>;
  pendingAnalysisRefresh: ReturnType<typeof setTimeout> | null;
  pendingAnalysisChangeKind: AnalysisChangedPayload["changeKind"] | null;
  shutdown: Promise<void> | null;
}

const lifecycleRefreshStates = new WeakMap<ServerContext, LifecycleRefreshState>();

function sourceFileStructuralChangePaths(
  ctx: ServerContext,
  changes: readonly FileEvent[],
): readonly string[] {
  const filePaths: string[] = [];
  for (const change of changes) {
    if (change.type !== FileChangeType.Created && change.type !== FileChangeType.Deleted) continue;
    if (!isAnalyzedSourceDocumentUri(change.uri)) continue;
    const filePath = ctx.documentUris.workspaceHostPath(change.uri);
    if (filePath != null) filePaths.push(filePath);
  }
  return filePaths;
}

function closedAnalyzedSourceContentPaths(
  ctx: ServerContext,
  changes: readonly FileEvent[],
): readonly string[] {
  const filePaths: string[] = [];
  for (const change of changes) {
    if (change.type !== FileChangeType.Changed) continue;
    if (!isAnalyzedSourceDocumentUri(change.uri)) continue;
    // Open-document text is already authoritative through didChange. Replaying
    // the ensuing filesystem save would invalidate the same source generation
    // twice and enqueue a second all-document diagnostics wave.
    if (ctx.openWorkspaceDocument(change.uri) != null) continue;
    const filePath = ctx.documentUris.workspaceHostPath(change.uri);
    if (filePath == null || isProjectTopologyConfigurationPath(filePath)) continue;
    filePaths.push(filePath);
  }
  return filePaths;
}

function projectTopologyConfigurationChangePaths(
  ctx: ServerContext,
  changes: readonly FileEvent[],
): readonly string[] {
  const filePaths: string[] = [];
  for (const change of changes) {
    if (change.type !== FileChangeType.Created && change.type !== FileChangeType.Deleted) continue;
    const hostPath = ctx.documentUris.workspaceHostPath(change.uri);
    if (hostPath == null) continue;
    if (!isProjectTopologyConfigurationPath(hostPath)) continue;
    filePaths.push(hostPath);
  }
  return filePaths;
}

function projectConfigurationValueChangePaths(
  ctx: ServerContext,
  changes: readonly FileEvent[],
): readonly string[] {
  const filePaths: string[] = [];
  for (const change of changes) {
    if (change.type !== FileChangeType.Changed) continue;
    const hostPath = ctx.documentUris.workspaceHostPath(change.uri);
    if (hostPath == null || !isProjectTopologyConfigurationPath(hostPath)) continue;
    // Synchronized open text is already the project-input authority. Replaying
    // the filesystem save would invalidate the same exact value twice.
    if (ctx.openWorkspaceDocument(change.uri) != null) continue;
    filePaths.push(hostPath);
  }
  return filePaths;
}

function isProjectTopologyConfigurationPath(filePath: string): boolean {
  const base = path.basename(filePath).toLowerCase();
  // Project shape reads dependency scope and workspace membership from package
  // and TypeScript manifests. Native Aurelia configuration contributes authored
  // membership directly, so every authority transition for these files is topology.
  return base === "package.json"
    || base === "jsconfig.json"
    || base === "tsconfig.json"
    || (base.startsWith("tsconfig.") && base.endsWith(".json"))
    || base === "aurelia.project.json";
}

function recordProjectTopologyChanged(
  ctx: ServerContext,
  reason: string,
  filePaths: readonly string[],
): void {
  ctx.semanticRuntime.recordProjectTopologyChanged(filePaths);
  ctx.logger.info(`[workspace] semantic-runtime invalidated (${reason})`);
  scheduleAnalysisRefresh(ctx, reason, "topology");
}

function recordSourceTextChanged(
  ctx: ServerContext,
  reason: string,
  filePaths: readonly string[],
): void {
  ctx.semanticRuntime.recordSourceTextChanged(filePaths);
  ctx.logger.log(`${reason}: semantic-runtime source generation advanced for ${filePaths.length} file(s)`);
  scheduleAnalysisRefresh(ctx, reason, "source-text");
}

function recordProjectConfigurationChanged(
  ctx: ServerContext,
  reason: string,
  filePaths: readonly string[],
): void {
  ctx.semanticRuntime.recordProjectConfigurationChanged(filePaths);
  ctx.logger.log(`${reason}: semantic-runtime configuration value advanced for ${filePaths.length} file(s)`);
  // Configuration remains topology-significant to host presentation (ownership/context may change), while the shared
  // source-world receipt—not the LSP ingress classifier—decides whether this exact value changed source membership.
  scheduleAnalysisRefresh(ctx, reason, "topology");
}

function scheduleAnalysisRefresh(
  ctx: ServerContext,
  reason: string,
  changeKind: AnalysisChangedPayload["changeKind"],
): void {
  const state = lifecycleRefreshState(ctx);
  if (state.shutdown != null) return;
  state.pendingAnalysisChangeKind = dominantAnalysisChangeKind(
    state.pendingAnalysisChangeKind,
    changeKind,
  );
  if (state.pendingAnalysisRefresh != null) {
    clearTimeout(state.pendingAnalysisRefresh);
  }
  state.pendingAnalysisRefresh = setTimeout(() => {
    state.pendingAnalysisRefresh = null;
    const settledChangeKind = state.pendingAnalysisChangeKind ?? changeKind;
    state.pendingAnalysisChangeKind = null;
    ctx.logger.log(`[workspace] processing settled analysis (${reason})`);
    runLifecycleTask(ctx, "workspace analysis refresh", () =>
      notifyAnalysisChanged(ctx, settledChangeKind));
  }, ANALYSIS_REFRESH_DEBOUNCE_MS);
}

function dominantAnalysisChangeKind(
  current: AnalysisChangedPayload["changeKind"] | null,
  incoming: AnalysisChangedPayload["changeKind"],
): AnalysisChangedPayload["changeKind"] {
  return current === "topology" || incoming === "topology" ? "topology" : "source-text";
}

export function handleInitialize(ctx: ServerContext, params: InitializeParams): InitializeResult {
  const rootUri = initializeRootUri(ctx, params);
  const options = initializeOptions(params.initializationOptions);
  try {
    ctx.configureWorkspace(
      rootUri,
      options.excludedWorkspaceRootUris,
      options.projectRootHintUris,
    );
  } catch (error) {
    throw new ResponseError(
      ErrorCodes.InvalidParams,
      error instanceof Error ? error.message : String(error),
    );
  }
  ctx.clientSupportsCodeActionResolveEdit = params.capabilities.textDocument?.codeAction?.dataSupport === true
    && params.capabilities.textDocument.codeAction.resolveSupport?.properties.includes("edit") === true;
  ctx.clientSupport.configurationPull = params.capabilities.workspace?.configuration === true;
  ctx.clientSupport.configurationChangeRegistration =
    params.capabilities.workspace?.didChangeConfiguration?.dynamicRegistration === true;
  ctx.clientSupport.inlayHintRefresh = params.capabilities.workspace?.inlayHint?.refreshSupport === true;
  ctx.clientSupport.semanticTokensRefresh = params.capabilities.workspace?.semanticTokens?.refreshSupport === true;
  ctx.clientSupport.diagnosticRefresh = params.capabilities.workspace?.diagnostics?.refreshSupport === true;
  ctx.logger.info(`initialize: root=${rootUri}`);

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ["<", " ", ".", ":", "@", "$", "{"] },
      hoverProvider: true,
      definitionProvider: { workDoneProgress: false },
      documentHighlightProvider: true,
      referencesProvider: true,
      renameProvider: { prepareProvider: true },
      codeActionProvider: { resolveProvider: true },
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
      selectionRangeProvider: true,
      linkedEditingRangeProvider: true,
      foldingRangeProvider: true,
      inlayHintProvider: true,
      semanticTokensProvider: {
        legend: SEMANTIC_TOKENS_LEGEND,
        full: true,
      },
      diagnosticProvider: {
        identifier: "aurelia",
        interFileDependencies: true,
        workspaceDiagnostics: false,
      },
    },
  };
}

function initializeOptions(value: unknown): AureliaInitializeOptions {
  if (value == null) {
    return { excludedWorkspaceRootUris: [], projectRootHintUris: [] };
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ResponseError(ErrorCodes.InvalidParams, "Aurelia initialization options must be an object.");
  }
  const options = value as Record<string, unknown>;
  return {
    excludedWorkspaceRootUris: initializeUriArrayOption(options, "excludedWorkspaceRootUris"),
    projectRootHintUris: initializeUriArrayOption(options, "projectRootHintUris"),
  };
}

function initializeUriArrayOption(
  options: Readonly<Record<string, unknown>>,
  key: "excludedWorkspaceRootUris" | "projectRootHintUris",
): readonly string[] {
  const value = options[key];
  if (value == null) return [];
  if (!Array.isArray(value) || !value.every((entry): entry is string => typeof entry === "string")) {
    throw new ResponseError(
      ErrorCodes.InvalidParams,
      `Aurelia ${key} must be an array of document URI strings.`,
    );
  }
  return value;
}

function initializeRootUri(ctx: ServerContext, params: InitializeParams): string {
  const rootUri = params.rootUri
    ?? params.workspaceFolders?.[0]?.uri
    ?? (params.rootPath == null ? null : ctx.documentUris.uriForHostPath(params.rootPath));
  if (rootUri == null) {
    throw new ResponseError(
      ErrorCodes.InvalidParams,
      "Aurelia language server requires a filesystem-backed workspace root.",
    );
  }
  return rootUri;
}

/**
 * Registers all lifecycle handlers on the connection and documents.
 */
export function registerLifecycleHandlers(ctx: ServerContext): void {
  ctx.connection.onInitialize((params) => handleInitialize(ctx, params));
  ctx.connection.onShutdown(() => shutdownLifecycle(ctx));

  ctx.connection.onInitialized(() => {
    runLifecycleTask(ctx, "configuration registration", () => registerInlayHintConfigurationChanges(ctx));
  });

  ctx.documents.onDidOpen((e) => {
    if (ctx.documentUris.workspaceHostPath(e.document.uri) == null || !isAnalyzedSourceDocumentUri(e.document.uri)) return;
    const state = lifecycleRefreshState(ctx);
    if (state.shutdown != null) return;
    ctx.logger.log(`didOpen ${e.document.uri}`);
  });

  ctx.connection.onDidChangeConfiguration(() => {
    if (!ctx.clientSupport.inlayHintRefresh) return;
    requestClientRefresh(ctx, "inlay hints", () =>
      ctx.connection.languages.inlayHint.refresh());
  });

  ctx.connection.onDidChangeWatchedFiles((e: DidChangeWatchedFilesParams) => {
    if (!e.changes?.length) return;
    const changes = e.changes.filter((change) => ctx.documentUris.workspaceHostPath(change.uri) != null);
    if (changes.length === 0) return;

    const structuralPaths = [...new Set([
      ...projectTopologyConfigurationChangePaths(ctx, changes),
      // Source create/delete is deliberately a broad structural event. Semantic-runtime owns whether the refreshed
      // source world admits it; coarse watcher eligibility never grants authored ownership by itself.
      ...sourceFileStructuralChangePaths(ctx, changes),
    ])];
    if (structuralPaths.length > 0) {
      ctx.logger.log("didChangeWatchedFiles: structural workspace input changed, reloading project");
      recordProjectTopologyChanged(ctx, "watched files", structuralPaths);
      return;
    }

    const configurationFilePaths = projectConfigurationValueChangePaths(ctx, changes);
    if (configurationFilePaths.length > 0) {
      ctx.logger.log("didChangeWatchedFiles: project configuration value changed");
      recordProjectConfigurationChanged(ctx, "watched files", configurationFilePaths);
    }

    const changedFilePaths = closedAnalyzedSourceContentPaths(ctx, changes);
    if (changedFilePaths.length > 0) {
      ctx.logger.log("didChangeWatchedFiles: analyzed source content changed");
      recordSourceTextChanged(ctx, "watched files", changedFilePaths);
    }
  });

  ctx.documents.onDidChangeContent((e) => {
    const uri = e.document.uri;
    const filePath = ctx.documentUris.workspaceHostPath(uri);
    if (filePath == null) return;
    const state = lifecycleRefreshState(ctx);
    if (state.shutdown != null) return;
    // TextDocuments emits this event for both didOpen and didChange. It is the
    // single point where the synchronized client text becomes authoritative.
    ctx.logger.log(`document text synchronized ${uri}@${e.document.version}`);
    if (isProjectTopologyConfigurationPath(filePath)) {
      recordProjectConfigurationChanged(ctx, "project configuration text synchronization", [filePath]);
      return;
    }
    if (!isAnalyzedSourceDocumentUri(uri)) return;
    recordSourceTextChanged(ctx, "document text synchronization", [filePath]);
  });

  ctx.documents.onDidClose((e) => {
    const uri = e.document.uri;
    const filePath = ctx.documentUris.workspaceHostPath(uri);
    if (filePath == null) return;
    ctx.logger.log(`didClose ${uri}`);

    const state = lifecycleRefreshState(ctx);
    if (state.shutdown != null) return;
    // Closing returns source-text authority to the workspace host. Diagnostic
    // pull owns editor collection cleanup; the server only invalidates meaning.
    if (isProjectTopologyConfigurationPath(filePath)) {
      recordProjectConfigurationChanged(ctx, "project configuration close", [filePath]);
      return;
    }
    if (!isAnalyzedSourceDocumentUri(uri)) return;
    recordSourceTextChanged(ctx, "document close", [filePath]);
  });
}

async function registerInlayHintConfigurationChanges(ctx: ServerContext): Promise<void> {
  if (!ctx.clientSupport.configurationChangeRegistration) return;
  // vscode-languageclient's configurationSection push is deprecated. Register only the
  // invalidation signal, then pull the effective value for each document URI on request.
  await ctx.connection.client.register(DidChangeConfigurationNotification.type, {
    section: "aurelia.inlayHints",
  });
}

async function notifyAnalysisChanged(
  ctx: ServerContext,
  changeKind: AnalysisChangedPayload["changeKind"],
): Promise<void> {
  if (lifecycleRefreshState(ctx).shutdown != null) return;
  let generation: SemanticRuntimeLspGeneration;
  try {
    generation = await ctx.semanticRuntime.runRequest(
      null,
      (operation) => operation.generation,
    );
  } catch (error) {
    if (lifecycleRefreshState(ctx).shutdown != null) return;
    if (!isSettledAnalysisStale(error)) throw error;
    // A pull can discover source-world movement which did not arrive through the
    // editor event stream. Retry from a new managed ingress instead of publishing
    // or logging a generation which failed egress currentness.
    scheduleAnalysisRefresh(
      ctx,
      "managed analysis currentness retry",
      retryAnalysisChangeKind(error, changeKind),
    );
    return;
  }
  if (lifecycleRefreshState(ctx).shutdown != null) return;
  const analysisChanged: AnalysisChangedPayload = {
    fingerprint: generation.fingerprint,
    changeKind,
  };
  await ctx.connection.sendNotification(AureliaProtocolNotification.AnalysisChanged, analysisChanged);
  if (lifecycleRefreshState(ctx).shutdown != null) return;
  // This is the single post-change diagnostic scheduler. The client deliberately
  // disables pull-on-change: starting a speculative pull before this semantic
  // generation settles would race this refresh and repeat the same expensive
  // analysis. One source can invalidate diagnostics owned by any visible file,
  // so the standard workspace refresh remains project-wide.
  if (ctx.clientSupport.diagnosticRefresh) {
    requestClientRefresh(ctx, "diagnostics", () =>
      ctx.connection.languages.diagnostics.refresh());
  }
  if (ctx.clientSupport.semanticTokensRefresh) {
    requestClientRefresh(ctx, "semantic tokens", () =>
      ctx.connection.languages.semanticTokens.refresh());
  }
}

function isSettledAnalysisStale(error: unknown): boolean {
  return error instanceof ManagedSemanticWorkspaceOperationStaleError
    || (isSemanticRuntimeLspRequestAborted(error) && error.reason === "stale");
}

function retryAnalysisChangeKind(
  error: unknown,
  fallback: AnalysisChangedPayload["changeKind"],
): AnalysisChangedPayload["changeKind"] {
  const managedStale = managedOperationStaleCause(error);
  return managedStale?.currentnessKind === SemanticSourceWorldCurrentnessKind.FreshBootRequired
    ? "topology"
    : fallback;
}

function managedOperationStaleCause(
  error: unknown,
): ManagedSemanticWorkspaceOperationStaleError | null {
  if (error instanceof ManagedSemanticWorkspaceOperationStaleError) return error;
  if (isSemanticRuntimeLspRequestAborted(error)
      && error.cause instanceof ManagedSemanticWorkspaceOperationStaleError) {
    return error.cause;
  }
  return null;
}

/**
 * LSP refresh methods are server-to-client requests despite their command-like API.
 * Their response only acknowledges client scheduling; it is not semantic work. Joining
 * that response to the shutdown drain deadlocks when a client waits for `shutdown`
 * while retiring the providers that would answer the refresh request.
 */
function requestClientRefresh(
  ctx: ServerContext,
  label: string,
  request: () => Promise<void>,
): void {
  void Promise.resolve().then(request).catch((error: unknown) => {
    if (lifecycleRefreshState(ctx).shutdown != null) return;
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    ctx.logger.warn(`[workspace] ${label} refresh request failed: ${message}`);
  });
}

export function shutdownLifecycle(ctx: ServerContext): Promise<void> {
  const state = lifecycleRefreshState(ctx);
  if (state.shutdown != null) {
    return state.shutdown;
  }
  const shutdown = Promise.resolve().then(() => {
    if (state.pendingAnalysisRefresh != null) {
      clearTimeout(state.pendingAnalysisRefresh);
      state.pendingAnalysisRefresh = null;
    }
    state.pendingAnalysisChangeKind = null;
    ctx.semanticRuntime.invalidateRequests();

    // LSP shutdown retires this dedicated server process. Waiting for obsolete
    // requests here deadlocks with clients that wait for the shutdown response
    // before cancelling providers and their in-flight requests. Revoke guards,
    // answer shutdown, and retain task settlement only as deferred cleanup for
    // hosts that do not immediately follow with the standard `exit` notification.
    const tasks = [...state.tasks];
    void Promise.allSettled(tasks)
      .then(() => ctx.semanticRuntime.dispose())
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.stack ?? error.message : String(error);
        ctx.logger.error(`semantic session retirement failed: ${message}`);
      });
  });
  state.shutdown = shutdown;
  return shutdown;
}

function runLifecycleTask(
  ctx: ServerContext,
  label: string,
  operation: () => Promise<void>,
): void {
  if (lifecycleRefreshState(ctx).shutdown != null) return;
  void runServerOperation(ctx, operation).then(
    () => undefined,
    (error: unknown) => {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      ctx.logger.error(`${label} failed: ${message}`);
    },
  );
}

/** Own one foreground or background operation until it settles so shutdown can drain it. */
export async function runServerOperation<T>(
  ctx: ServerContext,
  operation: () => T | Promise<T>,
): Promise<T> {
  const state = lifecycleRefreshState(ctx);
  if (state.shutdown != null) {
    throw new Error("Aurelia language server is shutting down.");
  }
  const task = Promise.resolve().then(operation);
  state.tasks.add(task);
  try {
    return await task;
  } finally {
    state.tasks.delete(task);
  }
}

function lifecycleRefreshState(ctx: ServerContext): LifecycleRefreshState {
  const existing = lifecycleRefreshStates.get(ctx);
  if (existing != null) {
    return existing;
  }
  const state: LifecycleRefreshState = {
    tasks: new Set(),
    pendingAnalysisRefresh: null,
    pendingAnalysisChangeKind: null,
    shutdown: null,
  };
  lifecycleRefreshStates.set(ctx, state);
  return state;
}
