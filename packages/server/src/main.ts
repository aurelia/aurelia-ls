import {
  createConnection, ProposedFeatures, TextDocuments, TextDocumentSyncKind,
  DiagnosticSeverity, type InitializeParams, type InitializeResult,
  type CompletionItem, type Hover, type Definition, type Location, type WorkspaceEdit,
  type ReferenceParams, type RenameParams, type TextDocumentPositionParams, type CodeAction,
  type CodeActionParams, type Position,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import * as fs from "node:fs";
import * as path from "node:path";
import * as ts from "typescript";

import {
  compileTemplate, compileTemplateToSSR, PRELUDE_TS, getExpressionParser, DEFAULT_SYNTAX
} from "@aurelia-ls/domain";
import type {
  VmReflection,
  TemplateCompilation,
  TemplateMappingArtifact,
  TemplateMappingEntry,
  TemplateMappingSegment,
  TemplateExpressionInfo,
  CompilerDiagnostic,
} from "@aurelia-ls/domain";

/* ============================================================================
 * Logging (verbose)
 * ========================================================================== */
const connection = createConnection(ProposedFeatures.all);
const log  = (m: string) => connection.console.log(`[aurelia-ls] ${m}`);
const info = (m: string) => connection.console.info(`[aurelia-ls] ${m}`);
const warn = (m: string) => connection.console.warn(`[aurelia-ls] ${m}`);
const err  = (m: string) => connection.console.error(`[aurelia-ls] ${m}`);

const documents = new TextDocuments(TextDocument);
let workspaceRoot: string | null = null;

/* ============================================================================
 * Canonicalization & in-memory FS for TS LS
 * ========================================================================== */
const CASE_SENSITIVE = ts.sys.useCaseSensitiveFileNames ?? false;
const normalizeSlashes = (f: string) => f.replace(/\\/g, '/');
const canonical = (f: string) => {
  const s = normalizeSlashes(f);
  return CASE_SENSITIVE ? s : s.toLowerCase();
};

type Snapshot = { text: string; version: number };
const overlayFiles   = new Map<string, Snapshot>();
const scriptFileKeys = new Set<string>();
const htmlPrograms   = new Map<string, TemplateCompilation>();
const htmlToSsr      = new Map<string, { htmlPath: string; htmlText: string; manifestPath: string; manifestText: string }>();

let projectVersion = 1;
let PRELUDE_PATH = "";

/* ============================================================================
 * TS Language Service plumbing
 * ========================================================================== */
function compilerOptions(): ts.CompilerOptions {
  return {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    allowJs: true,
    checkJs: false,
    skipLibCheck: true,
    resolveJsonModule: true,
    noEmit: true,
    verbatimModuleSyntax: true,
    allowImportingTsExtensions: true, // crucial for import("./my-app.ts")
    types: [],
  };
}

const host: ts.LanguageServiceHost = {
  getCompilationSettings: () => compilerOptions(),
  getCurrentDirectory: () => workspaceRoot ?? process.cwd(),
  getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
  getProjectVersion: () => String(projectVersion),
  useCaseSensitiveFileNames: () => CASE_SENSITIVE,

  getScriptFileNames: () => Array.from(scriptFileKeys),
  getScriptVersion: (f) => overlayFiles.get(canonical(f))?.version.toString() ?? "0",

  getScriptSnapshot: (f) => {
    const key = canonical(f);
    const v = overlayFiles.get(key);
    if (v) {
      log(`[host] getScriptSnapshot HIT overlay: ${f} → ${key}`);
      return ts.ScriptSnapshot.fromString(v.text);
    }
    try {
      if (fs.existsSync(f)) {
        log(`[host] getScriptSnapshot HIT disk: ${f}`);
        return ts.ScriptSnapshot.fromString(fs.readFileSync(f, "utf8"));
      }
    } catch {}
    warn(`[host] getScriptSnapshot MISS: ${f} → ${key}`);
    return undefined;
  },

  fileExists: (f) => {
    const key = canonical(f);
    const exists = overlayFiles.has(key) || fs.existsSync(f);
    if (!exists) warn(`[host] fileExists MISS: ${f} → ${key}`);
    return exists;
  },
  readFile: (f) => overlayFiles.get(canonical(f))?.text ?? (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : undefined),
  readDirectory: ts.sys.readDirectory,
  directoryExists: ts.sys.directoryExists,
  getDirectories: ts.sys.getDirectories,

  realpath: (p) => (overlayFiles.has(canonical(p)) ? p : (ts.sys.realpath ? ts.sys.realpath(p) : p)),

  // Optional instrumentation of module resolution
  resolveModuleNameLiterals(lits, containingFile, redirected, options) {
    const modHost: ts.ModuleResolutionHost = {
      fileExists: (f) => overlayFiles.has(canonical(f)) || fs.existsSync(f),
      readFile:   (f) => overlayFiles.get(canonical(f))?.text ?? (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : undefined),
      directoryExists: ts.sys.directoryExists,
      realpath: (p) =>
        overlayFiles.has(canonical(p))
          ? p
          : ts.sys.realpath ? ts.sys.realpath(p) : p,
      getCurrentDirectory: () => workspaceRoot ?? process.cwd(),
    };
    return lits.map(lit => {
      const res = ts.resolveModuleName(lit.text, containingFile, options, modHost);
      if (res.resolvedModule) {
        log(`resolve OK '${lit.text}' from '${containingFile}' → '${res.resolvedModule.resolvedFileName}'`);
      } else {
        warn(`resolve FAIL '${lit.text}' from '${containingFile}'`);
      }
      return { resolvedModule: res.resolvedModule } as ts.ResolvedModuleWithFailedLookupLocations;
    });
  },
};

let tsService: ts.LanguageService = ts.createLanguageService(host);
function recreateLanguageService() {
  try { tsService.dispose(); } catch {}
  tsService = ts.createLanguageService(host);
  log(`LanguageService recreated (projectVersion=${projectVersion})`);
}

/* ============================================================================
 * Parsers (DI) — one-time
 * ========================================================================== */
const exprParser = getExpressionParser();
const attrParser = DEFAULT_SYNTAX;

/* ============================================================================
 * Helpers
 * ========================================================================== */
function ensurePrelude() {
  const root = workspaceRoot ?? process.cwd();
  PRELUDE_PATH = path.join(root, ".aurelia", "__prelude.d.ts");
  const key = canonical(PRELUDE_PATH);
  if (!overlayFiles.has(key)) {
    overlayFiles.set(key, { text: PRELUDE_TS, version: 1 });
    scriptFileKeys.add(key);
    projectVersion++;
    recreateLanguageService();
    log(`Prelude installed @ ${PRELUDE_PATH}`);
  }
}

function upsertOverlay(fileAbs: string, text: string) {
  const key = canonical(fileAbs);
  const prev = overlayFiles.get(key);
  if (!prev) {
    scriptFileKeys.add(key);
    projectVersion++;
    log(`Overlay added root: ${fileAbs}`);
  }
  overlayFiles.set(key, { text, version: (prev?.version ?? 0) + 1 });
  projectVersion++;
  recreateLanguageService();
  log(`Overlay updated: ${fileAbs} (len=${text.length})`);
}

function uriToFsPath(uri: string): string {
  return URI.parse(uri).fsPath;
}
function spanToRange(doc: TextDocument, start: number, end: number) {
  return { start: doc.positionAt(start), end: doc.positionAt(end) };
}
function pascalFromKebab(n: string): string {
  return n.split(/[-_]/g).filter(Boolean)
          .map(s => (s[0] ? s[0].toUpperCase() + s.slice(1) : s)).join("");
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
function preview(s: string, n = 200) { return s.length <= n ? s : s.slice(0, n) + " …"; }
function flattenTsMessage(msg: string | ts.DiagnosticMessageChain): string {
  if (typeof msg === "string") return msg;
  const parts: string[] = [msg.messageText];
  let next = msg.next?.[0];
  while (next) { parts.push(next.messageText); next = next.next?.[0]; }
  return parts.join(" ");
}
function tsSeverityToLsp(cat: ts.DiagnosticCategory): DiagnosticSeverity {
  switch (cat) {
    case ts.DiagnosticCategory.Error: return DiagnosticSeverity.Error;
    case ts.DiagnosticCategory.Warning: return DiagnosticSeverity.Warning;
    case ts.DiagnosticCategory.Suggestion: return DiagnosticSeverity.Hint;
    case ts.DiagnosticCategory.Message: return DiagnosticSeverity.Information;
    default: return DiagnosticSeverity.Error;
  }
}

function compilerSeverityToLsp(sev: CompilerDiagnostic["severity"]): DiagnosticSeverity {
  switch (sev) {
    case "warning": return DiagnosticSeverity.Warning;
    case "info": return DiagnosticSeverity.Information;
    default: return DiagnosticSeverity.Error;
  }
}

/** Force create the SourceFile inside Program, then return it. */
function forceOverlaySourceFile(overlayPathCanon: string): ts.SourceFile | undefined {
  try {
    const syn = tsService.getSyntacticDiagnostics(overlayPathCanon);
    log(`syntactic diags for overlay: ${syn.length}`);
  } catch (e: any) {
    err(`getSyntacticDiagnostics threw: ${e?.message || e}`);
  }
  const program = tsService.getProgram();
  return program?.getSourceFile(overlayPathCanon);
}

/* ============================================================================
 * SSR compilation (on-demand)
 * ========================================================================== */
function buildVmReflection(fsPath: string): VmReflection {
  const base = path.basename(fsPath, ".html");
  const vmTypeNameGuess = pascalFromKebab(base);
  const vmSpecifier = detectVmSpecifier(fsPath, base);
  info(`vmType: ${vmTypeNameGuess}, vmSpecifier: ${vmSpecifier}`);
  return {
    getRootVmTypeExpr() { return `import("${vmSpecifier}").${vmTypeNameGuess}`; },
    getSyntheticPrefix() { return "__AU_TTC_"; },
  };
}

async function compileSsrForDocument(doc: TextDocument) {
  const fsPath = uriToFsPath(doc.uri);
  if (path.extname(fsPath).toLowerCase() !== ".html") return null;

  const cached = htmlToSsr.get(canonical(fsPath));
  if (cached) return cached;

  const vm = buildVmReflection(fsPath);
  try {
    const ssr = compileTemplateToSSR({
      html: doc.getText(),
      templateFilePath: fsPath,
      isJs: false,
      vm,
      attrParser,
      exprParser,
    });
    const rec = {
      htmlPath: ssr.htmlPath,
      htmlText: ssr.htmlText,
      manifestPath: ssr.manifestPath,
      manifestText: ssr.manifestText,
    };
    htmlToSsr.set(canonical(fsPath), rec);
    return rec;
  } catch (e: any) {
    err(`compileTemplateToSSR threw: ${e?.stack || e}`);
    return null;
  }
}

/* ============================================================================
 * Core: compile + overlay + diagnostics
 * ========================================================================== */

async function compileAndUpdateOverlay(doc: TextDocument) {
  const fsPath = uriToFsPath(doc.uri);
  const lang = (doc as any).languageId ?? "<unknown>";
  const key = canonical(fsPath);
  log(`compileAndUpdateOverlay: uri=${doc.uri} fsPath=${fsPath} lang=${lang}`);
  if (path.extname(fsPath).toLowerCase() !== ".html") {
    log(`skip (not .html): ${fsPath}`);
    return;
  }

  const vm: VmReflection = buildVmReflection(fsPath);

  let compilation: TemplateCompilation | null = null;
  try {
    compilation = compileTemplate({
      html: doc.getText(),
      templateFilePath: fsPath,
      isJs: false,
      vm,
      attrParser,
      exprParser,
    });
  } catch (e: any) {
    err(`compileTemplate threw: ${e?.stack || e}`);
    connection.sendDiagnostics({ uri: doc.uri, diagnostics: [] });
    return;
  }
  if (!compilation) { warn(`no overlay result for ${fsPath}`); return; }

  const overlay = compilation.overlay;
  upsertOverlay(overlay.overlayPath, overlay.text);
  htmlToSsr.delete(key); // invalidate SSR cache on new overlay build
  htmlPrograms.set(key, compilation);

  const accessCount = (overlay.text.match(/__au\$access/g) || []).length;
  log(`overlay@${overlay.overlayPath} len=${overlay.text.length} calls=${accessCount} preview:\n${preview(overlay.text)}`);
  log(`calls mapping entries: ${overlay.calls.length}`);

  const overlayCanon = canonical(overlay.overlayPath);
  const sf = forceOverlaySourceFile(overlayCanon);
  const program = tsService.getProgram();
  const roots = (program?.getRootFileNames() ?? []).map(canonical);
  log(`TS roots (${roots.length}):\n - ${roots.join("\n - ")}`);

  if (!program || !sf) {
    warn(`overlay SourceFile not ready in program: ${overlayCanon}`);
    connection.sendDiagnostics({ uri: doc.uri, diagnostics: [] });
    return;
  }

  const tsDiags = ts.getPreEmitDiagnostics(program, sf);
  log(`overlay diagnostics: ${tsDiags.length}`);

  const compilerDiags = mapCompilerDiagnosticsToLsp(compilation, doc);
  const badExprDiags = collectBadExpressionDiagnostics(compilation, doc);
  const htmlDiags = [...compilerDiags, ...badExprDiags, ...mapTsDiagnosticsToLsp(compilation, tsDiags, doc)];

  log(`remapped diagnostics: ${htmlDiags.length} (compiler=${compilerDiags.length}, bad=${badExprDiags.length}, ts=${htmlDiags.length - compilerDiags.length - badExprDiags.length})`);
  connection.sendDiagnostics({ uri: doc.uri, diagnostics: htmlDiags });

  connection.sendNotification("aurelia/overlayReady", {
    uri: doc.uri,
    overlayPath: overlay.overlayPath,
    calls: overlay.calls.length,
    overlayLen: overlay.text.length,
    diags: htmlDiags.length,
  });
}

async function ensureCompilationForDocument(doc: TextDocument): Promise<TemplateCompilation | null> {
  const fsPath = uriToFsPath(doc.uri);
  const key = canonical(fsPath);
  const cached = htmlPrograms.get(key);
  if (cached) return cached;
  await compileAndUpdateOverlay(doc);
  return htmlPrograms.get(key) ?? null;
}

async function ensureCompilationForUri(uri: string): Promise<TemplateCompilation | null> {
  const doc = documents.get(uri) ?? getTextDocumentForUri(uri);
  if (!doc) return null;
  return ensureCompilationForDocument(doc);
}


/* ============================================================================
 * Custom requests (overlay/SSR preview + dump state)
 * ========================================================================== */
type GetOverlayParams = { uri?: string } | string | null;
type OverlayCall = { exprId: string; overlayStart: number; overlayEnd: number; htmlStart: number; htmlEnd: number };
type GetOverlayResult = { overlayPath: string; text: string; calls?: OverlayCall[]; mapping?: TemplateMappingArtifact } | null;
type GetMappingResult = { overlayPath: string; mapping: TemplateMappingArtifact } | null;
type QueryAtPositionParams = { uri: string; position: Position };
type QueryAtPositionResult = {
  expr?: TemplateExpressionInfo | null;
  node?: ReturnType<TemplateCompilation["query"]["nodeAt"]>;
  bindables?: ReturnType<TemplateCompilation["query"]["bindablesFor"]>;
  controller?: ReturnType<TemplateCompilation["query"]["controllerAt"]>;
  mappingSize?: number;
} | null;
type GetSsrResult = { htmlPath: string; htmlText: string; manifestPath: string; manifestText: string } | null;


connection.onRequest("aurelia/getOverlay", async (params: GetOverlayParams): Promise<GetOverlayResult> => {
  let uri: string | undefined;
  if (typeof params === "string") uri = params;
  else if (params && typeof params === "object") uri = (params as any).uri;

  log(`RPC aurelia/getOverlay params=${JSON.stringify(params)}`);

  if (uri) {
    const compilation = await ensureCompilationForUri(uri);
    if (compilation) {
      const overlay = compilation.overlay;
      log(`overlay found for ${uri} -> ${overlay.overlayPath} (len=${overlay.text.length})`);
      return {
        overlayPath: overlay.overlayPath,
        text: overlay.text,
        mapping: compilation.mapping,
        calls: overlay.calls.map((c) => ({
          exprId: c.exprId as string,
          overlayStart: c.overlayStart,
          overlayEnd: c.overlayEnd,
          htmlStart: c.htmlSpan?.start ?? 0,
          htmlEnd: c.htmlSpan?.end ?? 0,
        })),
      };
    }
    warn(`overlay still not found for ${uri}`);
    return null;
  }

  const last = Array.from(htmlPrograms.values()).pop();
  return last ? {
    overlayPath: last.overlay.overlayPath,
    text: last.overlay.text,
    mapping: last.mapping,
    calls: last.overlay.calls.map((c) => ({
      exprId: c.exprId as string,
      overlayStart: c.overlayStart,
      overlayEnd: c.overlayEnd,
      htmlStart: c.htmlSpan?.start ?? 0,
      htmlEnd: c.htmlSpan?.end ?? 0,
    })),
  } : null;
});

connection.onRequest("aurelia/getMapping", async (params: GetOverlayParams): Promise<GetMappingResult> => {
  let uri: string | undefined;
  if (typeof params === "string") uri = params;
  else if (params && typeof params === "object") uri = (params as any).uri;

  if (uri) {
    const compilation = await ensureCompilationForUri(uri);
    if (!compilation) return null;
    return { overlayPath: compilation.overlay.overlayPath, mapping: compilation.mapping };
  }

  const last = Array.from(htmlPrograms.values()).pop();
  return last ? { overlayPath: last.overlay.overlayPath, mapping: last.mapping } : null;
});

connection.onRequest("aurelia/queryAtPosition", async (params: QueryAtPositionParams): Promise<QueryAtPositionResult> => {
  const uri = params?.uri;
  if (!uri || !params.position) return null;

  const doc = getTextDocumentForUri(uri);
  if (!doc) return null;

  const compilation = await ensureCompilationForDocument(doc);
  if (!compilation) return null;

  const offset = doc.offsetAt(params.position);
  const query = compilation.query;
  const expr = query.exprAt(offset);
  const node = query.nodeAt(offset);
  const controller = query.controllerAt(offset);
  const bindables = node ? query.bindablesFor(node) : null;

  return { expr, node, controller, bindables, mappingSize: compilation.mapping.entries.length };
});


function getTextDocumentForUri(uri: string): TextDocument | null {
  const live = documents.get(uri);
  if (live) return live;
  const fsPath = uriToFsPath(uri);
  if (!fs.existsSync(fsPath)) return null;
  const content = fs.readFileSync(fsPath, "utf8");
  return TextDocument.create(uri, "html", 0, content);
}

type MappingHit = { entry: TemplateMappingEntry; segment?: TemplateMappingSegment | null };

function findMappingHitForHtmlOffset(mapping: TemplateMappingArtifact, htmlOffset: number): MappingHit | null {
  let bestSegment: MappingHit | null = null;
  for (const entry of mapping.entries) {
    for (const seg of entry.segments ?? []) {
      if (htmlOffset >= seg.htmlSpan.start && htmlOffset <= seg.htmlSpan.end) {
        if (!bestSegment || spanSize(seg.htmlSpan) < spanSize(bestSegment.segment!.htmlSpan)) {
          bestSegment = { entry, segment: seg };
        }
      }
    }
  }
  if (bestSegment) return bestSegment;
  const fallback = mapping.entries.find((entry) => htmlOffset >= entry.htmlSpan.start && htmlOffset <= entry.htmlSpan.end);
  return fallback ? { entry: fallback, segment: null } : null;
}

function findMappingHitForOverlayOffset(mapping: TemplateMappingArtifact, overlayOffset: number): MappingHit | null {
  for (const entry of mapping.entries) {
    for (const seg of entry.segments ?? []) {
      if (overlayOffset >= seg.overlaySpan[0] && overlayOffset <= seg.overlaySpan[1]) {
        return { entry, segment: seg };
      }
    }
  }
  const fallback = mapping.entries.find((entry) => overlayOffset >= entry.overlayRange[0] && overlayOffset <= entry.overlayRange[1]);
  return fallback ? { entry: fallback, segment: null } : null;
}

function spanSize(span: { start: number; end: number }): number {
  return span.end - span.start;
}

function tsSpanToRange(fileName: string, start: number, length: number): { start: Position; end: Position } | null {
  const sf = tsService.getProgram()?.getSourceFile(fileName);
  if (!sf) return null;
  const a = ts.getLineAndCharacterOfPosition(sf, start);
  const b = ts.getLineAndCharacterOfPosition(sf, start + length);
  return { start: { line: a.line, character: a.character }, end: { line: b.line, character: b.character } };
}

function mapHtmlPositionToOverlay(compilation: TemplateCompilation, doc: TextDocument, pos: Position): { overlayPath: string; offset: number } | null {
  const htmlOffset = doc.offsetAt(pos);
  const hit = findMappingHitForHtmlOffset(compilation.mapping, htmlOffset);
  if (!hit) return null;
  if (hit.segment) {
    const seg = hit.segment;
    const delta = Math.min(seg.overlaySpan[1] - seg.overlaySpan[0], Math.max(0, htmlOffset - seg.htmlSpan.start));
    return { overlayPath: compilation.overlay.overlayPath, offset: seg.overlaySpan[0] + delta };
  }
  return { overlayPath: compilation.overlay.overlayPath, offset: hit.entry.overlayRange[0] };
}

function mapOverlayLocationToHtml(doc: TextDocument, compilation: TemplateCompilation, file: string, start: number, length: number): Location | null {
  const overlayCanon = canonical(compilation.overlay.overlayPath);
  if (canonical(file) !== overlayCanon) {
    // Non-overlay locations can be returned verbatim (e.g., VM definitions).
    const uri = URI.file(file).toString();
    const range = tsSpanToRange(file, start, length);
    if (!range) return null;
    return { uri, range };
  }
  const hit = findMappingHitForOverlayOffset(compilation.mapping, start);
  if (!hit) return null;
  if (hit.segment) {
    const range = spanToRange(doc, hit.segment.htmlSpan.start, hit.segment.htmlSpan.end);
    return { uri: doc.uri, range };
  }
  const range = spanToRange(doc, hit.entry.htmlSpan.start, hit.entry.htmlSpan.end);
  return { uri: doc.uri, range };
}

function mapCompilerDiagnosticsToLsp(compilation: TemplateCompilation, doc: TextDocument) {
  const all = [
    ...(compilation.linked?.diags ?? []),
    ...(compilation.scope?.diags ?? []),
    ...(compilation.typecheck?.diags ?? []),
  ];
  return all
    .filter((d) => d.span?.start != null && d.span?.end != null)
    .map((d) => {
      const shrunk = shrinkSpanWithMapping(d.span!, compilation.mapping);
      return {
        range: spanToRange(doc, shrunk.start, shrunk.end),
        message: d.message,
        severity: compilerSeverityToLsp(d.severity),
        code: d.code,
        source: d.source,
      };
    });
}

function mapTsDiagnosticsToLsp(compilation: TemplateCompilation, tsDiags: readonly ts.Diagnostic[], doc: TextDocument) {
  const htmlDiags = [];
  for (const d of tsDiags) {
    if (d.start == null || d.length == null) continue;
    const hit = findMappingHitForOverlayOffset(compilation.mapping, d.start);
    if (!hit) continue;
    const htmlSpan = hit.segment ? hit.segment.htmlSpan : hit.entry.htmlSpan;
    const range = spanToRange(doc, htmlSpan.start, htmlSpan.end);
    const message = flattenTsMessage(d.messageText);
    const severity = tsSeverityToLsp(d.category);
    htmlDiags.push({ range, message, severity, source: "aurelia-ttc" });
  }
  return htmlDiags;
}

function collectBadExpressionDiagnostics(compilation: TemplateCompilation, doc: TextDocument) {
  const diags = [];
  const mapping = compilation.mapping;
  const entriesByExpr = new Map<string, TemplateMappingEntry>();
  for (const entry of mapping.entries) entriesByExpr.set(entry.exprId as string, entry);

  for (const entry of compilation.ir?.exprTable ?? []) {
    const ast: any = (entry as any).ast;
    if (!ast || ast.$kind !== "BadExpression") continue;
    const m = entriesByExpr.get(entry.id as string);
    const span = m?.htmlSpan;
    if (!span) continue;
    const message = ast.message ? String(ast.message) : "Malformed expression";
    diags.push({
      range: spanToRange(doc, span.start, span.end),
      message,
      severity: DiagnosticSeverity.Error,
      code: "AU1000",
      source: "lower",
    });
  }
  return diags;
}

function shrinkSpanWithMapping(span: { start: number; end: number }, mapping: TemplateMappingArtifact): { start: number; end: number } {
  const hit = mapping.entries.find((m) => intersects(span, m.htmlSpan));
  if (!hit) return span;
  let best: { start: number; end: number } = hit.htmlSpan;
  for (const seg of hit.segments ?? []) {
    if (!intersects(span, seg.htmlSpan)) continue;
    if (spanSize(seg.htmlSpan) < spanSize(best)) best = seg.htmlSpan;
  }
  return spanSize(best) < spanSize(span) ? best : span;
}

function intersects(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start <= b.end && b.start <= a.end;
}

connection.onRequest("aurelia/getSsr", async (params: GetOverlayParams): Promise<GetSsrResult> => {
  let uri: string | undefined;
  if (typeof params === "string") uri = params;
  else if (params && typeof params === "object") uri = (params as any).uri;

  log(`RPC aurelia/getSsr params=${JSON.stringify(params)}`);
  const doc = uri ? getTextDocumentForUri(uri) : null;
  if (!doc) {
    warn(`getSsr: no document for uri=${uri ?? "<undefined>"}`);
    return null;
  }

  const rec = await compileSsrForDocument(doc);
  if (!rec) return null;
  return rec;
});

connection.onRequest("aurelia/dumpState", () => {
  const roots = tsService.getProgram()?.getRootFileNames() ?? [];
  return {
    workspaceRoot,
    caseSensitive: CASE_SENSITIVE,
    projectVersion,
    prelude: PRELUDE_PATH,
    overlayRoots: Array.from(scriptFileKeys),
    overlays: Array.from(overlayFiles.keys()),
    htmlPrograms: Array.from(htmlPrograms.entries()).map(([k, v]) => ({
      key: k,
      overlay: v.overlay.overlayPath,
      calls: v.overlay.calls.length,
      mappingEntries: v.mapping.entries.length,
    })),
    programRoots: roots,
  };
});

/* ============================================================================
 * LSP feature scaffolding (completions/hover/defs/refs/rename/code actions)
 * ========================================================================== */
connection.onCompletion(async (params): Promise<CompletionItem[]> => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  const compilation = await ensureCompilationForDocument(doc);
  if (!compilation) return [];
  const mapped = mapHtmlPositionToOverlay(compilation, doc, params.position);
  if (!mapped) return [];

  const overlayCanon = canonical(mapped.overlayPath);
  const completions = tsService.getCompletionsAtPosition(overlayCanon, mapped.offset, {});
  if (!completions?.entries) return [];

  return completions.entries.map((entry) => ({
    label: entry.name,
    detail: entry.kind,
    // TODO: map completion ranges back to HTML spans once mapping artifact is richer.
  }));
});

connection.onHover(async (params: TextDocumentPositionParams): Promise<Hover | null> => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const compilation = await ensureCompilationForDocument(doc);
  if (!compilation) return null;
  const mapped = mapHtmlPositionToOverlay(compilation, doc, params.position);
  if (!mapped) return null;

  const overlayCanon = canonical(mapped.overlayPath);
  const info = tsService.getQuickInfoAtPosition(overlayCanon, mapped.offset);
  if (!info) return null;

  const text = ts.displayPartsToString(info.displayParts ?? []);
  return { contents: [{ language: "typescript", value: text }] };
});

