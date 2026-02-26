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
import { canonicalDocumentUri } from "@aurelia-ls/compiler";
import { createSemanticWorkspace } from "@aurelia-ls/semantic-workspace";
import type { ServerContext } from "../context.js";
import { mapWorkspaceDiagnostics, type LookupTextFn } from "../mapping/lsp-types.js";
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
  if (!ctx.workspace) return;
  ctx.workspace.configureProject({ workspaceRoot: ctx.workspaceRoot });
  ctx.logger.info(`[workspace] tsconfig reload (${reason}; fingerprint=${ctx.workspace.snapshot().meta.fingerprint})`);
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
    const canonical = canonicalDocumentUri(doc.uri);
    if (reason === "open") {
      ctx.workspace.open(canonical.uri, doc.getText(), doc.version);
    } else {
      ctx.workspace.update(canonical.uri, doc.getText(), doc.version);
    }

    const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);

    const diagnostics = ctx.workspace.diagnostics(canonical.uri);
    const lspDiagnostics = mapWorkspaceDiagnostics(canonical.uri, diagnostics, lookupText);
    await ctx.connection.sendDiagnostics({ uri: doc.uri, diagnostics: lspDiagnostics });

    let overlay: ReturnType<ServerContext["workspace"]["getOverlay"]> | null = null;
    let compilation: ReturnType<ServerContext["workspace"]["getCompilation"]> | null = null;
    try {
      overlay = ctx.workspace.getOverlay(canonical.uri);
      compilation = ctx.workspace.getCompilation(canonical.uri);
    } catch {}

    await ctx.connection.sendNotification("aurelia/overlayReady", {
      uri: doc.uri,
      overlayPath: overlay?.overlay.path,
      calls: overlay?.calls.length ?? 0,
      overlayLen: overlay?.overlay.text.length ?? 0,
      diags: lspDiagnostics.length,
      meta: compilation?.meta,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`refreshDocument failed: ${message}`);
  }
}

export function handleInitialize(ctx: ServerContext, params: InitializeParams): InitializeResult {
  ctx.workspaceRoot = params.rootUri ? URI.parse(params.rootUri).fsPath : null;
  ctx.logger.info(`initialize: root=${ctx.workspaceRoot ?? "<cwd>"}`);
  const stripSourcedNodes = process.env["AURELIA_RESOLUTION_STRIP_SOURCED_NODES"] === "1";
  ctx.workspace = createSemanticWorkspace({
    logger: ctx.logger,
    workspaceRoot: ctx.workspaceRoot,
    discovery: {
      stripSourcedNodes,
    },
  });

  // Subscribe to workspace-level semantic changes (third-party scan,
  // TS project version bump, config reload). Forward as LSP notifications
  // so VS Code features can react to knowledge changes.
  ctx.workspace.onDidChangeSemantics((event) => {
    ctx.logger.info(`[workspace] semantics changed: domains=[${event.domains.join(",")}] fingerprint=${event.fingerprint}`);
    void ctx.connection.sendNotification("aurelia/workspaceChanged", {
      fingerprint: event.fingerprint,
      domains: event.domains,
    });
    // Use standard LSP refresh for cross-file effects on standard features
    if (event.domains.includes("diagnostics") || event.domains.includes("types")) {
      void ctx.connection.sendRequest("workspace/diagnostics/refresh").catch(() => {});
    }
    if (event.domains.includes("resources") || event.domains.includes("scopes")) {
      void ctx.connection.sendRequest("workspace/semanticTokens/refresh").catch(() => {});
    }
    // Refresh open documents so they pick up the changed semantics
    void refreshAllOpenDocuments(ctx, "change");
  });

  // Fire-and-forget: async npm analysis discovers third-party Aurelia packages.
  void ctx.workspace.initThirdParty().then(() => {
    ctx.logger.info("[workspace] Third-party init complete");
  });

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ["<", " ", ".", ":", "@", "$", "{"] },
      hoverProvider: true,
      definitionProvider: { workDoneProgress: false },
      referencesProvider: true,
      renameProvider: { prepareProvider: true },
      codeActionProvider: true,
      inlayHintProvider: true,
      semanticTokensProvider: {
        legend: SEMANTIC_TOKENS_LEGEND,
        full: true,
      },
      // Post-PR-19 feature stubs — uncomment when workspace adds support:
      // documentSymbolProvider: true,
      // codeLensProvider: { resolveProvider: false },
      // inlayHintProvider: { resolveProvider: false },
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
      ctx.workspace.reloadProject();
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

    const canonical = canonicalDocumentUri(e.document.uri);
    ctx.workspace.close(canonical.uri);
    void ctx.connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
  });
}
