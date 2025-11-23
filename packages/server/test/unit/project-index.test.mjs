import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import ts from "typescript";

import { AureliaProjectIndex } from "../../out/services/project-index.js";
import { DEFAULT_SEMANTICS } from "../../../domain/out/index.js";

const logger = { log() {}, info() {}, warn() {}, error() {} };

function createTsProject(source = "export class Example {}", compilerOptions = {}) {
  const files = new Map([[path.join(process.cwd(), "src", "example.ts"), source]]);
  const settings = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    ...compilerOptions,
  };
  let version = 1;

  const host = {
    getScriptFileNames: () => Array.from(files.keys()),
    getScriptVersion: () => String(version),
    getCompilationSettings: () => settings,
    getCurrentDirectory: () => process.cwd(),
    getDefaultLibFileName: (opts) => ts.getDefaultLibFilePath(opts),
    getScriptSnapshot: (fileName) => {
      const text = files.get(fileName);
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
    },
    fileExists: (fileName) => files.has(fileName) || ts.sys.fileExists(fileName),
    readFile: (fileName) => files.get(fileName) ?? ts.sys.readFile(fileName),
    readDirectory: ts.sys.readDirectory,
  };

  const languageService = ts.createLanguageService(host);

  return {
    getService: () => languageService,
    compilerOptions: () => settings,
    getRootFileNames: () => Array.from(files.keys()),
    getProjectVersion: () => version,
    bumpVersion() { version += 1; },
    addFile(fileName, text) {
      files.set(fileName, text);
      version += 1;
    },
    updateFile(fileName, text) {
      files.set(fileName, text);
      version += 1;
    },
  };
}

test("produces a semantics + resource graph snapshot from TS project state", () => {
  const tsProject = createTsProject();
  const index = new AureliaProjectIndex({ ts: tsProject, logger });

  const semantics = index.currentSemantics();
  const graph = index.currentResourceGraph();

  assert.equal(semantics.version, DEFAULT_SEMANTICS.version);
  assert.ok(graph.root);
  assert.equal(graph.version, "aurelia-resource-graph@1");
  assert.ok(graph.scopes[graph.root]);
  assert.ok(index.currentFingerprint().length > 0);
});

test("fingerprint reflects TS project version and root set changes", async () => {
  const tsProject = createTsProject();
  const index = new AureliaProjectIndex({ ts: tsProject, logger });

  const baseline = index.currentFingerprint();

  await index.refresh();
  assert.equal(index.currentFingerprint(), baseline, "refresh without change should be stable");

  tsProject.bumpVersion();
  await index.refresh();
  const afterVersionBump = index.currentFingerprint();
  assert.notEqual(afterVersionBump, baseline);

  tsProject.addFile(path.join(process.cwd(), "src", "other.ts"), "export const value = 1;");
  await index.refresh();
  const afterRootChange = index.currentFingerprint();
  assert.notEqual(afterRootChange, afterVersionBump);
});
