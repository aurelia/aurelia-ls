import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { createSourceProject } from "../dist/source/project.js";
import { readFrameworkModuleBootIndex } from "../dist/framework/module-boot.js";
import { readEvaluationEffectTrace } from "../dist/evaluation/effects.js";
import { answerFrameworkDi } from "../dist/inquiry/runtime/framework-di-lenses.js";
import { answerFrameworkEvaluator } from "../dist/inquiry/runtime/framework-evaluator-lenses.js";
import { readFrameworkMaterializationIndex } from "../dist/inquiry/runtime/framework-materialization-lenses.js";

function configurationProject(root, useClassKeys = false) {
  const packages = ["kernel", "router", "validation", "runtime-html"].map(id => ({
    id,
    packageName: `@aurelia/${id}`,
    rootPath: `aurelia/packages/${id}`,
    tsconfigPath: `aurelia/packages/${id}/tsconfig.json`,
  }));
  const paths = Object.fromEntries(packages.map(pkg =>
    [pkg.packageName, [path.join(root, pkg.rootPath, "src/index.ts")]]));
  function write(id, file, text) {
    writeFileSync(path.join(root, "aurelia/packages", id, "src", file + ".ts"), text);
  }
  for (const pkg of packages) {
    mkdirSync(path.join(root, pkg.rootPath, "src"), { recursive: true });
    writeFileSync(path.join(root, pkg.tsconfigPath), JSON.stringify({
      compilerOptions: { target: "ES2022", module: "esnext", moduleResolution: "bundler", paths }, include: ["src"],
    }));
  }
  write("kernel", "index", `
    export interface InterfaceSymbol<T> { readonly friendlyName: string; readonly $isInterface: true }
    export interface IRegistry { register(container: any): void }
    export const DI = { createInterface<T>(friendlyName: string, configure?: (x: any) => any): InterfaceSymbol<T> {
      return { $isInterface: true, friendlyName };
    }};
    export const Registration = { instance(key: unknown, value: unknown): IRegistry {
      return { register(container: any) { container.registerResolver(key, value); } };
    }};
  `);
  for (const id of ["router", "validation"]) {
    write(id, "index", `
      import { DI } from "@aurelia/kernel";
      export class Provider {}
      export const IService = DI.createInterface<Provider>("SharedKey", x => x.singleton(Provider));
    `);
  }
  write("runtime-html", "barrel", `
    export { IService as Left } from "@aurelia/router";
    export { IService as Right } from "@aurelia/validation";
    export type { InterfaceSymbol } from "@aurelia/kernel";
  `);
  write("runtime-html", "barrel-alias", `import { Left as Via } from "./barrel"; export { Via as Left };`);
  write("runtime-html", "diamond", `export * from "./barrel"; export * from "./barrel-alias";`);
  write("runtime-html", "clash", `export const Left = "different binding";`);
  write("runtime-html", "ambiguous", `export * from "./diamond"; export * from "./clash";`);
  write("runtime-html", "index", `
    import { Registration } from "@aurelia/kernel";
    import { Left, Right } from "./barrel";
    import * as namespace from "./diamond";
    export const linkedLeft = namespace.Left;
    export { Left as ambiguousLeft } from "./ambiguous";
    export { Left, Right } from "./barrel";
    declare function getRuntimeCondition(): boolean;
    declare function updateOptions(options: { enabled: boolean }): void;
    const runtimeFlag = getRuntimeCondition();
    function configure(c: any) {
      c.register(Registration.instance(Left, "before"));
      let enabled = true;
      enabled = false;
      if (enabled) c.register(Registration.instance(Left, "stale guard"));
      { let enabled = true; }
      if (enabled || 0x0n) c.register(Registration.instance(Left, "shadow or bigint"));
      let captured = true;
      const disable = () => { captured = false; };
      disable();
      if (captured) c.register(Registration.instance(Left, "stale captured guard"));
      let uncertain = true;
      if (runtimeFlag) uncertain = false;
      if (uncertain) c.register(Registration.instance(Left, "possible guard write"));
      const opts = { enabled: true };
      updateOptions(opts);
      if (opts.enabled) c.register(Registration.instance(Left, "opaque options"));
      if (false) c.register(Registration.instance(Left, "unreachable branch"));
      if (runtimeFlag) c.register(Registration.instance(Left, "conditional"));
      c.register(Registration.instance(Right, "after"));
      return;
      c.register(Registration.instance(Right, "unreachable tail"));
    }
    export const StandardConfiguration = { register(container: any) { return configure(container); } };
    export const DirectKeys = [Left, Right];
    export const Empty = [];
    const obj = {};
    export const aliasEqual = obj === obj;
    export const distinctEqual = obj === {};
    export const unknownEqual = runtimeFlag === true;
    export const coercion = 1 == "1";
    export const unknownBranch = runtimeFlag && "conditional";
    let marker = 0;
    false && (marker = 1);
    export const markerAfter = marker;
    declare const opaqueArray: any[];
    declare const opaqueObject: object;
    const items = [7, ...opaqueArray, 9];
    export const prefix = items[0];
    export const uncertainOffset = items[1];
    export const uncertainLength = items.length;
    export const overwritten = { x: 4, ...opaqueObject }.x;
    export const lastWrite = { ...opaqueObject, x: 5 }.x;
  `);
  if (useClassKeys) {
    write("runtime-html", "left", "export class Service {}");
    write("runtime-html", "right", "export class Service {}");
    write("runtime-html", "alias", 'export { Service as Via } from "./left";');
    write("runtime-html", "index", `
      import { Registration } from "@aurelia/kernel";
      import { Service as Left } from "./left";
      import { Service as Right } from "./right";
      import { Via } from "./alias";
      export class SharedProvider {}
      export const StandardConfiguration = { register(c: any) {
        c.register(Registration.instance(Left, SharedProvider), Registration.instance(Right, SharedProvider),
          Registration.instance(Via, SharedProvider));
      }};
    `);
  }
  return createSourceProject({ repoRoot: root, packages });
}

