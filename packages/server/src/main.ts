import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  DiagnosticSeverity as LspDiagnosticSeverity,
  DiagnosticTag,
  type InitializeParams,
  type InitializeResult,
  type CompletionItem,
  type Hover,
  type Definition,
  type Location,
  type WorkspaceEdit,
  type ReferenceParams,
  type RenameParams,
  type TextDocumentPositionParams,
  type CodeAction,
  type CodeActionParams,
  type Position,
  type Diagnostic,
  type Range,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import path from "node:path";
import fs from "node:fs";
import {
  PRELUDE_TS,
  canonicalDocumentUri,
  deriveTemplatePaths,
  idKey,
  type DocumentSpan,
  type DocumentUri,
  type TemplateLanguageDiagnostic,
  type TemplateLanguageDiagnostics,
  type TemplateLanguageService,
  type TextEdit as TemplateTextEdit,
  type TextRange as TemplateTextRange,
  type HoverInfo,
} from "@aurelia-ls/domain";
import { createPathUtils } from "./services/paths.js";
import { OverlayFs } from "./services/overlay-fs.js";
import { TsService } from "./services/ts-service.js";
import { TsServicesAdapter } from "./services/typescript-services.js";
import { TemplateWorkspace } from "./services/template-workspace.js";
import type { Logger } from "./services/types.js";

/* =============================================================================
 * Logging + LSP wiring
 * ========================================================================== */
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
let workspaceRoot: string | null = null;

const logger: Logger = {
  log: (m: string) => connection.console.log(`[aurelia-ls] ${m}`),
  info: (m: string) => connection.console.info(`[aurelia-ls] ${m}`),
  warn: (m: string) => connection.console.warn(`[aurelia-ls] ${m}`),
  error: (m: string) => connection.console.error(`[aurelia-ls] ${m}`),
};

/* =============================================================================
 * Core services
 * ========================================================================== */
const paths = createPathUtils();
const overlayFs = new OverlayFs(paths);
const tsService = new TsService(overlayFs, paths, logger);
const tsAdapter = new TsServicesAdapter(tsService, paths);
const workspace = new TemplateWorkspace({
  program: {
    vm: createVmReflection(),
    isJs: false,
  },
  language: { typescript: tsAdapter },
});

/* =============================================================================
 * Helpers
 * ========================================================================== */
function createVmReflection() {
  return {
    getRootVmTypeExpr() { return "unknown"; },
    getSyntheticPrefix() { return "__AU_TTC_"; },
  };
}

function ensurePrelude() {
  const root = workspaceRoot ?? process.cwd();
  const preludePath = path.join(root, ".aurelia", "__prelude.d.ts");
  tsService.ensurePrelude(preludePath, PRELUDE_TS);
}

function toLspUri(uri: DocumentUri): string {
  const canonical = canonicalDocumentUri(uri);
  return URI.file(canonical.path).toString();
}

function guessLanguage(uri: DocumentUri): string {
  if (uri.endsWith(".ts") || uri.endsWith(".js")) return "typescript";
  if (uri.endsWith(".json")) return "json";
  return "html";
}

function lookupText(uri: DocumentUri): string | null {
  const canonical = canonicalDocumentUri(uri);
  const snap = workspace.program.sources.get(canonical.uri);
  if (snap) return snap.text;
  const overlay = overlayFs.snapshot(paths.canonical(canonical.path));
  if (overlay) return overlay.text;
  try {
    return fs.readFileSync(canonical.path, "utf8");
  } catch {
    return null;
  }
}

function spanToRange(loc: DocumentSpan): Range | null {
  const text = lookupText(loc.uri);
  if (!text) return null;
  const doc = TextDocument.create(toLspUri(loc.uri), guessLanguage(loc.uri), 0, text);
  return { start: doc.positionAt(loc.span.start), end: doc.positionAt(loc.span.end) };
}