connection.onDefinition(async (params: TextDocumentPositionParams): Promise<Definition | null> => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const compilation = await ensureCompilationForDocument(doc);
  if (!compilation) return null;
  const mapped = mapHtmlPositionToOverlay(compilation, doc, params.position);
  if (!mapped) return [];

  const overlayCanon = canonical(mapped.overlayPath);
  const defs = tsService.getDefinitionAtPosition(overlayCanon, mapped.offset) ?? [];
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
  const compilation = await ensureCompilationForDocument(doc);
  if (!compilation) return null;
  // TODO: map TS references back to HTML using first-class mapping (requires richer overlay spans).
  void params;
  return [];
});

connection.onRenameRequest(async (params: RenameParams): Promise<WorkspaceEdit | null> => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const compilation = await ensureCompilationForDocument(doc);
  if (!compilation) return null;
  // TODO: implement HTML<->TS rename using mapping artifact.
  void params;
  return null;
});

connection.onCodeAction(async (params: CodeActionParams): Promise<CodeAction[] | null> => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const compilation = await ensureCompilationForDocument(doc);
  if (!compilation) return null;
  // TODO: surface create-bindable / event-name-fix actions using Query API context.
  void params;
  void compilation;
  return [];
});

/* ============================================================================
 * LSP lifecycle
 * ========================================================================== */
connection.onInitialize((params: InitializeParams): InitializeResult => {
  workspaceRoot = params.rootUri ? URI.parse(params.rootUri).fsPath : null;
  info(`initialize: root=${workspaceRoot ?? "<cwd>"} caseSensitive=${CASE_SENSITIVE}`);
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

documents.onDidOpen(async (e) => { log(`didOpen ${e.document.uri}`); await compileAndUpdateOverlay(e.document); });
documents.onDidChangeContent(async (e) => { log(`didChange ${e.document.uri}`); await compileAndUpdateOverlay(e.document); });
documents.onDidClose((e) => {
  log(`didClose ${e.document.uri}`);
  connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

documents.listen(connection);
connection.listen();
