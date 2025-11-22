import path from "node:path";
import { readFile } from "node:fs/promises";
import { compileTemplate, compileTemplateToOverlay, PRELUDE_TS, getExpressionParser, DEFAULT_SYNTAX } from "../../out/index.js";
import { createProgramFromMemory } from "./ts-harness.mjs";

const DEFAULT_VM = {
  getRootVmTypeExpr: () => "RootVm",
  getSyntheticPrefix: () => "__AU_TTC_",
};

export function vmStub(overrides = {}) {
  return { ...DEFAULT_VM, ...overrides };
}

export function compileMarkup(html, templateFilePath = "C:/mem/template.html", opts = {}) {
  const attrParser = opts.attrParser ?? DEFAULT_SYNTAX;
  const exprParser = opts.exprParser ?? getExpressionParser();
  const vm = opts.vm ?? DEFAULT_VM;
  return compileTemplate({
    html,
    templateFilePath,
    isJs: opts.isJs ?? false,
    vm,
    semantics: opts.semantics,
    attrParser,
    exprParser,
    overlayBaseName: opts.overlayBaseName,
  });
}

export async function compileFixtureOverlay(fixtureDir, opts = {}) {
  const htmlPath = path.resolve(fixtureDir, "template.html");
  const html = await readFile(htmlPath, "utf8");
  const overlay = compileTemplateToOverlay({
    html,
    templateFilePath: htmlPath,
    isJs: opts.isJs ?? false,
    vm: opts.vm ?? DEFAULT_VM,
    semantics: opts.semantics,
    attrParser: opts.attrParser ?? DEFAULT_SYNTAX,
    exprParser: opts.exprParser ?? getExpressionParser(),
    overlayBaseName: opts.overlayBaseName,
  });
  return { html, htmlPath, overlay };
}

export function createTsProgramFromOverlay(overlayText, overlayPath = "/mem/overlay.ts") {
  const files = {
    "/mem/__prelude.d.ts": PRELUDE_TS,
    [overlayPath]: overlayText,
  };
  const rootNames = Object.keys(files);
  return createProgramFromMemory(files, rootNames);
}
