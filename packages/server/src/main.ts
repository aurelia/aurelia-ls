import {
  createConnection, ProposedFeatures, TextDocuments, TextDocumentSyncKind,
  DiagnosticSeverity, type InitializeParams, type InitializeResult,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";
import { URI } from "vscode-uri";
import * as fs from "node:fs";
import * as path from "node:path";
import * as ts from "typescript";

import {
  compileTemplateToOverlay, PRELUDE_TS, getExpressionParser, DEFAULT_SYNTAX
} from "@aurelia-ls/domain";
import type { VmReflection } from "@aurelia-ls/domain";

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
const htmlToOverlay  = new Map<string, { path: string; text: string }>();

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
 * Core: compile + overlay + diagnostics
 * ========================================================================== */
async function compileAndUpdateOverlay(doc: TextDocument) {
  const fsPath = uriToFsPath(doc.uri);
  const lang = (doc as any).languageId ?? "<unknown>";
  log(`compileAndUpdateOverlay: uri=${doc.uri} fsPath=${fsPath} lang=${lang}`);
  if (path.extname(fsPath).toLowerCase() !== ".html") {
    log(`skip (not .html): ${fsPath}`);
    return;
  }

  const base = path.basename(fsPath, ".html");
  const vmTypeNameGuess = pascalFromKebab(base);
  const vmSpecifier = detectVmSpecifier(fsPath, base);
  info(`vmType: ${vmTypeNameGuess}, vmSpecifier: ${vmSpecifier}`);

  const vm: VmReflection = {
    getRootVmTypeExpr() { return `import("${vmSpecifier}").${vmTypeNameGuess}`; },
    getSyntheticPrefix() { return "__AU_TTC_"; },
  };

  // Domain pipeline (HTML → IR → Linked → Scope → Plan → Emit)
  // e.g. :contentReference[oaicite:2]{index=2} :contentReference[oaicite:3]{index=3} :contentReference[oaicite:4]{index=4} :contentReference[oaicite:5]{index=5} :contentReference[oaicite:6]{index=6}
  let result: ReturnType<typeof compileTemplateToOverlay> | null = null;
  try {
    result = compileTemplateToOverlay({
      html: doc.getText(),
      templateFilePath: fsPath,
      isJs: false,
      vm,
      attrParser,
      exprParser,
    });
  } catch (e: any) {
    err(`compileTemplateToOverlay threw: ${e?.stack || e}`);
    connection.sendDiagnostics({ uri: doc.uri, diagnostics: [] });
    return;
  }
  if (!result) { warn(`no overlay result for ${fsPath}`); return; }

  upsertOverlay(result.overlayPath, result.text);
  htmlToOverlay.set(canonical(fsPath), { path: result.overlayPath, text: result.text });

  const accessCount = (result.text.match(/__au\$access/g) || []).length;
  log(`overlay@${result.overlayPath} len=${result.text.length} calls=${accessCount} preview:\n${preview(result.text)}`);
  log(`calls mapping entries: ${result.calls.length}`);

  const overlayCanon = canonical(result.overlayPath);
  const sf = forceOverlaySourceFile(overlayCanon);
  const program = tsService.getProgram();
  const roots = (program?.getRootFileNames() ?? []).map(canonical);
  log(`TS roots (${roots.length}):\n - ${roots.join("\n - ")}`);

  if (!program || !sf) {
    warn(`overlay SourceFile not ready in program: ${overlayCanon}`);
    connection.sendDiagnostics({ uri: doc.uri, diagnostics: [] });
    return;
  }

  const diags = ts.getPreEmitDiagnostics(program, sf);
  log(`overlay diagnostics: ${diags.length}`);

  const htmlDiags = [];
  for (const d of diags) {
    if (d.start == null || d.length == null) continue;
    const start = d.start;
    const call = result.calls.find((c) => start >= c.overlayStart && start <= c.overlayEnd);
    if (!call) continue;

    const range = spanToRange(doc, call.htmlSpan.start, call.htmlSpan.end);
    const message = flattenTsMessage(d.messageText);
    const severity = tsSeverityToLsp(d.category);
    htmlDiags.push({ range, message, severity, source: "aurelia-ttc" });
  }

  log(`remapped diagnostics: ${htmlDiags.length}`);
  connection.sendDiagnostics({ uri: doc.uri, diagnostics: htmlDiags });

  connection.sendNotification("aurelia/overlayReady", {
    uri: doc.uri,
    overlayPath: result.overlayPath,
    calls: result.calls.length,
    overlayLen: result.text.length,
    diags: htmlDiags.length,
  });
}

/* ============================================================================
 * Custom requests (overlay preview + dump state)
 * ========================================================================== */
type GetOverlayParams = { uri?: string } | string | null;
type GetOverlayResult = { overlayPath: string; text: string } | null;

connection.onRequest("aurelia/getOverlay", async (params: GetOverlayParams): Promise<GetOverlayResult> => {
  let uri: string | undefined;
  if (typeof params === "string") uri = params;
  else if (params && typeof params === "object") uri = (params as any).uri;

  log(`RPC aurelia/getOverlay params=${JSON.stringify(params)}`);

  if (uri) {
    const fsPath = uriToFsPath(uri);
    const key = canonical(fsPath);
    let rec = htmlToOverlay.get(key);

    if (!rec) {
      log(`overlay missing for ${fsPath} — compiling on demand`);
      const doc = documents.get(uri);
      if (doc) await compileAndUpdateOverlay(doc);
      rec = htmlToOverlay.get(key);
    }

    if (rec) {
      log(`overlay found for ${fsPath} → ${rec.path} (len=${rec.text.length})`);
      return { overlayPath: rec.path, text: rec.text };
    }
    warn(`overlay still not found for ${fsPath}`);
    return null;
  }

  const last = Array.from(htmlToOverlay.values()).pop();
  return last ? { overlayPath: last.path, text: last.text } : null;
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
    htmlToOverlay: Array.from(htmlToOverlay.entries()),
    programRoots: roots,
  };
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