test("two class declarations remain distinct and a re-export uses its original DI key", () => {
  const root = mkdtempSync(path.join(tmpdir(), "atlas-class-key-"));
  try {
    const project = configurationProject(root, true);
    const ask = (projection, filters = {}) => answerFrameworkDi({
      lens: "framework.di", locus: { kind: "repo" }, projection, filters, budget: { rows: 100 },
    }, project).value;
    const slots = ask("world").configurationWorld.resolverSlots;
    assert.deepEqual(slots.map(slot => path.basename(slot.key.source.filePath)), ["left.ts", "right.ts", "left.ts"]);
    const routes = readFrameworkMaterializationIndex(project, {key: "Service"}).routes;
    assert.equal(routes.length, 2);
    const graph = ask("graph", { key: "Service", edgeKind: "key-materializes-through-route" }).diGraph;
    assert.equal(graph.edges.length, 2);
    const keyIds = new Set(graph.edges.map(edge => edge.fromNodeId));
    assert.equal(keyIds.size, 2);
    assert.deepEqual(graph.nodes.filter(node => keyIds.has(node.id)).map(node => path.basename(node.source.filePath)).sort(), ["left.ts", "right.ts"]);
    const alias = ask("graph", { key: "Via", edgeKind: "key-materializes-through-route" }).diGraph;
    assert.equal(alias.edges.length, 1);
    assert.equal(path.basename(alias.nodes.find(node => node.id === alias.edges[0].fromNodeId).source.filePath), "left.ts");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the framework world keeps declaration identity, configuration reachability and query closure", () => {
  const root = mkdtempSync(path.join(tmpdir(), "atlas-di-world-"));
  try {
    const project = configurationProject(root);
    const boot = readFrameworkModuleBootIndex(project).readPackage("runtime-html");
    const left = boot.readExportValue("Left");
    const right = boot.readExportValue("Right");
    assert.equal(left.kind, "object");
    assert.equal(right.kind, "object");
    assert.notStrictEqual(left, right);
    assert.strictEqual(boot.readExportValue("linkedLeft"), left);
    assert.equal(boot.readExportValue("ambiguousLeft").kind, "unknown");
    const missing = "absentExportForRetention";
    for (let i = 0; i < 100; i++) assert.equal(boot.readExportValue(missing).kind, "unknown");
    const matchingOpens = boot.evaluator.evaluate(boot.entryModuleKey).openValues.filter(value => value.reason.includes(missing));
    assert.equal(matchingOpens.length, 1);
    for (const [name, expected] of Object.entries({ aliasEqual: true, distinctEqual: false, coercion: true, markerAfter: 0, prefix: 7, lastWrite: 5 })) {
      assert.equal(boot.readExportValue(name).value, expected, name);
    }
    assert.equal(boot.readExportValue("unknownEqual").kind, "unknown");
    assert.equal(boot.readExportValue("unknownBranch").kind, "unknown");
    for (const name of ["uncertainOffset", "uncertainLength", "overwritten"]) assert.equal(boot.readExportValue(name).kind, "unknown", name);

    const ask = (projection, filters = {}, cursor, size = 100) => answerFrameworkDi({
      lens: "framework.di", projection, filters, locus: { kind: "repo" },
      page: { size, cursor }, budget: { evidencePerSubject: 0 },
    }, project);
    const keys = ask("keys", { key: "SharedKey" }).value.keys;
    assert.equal(keys.length, 2);
    const declarations = ask("graph", { key: "SharedKey", edgeKind: "declares-key" }).value.diGraph.edges;
    assert.deepEqual(new Set(declarations.map(row => row.toNodeId)), new Set(keys.map(k => k.id)));
    const routes = readFrameworkMaterializationIndex(project, { key: "SharedKey" }).routes.filter(row => row.strategy === "singleton");
    assert.deepEqual(routes.map(row => row.providerSource.filePath).sort(), keys.map(k => k.source.filePath).sort());

    const first = ask("world", {}, undefined, 1);
    assert.equal(first.outcome, "partial");
    assert.equal(first.page.total, 2);
    assert.equal(first.value.configurationWorld.resolverSlots[0].provider.name, "before");
    assert.match(first.openSeams[0].summary, /condition/);
    const second = ask("world", {}, first.page.nextCursor, 1);
    assert.equal(second.value.configurationWorld.resolverSlots[0].provider.name, "after");
    assert.equal(second.page.nextCursor, undefined);
    assert.equal(ask("world", { configurationExportName: "NoSuchConfiguration" }).outcome, "open");
    assert.equal(ask("world", { configurationExportName: "Empty" }).outcome, "miss");
    const explicit = ask("slots", { configurationExportName: "DirectKeys" });
    assert.deepEqual(explicit.value.configurationWorld.resolverSlots.map(slot => slot.key.source.filePath).sort(),
      keys.map(k => k.source.filePath).sort());

    const unrooted = { lens: "framework.evaluator", locus: { kind: "repo" }, projection: "effects", filters: { query: "define" } };
    assert.equal(answerFrameworkEvaluator(unrooted, project).outcome, "reroute");
    assert.throws(() => readEvaluationEffectTrace(project, { scheme: "workspace" }, { limit: 1 }), /Select a source/);
    const selector = { scheme: "declaration", name: "configure", filePath: "aurelia/packages/runtime-html/src/index.ts" };
    const a = readEvaluationEffectTrace(project, selector, { limit: 1, calleeName: "instance" });
    const b = readEvaluationEffectTrace(project, selector, { limit: 1, offset: a.nextOffset, calleeName: "instance" });
    assert.ok(a.totalEffects > 1);
    assert.equal(a.totalEffects, b.totalEffects);
    assert.ok(a.effects[0].sequence < b.effects[0].sequence);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
