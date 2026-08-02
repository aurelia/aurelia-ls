/**
 * LSP lifecycle handlers: initialize, document events, configuration changes
 */
import {
  TextDocumentSyncKind,
  FileChangeType,
  DidChangeConfigurationNotification,
  type InitializeParams,
  type InitializeResult,
  type DidChangeWatchedFilesParams,
  type FileEvent,
} from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import path from "node:path";
import type { ServerContext } from "../context.js";
import { AureliaProtocolNotification } from "../protocol.js";
import type { AnalysisReadyPayload, WorkspaceChangedPayload } from "../protocol.js";
import { mapSemanticRuntimeAppDiagnostics } from "../mapping/lsp-types.js";
import {
  isSemanticRuntimeLspRequestAborted,
  type SemanticRuntimeLspGeneration,
  type SemanticRuntimeLspRequestGuard,
} from "../runtime/semantic-runtime-session.js";
import {
  isAnalyzedSourceDocumentUri,
  isScriptDocumentUri,
} from "../utils/document-kind.js";
import { SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";
import { logIfSemanticRuntimeRequestAborted } from "./request-guard.js";

/** Debounce delay for document changes (ms). Waits for typing to pause before processing. */
const DOCUMENT_CHANGE_DEBOUNCE_MS = 300;

type DiagnosticRefreshReason = "open" | "change";
type DiagnosticRefreshOutcome = "published" | "stale" | "failed";

interface DiagnosticRefreshOptions {
  readonly sourceChanged?: boolean;
  readonly notifyWorkspace?: boolean;
}

interface PendingDiagnosticRefresh {
  readonly document: TextDocument;
  readonly reason: DiagnosticRefreshReason;
  readonly notifyWorkspace: boolean;
}

interface LifecycleRefreshState {
  readonly documentVersions: Map<string, number>;
  readonly pendingDebounces: Map<string, ReturnType<typeof setTimeout>>;
  readonly pendingDiagnostics: Map<string, PendingDiagnosticRefresh>;
  diagnosticDrain: Promise<void> | null;
}

const lifecycleRefreshStates = new WeakMap<ServerContext, LifecycleRefreshState>();

function hasSourceFileStructuralChange(changes: readonly FileEvent[]): boolean {
  for (const change of changes) {
    if (change.type !== FileChangeType.Created && change.type !== FileChangeType.Deleted) continue;
    if (isScriptDocumentUri(URI.parse(change.uri).fsPath)) return true;
  }
  return false;
}

function hasClosedAnalyzedSourceContentChange(
  ctx: ServerContext,
  changes: readonly FileEvent[],
): boolean {
  for (const change of changes) {
    if (change.type !== FileChangeType.Changed) continue;
    if (!isAnalyzedSourceDocumentUri(URI.parse(change.uri).fsPath)) continue;
    // Open-document text is already authoritative through didChange. Replaying
    // the ensuing filesystem save would invalidate the same source generation
    // twice and enqueue a second all-document diagnostics wave.
    if (ctx.documents.get(change.uri) != null) continue;
    return true;
  }
  return false;
}

function shouldReloadForFileChange(changes: readonly FileEvent[]): boolean {
  for (const change of changes) {
    const fsPath = URI.parse(change.uri).fsPath;
    const base = path.basename(fsPath).toLowerCase();
    // Project-shape authority reads dependency scope and workspace membership
    // from package manifests, so manifest edits are topology changes too.
    if (base === "package.json") return true;
    if (base === "tsconfig.json") return true;
    if (base === "jsconfig.json") return true;
    if (base.startsWith("tsconfig.") && base.endsWith(".json")) return true;
  }
  return false;
}

async function reloadProjectConfiguration(ctx: ServerContext, reason: string): Promise<void> {
  const generation = ctx.semanticRuntime.recordProjectTopologyChanged();
  ctx.logger.info(`[workspace] semantic-runtime invalidated (${reason})`);
  await notifyWorkspaceChanged(ctx, ["diagnostics", "types", "resources", "templates"], reason, generation);
  await refreshAllOpenDocuments(ctx, "change", { notifyWorkspace: false });
}

async function refreshWorkspaceSourceTextChanged(ctx: ServerContext, reason: string): Promise<void> {
  const generation = await ctx.semanticRuntime.recordSourceTextChanged();
  ctx.logger.log(`[workspace] semantic-runtime source text changed (${reason})`);
  await notifyWorkspaceChanged(ctx, ["resources", "types", "diagnostics", "templates"], reason, generation);
  await refreshAllOpenDocuments(ctx, "change", { notifyWorkspace: false });
}

async function refreshWorkspaceAfterRecordedSourceTextChanged(
  ctx: ServerContext,
  reason: string,
  refreshReason: "open" | "change",
): Promise<void> {
  const generation = ctx.semanticRuntime.currentGeneration();
  await notifyWorkspaceChanged(ctx, ["resources", "types", "diagnostics", "templates"], reason, generation);
  await refreshAllOpenDocuments(ctx, refreshReason, { notifyWorkspace: false });
}

export async function refreshAllOpenDocuments(
  ctx: ServerContext,
  reason: DiagnosticRefreshReason,
  options: DiagnosticRefreshOptions = {},
): Promise<void> {
  if (options.sourceChanged === true) {
    await ctx.semanticRuntime.recordSourceTextChanged();
  }
  await enqueueDiagnosticRefreshes(
    ctx,
    ctx.documents.all().map((document) => ({
      document,
      reason,
      notifyWorkspace: options.notifyWorkspace !== false,
    })),
  );
}

export async function refreshDocument(
  ctx: ServerContext,
  doc: TextDocument,
  reason: DiagnosticRefreshReason,
  options: DiagnosticRefreshOptions = {},
): Promise<void> {
  if (options.sourceChanged ?? true) {
    await ctx.semanticRuntime.recordSourceTextChanged();
  }
  await enqueueDiagnosticRefreshes(ctx, [{
    document: doc,
    reason,
    notifyWorkspace: options.notifyWorkspace !== false,
  }]);
}

async function enqueueDiagnosticRefreshes(
  ctx: ServerContext,
  refreshes: readonly PendingDiagnosticRefresh[],
): Promise<void> {
  const state = lifecycleRefreshState(ctx);
  for (const refresh of refreshes) {
    state.pendingDiagnostics.set(refresh.document.uri, refresh);
  }
  if (state.pendingDiagnostics.size === 0) {
    return;
  }

  do {
    await ensureDiagnosticDrain(ctx, state);
  } while (state.diagnosticDrain != null || state.pendingDiagnostics.size > 0);
}

function ensureDiagnosticDrain(
  ctx: ServerContext,
  state: LifecycleRefreshState,
): Promise<void> {
  if (state.diagnosticDrain != null) {
    return state.diagnosticDrain;
  }
  const drain = drainDiagnosticRefreshes(ctx, state);
  state.diagnosticDrain = drain;
  void drain.then(
    () => finishDiagnosticDrain(ctx, state, drain),
    () => finishDiagnosticDrain(ctx, state, drain),
  );
  return drain;
}

function finishDiagnosticDrain(
  ctx: ServerContext,
  state: LifecycleRefreshState,
  drain: Promise<void>,
): void {
  if (state.diagnosticDrain === drain) {
    state.diagnosticDrain = null;
  }
  if (state.pendingDiagnostics.size > 0) {
    void ensureDiagnosticDrain(ctx, state);
  }
}

async function drainDiagnosticRefreshes(
  ctx: ServerContext,
  state: LifecycleRefreshState,
): Promise<void> {
  try {
    while (state.pendingDiagnostics.size > 0) {
      const batch = [...state.pendingDiagnostics.values()];
      state.pendingDiagnostics.clear();
      const guard = ctx.semanticRuntime.requestGuard(null);
      let staleIndex = -1;

      for (let index = 0; index < batch.length; index += 1) {
        const refresh = batch[index]!;
        const liveDocument = ctx.documents.get(refresh.document.uri);
        if (liveDocument == null && state.documentVersions.has(refresh.document.uri)) {
          continue;
        }
        const currentDocument = liveDocument ?? refresh.document;
        const outcome = await publishDocumentDiagnostics(ctx, currentDocument, guard);
        if (outcome === "stale") {
          staleIndex = index;
          break;
        }
      }

      if (staleIndex >= 0) {
        requeueStaleDiagnosticRefreshes(state, batch.slice(staleIndex));
        continue;
      }

      const notify = batch.find((refresh) => refresh.notifyWorkspace);
      if (notify != null && ctx.semanticRuntime.isCurrentGeneration(guard.generation)) {
        await notifyWorkspaceChanged(ctx, ["diagnostics", "templates"], notify.reason, guard.generation);
      }
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`diagnostic refresh drain failed: ${message}`);
  }
}

function requeueStaleDiagnosticRefreshes(
  state: LifecycleRefreshState,
  refreshes: readonly PendingDiagnosticRefresh[],
): void {
  for (const refresh of refreshes) {
    if (state.pendingDebounces.has(refresh.document.uri)) {
      continue;
    }
    if (!state.pendingDiagnostics.has(refresh.document.uri)) {
      state.pendingDiagnostics.set(refresh.document.uri, refresh);
    }
  }
}

async function publishDocumentDiagnostics(
  ctx: ServerContext,
  doc: TextDocument,
  guard: SemanticRuntimeLspRequestGuard,
): Promise<DiagnosticRefreshOutcome> {
  try {
    const diagnostics = await ctx.semanticRuntime.appDiagnostics(doc, guard);
    if (!ctx.semanticRuntime.isCurrentGeneration(guard.generation)) {
      return "stale";
    }
    const diagnosticMapping = mapSemanticRuntimeAppDiagnostics(
      diagnostics,
      doc,
      ctx.workspaceRoot,
      (uri) => ctx.lookupText(uri),
    );
    if (diagnosticMapping.failures.length > 0) {
      ctx.logger.warn(
        `[diagnostics] omitted ${diagnosticMapping.failures.length} source-backed row(s): ${diagnosticMapping.failures.join(" ")}`,
      );
    }
    const lspDiagnostics = diagnosticMapping.value;
    if (!ctx.semanticRuntime.isCurrentGeneration(guard.generation)) {
      return "stale";
    }
    // Diagnostic.data is detached from the semantic answer; version the batch so the client can reject stale evidence.
    await ctx.connection.sendDiagnostics({ uri: doc.uri, version: doc.version, diagnostics: lspDiagnostics });
    const analysisReady: AnalysisReadyPayload = {
      uri: doc.uri,
      version: doc.version,
      diags: lspDiagnostics.length,
      fingerprint: guard.generation.fingerprint,
    };
    await ctx.connection.sendNotification(AureliaProtocolNotification.AnalysisReady, analysisReady);
    return "published";
  } catch (e: unknown) {
    if (isSemanticRuntimeLspRequestAborted(e) && e.reason === "stale") {
      return "stale";
    }
    if (logIfSemanticRuntimeRequestAborted(ctx, "refreshDocument", e, doc.uri)) {
      return "failed";
    }
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`refreshDocument failed: ${message}`);
    return "failed";
  }
}