function toRange(range: TemplateTextRange): Range {
  return {
    start: { line: range.start.line, character: range.start.character },
    end: { line: range.end.line, character: range.end.character },
  };
}

function toLspSeverity(sev: TemplateLanguageDiagnostic["severity"]): LspDiagnosticSeverity {
  switch (sev) {
    case "warning":
      return LspDiagnosticSeverity.Warning;
    case "info":
      return LspDiagnosticSeverity.Information;
    default:
      return LspDiagnosticSeverity.Error;
  }
}

function toLspTags(tags: readonly string[] | undefined): DiagnosticTag[] | undefined {
  if (!tags?.length) return undefined;
  const mapped: DiagnosticTag[] = [];
  for (const tag of tags) {
    if (tag === "unnecessary") mapped.push(DiagnosticTag.Unnecessary);
    if (tag === "deprecated") mapped.push(DiagnosticTag.Deprecated);
  }
  return mapped.length ? mapped : undefined;
}

function mapDiagnostics(diags: TemplateLanguageDiagnostics): Diagnostic[] {
  const mapped: Diagnostic[] = [];
  for (const diag of diags.all) {
    const range = diag.location ? spanToRange(diag.location) : null;
    if (!range) continue;
    const tags = diag.tags ? toLspTags(diag.tags) : undefined;
    const related = diag.related
      ?.map((rel) => {
        if (!rel.location) return null;
        const relRange = spanToRange(rel.location);
        return relRange ? { message: rel.message, location: { uri: toLspUri(rel.location.uri), range: relRange } } : null;
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r));

    const base: Diagnostic = {
      range,
      message: diag.message,
      severity: toLspSeverity(diag.severity),
      code: diag.code,
      source: diag.source,
    };

    if (related?.length) base.relatedInformation = related;
    if (tags) base.tags = tags;

    mapped.push(base);
  }
  return mapped;
}

function mapCompletions(items: ReturnType<TemplateLanguageService["getCompletions"]>): CompletionItem[] {
  return items.map((item) => {
    const completion: CompletionItem = { label: item.label };
    if (item.detail) completion.detail = item.detail;
    if (item.documentation) completion.documentation = item.documentation;
    if (item.sortText) completion.sortText = item.sortText;
    if (item.insertText) completion.insertText = item.insertText;
    if (item.range) {
      completion.textEdit = { range: toRange(item.range), newText: item.insertText ?? item.label };
    }
    return completion;
  });
}

function mapHover(hover: HoverInfo | null): Hover | null {
  if (!hover) return null;
  return {
    contents: { kind: "markdown", value: hover.contents },
    range: toRange(hover.range),
  };
}

function mapLocations(
  locs: ReturnType<TemplateLanguageService["getDefinition"]> | ReturnType<TemplateLanguageService["getReferences"]>,
): Location[] {
  return (locs ?? []).map((loc) => ({ uri: toLspUri(loc.uri), range: toRange(loc.range) }));
}

function mapWorkspaceEdit(edits: readonly TemplateTextEdit[]): WorkspaceEdit | null {
  if (!edits.length) return null;
  const changes: Record<string, { range: Range; newText: string }[]> = {};
  for (const edit of edits) {
    const uri = toLspUri(edit.uri);
    const lspEdit = { range: toRange(edit.range), newText: edit.newText };
    if (!changes[uri]) changes[uri] = [];
    changes[uri]!.push(lspEdit);
  }
  return { changes };
}

function overlayPathOptions(): { isJs: boolean; overlayBaseName?: string } {
  return workspace.program.options.overlayBaseName === undefined
    ? { isJs: workspace.program.options.isJs }
    : { isJs: workspace.program.options.isJs, overlayBaseName: workspace.program.options.overlayBaseName };
}

function ensureProgramDocument(uri: string): TextDocument | null {
  const live = documents.get(uri);
  if (live) {
    workspace.upsertDocument(live);
    return live;
  }
  const snap = workspace.ensureFromFile(uri);
  if (!snap) return null;
  return TextDocument.create(uri, "html", snap.version, snap.text);
}

