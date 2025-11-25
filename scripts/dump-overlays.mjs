#!/usr/bin/env node
/* Dump overlay goldens for one or more templates.
 *
 * Usage:
 *   pnpm dump:overlay                       # scan ./fixtures/overlays by default
 *   pnpm dump:overlay fixtures/overlays/foo # dir
 *   pnpm dump:overlay path/to/file.html     # single file
 */

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const domainMod = await import(pathToFileURL(path.resolve(
  process.cwd(),
  "packages/domain/out/index.js"
)).href);
const programMod = await import(pathToFileURL(path.resolve(
  process.cwd(),
  "packages/domain/out/program/index.js"
)).href);

const { DEFAULT_SYNTAX, getExpressionParser } = domainMod;
const {
  DefaultTemplateProgram,
  DefaultTemplateBuildService,
  canonicalDocumentUri,
} = programMod;

const VM = {
  getRootVmTypeExpr: () => "any",
  getSyntheticPrefix: () => "__AU_TTC_",
};

const program = new DefaultTemplateProgram({
  vm: VM,
  isJs: false,
  attrParser: DEFAULT_SYNTAX,
  exprParser: getExpressionParser(),
});
const build = new DefaultTemplateBuildService(program);

const args = process.argv.slice(2);
const inputs = args.length ? args : ["fixtures/overlays"]; // default: scan overlay fixtures

let totalOut = 0;
for (const input of inputs) {
  const abs = path.resolve(process.cwd(), input);
  const files = await collectHtmlFiles(abs);
  if (files.length === 0) {
    console.warn(`[skip] ${input} - no .html files`);
    continue;
  }

  for (const f of files) {
    const html = await fs.readFile(f, "utf8");
    const canonical = canonicalDocumentUri(f);
    program.upsertTemplate(canonical.uri, html);

    const overlay = build.getOverlay(canonical.uri);
    const outPath = path.normalize(overlay.overlay.path);

    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, overlay.overlay.text, "utf8");

    console.log(`Overlay → ${rel(outPath)}`);
    totalOut += 1;
  }
}

console.log(`Done. Wrote ${totalOut} file(s).`);

function rel(p) { return path.relative(process.cwd(), p); }

async function collectHtmlFiles(entry) {
  const st = await fs.stat(entry).catch(() => null);
  if (!st) return [];
  if (st.isFile()) return entry.endsWith(".html") ? [entry] : [];

  const out = [];
  const stack = [entry];
  while (stack.length) {
    const dir = stack.pop();
    const ents = await fs.readdir(dir, { withFileTypes: true });
    for (const d of ents) {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) stack.push(p);
      else if (d.isFile() && p.endsWith(".html")) out.push(p);
    }
  }
  return out;
}
