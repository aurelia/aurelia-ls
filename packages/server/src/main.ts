import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  DiagnosticSeverity,
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
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import * as fs from "node:fs";
import * as path from "node:path";
import ts from "typescript";
import {
  PRELUDE_TS,
  mapHtmlOffsetToOverlay,
  mapOverlayOffsetToHtml,
  idKey,
  type TemplateCompilation,
} from "@aurelia-ls/domain";
import { createPathUtils } from "./services/paths.js";
import { OverlayFs } from "./services/overlay-fs.js";
import { TsService } from "./services/ts-service.js";
import { CompilerService } from "./services/compiler-service.js";
import {
  collectBadExpressionDiagnostics,
  mapCompilerDiagnosticsToLsp,
  mapTsDiagnosticsToLsp,
} from "./services/diagnostics.js";
import type { Logger } from "./services/types.js";
import { spanToRange } from "./services/spans.js";

/* =============================================================================
 * Logging + LSP wiring
 * ========================================================================== */
const connection = createConnection(ProposedFeatures.all);
const logger: Logger = {
  log: (m: string) => connection.console.log(`[aurelia-ls] ${m}`),
  info: (m: string) => connection.console.info(`[aurelia-ls] ${m}`),
  warn: (m: string) => connection.console.warn(`[aurelia-ls] ${m}`),
  error: (m: string) => connection.console.error(`[aurelia-ls] ${m}`),
};

const documents = new TextDocuments(TextDocument);
let workspaceRoot: string | null = null;

/* =============================================================================
 * Core services
 * ========================================================================== */
const paths = createPathUtils();
const overlayFs = new OverlayFs(paths);
const tsService = new TsService(overlayFs, paths, logger, () => workspaceRoot);
const compiler = new CompilerService(paths, logger);

/* =============================================================================
 * Helpers
 * ========================================================================== */
function ensurePrelude() {
  const root = workspaceRoot ?? process.cwd();
  const preludePath = path.join(root, ".aurelia", "__prelude.d.ts");
  tsService.ensurePrelude(preludePath, PRELUDE_TS);
}

function uriToFsPath(uri: string): string {
  return URI.parse(uri).fsPath;
}

function buildVmReflection(fsPath: string) {
  const base = path.basename(fsPath, ".html");
  const vmTypeNameGuess = pascalFromKebab(base);
  const vmSpecifier = detectVmSpecifier(fsPath, base);
  logger.info(`vmType: ${vmTypeNameGuess}, vmSpecifier: ${vmSpecifier}`);
  return {
    getRootVmTypeExpr() { return `import("${vmSpecifier}").${vmTypeNameGuess}`; },
    getSyntheticPrefix() { return "__AU_TTC_"; },
  };
}

function detectVmSpecifier(htmlPath: string, base: string): string {
  const dir = path.dirname(htmlPath);
  const candidates = [".ts", ".tsx", ".mts", ".cts", ".d.ts", ".js", ".jsx", ".mjs", ".cjs"];
  for (const ext of candidates) {
    const p = path.join(dir, `${base}${ext}`);
    if (fs.existsSync(p)) return `./${base}${ext}`;
  }
  return `./${base}`;
}

function pascalFromKebab(n: string): string {
  return n.split(/[-_]/g).filter(Boolean)
    .map((s) => (s[0] ? s[0].toUpperCase() + s.slice(1) : s)).join("");
}

function getTextDocumentForUri(uri: string): TextDocument | null {
  const live = documents.get(uri);
  if (live) return live;
  const fsPath = uriToFsPath(uri);
  if (!fs.existsSync(fsPath)) return null;
  const content = fs.readFileSync(fsPath, "utf8");
  return TextDocument.create(uri, "html", 0, content);
}

function mapHtmlPositionToOverlay(compilation: TemplateCompilation, doc: TextDocument, pos: Position): { overlayPath: string; offset: number } | null {
  const htmlOffset = doc.offsetAt(pos);
  const hit = mapHtmlOffsetToOverlay(compilation.mapping, htmlOffset);
  if (!hit) return null;
  if (hit.segment) {
    const seg = hit.segment;
    const delta = Math.min(seg.overlaySpan.end - seg.overlaySpan.start, Math.max(0, htmlOffset - seg.htmlSpan.start));
    return { overlayPath: compilation.overlay.overlayPath, offset: seg.overlaySpan.start + delta };
  }
  return { overlayPath: compilation.overlay.overlayPath, offset: hit.entry.overlaySpan.start };
}

