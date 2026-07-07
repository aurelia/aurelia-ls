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
} from "vscode-languageserver/node.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import path from "node:path";
import type { ServerContext } from "../context.js";
import { mapSemanticRuntimeAppDiagnostics } from "../mapping/lsp-types.js";
import { SEMANTIC_TOKENS_LEGEND } from "./semantic-tokens.js";

/** Debounce delay for document changes (ms). Waits for typing to pause before processing. */
const DOCUMENT_CHANGE_DEBOUNCE_MS = 300;

/** Tracks pending debounced refresh operations per document URI */
const pendingRefreshes = new Map<string, ReturnType<typeof setTimeout>>();

function hasSourceFileStructuralChange(changes: readonly FileEvent[]): boolean {
  for (const change of changes) {
    if (change.type !== FileChangeType.Created && change.type !== FileChangeType.Deleted) continue;
    const fsPath = URI.parse(change.uri).fsPath;
    if (fsPath.endsWith(".ts") || fsPath.endsWith(".js")) return true;
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
  ctx.semanticRuntime.invalidate();
  ctx.logger.info(`[workspace] semantic-runtime invalidated (${reason})`);
  await notifyWorkspaceChanged(ctx, [reason, "diagnostics", "types", "resources"]);
  await refreshAllOpenDocuments(ctx, "change");
}

async function refreshAllOpenDocuments(
  ctx: ServerContext,
  reason: "open" | "change",
  options?: { skipSync?: boolean }
): Promise<void> {
  const openDocs = ctx.documents.all();
  for (const doc of openDocs) {
    await refreshDocument(ctx, doc, reason, options);
  }
}

export async function refreshDocument(
  ctx: ServerContext,
  doc: TextDocument,
  reason: "open" | "change",
  _options?: { skipSync?: boolean }
): Promise<void> {
  try {
    ctx.semanticRuntime.invalidate();

    const diagnostics = await ctx.semanticRuntime.appDiagnostics(doc);
    const lspDiagnostics = mapSemanticRuntimeAppDiagnostics(diagnostics, doc, ctx.workspaceRoot, ctx.lookupText);
    await ctx.connection.sendDiagnostics({ uri: doc.uri, diagnostics: lspDiagnostics });

    await ctx.connection.sendNotification("aurelia/workspaceChanged", {
      fingerprint: semanticRuntimeFingerprint(ctx),
      domains: ["diagnostics", "templates"],
      reason,
    });
    await ctx.connection.sendNotification("aurelia/analysisReady", {
      uri: doc.uri,
      diags: lspDiagnostics.length,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`refreshDocument failed: ${message}`);
  }
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
    void refreshDocument(ctx, e.document, "open");
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
      ctx.semanticRuntime.invalidate();
      void notifyWorkspaceChanged(ctx, ["resources", "types", "diagnostics"]);
      void refreshAllOpenDocuments(ctx, "change");
    }
  });

  ctx.documents.onDidChangeContent((e) => {
    const uri = e.document.uri;
    ctx.logger.log(`didChange ${uri} (debouncing)`);

    // Cancel any pending refresh for this document
    const existing = pendingRefreshes.get(uri);
    if (existing) {
      clearTimeout(existing);
    }

    // Schedule new refresh after debounce period
    // This ensures we only process after typing pauses, not on every keystroke
    const timeout = setTimeout(() => {
      pendingRefreshes.delete(uri);
      ctx.logger.log(`didChange ${uri} (processing after debounce)`);
      void refreshDocument(ctx, e.document, "change");
    }, DOCUMENT_CHANGE_DEBOUNCE_MS);

    pendingRefreshes.set(uri, timeout);
  });

  ctx.documents.onDidClose((e) => {
    ctx.logger.log(`didClose ${e.document.uri}`);

    // Cancel any pending refresh for this document
    const pending = pendingRefreshes.get(e.document.uri);
    if (pending) {
      clearTimeout(pending);
      pendingRefreshes.delete(e.document.uri);
    }

    ctx.semanticRuntime.invalidate();
    void ctx.connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
  });
}

async function notifyWorkspaceChanged(ctx: ServerContext, domains: readonly string[]): Promise<void> {
  const fingerprint = semanticRuntimeFingerprint(ctx);
  await ctx.connection.sendNotification("aurelia/workspaceChanged", {
    fingerprint,
    domains,
  });
  if (domains.includes("diagnostics") || domains.includes("types")) {
    void ctx.connection.sendRequest("workspace/diagnostics/refresh").catch(() => {});
  }
  if (domains.includes("resources") || domains.includes("templates")) {
    void ctx.connection.sendRequest("workspace/semanticTokens/refresh").catch(() => {});
  }
}

function semanticRuntimeFingerprint(ctx: ServerContext): string {
  return `semantic-runtime:${ctx.workspaceRoot ?? "no-root"}:${ctx.documents.all().length}`;
}