async function refreshDocument(doc: TextDocument) {
  try {
    const canonical = canonicalDocumentUri(doc.uri);
    workspace.upsertDocument(doc);
    const overlay = workspace.buildService.getOverlay(canonical.uri);
    tsService.upsertOverlay(overlay.overlay.path, overlay.overlay.text);

    const diagnostics = workspace.languageService.getDiagnostics(canonical.uri);
    const lspDiagnostics = mapDiagnostics(diagnostics);
    connection.sendDiagnostics({ uri: doc.uri, diagnostics: lspDiagnostics });

    const compilation = workspace.program.getCompilation(canonical.uri);
    connection.sendNotification("aurelia/overlayReady", {
      uri: doc.uri,
      overlayPath: overlay.overlay.path,
      calls: overlay.calls.length,
      overlayLen: overlay.overlay.text.length,
      diags: lspDiagnostics.length,
      meta: compilation.meta,
    });
  } catch (e: any) {
    logger.error(`refreshDocument failed: ${e?.stack ?? e}`);
    connection.sendDiagnostics({ uri: doc.uri, diagnostics: [] });
  }
}

/* =============================================================================
 * Custom requests (overlay/SSR preview + dump state)
 * ========================================================================== */
connection.onRequest("aurelia/getOverlay", async (params: { uri?: string } | string | null) => {
  let uri: string | undefined;
  if (typeof params === "string") uri = params;
  else if (params && typeof params === "object") uri = (params as any).uri;

  logger.log(`RPC aurelia/getOverlay params=${JSON.stringify(params)}`);
  if (!uri) return null;
  const doc = ensureProgramDocument(uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(uri);
  const artifact = workspace.buildService.getOverlay(canonical.uri);
  tsService.upsertOverlay(artifact.overlay.path, artifact.overlay.text);
  return {
    overlayPath: artifact.overlay.path,
    text: artifact.overlay.text,
    mapping: artifact.mapping,
    calls: artifact.calls.map((c) => ({
      exprId: idKey(c.exprId),
      overlayStart: c.overlayStart,
      overlayEnd: c.overlayEnd,
      htmlStart: c.htmlSpan?.start ?? 0,
      htmlEnd: c.htmlSpan?.end ?? 0,
    })),
  };
});

connection.onRequest("aurelia/getMapping", async (params: { uri?: string } | string | null) => {
  let uri: string | undefined;
  if (typeof params === "string") uri = params;
  else if (params && typeof params === "object") uri = (params as any).uri;
  if (!uri) return null;
  const canonical = canonicalDocumentUri(uri);
  ensureProgramDocument(uri);
  const mapping = workspace.program.getMapping(canonical.uri);
  if (!mapping) return null;
  const derived = deriveTemplatePaths(canonical.uri, overlayPathOptions());
  return { overlayPath: derived.overlay.path, mapping };
});

connection.onRequest("aurelia/queryAtPosition", async (params: { uri: string; position: Position }) => {
  const uri = params?.uri;
  if (!uri || !params.position) return null;
  const doc = ensureProgramDocument(uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(uri);
  const query = workspace.program.getQuery(canonical.uri);
  const offset = doc.offsetAt(params.position);
  return {
    expr: query.exprAt(offset),
    node: query.nodeAt(offset),
    controller: query.controllerAt(offset),
    bindables: query.nodeAt(offset) ? query.bindablesFor(query.nodeAt(offset)!) : null,
    mappingSize: workspace.program.getMapping(canonical.uri)?.entries.length ?? 0,
  };
});

connection.onRequest("aurelia/getSsr", async (params: { uri?: string } | string | null) => {
  let uri: string | undefined;
  if (typeof params === "string") uri = params;
  else if (params && typeof params === "object") uri = (params as any).uri;
  if (!uri) return null;
  const doc = ensureProgramDocument(uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(uri);
  const ssr = workspace.buildService.getSsr(canonical.uri);
  return {
    htmlPath: ssr.html.path,
    htmlText: ssr.html.text,
    manifestPath: ssr.manifest.path,
    manifestText: ssr.manifest.text,
  };
});

connection.onRequest("aurelia/dumpState", () => {
  const roots = tsService.getService().getProgram()?.getRootFileNames() ?? [];
  return {
    workspaceRoot,
    caseSensitive: paths.isCaseSensitive(),
    projectVersion: tsService.getProjectVersion(),
    overlayRoots: overlayFs.listScriptRoots(),
    overlays: overlayFs.listOverlays(),
    programRoots: roots,
    programCache: workspace.program.getCacheStats(),
  };
});

/* =============================================================================
 * LSP feature wiring (completions/hover/defs/refs/rename/code actions)
 * ========================================================================== */
connection.onCompletion((params): CompletionItem[] => {
  const doc = ensureProgramDocument(params.textDocument.uri);
  if (!doc) return [];
  const canonical = canonicalDocumentUri(doc.uri);
  const completions = workspace.languageService.getCompletions(canonical.uri, params.position);
  return mapCompletions(completions);
});

connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  const doc = ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(doc.uri);
  return mapHover(workspace.languageService.getHover(canonical.uri, params.position));
});

connection.onDefinition((params: TextDocumentPositionParams): Definition | null => {
  const doc = ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(doc.uri);
  return mapLocations(workspace.languageService.getDefinition(canonical.uri, params.position));
});

connection.onReferences((params: ReferenceParams): Location[] | null => {
  const doc = ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(doc.uri);
  return mapLocations(workspace.languageService.getReferences(canonical.uri, params.position));
});

connection.onRenameRequest((params: RenameParams): WorkspaceEdit | null => {
  const doc = ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(doc.uri);
  const edits = workspace.languageService.renameSymbol(canonical.uri, params.position, params.newName);
  return mapWorkspaceEdit(edits);
});

connection.onCodeAction((params: CodeActionParams): CodeAction[] | null => {
  const doc = ensureProgramDocument(params.textDocument.uri);
  if (!doc) return null;
  const canonical = canonicalDocumentUri(doc.uri);
  const actions = workspace.languageService.getCodeActions(canonical.uri, params.range);
  const mapped: CodeAction[] = [];
  for (const action of actions) {
    const edit = mapWorkspaceEdit(action.edits);
    if (!edit) continue;
    const mappedAction: CodeAction = { title: action.title, edit };
    if (action.kind) mappedAction.kind = action.kind;
    mapped.push(mappedAction);
  }
  return mapped.length ? mapped : null;
});

/* =============================================================================
 * LSP lifecycle
 * ========================================================================== */
connection.onInitialize((params: InitializeParams): InitializeResult => {
  workspaceRoot = params.rootUri ? URI.parse(params.rootUri).fsPath : null;
  logger.info(`initialize: root=${workspaceRoot ?? "<cwd>"} caseSensitive=${paths.isCaseSensitive()}`);
  tsService.configure({ workspaceRoot });
  ensurePrelude();
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { triggerCharacters: ["<", " ", ".", ":", "@", "$", "{"] },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      renameProvider: true,
      codeActionProvider: true,
    },
  };
});

documents.onDidOpen(async (e) => {
  logger.log(`didOpen ${e.document.uri}`);
  await refreshDocument(e.document);
});

documents.onDidChangeContent(async (e) => {
  logger.log(`didChange ${e.document.uri}`);
  await refreshDocument(e.document);
});

documents.onDidClose((e) => {
  logger.log(`didClose ${e.document.uri}`);
  const canonical = canonicalDocumentUri(e.document.uri);
  workspace.close(canonical.uri);
  const derived = deriveTemplatePaths(canonical.uri, overlayPathOptions());
  tsService.deleteOverlay(derived.overlay.path);
  connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

documents.listen(connection);
connection.listen();