function mapOverlayLocationToHtml(
  doc: TextDocument,
  compilation: TemplateCompilation,
  file: string,
  start: number,
  length: number,
): Location | null {
  const overlayCanon = paths.canonical(compilation.overlay.overlayPath);
  if (paths.canonical(file) !== overlayCanon) {
    const uri = URI.file(file).toString();
    const range = tsService.tsSpanToRange(file, start, length);
    if (!range) return null;
    return { uri, range };
  }
  const hit = mapOverlayOffsetToHtml(compilation.mapping, start);
  if (!hit) return null;
  const htmlSpan = hit.segment ? hit.segment.htmlSpan : hit.entry.htmlSpan;
  const range = spanToRange(doc, htmlSpan);
  return { uri: doc.uri, range };
}

/* =============================================================================
 * Compilation + diagnostics flow
 * ========================================================================== */
async function compileAndPublish(doc: TextDocument) {
  const fsPath = uriToFsPath(doc.uri);
  if (path.extname(fsPath).toLowerCase() !== ".html") {
    logger.log(`skip (not .html): ${fsPath}`);
    return;
  }

  const vm = buildVmReflection(fsPath);
  let compiled: TemplateCompilation | null = null;
  try {
    compiled = compiler.compileDocument(doc, vm)?.compilation ?? null;
  } catch (e: any) {
    logger.error(`compileTemplate threw: ${e?.stack ?? e}`);
    connection.sendDiagnostics({ uri: doc.uri, diagnostics: [] });
    return;
  }
  if (!compiled) return;

  const overlay = compiled.overlay;
  tsService.upsertOverlay(overlay.overlayPath, overlay.text);

  const overlayCanon = paths.canonical(overlay.overlayPath);
  const sf = tsService.forceOverlaySourceFile(overlayCanon);
  const program = tsService.getService().getProgram();
  const tsDiags = sf && program ? ts.getPreEmitDiagnostics(program, sf) : [];

  const compilerDiags = mapCompilerDiagnosticsToLsp(compiled, doc);
  const badExprDiags = collectBadExpressionDiagnostics(compiled, doc);
  const htmlDiags: Diagnostic[] = [...compilerDiags, ...badExprDiags, ...mapTsDiagnosticsToLsp(compiled, tsDiags, doc)];

  connection.sendDiagnostics({ uri: doc.uri, diagnostics: htmlDiags });
  connection.sendNotification("aurelia/overlayReady", {
    uri: doc.uri,
    overlayPath: overlay.overlayPath,
    calls: overlay.calls.length,
    overlayLen: overlay.text.length,
    diags: htmlDiags.length,
    meta: compiled.meta,
  });
}

async function ensureCompilationForUri(uri: string): Promise<TemplateCompilation | null> {
  const existing = compiler.getCompilationByUri(uri);
  if (existing) return existing;
  const doc = getTextDocumentForUri(uri);
  if (!doc) return null;
  await compileAndPublish(doc);
  return compiler.getCompilationByUri(uri);
}

/* =============================================================================
 * Custom requests (overlay/SSR preview + dump state)
 * ========================================================================== */
connection.onRequest("aurelia/getOverlay", async (params: { uri?: string } | string | null) => {
  let uri: string | undefined;
  if (typeof params === "string") uri = params;
  else if (params && typeof params === "object") uri = (params as any).uri;

  logger.log(`RPC aurelia/getOverlay params=${JSON.stringify(params)}`);
  const compilation = uri ? await ensureCompilationForUri(uri) : null;
  if (compilation) {
    const overlay = compilation.overlay;
    return {
      overlayPath: overlay.overlayPath,
      text: overlay.text,
      mapping: compilation.mapping,
      calls: overlay.calls.map((c) => ({
        exprId: idKey(c.exprId),
        overlayStart: c.overlayStart,
        overlayEnd: c.overlayEnd,
        htmlStart: c.htmlSpan?.start ?? 0,
        htmlEnd: c.htmlSpan?.end ?? 0,
      })),
    };
  }
  const last = Array.from(documents.all()).pop();
  return last ? await ensureCompilationForUri(last.uri) : null;
});

connection.onRequest("aurelia/getMapping", async (params: { uri?: string } | string | null) => {
  let uri: string | undefined;
  if (typeof params === "string") uri = params;
  else if (params && typeof params === "object") uri = (params as any).uri;
  const compilation = uri ? await ensureCompilationForUri(uri) : null;
  if (!compilation) return null;
  return { overlayPath: compilation.overlay.overlayPath, mapping: compilation.mapping };
});

