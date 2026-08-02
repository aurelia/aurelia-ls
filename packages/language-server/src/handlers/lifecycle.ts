/**
 * LSP lifecycle handlers: initialize, document events, configuration changes
 */
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
import { SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";

/** Quiet period before publishing workspace-wide derived analysis. */
const ANALYSIS_REFRESH_DEBOUNCE_MS = 300;

interface LifecycleRefreshState {
  readonly tasks: Set<Promise<unknown>>;
  pendingAnalysisRefresh: ReturnType<typeof setTimeout> | null;
  shutdown: Promise<void> | null;
}

const lifecycleRefreshStates = new WeakMap<ServerContext, LifecycleRefreshState>();

function hasSourceFileStructuralChange(changes: readonly FileEvent[]): boolean {
  for (const change of changes) {
    if (change.type !== FileChangeType.Created && change.type !== FileChangeType.Deleted) continue;
    if (isAnalyzedSourceDocumentUri(change.uri)) return true;
  }
  return false;
}

function hasClosedAnalyzedSourceContentChange(
  ctx: ServerContext,
  changes: readonly FileEvent[],
): boolean {
  for (const change of changes) {
    if (change.type !== FileChangeType.Changed) continue;
    if (!isAnalyzedSourceDocumentUri(change.uri)) continue;
    // Open-document text is already authoritative through didChange. Replaying
    // the ensuing filesystem save would invalidate the same source generation
    // twice and enqueue a second all-document diagnostics wave.
    if (ctx.openDocument(change.uri) != null) continue;
    return true;
  }
  return false;
}

function shouldReloadForFileChange(
  ctx: ServerContext,
  changes: readonly FileEvent[],
): boolean {
  for (const change of changes) {
    const hostPath = ctx.documentUris.authoredHostPath(change.uri);
    if (hostPath == null) continue;
    const base = path.basename(hostPath).toLowerCase();
    // Project-shape authority reads dependency scope and workspace membership
    // from package manifests, so manifest edits are topology changes too.
    if (base === "package.json") return true;
    if (base === "tsconfig.json") return true;
    if (base === "jsconfig.json") return true;
    if (base.startsWith("tsconfig.") && base.endsWith(".json")) return true;
  }
  return false;
}

function recordProjectTopologyChanged(ctx: ServerContext, reason: string): void {
  ctx.semanticRuntime.recordProjectTopologyChanged();
  ctx.logger.info(`[workspace] semantic-runtime invalidated (${reason})`);
  scheduleAnalysisRefresh(ctx, reason);
}

function recordSourceTextChanged(ctx: ServerContext, reason: string): void {
  ctx.semanticRuntime.recordSourceTextChanged();
  ctx.logger.log(`${reason}: semantic-runtime source generation advanced`);
  scheduleAnalysisRefresh(ctx, reason);
}

function scheduleAnalysisRefresh(ctx: ServerContext, reason: string): void {
  const state = lifecycleRefreshState(ctx);
  if (state.shutdown != null) return;
  if (state.pendingAnalysisRefresh != null) {
    clearTimeout(state.pendingAnalysisRefresh);
  }
  state.pendingAnalysisRefresh = setTimeout(() => {
    state.pendingAnalysisRefresh = null;
    ctx.logger.log(`[workspace] processing settled analysis (${reason})`);
    runLifecycleTask(ctx, "workspace analysis refresh", () =>
      notifyAnalysisChanged(ctx));
  }, ANALYSIS_REFRESH_DEBOUNCE_MS);
}

export function handleInitialize(ctx: ServerContext, params: InitializeParams): InitializeResult {
  const rootUri = initializeRootUri(ctx, params);
  const options = initializeOptions(params.initializationOptions);
  try {
    ctx.configureWorkspace(rootUri, options.excludedWorkspaceRootUris);
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
    return { excludedWorkspaceRootUris: [] };
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ResponseError(ErrorCodes.InvalidParams, "Aurelia initialization options must be an object.");
  }
  const excludedWorkspaceRootUris = (value as Record<string, unknown>).excludedWorkspaceRootUris;
  if (excludedWorkspaceRootUris == null) {
    return { excludedWorkspaceRootUris: [] };
  }
  if (
    !Array.isArray(excludedWorkspaceRootUris)
    || !excludedWorkspaceRootUris.every((entry): entry is string => typeof entry === "string")
  ) {
    throw new ResponseError(
      ErrorCodes.InvalidParams,
      "Aurelia excludedWorkspaceRootUris must be an array of document URI strings.",
    );
  }
  return { excludedWorkspaceRootUris };
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
    if (!ctx.ownsDocument(e.document.uri) || !isAnalyzedSourceDocumentUri(e.document.uri)) return;
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
    const changes = e.changes.filter((change) => ctx.ownsDocument(change.uri));
    if (changes.length === 0) return;

    if (shouldReloadForFileChange(ctx, changes)) {
      ctx.logger.log("didChangeWatchedFiles: tsconfig/jsconfig changed, reloading project");
      recordProjectTopologyChanged(ctx, "watched files");
      return;
    }

    // Any admitted source can change project membership or semantic topology.
    if (hasSourceFileStructuralChange(changes)) {
      ctx.logger.log("didChangeWatchedFiles: source file created/deleted, reloading project");
      recordProjectTopologyChanged(ctx, "watched files");
      return;
    }

    if (hasClosedAnalyzedSourceContentChange(ctx, changes)) {
      ctx.logger.log("didChangeWatchedFiles: analyzed source content changed");
      recordSourceTextChanged(ctx, "watched files");
    }
  });

  ctx.documents.onDidChangeContent((e) => {
    const uri = e.document.uri;
    if (!ctx.ownsDocument(uri) || !isAnalyzedSourceDocumentUri(uri)) return;
    const state = lifecycleRefreshState(ctx);
    if (state.shutdown != null) return;
    // TextDocuments emits this event for both didOpen and didChange. It is the
    // single point where the synchronized client text becomes authoritative.
    ctx.logger.log(`document text synchronized ${uri}@${e.document.version}`);
    recordSourceTextChanged(ctx, "document text synchronization");
  });

  ctx.documents.onDidClose((e) => {
    if (!ctx.ownsDocument(e.document.uri) || !isAnalyzedSourceDocumentUri(e.document.uri)) return;
    ctx.logger.log(`didClose ${e.document.uri}`);

    const state = lifecycleRefreshState(ctx);
    if (state.shutdown != null) return;
    // Closing returns source-text authority to the workspace host. Diagnostic
    // pull owns editor collection cleanup; the server only invalidates meaning.
    recordSourceTextChanged(ctx, "document close");
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

async function notifyAnalysisChanged(ctx: ServerContext): Promise<void> {
  if (lifecycleRefreshState(ctx).shutdown != null) return;
  const generation = ctx.semanticRuntime.currentGeneration();
  const analysisChanged: AnalysisChangedPayload = {
    fingerprint: generation.fingerprint,
  };
  await ctx.connection.sendNotification(AureliaProtocolNotification.AnalysisChanged, analysisChanged);
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
    shutdown: null,
  };
  lifecycleRefreshStates.set(ctx, state);
  return state;
}
