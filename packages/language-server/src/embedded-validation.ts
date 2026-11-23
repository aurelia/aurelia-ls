import path from "node:path";
import ts from "typescript";
import { getCSSLanguageService, type LanguageSettings } from "vscode-css-languageservice";
import { DiagnosticSeverity, type Diagnostic } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import type { EmbeddedLanguageRegion } from "@aurelia-ls/semantic-runtime/embedded-languages";

export interface EmbeddedValidationOptions {
  readonly styles: boolean;
  readonly scripts: boolean;
  readonly css?: LanguageSettings;
  readonly javascript?: Pick<ts.CompilerOptions, "strictNullChecks" | "experimentalDecorators">;
}

interface LiteralSegment {
  readonly start: number;
  readonly end: number;
  readonly valueStart: number;
  readonly region: EmbeddedLanguageRegion;
}

/**
 * A runtime value can supply any part of a CSS token, including a dimension or a hexadecimal colour.
 * Project the complete dynamic token so its authored unit, prefix, or neighbouring hole cannot
 * become a free-standing syntax error. Punctuation separating declarations and rules stays authored.
 */
function substitutions(region: EmbeddedLanguageRegion) {
  if (region.language === "javascript") return region.holes;
  const tokens: { start: number; end: number }[] = [];
  const tokenChar = /[\w.#%\-\u0080-\uFFFF]/u;
  for (const hole of region.holes) {
    let { start, end } = hole;
    while (start > 0 && tokenChar.test(region.value[start - 1]!)) start--;
    while (end < region.value.length && tokenChar.test(region.value[end]!)) end++;
    const previous = tokens.at(-1);
    if (previous && previous.end >= start) previous.end = end;
    else tokens.push({ start, end });
  }
  return tokens;
}

/** Only copied text can own a diagnostic; wrappers and substituted Aurelia values have no authored location. */
/** JavaScript template spans remain expressions, even when Aurelia supplies their runtime value. */
function scriptTemplateOpeners(region: EmbeddedLanguageRegion): Set<number> {
  const starts = new Set<number>();
  if (region.language !== "javascript" || !region.holes.length || !region.value.includes("`")) return starts;
  const source = ts.createSourceFile("embedded.js", region.value, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS);
  const visit = (node: ts.Node) => {
    if (node.kind === ts.SyntaxKind.TemplateHead || node.kind === ts.SyntaxKind.TemplateMiddle) starts.add(node.end - 2);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return starts;
}

function project(regions: readonly EmbeddedLanguageRegion[], module = false) {
  // An unresolved JS placeholder carries an open ("any") value through the checker. An
  // authored binding with the same name would assign a fabricated type to downstream reads.
  let placeholder = "__aureliaInterpolation";
  if (regions.some(r => r.language === "javascript" && r.holes.length)) {
    while (regions.some(r => r.value.includes(placeholder))) placeholder += "_";
  }
  let text = "";
  const ends = new Map<number, number>();
  const segments: LiteralSegment[] = [];
  const copy = (region: EmbeddedLanguageRegion, from: number, to: number) => {
    if (from === to) return;
    const start = text.length;
    text += region.value.slice(from, to);
    segments.push({ start, end: text.length, valueStart: from, region });
  };
  for (const region of regions) {
    if (region.context === "attribute" && region.language === "css") text += "__{";
    const templateOpeners = scriptTemplateOpeners(region);
    let from = 0;
    for (const hole of substitutions(region)) {
      copy(region, from, hole.start);
      const prefix = region.value.slice(hole.start, hole.start + 2);
      text += templateOpeners.has(hole.start) ? "${" + placeholder + "}"
        : region.language === "javascript" ? placeholder
        : prefix.startsWith("#") ? "#aaa"
        : prefix === "--" ? "--au"
        : "__au";
      from = hole.end;
    }
    copy(region, from, region.value.length);
    const suffixStart = text.length;
    if (region.context === "attribute") text += region.language === "css" ? "}" : ";";
    text += "\n";
    if (region.value.slice(from).trim()) {
      for (let offset = suffixStart; offset <= text.length; offset++) ends.set(offset, region.end);
    }
  }
  if (module) text += "export {};";
  return { text, segments, ends };
}

function authoredRange(
  document: TextDocument,
  projection: ReturnType<typeof project>,
  start: number,
  end: number,
  allowGeneratedEnd: boolean,
) {
  let low = 0;
  let high = projection.segments.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (projection.segments[mid]!.start <= start) low = mid + 1;
    else high = mid;
  }
  const segment = projection.segments[low - 1];
  if (!segment || end > segment.end) {
    // An expected token at the closing wrapper or EOF belongs at the end of the authored region.
    const anchor = projection.ends.get(start);
    if (!allowGeneratedEnd || anchor === undefined || projection.ends.get(end) !== anchor) return undefined;
    const position = document.positionAt(anchor);
    return { start: position, end: position };
  }
  const { region } = segment;
  const offset = (n: number) => {
    const valueOffset = segment.valueStart + n - segment.start;
    return region.start + (region.offsets?.[valueOffset] ?? valueOffset);
  };
  return { start: document.positionAt(offset(start)), end: document.positionAt(offset(end)) };
}

const css = getCSSLanguageService();

function cssDiagnostics(
  document: TextDocument,
  regions: readonly EmbeddedLanguageRegion[],
  settings?: LanguageSettings,
): Diagnostic[] {
  const projection = project(regions);
  const projected = TextDocument.create(document.uri, "css", document.version, projection.text);
  const diagnostics: Diagnostic[] = [];
  for (const d of css.doValidation(projected, css.parseStylesheet(projected), settings)) {
    const range = authoredRange(
      document, projection, projected.offsetAt(d.range.start), projected.offsetAt(d.range.end),
      d.code === "css-propertyvalueexpected" || d.code === "css-colonexpected",
    );
    if (range) diagnostics.push({ range, message: d.message, code: d.code, severity: d.severity, source: "css" });
  }
  return diagnostics;
}

// Like VS Code's HTML validator, analyze the document's inline JavaScript in its own script context.
// Only the shipped TypeScript declaration libraries are readable by this host.
function createScriptValidator() {
  let options: ts.CompilerOptions = {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowJs: true,
    types: [],
    lib: ["lib.es2020.full.d.ts"],
  };
  const libDir = path.dirname(ts.getDefaultLibFilePath(options));
  const fileName = path.resolve("__aurelia_embedded__.js").replaceAll(path.sep, "/");
  const isLibrary = (f: string) => path.resolve(path.dirname(f)) === path.resolve(libDir)
    && /^lib(?:\.[\w.-]+)?\.d\.ts$/u.test(path.basename(f));
  let version = 0;
  let source = "";
  const readFile = (file: string) => file === fileName ? source : isLibrary(file) ? ts.sys.readFile(file) : undefined;
  const service = ts.createLanguageService({
    getCompilationSettings: () => options,
    getScriptFileNames: () => [fileName],
    getScriptVersion: file => file === fileName ? String(version) : "0",
    getScriptSnapshot: file => {
      const text = readFile(file);
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => path.dirname(fileName),
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    readFile,
    fileExists: file => file === fileName || (isLibrary(file) && ts.sys.fileExists(file)),
  });
  return (text: string, settings: EmbeddedValidationOptions["javascript"]) => {
    if (options.strictNullChecks !== settings?.strictNullChecks || options.experimentalDecorators !== settings?.experimentalDecorators) {
      options = { ...options, strictNullChecks: settings?.strictNullChecks, experimentalDecorators: settings?.experimentalDecorators };
      version++;
    }
    if (source !== text) {
      source = text;
      version++;
    }
    return [...service.getSyntacticDiagnostics(fileName), ...service.getSemanticDiagnostics(fileName)];
  };
}

let validateScript: ReturnType<typeof createScriptValidator> | undefined;

function javascriptDiagnostics(
  document: TextDocument,
  regions: readonly EmbeddedLanguageRegion[],
  module: boolean,
  settings: EmbeddedValidationOptions["javascript"],
): Diagnostic[] {
  const projection = project(regions, module);
  validateScript ??= createScriptValidator();
  const diagnostics: Diagnostic[] = [];
  for (const d of validateScript(projection.text, settings)) {
    // Inline event handlers can return, and a script tag's module graph is outside this document.
    if (d.start === undefined || d.length === undefined || d.code === 1108 || d.code === 2307 || d.code === 2792) continue;
    // VS Code's HTML service supplies legacy ambient jQuery declarations. This isolated
    // DOM/ES project has no evidence for a missing-name Problem at one of those globals.
    if ((d.code === 2304 || d.code === 2592) && ["$", "jQuery"].includes(projection.text.slice(d.start, d.start + d.length))) continue;
    const range = authoredRange(document, projection, d.start, d.start + d.length, true);
    if (range) diagnostics.push({
      range, source: "javascript", severity: DiagnosticSeverity.Error, message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
    });
  }
  return diagnostics;
}

export function validateEmbeddedLanguages(
  document: TextDocument,
  regions: readonly EmbeddedLanguageRegion[],
  options: EmbeddedValidationOptions,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (options.styles) {
    const styles = regions.filter(region => region.language === "css");
    if (styles.length) diagnostics.push(...cssDiagnostics(document, styles, options.css));
  }
  if (options.scripts) {
    const scripts = regions.filter(region => region.language === "javascript");
    const classic = scripts.filter(region => !region.module);
    if (classic.length) diagnostics.push(...javascriptDiagnostics(document, classic, false, options.javascript));
    for (const region of scripts) {
      if (region.module) diagnostics.push(...javascriptDiagnostics(document, [region], true, options.javascript));
    }
  }
  return diagnostics;
}