connection.onRequest("aurelia/queryAtPosition", async (params: { uri: string; position: Position }) => {
  const uri = params?.uri;
  if (!uri || !params.position) return null;
  const doc = getTextDocumentForUri(uri);
  if (!doc) return null;
  const compilation = await ensureCompilationForUri(uri);
  if (!compilation) return null;

  const offset = doc.offsetAt(params.position);
  const query = compilation.query;
  const expr = query.exprAt(offset);
  const node = query.nodeAt(offset);
  const controller = query.controllerAt(offset);
  const bindables = node ? query.bindablesFor(node) : null;

  return { expr, node, controller, bindables, mappingSize: compilation.mapping.entries.length };
});

connection.onRequest("aurelia/getSsr", async (params: { uri?: string } | string | null) => {
  let uri: string | undefined;
  if (typeof params === "string") uri = params;
  else if (params && typeof params === "object") uri = (params as any).uri;

  logger.log(`RPC aurelia/getSsr params=${JSON.stringify(params)}`);
  const doc = uri ? getTextDocumentForUri(uri) : null;
  if (!doc) return null;
  const fsPath = uriToFsPath(doc.uri);
  const vm = buildVmReflection(fsPath);
  const ssr = compiler.compileSsrDocument(doc, vm);
  return ssr
    ? { htmlPath: ssr.htmlPath, htmlText: ssr.htmlText, manifestPath: ssr.manifestPath, manifestText: ssr.manifestText }
    : null;
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
  };
});

/* =============================================================================
 * LSP feature scaffolding (completions/hover/defs/refs/rename/code actions)
 * ========================================================================== */
connection.onCompletion(async (params): Promise<CompletionItem[]> => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  const compilation = await ensureCompilationForUri(doc.uri);
  if (!compilation) return [];
  const mapped = mapHtmlPositionToOverlay(compilation, doc, params.position);
  if (!mapped) return [];

  const overlayCanon = paths.canonical(mapped.overlayPath);
  const completions = tsService.getService().getCompletionsAtPosition(overlayCanon, mapped.offset, {});
  if (!completions?.entries) return [];

  return completions.entries.map((entry) => ({
    label: entry.name,
    detail: entry.kind,
  }));
});

connection.onHover(async (params: TextDocumentPositionParams): Promise<Hover | null> => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const compilation = await ensureCompilationForUri(doc.uri);
  if (!compilation) return null;
  const mapped = mapHtmlPositionToOverlay(compilation, doc, params.position);
  if (!mapped) return null;

  const overlayCanon = paths.canonical(mapped.overlayPath);
  const info = tsService.getService().getQuickInfoAtPosition(overlayCanon, mapped.offset);
  if (!info) return null;

  const text = ts.displayPartsToString(info.displayParts ?? []);
  return { contents: [{ language: "typescript", value: text }] };
});

connection.onDefinition(async (params: TextDocumentPositionParams): Promise<Definition | null> => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const compilation = await ensureCompilationForUri(doc.uri);
  if (!compilation) return null;
  const mapped = mapHtmlPositionToOverlay(compilation, doc, params.position);
  if (!mapped) return [];

  const overlayCanon = paths.canonical(mapped.overlayPath);
  const defs = tsService.getService().getDefinitionAtPosition(overlayCanon, mapped.offset) ?? [];
  const out: Location[] = [];
  for (const d of defs) {
    const loc = mapOverlayLocationToHtml(doc, compilation, d.fileName, d.textSpan.start, d.textSpan.length);
    if (loc) out.push(loc);
  }
  return out;
});

connection.onReferences(async (params: ReferenceParams): Promise<Location[] | null> => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const compilation = await ensureCompilationForUri(doc.uri);
  if (!compilation) return null;
  void params;
  return [];
});

connection.onRenameRequest(async (params: RenameParams): Promise<WorkspaceEdit | null> => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const compilation = await ensureCompilationForUri(doc.uri);
  if (!compilation) return null;
  void params;
  return null;
});

connection.onCodeAction(async (params: CodeActionParams): Promise<CodeAction[] | null> => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const compilation = await ensureCompilationForUri(doc.uri);
  if (!compilation) return null;
  void params;
  void compilation;
  return [];
});

/* =============================================================================
 * LSP lifecycle
 * ========================================================================== */
connection.onInitialize((params: InitializeParams): InitializeResult => {
  workspaceRoot = params.rootUri ? URI.parse(params.rootUri).fsPath : null;
  logger.info(`initialize: root=${workspaceRoot ?? "<cwd>"} caseSensitive=${paths.isCaseSensitive()}`);
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

documents.onDidOpen(async (e) => { logger.log(`didOpen ${e.document.uri}`); await compileAndPublish(e.document); });
documents.onDidChangeContent(async (e) => { logger.log(`didChange ${e.document.uri}`); await compileAndPublish(e.document); });
documents.onDidClose((e) => {
  logger.log(`didClose ${e.document.uri}`);
  connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

documents.listen(connection);
connection.listen();