export function handleInitialize(ctx: ServerContext, params: InitializeParams): InitializeResult {
  ctx.workspaceRoot = params.rootUri ? URI.parse(params.rootUri).fsPath : null;
  ctx.clientSupportsCodeActionResolveEdit = params.capabilities.textDocument?.codeAction?.dataSupport === true
    && params.capabilities.textDocument.codeAction.resolveSupport?.properties.includes("edit") === true;
  ctx.clientSupport.configurationPull = params.capabilities.workspace?.configuration === true;
  ctx.clientSupport.configurationChangeRegistration =
    params.capabilities.workspace?.didChangeConfiguration?.dynamicRegistration === true;
  ctx.clientSupport.inlayHintRefresh = params.capabilities.workspace?.inlayHint?.refreshSupport === true;
  ctx.logger.info(`initialize: root=${ctx.workspaceRoot ?? "<cwd>"}`);

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
      codeLensProvider: { resolveProvider: false },
      selectionRangeProvider: true,
      linkedEditingRangeProvider: true,
      foldingRangeProvider: true,
      inlayHintProvider: true,
      semanticTokensProvider: {
        legend: SEMANTIC_TOKENS_LEGEND,
        full: true,
      },
    },
  };
}

/**
 * Registers all lifecycle handlers on the connection and documents.
 */
