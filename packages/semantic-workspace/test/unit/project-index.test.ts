import { test, expect } from "vitest";
import path from "node:path";
import ts from "typescript";

import { AureliaProjectIndex } from "../../out/typescript/project-index.js";
import { BUILTIN_SEMANTICS } from "@aurelia-ls/compiler/schema/registry.js";
import { buildResourceGraphFromSemantics } from "@aurelia-ls/compiler/schema/resource-graph.js";
import type { ResourceScopeId } from "@aurelia-ls/compiler/schema/types.js";
const logger = { log() {}, info() {}, warn() {}, error() {} };

function createTsProject(source: string | Record<string, string> = "export class Example {}", compilerOptions = {}) {
  const normalizeName = (fileName: string) => {
    const normalized = path.normalize(fileName);
    return ts.sys.useCaseSensitiveFileNames ? normalized : normalized.toLowerCase();
  };
  const files = new Map<string, string>();
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

  const host: ts.LanguageServiceHost = {
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
    getProgram: () => languageService.getProgram()!,
    compilerOptions: () => settings,
    getRootFileNames: () => Array.from(files.keys()),
    getProjectVersion: () => version,
    bumpVersion() { version += 1; },
    addFile(fileName: string, text: string) {
      files.set(normalizeName(fileName), text);
      version += 1;
    },
    updateFile(fileName: string, text: string) {
      files.set(normalizeName(fileName), text);
      version += 1;
    },
  };
}

test("produces a semantics + resource graph snapshot from TS project state", () => {
  const tsProject = createTsProject();
  const index = new AureliaProjectIndex({ ts: tsProject, logger });

  const model = index.currentModel();

  expect(model.semantics.version).toBe(BUILTIN_SEMANTICS.version);
  expect(model.resourceGraph.root).toBeTruthy();
  expect(model.resourceGraph.version).toBe("aurelia-resource-graph@1");
  expect(model.resourceGraph.scopes[model.resourceGraph.root]).toBeTruthy();
  expect(model.fingerprint.length > 0).toBe(true);
});

test("fingerprint tracks resource and root changes", async () => {
  const tsProject = createTsProject();
  const index = new AureliaProjectIndex({ ts: tsProject, logger });

  const baseline = index.currentModel().fingerprint;

  index.refresh();
  expect(index.currentModel().fingerprint, "refresh without change should be stable").toBe(baseline);

  tsProject.bumpVersion();
  index.refresh();
  expect(index.currentModel().fingerprint, "project version bumps alone should not affect fingerprint").toBe(baseline);

  const examplePath = path.join(process.cwd(), "src", "example.ts");
  tsProject.updateFile(examplePath, `
    const customElement = (options) => (target) => target;

    @customElement({ name: 'updated-box' })
    export class UpdatedBox {}
  `);
  index.refresh();
  const afterResourceChange = index.currentModel().fingerprint;
  expect(afterResourceChange).not.toBe(baseline);

  // Adding a non-Aurelia file doesn't change semantic content, so the
  // model fingerprint stays stable (content-derived, not input-derived).
  tsProject.addFile(path.join(process.cwd(), "src", "other.ts"), "export const value = 1;");
  index.refresh();
  expect(index.currentModel().fingerprint, "non-resource file addition should not change semantic fingerprint").toBe(afterResourceChange);
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
  const sem = index.currentModel().semantics;

  const fancy = sem.resources.elements["fancy-box"];
  expect(fancy, "custom element discovered").toBeTruthy();
  expect(fancy.aliases?.includes("box")).toBe(true);
  expect(fancy.bindables.value?.mode).toBe("fromView");
  expect(fancy.bindables.count?.mode).toBe("twoWay");

  const panel = sem.resources.elements.panel;
  expect(panel, "fallback name from class detected").toBeTruthy();
  expect(panel.containerless).toBe(true);

  const ifNot = sem.resources.attributes["if-not"];
  expect(ifNot, "custom attribute discovered").toBeTruthy();
  expect(ifNot.isTemplateController).toBe(true);
  expect(ifNot.primary).toBe("toggle");
  expect(ifNot.aliases?.includes("unless")).toBe(true);
  expect(ifNot.noMultiBindings).toBe(true);

  const vc = sem.resources.valueConverters["date-format"];
  expect(vc, "value converter discovered").toBeTruthy();

  const bb = sem.resources.bindingBehaviors.throttle;
  expect(bb, "binding behavior discovered").toBeTruthy();
});

test("maps discoveries into the default resource scope when a graph is provided", () => {
  const featureScope = "feature-scope" as ResourceScopeId;
  const baseGraph = buildResourceGraphFromSemantics(BUILTIN_SEMANTICS);
  baseGraph.scopes[featureScope] = { id: featureScope, parent: baseGraph.root, label: "feature", resources: {} };
  const baseSemantics = { ...BUILTIN_SEMANTICS, resourceGraph: baseGraph, defaultScope: featureScope };
  const tsProject = createTsProject({
    "src/components.ts": `
      const customElement = (options) => (target) => target;
      @customElement({ name: 'scoped-box' })
      export class ScopedBox {}
    `,
  });

  const index = new AureliaProjectIndex({
    ts: tsProject,
    logger,
    discovery: { baseSemantics, defaultScope: featureScope },
  });
  const model = index.currentModel();
  const graph = model.resourceGraph;
  const sem = model.semantics;

  expect(graph).toBe(sem.resourceGraph);

  const scoped = graph.scopes[featureScope];
  expect(scoped, "expected scoped overlay to exist").toBeTruthy();
  expect(scoped.resources.elements["scoped-box"], "discovered element should be scoped").toBeTruthy();
  expect(graph.scopes[graph.root].resources.elements["scoped-box"], "root scope should remain unchanged").toBe(undefined);
  expect(sem.resources.elements["scoped-box"], "semantics should still surface discovered resources").toBeTruthy();
  expect(baseGraph.scopes[featureScope].resources.elements?.["scoped-box"], "base graph should not be mutated").toBe(undefined);
});
