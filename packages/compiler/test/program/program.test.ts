import { test, expect } from "vitest";

import { DEFAULT_SEMANTICS, DefaultTemplateProgram } from "@aurelia-ls/compiler";
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

function createProgram(overrides = {}) {
  return new DefaultTemplateProgram({
    vm: createVmReflection(),
    isJs: false,
    semantics: DEFAULT_SEMANTICS,
    moduleResolver: noopModuleResolver,
    ...overrides,
  });
}
