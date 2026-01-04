/**
 * LSP lifecycle handlers: initialize, document events, configuration changes
 */
import {
  TextDocumentSyncKind,
  SemanticTokensRegistrationType,
  type InitializeParams,
  type InitializeResult,
  type DidChangeWatchedFilesParams,
  type FileEvent,
} from "vscode-languageserver/node.js";
import type { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import path from "node:path";
import { canonicalDocumentUri, deriveTemplatePaths } from "@aurelia-ls/compiler";
import { DiagnosticSeverity } from "vscode-languageserver/node.js";
import { AureliaProjectIndex } from "../services/project-index.js";
import { TemplateWorkspace } from "../services/template-workspace.js";
import type { ServerContext } from "../context.js";
import { mapDiagnostics, type LookupTextFn } from "../mapping/lsp-types.js";
import { SEMANTIC_TOKENS_LEGEND, validateTemplateImports } from "./features.js";

/** Debounce delay for document changes (ms). Waits for typing to pause before processing. */
const DOCUMENT_CHANGE_DEBOUNCE_MS = 300;

/** Tracks pending debounced refresh operations per document URI */
const pendingRefreshes = new Map<string, ReturnType<typeof setTimeout>>();

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
  if (!ctx.projectIndex || !ctx.workspace) return;
  const beforeVersion = ctx.tsService.getProjectVersion();

  ctx.tsService.configure({ workspaceRoot: ctx.workspaceRoot });
  ctx.syncWorkspaceWithIndex({ force: true });  // Force sync on config reload

  const versionChanged = ctx.tsService.getProjectVersion() !== beforeVersion;
  const label = `${reason}; version=${ctx.tsService.getProjectVersion()} fingerprint=${ctx.workspace.fingerprint}`;

  if (versionChanged) {
    ctx.logger.info(`[workspace] tsconfig reload (${label})`);
  } else {
    ctx.logger.info(`[workspace] tsconfig reload (${label}) [no host change]`);
  }

  await refreshAllOpenDocuments(ctx, "change", { skipSync: true });
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
  options?: { skipSync?: boolean }
): Promise<void> {
  try {
    if (!options?.skipSync) {
      ctx.syncWorkspaceWithIndex();
    }
    const canonical = canonicalDocumentUri(doc.uri);
    if (reason === "open") {
      ctx.workspace.open(doc);
    } else {
      ctx.workspace.change(doc);
    }
    const overlay = ctx.materializeOverlay(canonical.uri);

    const lookupText: LookupTextFn = (uri) => ctx.lookupText(uri);

    const diagnostics = ctx.workspace.languageService.getDiagnostics(canonical.uri);
    const lspDiagnostics = mapDiagnostics(diagnostics, lookupText);

    // Add template import diagnostics
    const templateImportDiags = validateTemplateImports(ctx, doc, canonical.path);
    const importDiagsLsp = templateImportDiags.map((diag) => ({
      range: diag.range,
      message: diag.message,
      severity: diag.severity === "error" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
      code: diag.code,
      source: "aurelia",
    }));

    await ctx.connection.sendDiagnostics({ uri: doc.uri, diagnostics: [...lspDiagnostics, ...importDiagsLsp] });

    const compilation = ctx.workspace.program.getCompilation(canonical.uri);
    await ctx.connection.sendNotification("aurelia/overlayReady", {
      uri: doc.uri,
      overlayPath: overlay?.overlay.path,
      calls: overlay?.calls.length ?? 0,
      overlayLen: overlay?.overlay.text.length ?? 0,
      diags: lspDiagnostics.length,
      meta: compilation.meta,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.stack ?? e.message : String(e);
    ctx.logger.error(`refreshDocument failed: ${message}`);
    await ctx.connection.sendDiagnostics({ uri: doc.uri, diagnostics: [] });
  }
}

function createWorkspaceFromIndex(ctx: ServerContext): TemplateWorkspace {
  const semantics = ctx.projectIndex.currentSemantics();
  const resourceGraph = ctx.projectIndex.currentResourceGraph();
  const options: {
    vm: typeof ctx.vmReflection;
    isJs: boolean;
    semantics: typeof semantics;
    resourceGraph: typeof resourceGraph;
    resourceScope?: typeof resourceGraph.root | null;
  } = {
    vm: ctx.vmReflection,
    isJs: false,
    semantics,
    resourceGraph,
  };
  const resourceScope = semantics.defaultScope ?? resourceGraph.root ?? null;
  if (resourceScope !== null) options.resourceScope = resourceScope;

  return new TemplateWorkspace({
    program: options,
    language: { typescript: ctx.tsAdapter },
    fingerprint: ctx.projectIndex.currentFingerprint(),
  });
}

export function handleInitialize(ctx: ServerContext, params: InitializeParams): InitializeResult {
  ctx.workspaceRoot = params.rootUri ? URI.parse(params.rootUri).fsPath : null;
  ctx.logger.info(`initialize: root=${ctx.workspaceRoot ?? "<cwd>"} caseSensitive=${ctx.paths.isCaseSensitive()}`);
  ctx.tsService.configure({ workspaceRoot: ctx.workspaceRoot });
  ctx.ensurePrelude();
  ctx.projectIndex = new AureliaProjectIndex({ ts: ctx.tsService, logger: ctx.logger });
  ctx.projectIndex.refresh();
  ctx.workspace = createWorkspaceFromIndex(ctx);
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ["<", " ", ".", ":", "@", "$", "{"] },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      renameProvider: true,
      codeActionProvider: true,
      semanticTokensProvider: {
        legend: SEMANTIC_TOKENS_LEGEND,
        full: true,
        // delta: true,  // TODO: Enable incremental updates for performance
      },
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
    if (!shouldReloadForFileChange(e.changes)) return;
    ctx.logger.log("didChangeWatchedFiles: tsconfig/jsconfig changed, reloading project");
    void reloadProjectConfiguration(ctx, "watched files");
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
    const derived = deriveTemplatePaths(canonical.uri, ctx.overlayPathOptions());
    ctx.tsService.deleteOverlay(derived.overlay.path);
    void ctx.connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
  });
}