export function registerLifecycleHandlers(ctx: ServerContext): void {
  ctx.connection.onInitialize((params) => handleInitialize(ctx, params));

  ctx.connection.onInitialized(() => {
    void registerInlayHintConfigurationChanges(ctx);
  });

  ctx.documents.onDidOpen((e) => {
    const state = lifecycleRefreshState(ctx);
    state.documentVersions.set(e.document.uri, e.document.version);
    ctx.logger.log(`didOpen ${e.document.uri}`);
    recordSourceTextChanged(ctx, "document open");
    if (isScriptDocumentUri(e.document.uri)) {
      void refreshWorkspaceAfterRecordedSourceTextChanged(ctx, "open", "open");
    } else {
      void refreshDocument(ctx, e.document, "open", { sourceChanged: false });
    }
  });

  ctx.connection.onDidChangeConfiguration(() => {
    if (!ctx.clientSupport.inlayHintRefresh) return;
    void ctx.connection.languages.inlayHint.refresh().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.warn(`inlay hint refresh failed after configuration change: ${message}`);
    });
  });

  ctx.connection.onDidChangeWatchedFiles((e: DidChangeWatchedFilesParams) => {
    if (!e.changes?.length) return;

    if (shouldReloadForFileChange(e.changes)) {
      ctx.logger.log("didChangeWatchedFiles: tsconfig/jsconfig changed, reloading project");
      void reloadProjectConfiguration(ctx, "watched files");
      return;
    }

    // TS/JS file created or deleted — full reload to pick up new root files
    // and clear incremental discovery cache.
    if (hasSourceFileStructuralChange(e.changes)) {
      ctx.logger.log("didChangeWatchedFiles: source file created/deleted, reloading project");
      const generation = ctx.semanticRuntime.recordProjectTopologyChanged();
      void notifyWorkspaceChanged(ctx, ["resources", "types", "diagnostics", "templates"], "watched files", generation);
      void refreshAllOpenDocuments(ctx, "change", { notifyWorkspace: false });
      return;
    }

    if (hasClosedAnalyzedSourceContentChange(ctx, e.changes)) {
      ctx.logger.log("didChangeWatchedFiles: analyzed source content changed");
      void refreshWorkspaceSourceTextChanged(ctx, "watched files");
    }
  });

  ctx.documents.onDidChangeContent((e) => {
    const uri = e.document.uri;
    const state = lifecycleRefreshState(ctx);
    // vscode-languageserver fires onDidChangeContent immediately after onDidOpen
    // with the same document version. onDidOpen already owns that source event.
    if (state.documentVersions.get(uri) === e.document.version) {
      return;
    }
    state.documentVersions.set(uri, e.document.version);
    ctx.logger.log(`didChange ${uri} (debouncing)`);
    recordSourceTextChanged(ctx, "document content change");

    // Cancel any pending refresh for this document
    const existing = state.pendingDebounces.get(uri);
    if (existing) {
      clearTimeout(existing);
    }

    // Schedule new refresh after debounce period
    // This ensures we only process after typing pauses, not on every keystroke
    const timeout = setTimeout(() => {
      state.pendingDebounces.delete(uri);
      ctx.logger.log(`didChange ${uri} (processing after debounce)`);
      if (isScriptDocumentUri(uri)) {
        void refreshWorkspaceAfterRecordedSourceTextChanged(ctx, "change", "change");
      } else {
        void refreshDocument(ctx, e.document, "change", { sourceChanged: false });
      }
    }, DOCUMENT_CHANGE_DEBOUNCE_MS);

    state.pendingDebounces.set(uri, timeout);
  });

  ctx.documents.onDidClose((e) => {
    ctx.logger.log(`didClose ${e.document.uri}`);

    // Cancel any pending refresh for this document
    const state = lifecycleRefreshState(ctx);
    state.documentVersions.delete(e.document.uri);
    state.pendingDiagnostics.delete(e.document.uri);
    const pending = state.pendingDebounces.get(e.document.uri);
    if (pending) {
      clearTimeout(pending);
      state.pendingDebounces.delete(e.document.uri);
    }

    recordSourceTextChanged(ctx, "document close");
    void ctx.connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
    if (isScriptDocumentUri(e.document.uri)) {
      void refreshWorkspaceAfterRecordedSourceTextChanged(ctx, "close", "change");
    } else {
      void notifyWorkspaceChanged(ctx, ["diagnostics", "templates"], "close").catch(() => {});
    }
  });
}

