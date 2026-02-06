import { test, expect } from "vitest";

import {
  DEFAULT_SEMANTICS,
  DefaultTemplateProgram,
  buildProjectSnapshot,
  type BindingMode,
  type BindableDef,
  type ProjectSemantics,
} from "@aurelia-ls/compiler";
import { noopModuleResolver } from "../_helpers/test-utils.js";

test("cache stats track hits and invalidation", () => {
  const program = createProgram();
  const uri = "/app/components/example.html";
  const markup = "<template>${name}</template>";

  program.upsertTemplate(uri, markup);

  // First compile populates caches and provenance.
  program.getOverlay(uri);
  let stats = program.getCacheStats(uri);
  let doc = stats.documents[0];
  expect(doc.compilation?.programCacheHit).toBe(false);
  expect(doc.compilation?.stageReuse?.seeded.length).toBe(0);
  expect((doc.provenance.overlayEdges ?? 0) > 0).toBeTruthy();

  // Second call should hit the program-level cache.
  program.getOverlay(uri);
  stats = program.getCacheStats(uri);
  doc = stats.documents[0];
  expect(doc.compilation?.programCacheHit).toBe(true);

  // Invalidation keeps the snapshot but drops caches and provenance.
  program.invalidateTemplate(uri);
  const cleared = program.getCacheStats(uri).documents[0];
  expect(cleared.compilation).toBeUndefined();
  expect(cleared.provenance.totalEdges).toBe(0);
});

test("upsertTemplate is idempotent for identical version + text", () => {
  const program = createProgram();
  const uri = "/app/idempotent.html";
  const markup = "<template>${name}</template>";

  program.upsertTemplate(uri, markup, 1);
  program.getOverlay(uri);
  let doc = program.getCacheStats(uri).documents[0];
  expect(doc.compilation?.programCacheHit).toBe(false);

  program.upsertTemplate(uri, markup, 1);
  doc = program.getCacheStats(uri).documents[0];
  expect(doc.compilation).toBeDefined();

  program.getOverlay(uri);
  doc = program.getCacheStats(uri).documents[0];
  expect(doc.version).toBe(1);
  expect(doc.compilation?.programCacheHit).toBe(true);
});

test("upsertTemplate ignores stale explicit versions", () => {
  const program = createProgram();
  const uri = "/app/stale-version.html";

  program.upsertTemplate(uri, "<template>${name}</template>", 3);
  program.getOverlay(uri);
  program.upsertTemplate(uri, "<template>${other}</template>", 2);

  let doc = program.getCacheStats(uri).documents[0];
  expect(doc.version).toBe(3);
  expect(doc.compilation).toBeDefined();

  program.getOverlay(uri);
  doc = program.getCacheStats(uri).documents[0];
  expect(doc.version).toBe(3);
  expect(doc.compilation?.programCacheHit).toBe(true);
});

test("bulk builds cover all sources and overlays seed core stages", () => {
  const program = createProgram();
  const templates = [
    { uri: "/app/one.html", markup: "<template>one ${value}</template>" },
    { uri: "/app/two.html", markup: "<template>two ${value}</template>" },
  ];

  for (const tpl of templates) {
    program.upsertTemplate(tpl.uri, tpl.markup);
  }

  const overlays = program.buildAllOverlays();
  expect(overlays.size).toBe(templates.length);

  for (const tpl of templates) {
    const doc = program.getCacheStats(tpl.uri).documents[0];
    expect(doc.compilation?.programCacheHit === false).toBeTruthy();
  }

  program.invalidateAll();
  const totals = program.getCacheStats().totals;
  expect(totals.compilation).toBe(0);
  expect(totals.provenanceEdges).toBe(0);
});

test("closeTemplate purges sources, caches, and provenance", () => {
  const program = createProgram();
  const uri = "/app/closed.html";

  program.upsertTemplate(uri, "<template>${value}</template>");
  program.getOverlay(uri);
  program.closeTemplate(uri);

  const stats = program.getCacheStats(uri);
  const doc = stats.documents[0];
  expect(stats.totals.sources).toBe(0);
  expect(stats.totals.compilation).toBe(0);
  expect(stats.totals.provenanceEdges).toBe(0);
  expect(doc.compilation).toBeUndefined();
  expect(doc.core).toBeUndefined();
  expect(doc.provenance.totalEdges).toBe(0);
  expect(() => program.getOverlay(uri)).toThrow(/no snapshot/);
});

test("invalidateAll keeps sources but forces recomputation", () => {
  const program = createProgram();
  const uri = "/app/recompute.html";
  const markup = "<template>hi ${name}</template>";

  program.upsertTemplate(uri, markup);
  program.getOverlay(uri);
  program.getOverlay(uri);
  let doc = program.getCacheStats(uri).documents[0];
  expect(doc.compilation?.programCacheHit).toBe(true);
  expect((doc.provenance.overlayEdges ?? 0) > 0).toBeTruthy();

  program.invalidateAll();
  doc = program.getCacheStats(uri).documents[0];
  expect(doc.version).toBe(1);
  expect(doc.compilation).toBeUndefined();
  expect(doc.provenance.totalEdges).toBe(0);

  program.getOverlay(uri);
  doc = program.getCacheStats(uri).documents[0];
  expect(doc.compilation?.programCacheHit).toBe(false);
  expect((doc.provenance.overlayEdges ?? 0) > 0).toBeTruthy();
});

