import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { createSourceProject, StaticEvaluator } from "@aurelia-ls/atlas/analysis";
import { createSourceProject as fromSource } from "@aurelia-ls/atlas/source";
import { StaticEvaluator as fromEvaluation } from "@aurelia-ls/atlas/evaluation";

const root = fileURLToPath(new URL("../", import.meta.url));

test("the analysis build preserves source and evaluation identity and excludes the session engine", () => {
  assert.strictEqual(createSourceProject, fromSource);
  assert.strictEqual(StaticEvaluator, fromEvaluation);
  const config = ts.getParsedCommandLineOfConfigFile(path.join(root, "tsconfig.analysis.json"), {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic(diagnostic) { assert.fail(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")); },
  });
  assert.deepEqual(config.errors, []);
  const program = ts.createProgram(config.fileNames, config.options);
  const modules = program.getSourceFiles().map(file => path.relative(root, file.fileName).replaceAll("\\", "/"));
  assert(modules.includes("src/inquiry/runtime/atlas-memory-lenses.ts"));
  assert(modules.includes("src/inquiry/runtime/framework-di-lenses.ts"));
  assert(modules.includes("src/source/project.ts"));
  const fullOnly = modules.filter(file => file.startsWith("src/session/") || file.startsWith("src/scripts/") ||
    file === "src/inquiry/runtime/engine.ts" || file.startsWith("src/inquiry/runtime/atlas-work-router"));
  assert.deepEqual(fullOnly, []);
});

test("a full solution build after an analysis build emits full-only files and honors reverted source", t => {
  const parent = realpathSync(tmpdir());
  const fixture = mkdtempSync(path.join(parent, "atlas-build-"));
  t.after(() => {
    assert.equal(path.dirname(realpathSync(fixture)), parent);
    rmSync(fixture, { recursive: true, force: true });
  });
  const pkg = path.join(fixture, "packages/atlas");
  mkdirSync(path.join(pkg, "src"), { recursive: true });
  for (const name of ["package.json", "analysis.d.ts", "tsconfig.json", "tsconfig.analysis.json"]) {
    copyFileSync(path.join(root, name), path.join(pkg, name));
  }
  const base = JSON.parse(readFileSync(path.join(root, "../../tsconfig.base.json"), "utf8"));
  base.compilerOptions.types = [];
  writeFileSync(path.join(fixture, "tsconfig.base.json"), JSON.stringify(base));
  writeFileSync(path.join(fixture, "tsconfig.json"), JSON.stringify({ files: [], references: [{ path: "packages/atlas" }] }));
  writeFileSync(path.join(pkg, "src/analysis.ts"), 'export { version } from "./shared.js";');
  writeFileSync(path.join(pkg, "src/full.ts"), 'export { version } from "./shared.js";');
  const shared = path.join(pkg, "src/shared.ts");
  const version = number => writeFileSync(shared, `export const version = ${number};`);
  const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");
  const build = (...args) => execFileSync(process.execPath, [tsc, ...args], { cwd: fixture });
  version(1);
  build("-p", "packages/atlas/tsconfig.analysis.json");
  assert(existsSync(path.join(pkg, "dist/analysis.js")));
  assert(!existsSync(path.join(pkg, "dist/full.js")));
  build("-b");
  assert(existsSync(path.join(pkg, "dist/full.js")));
  const emitted = () => readFileSync(path.join(pkg, "dist/shared.js"), "utf8");
  const original = emitted();
  version(2);
  build("-p", "packages/atlas/tsconfig.analysis.json");
  assert.notEqual(emitted(), original);
  version(1);
  build("-b");
  assert.equal(emitted(), original);
});