async function registerInlayHintConfigurationChanges(ctx: ServerContext): Promise<void> {
  if (!ctx.clientSupport.configurationChangeRegistration) return;
  try {
    // vscode-languageclient's configurationSection push is deprecated. Register only the
    // invalidation signal, then pull the effective value for each document URI on request.
    await ctx.connection.client.register(DidChangeConfigurationNotification.type, {
      section: "aurelia.inlayHints",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.logger.warn(`inlay hint configuration registration failed: ${message}`);
  }
}

function recordSourceTextChanged(ctx: ServerContext, reason: string): void {
  void ctx.semanticRuntime.recordSourceTextChanged().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    ctx.logger.error(`${reason} source refresh failed: ${message}`);
  });
}

async function notifyWorkspaceChanged(
  ctx: ServerContext,
  domains: readonly string[],
  reason?: string,
  generation: SemanticRuntimeLspGeneration = ctx.semanticRuntime.currentGeneration(),
): Promise<void> {
  const workspaceChanged: WorkspaceChangedPayload = {
    fingerprint: generation.fingerprint,
    domains,
    ...(reason == null ? {} : { reason }),
  };
  await ctx.connection.sendNotification(AureliaProtocolNotification.WorkspaceChanged, workspaceChanged);
  if (domains.includes("diagnostics") || domains.includes("types")) {
    void ctx.connection.sendRequest("workspace/diagnostics/refresh").catch(() => {});
  }
  if (domains.includes("resources") || domains.includes("templates")) {
    void ctx.connection.sendRequest("workspace/semanticTokens/refresh").catch(() => {});
  }
}

function lifecycleRefreshState(ctx: ServerContext): LifecycleRefreshState {
  const existing = lifecycleRefreshStates.get(ctx);
  if (existing != null) {
    return existing;
  }
  const state: LifecycleRefreshState = {
    documentVersions: new Map(),
    pendingDebounces: new Map(),
    pendingDiagnostics: new Map(),
    diagnosticDrain: null,
  };
  lifecycleRefreshStates.set(ctx, state);
  return state;
}
