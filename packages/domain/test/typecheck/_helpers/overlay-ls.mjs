import * as ts from "typescript";

function createLsSession({ checkJs }) {
  const files = new Map(); // path -> { text, version }
  const get = (f) => files.get(f);
  const put = (f, text) => files.set(f, { text, version: (get(f)?.version ?? 0) + 1 });

  const options = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    strict: true,
    allowJs: true,
    checkJs: !!checkJs,
    noResolve: true,   // no module resolution; overlays are self-contained
    noLib: false,
    skipLibCheck: true,
  };

  const serviceHost = {
    getCompilationSettings: () => options,
    getScriptFileNames: () => [...files.keys()],
    getScriptVersion: (f) => String(get(f)?.version ?? 0),
    getScriptSnapshot: (f) => {
      const mem = get(f)?.text;
      if (mem != null) return ts.ScriptSnapshot.fromString(mem);
      if (ts.sys.fileExists(f)) {
        const t = ts.sys.readFile(f);
        return t != null ? ts.ScriptSnapshot.fromString(t) : undefined;
      }
      return undefined;
    },
    fileExists: (f) => files.has(f) || ts.sys.fileExists(f),
    readFile: (f) => get(f)?.text ?? ts.sys.readFile(f),
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists?.bind(ts.sys),
    getCurrentDirectory: () => "/mem",
    getDefaultLibFileName: (opts) => ts.getDefaultLibFilePath(opts),
    getCanonicalFileName: (f) => f,
    getNewLine: () => "\n",
  };

  const service = ts.createLanguageService(serviceHost);

  return {
    ts,
    setFile(path, text) { put(path, text); },
    ensurePrelude(path, text) { if (!files.has(path)) put(path, text); },
    getSemanticDiagnostics(path) { return service.getSemanticDiagnostics(path); },
    cleanup() { service.cleanupSemanticCache(); },
    dispose() { service.dispose(); },
  };
}

let TS_SESSION;  // checkJs: false
let JS_SESSION;  // checkJs: true

export async function getSession(isJs) {
  if (isJs) {
    JS_SESSION ??= createLsSession({ checkJs: true });
    return JS_SESSION;
  } else {
    TS_SESSION ??= createLsSession({ checkJs: false });
    return TS_SESSION;
  }
}

/**
 * Compile HTML → overlay, update the single warm LS, and return diagnostics.
 * overlayBaseName is used to create a unique in-memory filename to avoid races.
 */
export async function compileAndCheckFast({
  html,
  isJs,
  vmTypeExpr,
  preludeText,
  overlayBaseName = "overlay",
  exprParser,
  attrParser,
  typesText,
}) {
  const domainIndexUrl = new URL("../../../out/index.js", import.meta.url);
  const { compileTemplateToOverlay } = await import(domainIndexUrl.href);

  const vm = {
    getRootVmTypeExpr: () => vmTypeExpr,
    getSyntheticPrefix: () => "__AU_TTC_",
  };

  const { text } = compileTemplateToOverlay({
    html,
    templateFilePath: `C:/mem/${overlayBaseName}.html`,
    isJs,
    vm,
    exprParser,
    attrParser,
    overlayBaseName,
  });

  const sess = await getSession(isJs);
  const overlayPath = `/mem/${overlayBaseName}.${isJs ? "js" : "ts"}`;

  // Load prelude once per session
  sess.ensurePrelude("/mem/__prelude.d.ts", preludeText);
  // Load user-provided ambient types for this test case (mirrors real project types)
  if (typeof typesText === "string" && typesText.trim().length > 0) {
    sess.setFile("/mem/__types.d.ts", typesText);
  }
  // Update this test's overlay file
  sess.setFile(overlayPath, text);

  const diags = sess.getSemanticDiagnostics(overlayPath);
  return { ts: sess.ts, diags, overlayText: text, overlayPath };
}

export function assertSuccess(ts, diags) {
  if (diags.length) {
    const formatted = ts.formatDiagnosticsWithColorAndContext(diags, {
      getCurrentDirectory: () => "/mem",
      getCanonicalFileName: f => f,
      getNewLine: () => "\n",
    });
    throw new Error("Expected success, got diagnostics:\n" + formatted);
  }
}

export function assertFailure(ts, diags, patterns) {
  const msgs = diags.map(d => String(d.messageText));
  const ok = patterns.every(rx => msgs.some(m => rx.test(m)));
  if (!ok) {
    throw new Error(
      "Expected failure patterns not found.\nWanted:\n" +
      patterns.map(p => "  - " + p).join("\n") +
      "\nGot:\n" + msgs.map(m => "  - " + m).join("\n")
    );
  }
}
