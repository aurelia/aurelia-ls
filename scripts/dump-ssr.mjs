#!/usr/bin/env node
/* Dump SSR goldens (HTML + JSON) for one or more templates.
 *
 * Usage:
 *   pnpm dump:ssr                             # scan ./fixtures by default
 *   pnpm dump:ssr fixtures/hello-world/src    # dir
 *   pnpm dump:ssr fixtures/**\/src/*.html      # rely on shell for glob expansion
 *   pnpm dump:ssr path/to/file.html           # single file
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Import from the built domain package output (no runtime deps).
const domainMod = await import(pathToFileURL(path.resolve(
  process.cwd(),
  "packages/domain/out/index.js"
)).href);

// Pull what we need from the domain package.
const {
  compileTemplateToSSR,
  getExpressionParser,
  DEFAULT_SYNTAX,
} = domainMod;

// Minimal VM reflection: SSR planning doesn't need strong types.
const VM = {
  getRootVmTypeExpr: () => "any",
  getSyntheticPrefix: () => "__AU_TTC_",
};

const args = process.argv.slice(2);
const inputs = args.length ? args : ["fixtures/ssr"]; // default: scan fixtures/ssr/

// One pass over all inputs (files or directories).
let totalOut = 0;
for (const input of inputs) {
  const abs = path.resolve(process.cwd(), input);
  const files = await collectHtmlFiles(abs);
  if (files.length === 0) {
    console.warn(`[skip] ${input} — no .html files`);
    continue;
  }

  for (const f of files) {
    const html = await fs.readFile(f, "utf8");
    const res = compileTemplateToSSR({
      html,
      templateFilePath: f,
      isJs: false,
      vm: VM,
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
      // overlayBaseName: optional; default naming is fine: <name>.__au.ssr.{html|json}
    });

    await fs.writeFile(res.htmlPath, res.htmlText, "utf8");
    await fs.writeFile(res.manifestPath, res.manifestText, "utf8");

    console.log(`SSR → ${rel(res.htmlPath)}  (+ ${rel(res.manifestPath)})`);
    totalOut += 2;
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
