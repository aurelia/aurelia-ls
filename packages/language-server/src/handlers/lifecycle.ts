/**
 * LSP lifecycle handlers: initialize, document events, configuration changes
 */
import {
  TextDocumentSyncKind,
  FileChangeType,
  type InitializeParams,
  type InitializeResult,
  type DidChangeWatchedFilesParams,
  type FileEvent,
} from "vscode-languageserver/node";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import path from "node:path";
import type { ServerContext } from "../context.js";
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

const pendingRefreshesByContext = new WeakMap<ServerContext, Map<string, ReturnType<typeof setTimeout>>>();

interface DiagnosticRefreshWave {
  readonly reason: "open" | "change";
  readonly guard: SemanticRuntimeLspRequestGuard;
}

interface DiagnosticRefreshOptions {
  readonly wave?: DiagnosticRefreshWave;
  readonly sourceChanged?: boolean;
  readonly notifyWorkspace?: boolean;
  readonly staleRetryCount?: number;
}

function hasSourceFileStructuralChange(changes: readonly FileEvent[]): boolean {
  for (const change of changes) {
    if (change.type !== FileChangeType.Created && change.type !== FileChangeType.Deleted) continue;
    if (isScriptDocumentUri(URI.parse(change.uri).fsPath)) return true;
  }
  return false;
}

function hasAnalyzedSourceContentChange(changes: readonly FileEvent[]): boolean {
  for (const change of changes) {
    if (change.type !== FileChangeType.Changed) continue;
    if (isAnalyzedSourceDocumentUri(URI.parse(change.uri).fsPath)) return true;
  }
  return false;
}

function shouldReloadForFileChange(changes: readonly FileEvent[]): boolean {
  for (const change of changes) {
    const fsPath = URI.parse(change.uri).fsPath;
    const base = path.basename(fsPath).toLowerCase();
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
  reason: "open" | "change",
  options: DiagnosticRefreshOptions = {},
): Promise<void> {
  try {
    const wave = options.wave ?? await beginDiagnosticRefreshWave(ctx, reason, options.sourceChanged === true);
    if (options.notifyWorkspace !== false) {
      await notifyWorkspaceChanged(ctx, ["diagnostics", "templates"], reason, wave.guard.generation);
    }
    const openDocs = ctx.documents.all();
    for (const doc of openDocs) {
      if (!ctx.semanticRuntime.isCurrentGeneration(wave.guard.generation)) {
        ctx.logger.log("refreshAllOpenDocuments stopped because the refresh wave is stale");
        return;
      }
      await refreshDocument(ctx, doc, reason, {
        wave,
        notifyWorkspace: false,
        sourceChanged: false,
      });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`refreshAllOpenDocuments failed: ${message}`);
  }
}

export async function refreshDocument(
  ctx: ServerContext,
  doc: TextDocument,
  reason: "open" | "change",
  options: DiagnosticRefreshOptions = {},
): Promise<void> {
  try {
    const wave = options.wave ?? await beginDiagnosticRefreshWave(
      ctx,
      reason,
      options.sourceChanged ?? true,
    );
    const diagnostics = await ctx.semanticRuntime.appDiagnostics(doc, wave.guard);
    if (!ctx.semanticRuntime.isCurrentGeneration(wave.guard.generation)) {
      await retryStaleRefresh(ctx, doc, reason, options, "diagnostics");
      return;
    }
    const lspDiagnostics = mapSemanticRuntimeAppDiagnostics(
      diagnostics,
      doc,
      ctx.workspaceRoot,
      (uri) => ctx.lookupText(uri),
    );
    if (!ctx.semanticRuntime.isCurrentGeneration(wave.guard.generation)) {
      await retryStaleRefresh(ctx, doc, reason, options, "mapping");
      return;
    }
    await ctx.connection.sendDiagnostics({ uri: doc.uri, diagnostics: lspDiagnostics });

    if (options.notifyWorkspace !== false) {
      await notifyWorkspaceChanged(ctx, ["diagnostics", "templates"], reason, wave.guard.generation);
    }
    await ctx.connection.sendNotification("aurelia/analysisReady", {
      uri: doc.uri,
      diags: lspDiagnostics.length,
      fingerprint: wave.guard.generation.fingerprint,
    });
  } catch (e: unknown) {
    if (isSemanticRuntimeLspRequestAborted(e) && e.reason === "stale") {
      await retryStaleRefresh(ctx, doc, reason, options, "request");
      return;
    }
    if (logIfSemanticRuntimeRequestAborted(ctx, "refreshDocument", e, doc.uri)) {
      return;
    }
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`refreshDocument failed: ${message}`);
  }
}

async function retryStaleRefresh(
  ctx: ServerContext,
  doc: TextDocument,
  reason: "open" | "change",
  options: DiagnosticRefreshOptions,
  phase: string,
): Promise<void> {
  const retryCount = options.staleRetryCount ?? 0;
  if (retryCount >= 1) {
    ctx.logger.log(`refreshDocument skipped stale ${phase} for ${doc.uri}`);
    return;
  }
  const currentDoc = ctx.documents.get(doc.uri);
  if (currentDoc == null) {
    ctx.logger.log(`refreshDocument skipped stale ${phase} for closed document ${doc.uri}`);
    return;
  }
  ctx.logger.log(`refreshDocument retrying stale ${phase} for ${doc.uri}`);
  await refreshDocument(ctx, currentDoc, reason, {
    notifyWorkspace: options.notifyWorkspace,
    sourceChanged: false,
    staleRetryCount: retryCount + 1,
  });
}