test("cache stats totals reflect multi-document builds", () => {
  const program = createProgram();
  const templates = [
    { uri: "/app/a.html", markup: "<template>a ${x}</template>" },
    { uri: "/app/b.html", markup: "<template>b ${y}</template>" },
  ];

  for (const tpl of templates) {
    program.upsertTemplate(tpl.uri, tpl.markup);
  }

  program.buildAllOverlays();

  const totals = program.getCacheStats().totals;
  expect(totals.sources).toBe(templates.length);
  expect(totals.compilation).toBe(templates.length);
  expect(totals.core).toBe(templates.length);
  expect(totals.provenanceEdges > 0).toBeTruthy();
});

test("telemetry hooks capture cache/materialization/provenance data", () => {
  const cacheEvents = [];
  const materializationEvents = [];
  const provenanceEvents = [];
  const program = createProgram({
    telemetry: {
      onCacheAccess(event) {
        cacheEvents.push(event);
      },
      onMaterialization(event) {
        materializationEvents.push(event);
      },
      onProvenance(event) {
        provenanceEvents.push(event);
      },
    },
  });
  const uri = "/app/telemetry.html";

  program.upsertTemplate(uri, "<template>${name}</template>");
  program.getOverlay(uri);
  program.getOverlay(uri);

  const overlayCaches = cacheEvents.filter((evt) => evt.kind === "overlay");
  expect(overlayCaches.length).toBe(2);
  expect(overlayCaches[0]?.programCacheHit).toBe(false);
  expect(overlayCaches[1]?.programCacheHit).toBe(true);
  expect((overlayCaches[0]?.stageReuse.computed.length ?? 0) > 0).toBeTruthy();

  const overlayMaterialization = materializationEvents.filter((evt) => evt.kind === "overlay");
  expect(overlayMaterialization.length).toBe(2);
  expect(overlayMaterialization[1]?.programCacheHit).toBe(true);
  expect(overlayMaterialization.every((evt) => evt.durationMs >= 0)).toBeTruthy();

  expect(provenanceEvents.length >= 1).toBeTruthy();
  const last = provenanceEvents.at(-1);
  expect(last?.templateUri).toBe(uri);
  expect((last?.overlayEdges ?? 0) > 0).toBeTruthy();
});

test("updateOptions invalidates only templates that depend on changed custom elements", () => {
  const dependentUri = "/app/element-dependent.html";
  const unrelatedUri = "/app/unrelated.html";
  const program = createProgram({
    project: buildProjectSnapshot(baseProjectSemantics()),
  });

  program.upsertTemplate(
    dependentUri,
    "<template><au-compose template.bind=\"view\"></au-compose></template>",
  );
  program.upsertTemplate(unrelatedUri, "<template>${name}</template>");
  program.getOverlay(dependentUri);
  program.getOverlay(unrelatedUri);

  const nextProject = buildProjectSnapshot(withElementBindable("au-compose", "mode"));
  const result = program.updateOptions?.({
    vm: createVmReflection(),
    isJs: false,
    project: nextProject,
    moduleResolver: noopModuleResolver,
  });

  expect(result?.changed).toBe(true);
  expect(result?.mode).toBe("dependency");
  expect(result?.invalidated).toContain(dependentUri);
  expect(result?.retained).toContain(unrelatedUri);

  program.getOverlay(dependentUri);
  program.getOverlay(unrelatedUri);
  const dependentStats = program.getCacheStats(dependentUri).documents[0];
  const unrelatedStats = program.getCacheStats(unrelatedUri).documents[0];
  expect(dependentStats.compilation?.programCacheHit).toBe(false);
  expect(unrelatedStats.compilation?.programCacheHit).toBe(true);
});

test("updateOptions invalidates only templates that depend on changed custom attributes", () => {
  const dependentUri = "/app/attribute-dependent.html";
  const unrelatedUri = "/app/unrelated.html";
  const program = createProgram({
    project: buildProjectSnapshot(baseProjectSemantics()),
  });

  program.upsertTemplate(
    dependentUri,
    "<template><div show.bind=\"visible\"></div></template>",
  );
  program.upsertTemplate(unrelatedUri, "<template>${name}</template>");
  program.getOverlay(dependentUri);
  program.getOverlay(unrelatedUri);

  const nextProject = buildProjectSnapshot(withAttributeBindable("show", "tone"));
  const result = program.updateOptions?.({
    vm: createVmReflection(),
    isJs: false,
    project: nextProject,
    moduleResolver: noopModuleResolver,
  });

  expect(result?.changed).toBe(true);
  expect(result?.mode).toBe("dependency");
  expect(result?.invalidated).toContain(dependentUri);
  expect(result?.retained).toContain(unrelatedUri);

  program.getOverlay(dependentUri);
  program.getOverlay(unrelatedUri);
  const dependentStats = program.getCacheStats(dependentUri).documents[0];
  const unrelatedStats = program.getCacheStats(unrelatedUri).documents[0];
  expect(dependentStats.compilation?.programCacheHit).toBe(false);
  expect(unrelatedStats.compilation?.programCacheHit).toBe(true);
});

