import * as ts from "typescript";

const ASSET_MODULES_D_TS = `
declare module '*.html' {
  export const name: string;
  export const template: string;
  const _default: string;
  export default _default;
  export const dependencies: string[];
  export const containerless: boolean | undefined;
  export const shadowOptions: { mode: 'open' | 'closed'} | undefined;
}
declare module '*.css';
`;

const AURELIA_STUBS_D_TS = `
declare module '@aurelia/runtime-html' {
  export interface CustomElementOptions {
    name?: string;
    template?: string;
    dependencies?: unknown[];
    containerless?: boolean;
    shadowOptions?: { mode: 'open'|'closed' } | undefined;
  }
  export function customElement(options: CustomElementOptions | string): ClassDecorator;
  export const CustomElement: { define: (...args: any[]) => any };
}
declare module 'aurelia' {
  export const customElement: any;
  export const valueConverter: any;
  export const bindingBehavior: any;
  export const templateController: any;
  export const inlineView: any;
  export const noView: any;
}
`;

function createLsSession({ checkJs }) {
  const files = new Map(); // path -> { text, version }
  const get = (f) => files.get(f);
  const put = (f, text) => files.set(f, { text, version: (get(f)?.version ?? 0) + 1 });
  const has = (f) => files.has(f);

  const options = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    allowJs: true,
    checkJs: !!checkJs,
    experimentalDecorators: true,
    noResolve: true,   // no module resolution; overlays are self-contained
    noLib: false,
    skipLibCheck: true,
    types: [], // don't load @types/*
  };

  // Seed once per session
  const ensureOnce = (path, text) => { if (!has(path)) put(path, text); };
  ensureOnce("/mem/types/assets-modules.d.ts", ASSET_MODULES_D_TS);
  ensureOnce("/mem/types/aurelia-stubs.d.ts", AURELIA_STUBS_D_TS);

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
    setFile: put,
    ensureFile: ensureOnce,
    ensurePrelude(path, text) { ensureOnce(path, text); },
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
 * Build a realistic entry module (TS or JS), then prepend the overlay text into
 * that same module. Ambient stubs handle imports quickly.
 */
export async function compileFromEntry({
  html,
  markupFile = "view.html",
  isJs,
  className = "Foo",
  // 'entrySource' should contain import(s), decorator(s), class Foo, and any helper classes/types.
  entrySource,
  preludeText,
  overlayBaseName = "entry",
  exprParser,
  attrParser,
}) {
  const compilerIndexUrl = new URL("../../../out/index.js", import.meta.url);
  const {
    DefaultTemplateProgram,
    DefaultTemplateBuildService,
    canonicalDocumentUri,
  } = await import(compilerIndexUrl.href);

  const vm = {
    // Crucial: refer to the class in the same file, not a synthetic type alias.
    getRootVmTypeExpr: () => className,
    getSyntheticPrefix: () => "__AU_TTC_",
  };

  const program = new DefaultTemplateProgram({
    vm,
    isJs,
    exprParser,
    attrParser,
    overlayBaseName,
  });
  const uri = canonicalDocumentUri(`C:/mem/${markupFile}`).uri;
  program.upsertTemplate(uri, html);
  const overlay = new DefaultTemplateBuildService(program).getOverlay(uri).overlay.text;

  // Prepare the full entry file (prelude is global; overlay is per-file)
  const sess = await getSession(isJs);
  sess.ensurePrelude("/mem/types/ttc-prelude.d.ts", preludeText);

  const ext = isJs ? (markupFile.endsWith(".mjs") ? "mjs" : "js") : "ts";
  const entryPath = `/mem/${overlayBaseName}.${ext}`;

  // Prepend the overlay to the entry source (same module scope).
  const full = `${overlay}\n${entrySource}\n`;

  sess.setFile(entryPath, full);

  const diags = sess.getSemanticDiagnostics(entryPath);
  return { ts: sess.ts, diags, overlayText: overlay, entryPath, fullSource: full };
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
  const msgs = diags.map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
  const ok = patterns.every(rx => msgs.some(m => rx.test(m)));
  if (!ok) {
    throw new Error(
      "Expected failure patterns not found.\nWanted:\n" +
      patterns.map(p => "  - " + p).join("\n") +
      "\nGot:\n" + msgs.map(m => "  - " + m).join("\n")
    );
  }
}

export function prop(name, type, isTs, access = 'public') {
  if (isTs) return `${access} ${name}: ${type};`;
  return `
/**
 * @${access}
 * @type {${type}}
 */
${name};`;
}