export function handleInitialize(ctx: ServerContext, params: InitializeParams): InitializeResult {
  ctx.workspaceRoot = params.rootUri ? URI.parse(params.rootUri).fsPath : null;
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
      codeActionProvider: true,
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
      // Post-PR-19 feature stubs — uncomment when workspace adds support:
      // codeActionProvider: { resolveProvider: true },
    },
  };
}

/**
 * Registers all lifecycle handlers on the connection and documents.
 */
export function registerLifecycleHandlers(ctx: ServerContext): void {
  ctx.connection.onInitialize((params) => handleInitialize(ctx, params));

  ctx.documents.onDidOpen((e) => {
    ctx.logger.log(`didOpen ${e.document.uri}`);
    recordSourceTextChanged(ctx, "document open");
    if (isScriptDocumentUri(e.document.uri)) {
      void refreshWorkspaceAfterRecordedSourceTextChanged(ctx, "open", "open");
    } else {
      void refreshDocument(ctx, e.document, "open", { sourceChanged: false });
    }
  });

  ctx.connection.onDidChangeConfiguration(() => {
    ctx.logger.log("didChangeConfiguration: reloading tsconfig and project index");
    void reloadProjectConfiguration(ctx, "configuration change");
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

    if (hasAnalyzedSourceContentChange(e.changes)) {
      ctx.logger.log("didChangeWatchedFiles: analyzed source content changed");
      void refreshWorkspaceSourceTextChanged(ctx, "watched files");
    }
  });

  ctx.documents.onDidChangeContent((e) => {
    const uri = e.document.uri;
    ctx.logger.log(`didChange ${uri} (debouncing)`);
    recordSourceTextChanged(ctx, "document content change");

    // Cancel any pending refresh for this document
    const pendingRefreshes = pendingRefreshesForContext(ctx);
    const existing = pendingRefreshes.get(uri);
    if (existing) {
      clearTimeout(existing);
    }

    // Schedule new refresh after debounce period
    // This ensures we only process after typing pauses, not on every keystroke
    const timeout = setTimeout(() => {
      pendingRefreshes.delete(uri);
      ctx.logger.log(`didChange ${uri} (processing after debounce)`);
      if (isScriptDocumentUri(uri)) {
        void refreshWorkspaceAfterRecordedSourceTextChanged(ctx, "change", "change");
      } else {
        void refreshDocument(ctx, e.document, "change", { sourceChanged: false });
      }
    }, DOCUMENT_CHANGE_DEBOUNCE_MS);

    pendingRefreshes.set(uri, timeout);
  });

  ctx.documents.onDidClose((e) => {
    ctx.logger.log(`didClose ${e.document.uri}`);

    // Cancel any pending refresh for this document
    const pendingRefreshes = pendingRefreshesForContext(ctx);
    const pending = pendingRefreshes.get(e.document.uri);
    if (pending) {
      clearTimeout(pending);
      pendingRefreshes.delete(e.document.uri);
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

function recordSourceTextChanged(ctx: ServerContext, reason: string): void {
  void ctx.semanticRuntime.recordSourceTextChanged().catch((error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    ctx.logger.error(`${reason} source refresh failed: ${message}`);
  });
}

async function beginDiagnosticRefreshWave(
  ctx: ServerContext,
  reason: "open" | "change",
  sourceChanged: boolean,
): Promise<DiagnosticRefreshWave> {
  if (sourceChanged) {
    await ctx.semanticRuntime.recordSourceTextChanged();
  }
  return {
    reason,
    guard: ctx.semanticRuntime.requestGuard(null),
  };
}

async function notifyWorkspaceChanged(
  ctx: ServerContext,
  domains: readonly string[],
  reason?: string,
  generation: SemanticRuntimeLspGeneration = ctx.semanticRuntime.currentGeneration(),
): Promise<void> {
  await ctx.connection.sendNotification("aurelia/workspaceChanged", {
    fingerprint: generation.fingerprint,
    domains,
    ...(reason == null ? {} : { reason }),
  });
  if (domains.includes("diagnostics") || domains.includes("types")) {
    void ctx.connection.sendRequest("workspace/diagnostics/refresh").catch(() => {});
  }
  if (domains.includes("resources") || domains.includes("templates")) {
    void ctx.connection.sendRequest("workspace/semanticTokens/refresh").catch(() => {});
  }
}

function pendingRefreshesForContext(ctx: ServerContext): Map<string, ReturnType<typeof setTimeout>> {
  const existing = pendingRefreshesByContext.get(ctx);
  if (existing != null) {
    return existing;
  }
  const pending = new Map<string, ReturnType<typeof setTimeout>>();
  pendingRefreshesByContext.set(ctx, pending);
  return pending;
}