test("updateOptions invalidates only templates that depend on changed value converters", () => {
  const dependentUri = "/app/converter-dependent.html";
  const unrelatedUri = "/app/unrelated.html";
  const program = createProgram({
    project: buildProjectSnapshot(baseProjectSemantics()),
  });

  program.upsertTemplate(dependentUri, "<template>${name | sanitize}</template>");
  program.upsertTemplate(unrelatedUri, "<template>${name}</template>");
  program.getOverlay(dependentUri);
  program.getOverlay(unrelatedUri);

  const nextProject = buildProjectSnapshot(withConverterOutType("sanitize", "string"));
  const result = program.updateOptions?.({
    vm: createVmReflection(),
    isJs: false,
    project: nextProject,
    moduleResolver: noopModuleResolver,
  });

  expect(result?.changed).toBe(true);
  expect(result?.mode).toBe("dependency");
  expect(result?.invalidated).toContain(dependentUri);
  expect(result?.retained).toContain(unrelatedUri);

  program.getOverlay(dependentUri);
  program.getOverlay(unrelatedUri);
  const dependentStats = program.getCacheStats(dependentUri).documents[0];
  const unrelatedStats = program.getCacheStats(unrelatedUri).documents[0];
  expect(dependentStats.compilation?.programCacheHit).toBe(false);
  expect(unrelatedStats.compilation?.programCacheHit).toBe(true);
});

function createVmReflection() {
  return {
    getRootVmTypeExpr() {
      return "TestVm";
    },
    getSyntheticPrefix() {
      return "__AU_TTC_";
    },
  };
}

function builtin<T>(value: T): { origin: "builtin"; value: T } {
  return { origin: "builtin", value };
}

function builtinBindable(
  name: string,
  options: { mode?: BindingMode; type?: string; primary?: boolean } = {},
): BindableDef {
  const property = builtin(name);
  const attribute = builtin(name);
  const mode = builtin(options.mode ?? "default");
  const primary = builtin(options.primary ?? false);
  const base = { property, attribute, mode, primary };
  if (!options.type) return base;
  return { ...base, type: builtin(options.type) };
}

function stripSemanticsCaches(semantics: typeof DEFAULT_SEMANTICS): ProjectSemantics {
  const {
    resources: _resources,
    bindingCommands: _bindingCommands,
    attributePatterns: _attributePatterns,
    catalog: _catalog,
    ...base
  } = semantics;
  return base;
}

function baseProjectSemantics(): ProjectSemantics {
  return stripSemanticsCaches(DEFAULT_SEMANTICS);
}

function withElementBindable(elementName: string, bindableName: string): ProjectSemantics {
  const base = baseProjectSemantics();
  const existing = base.elements[elementName];
  if (!existing) throw new Error(`Missing element in builtins: ${elementName}`);
  return {
    ...base,
    elements: {
      ...base.elements,
      [elementName]: {
        ...existing,
        bindables: {
          ...existing.bindables,
          [bindableName]: builtinBindable(bindableName, { mode: "toView" }),
        },
      },
    },
  };
}

function withAttributeBindable(attributeName: string, bindableName: string): ProjectSemantics {
  const base = baseProjectSemantics();
  const existing = base.attributes[attributeName];
  if (!existing) throw new Error(`Missing attribute in builtins: ${attributeName}`);
  return {
    ...base,
    attributes: {
      ...base.attributes,
      [attributeName]: {
        ...existing,
        bindables: {
          ...existing.bindables,
          [bindableName]: builtinBindable(bindableName, { mode: "toView" }),
        },
      },
    },
  };
}

function withConverterOutType(name: string, outType: string): ProjectSemantics {
  const base = baseProjectSemantics();
  const existing = base.valueConverters[name];
  if (!existing) throw new Error(`Missing value converter in builtins: ${name}`);
  return {
    ...base,
    valueConverters: {
      ...base.valueConverters,
      [name]: {
        ...existing,
        toType: builtin(outType),
      },
    },
  };
}

function createProgram(overrides = {}) {
  return new DefaultTemplateProgram({
    vm: createVmReflection(),
    isJs: false,
    project: buildProjectSnapshot(DEFAULT_SEMANTICS),
    moduleResolver: noopModuleResolver,
    ...overrides,
  });
}
