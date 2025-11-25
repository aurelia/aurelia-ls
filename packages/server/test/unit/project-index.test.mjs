import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import ts from "typescript";

import { AureliaProjectIndex } from "../../out/services/project-index.js";
import { DEFAULT_SEMANTICS, buildResourceGraphFromSemantics } from "../../../domain/out/index.js";

const logger = { log() {}, info() {}, warn() {}, error() {} };

function createTsProject(source = "export class Example {}", compilerOptions = {}) {
  const normalizeName = (fileName) => {
    const normalized = path.normalize(fileName);
    return ts.sys.useCaseSensitiveFileNames ? normalized : normalized.toLowerCase();
  };
  const files = new Map();
  if (typeof source === "string") {
    const abs = path.join(process.cwd(), "src", "example.ts");
    files.set(normalizeName(abs), source);
  } else {
    for (const [fileName, text] of Object.entries(source)) {
      const abs = path.isAbsolute(fileName) ? fileName : path.join(process.cwd(), fileName);
      files.set(normalizeName(abs), text);
    }
  }

  const settings = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    experimentalDecorators: true,
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
      const text = files.get(normalizeName(fileName));
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
    },
    fileExists: (fileName) => files.has(normalizeName(fileName)) || ts.sys.fileExists(fileName),
    readFile: (fileName) => files.get(normalizeName(fileName)) ?? ts.sys.readFile(fileName),
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
      files.set(normalizeName(fileName), text);
      version += 1;
    },
    updateFile(fileName, text) {
      files.set(normalizeName(fileName), text);
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

test("fingerprint tracks resource and root changes", async () => {
  const tsProject = createTsProject();
  const index = new AureliaProjectIndex({ ts: tsProject, logger });

  const baseline = index.currentFingerprint();

  await index.refresh();
  assert.equal(index.currentFingerprint(), baseline, "refresh without change should be stable");

  tsProject.bumpVersion();
  await index.refresh();
  assert.equal(index.currentFingerprint(), baseline, "project version bumps alone should not affect fingerprint");

  const examplePath = path.join(process.cwd(), "src", "example.ts");
  tsProject.updateFile(examplePath, `
    const customElement = (options) => (target) => target;

    @customElement({ name: 'updated-box' })
    export class UpdatedBox {}
  `);
  await index.refresh();
  const afterResourceChange = index.currentFingerprint();
  assert.notEqual(afterResourceChange, baseline);

  tsProject.addFile(path.join(process.cwd(), "src", "other.ts"), "export const value = 1;");
  await index.refresh();
  const afterRootChange = index.currentFingerprint();
  assert.notEqual(afterRootChange, afterResourceChange);
});

test("discovers Aurelia resources from decorators and bindable members", () => {
  const tsProject = createTsProject({
    "src/resources.ts": `
      const customElement = (options) => (target) => target;
      const customAttribute = (options) => (target) => target;
      const valueConverter = (options) => (target) => target;
      const bindingBehavior = (options) => (target) => target;
      const templateController = (target) => target;
      const containerless = (target) => target;
      const bindable = (options) => (target, key) => {};

      @customElement({ name: 'fancy-box', aliases: ['box'], bindables: ['title', { name: 'count', mode: 'twoWay' }] })
      export class FancyBox {
        @bindable({ mode: 'fromView', primary: true }) value!: number;
      }

      @containerless
      @customElement({ alias: 'panel' })
      export class Panel {}

      @templateController
      @customAttribute({ name: 'if-not', aliases: ['unless'], noMultiBindings: true })
      export class IfNot {
        @bindable toggle!: boolean;
      }

      @valueConverter({ name: 'date-format' })
      export class DateFormat {}

      @bindingBehavior('throttle')
      export class Throttle {}
    `,
  }, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });

  const index = new AureliaProjectIndex({ ts: tsProject, logger });
  const sem = index.currentSemantics();

  const fancy = sem.resources.elements["fancy-box"];
  assert.ok(fancy, "custom element discovered");
  assert.equal(fancy.aliases?.includes("box"), true);
  assert.equal(fancy.bindables.value?.mode, "fromView");
  assert.equal(fancy.bindables.count?.mode, "twoWay");

  const panel = sem.resources.elements.panel;
  assert.ok(panel, "fallback name from class detected");
  assert.equal(panel.containerless, true);

  const ifNot = sem.resources.attributes["if-not"];
  assert.ok(ifNot, "custom attribute discovered");
  assert.equal(ifNot.isTemplateController, true);
  assert.equal(ifNot.primary, "toggle");
  assert.equal(ifNot.aliases?.includes("unless"), true);
  assert.equal(ifNot.noMultiBindings, true);

  const vc = sem.resources.valueConverters["date-format"];
  assert.ok(vc, "value converter discovered");

  const bb = sem.resources.bindingBehaviors.throttle;
  assert.ok(bb, "binding behavior discovered");
});

test("maps discoveries into the default resource scope when a graph is provided", () => {
  const featureScope = "feature-scope";
  const baseGraph = buildResourceGraphFromSemantics(DEFAULT_SEMANTICS);
  baseGraph.scopes[featureScope] = { id: featureScope, parent: baseGraph.root, label: "feature", resources: {} };
  const baseSemantics = { ...DEFAULT_SEMANTICS, resourceGraph: baseGraph, defaultScope: featureScope };
  const tsProject = createTsProject({
    "src/components.ts": `
      const customElement = (options) => (target) => target;
      @customElement({ name: 'scoped-box' })
      export class ScopedBox {}
    `,
  });

  const index = new AureliaProjectIndex({ ts: tsProject, logger, baseSemantics });
  const graph = index.currentResourceGraph();
  const sem = index.currentSemantics();

  assert.equal(graph, sem.resourceGraph);

  const scoped = graph.scopes[featureScope];
  assert.ok(scoped, "expected scoped overlay to exist");
  assert.ok(scoped.resources.elements["scoped-box"], "discovered element should be scoped");
  assert.equal(graph.scopes[graph.root].resources.elements["scoped-box"], undefined, "root scope should remain unchanged");
  assert.ok(sem.resources.elements["scoped-box"], "semantics should still surface discovered resources");
  assert.equal(baseGraph.scopes[featureScope].resources.elements?.["scoped-box"], undefined, "base graph should not be mutated");
});
