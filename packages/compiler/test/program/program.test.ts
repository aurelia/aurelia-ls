import { test } from "vitest";
import assert from "node:assert/strict";

import { DefaultTemplateProgram } from "../../out/index.js";

test("cache stats track hits and invalidation", () => {
  const program = createProgram();
  const uri = "/app/components/example.html";
  const markup = "<template>${name}</template>";

  program.upsertTemplate(uri, markup);

  // First compile populates caches and provenance.
  program.getOverlay(uri);
  let stats = program.getCacheStats(uri);
  let doc = stats.documents[0];
  assert.equal(doc.compilation?.programCacheHit, false);
  assert.equal(doc.compilation?.stageReuse?.seeded.length, 0);
  assert.ok((doc.provenance.overlayEdges ?? 0) > 0);

  // Second call should hit the program-level cache.
  program.getOverlay(uri);
  stats = program.getCacheStats(uri);
  doc = stats.documents[0];
  assert.equal(doc.compilation?.programCacheHit, true);

  // Invalidation keeps the snapshot but drops caches and provenance.
  program.invalidateTemplate(uri);
  const cleared = program.getCacheStats(uri).documents[0];
  assert.equal(cleared.compilation, undefined);
  assert.equal(cleared.provenance.totalEdges, 0);
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
  assert.equal(overlays.size, templates.length);

  for (const tpl of templates) {
    const doc = program.getCacheStats(tpl.uri).documents[0];
    assert.ok(doc.compilation?.programCacheHit === false);
  }

  program.invalidateAll();
  const totals = program.getCacheStats().totals;
  assert.equal(totals.compilation, 0);
  assert.equal(totals.provenanceEdges, 0);
});

test("closeTemplate purges sources, caches, and provenance", () => {
  const program = createProgram();
  const uri = "/app/closed.html";

  program.upsertTemplate(uri, "<template>${value}</template>");
  program.getOverlay(uri);
  program.closeTemplate(uri);

  const stats = program.getCacheStats(uri);
  const doc = stats.documents[0];
  assert.equal(stats.totals.sources, 0);
  assert.equal(stats.totals.compilation, 0);
  assert.equal(stats.totals.provenanceEdges, 0);
  assert.equal(doc.compilation, undefined);
  assert.equal(doc.core, undefined);
  assert.equal(doc.provenance.totalEdges, 0);
  assert.throws(() => program.getOverlay(uri), /no snapshot/);
});

test("invalidateAll keeps sources but forces recomputation", () => {
  const program = createProgram();
  const uri = "/app/recompute.html";
  const markup = "<template>hi ${name}</template>";

  program.upsertTemplate(uri, markup);
  program.getOverlay(uri);
  program.getOverlay(uri);
  let doc = program.getCacheStats(uri).documents[0];
  assert.equal(doc.compilation?.programCacheHit, true);
  assert.ok((doc.provenance.overlayEdges ?? 0) > 0);

  program.invalidateAll();
  doc = program.getCacheStats(uri).documents[0];
  assert.equal(doc.version, 1);
  assert.equal(doc.compilation, undefined);
  assert.equal(doc.provenance.totalEdges, 0);

  program.getOverlay(uri);
  doc = program.getCacheStats(uri).documents[0];
  assert.equal(doc.compilation?.programCacheHit, false);
  assert.ok((doc.provenance.overlayEdges ?? 0) > 0);
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
  assert.equal(totals.sources, templates.length);
  assert.equal(totals.compilation, templates.length);
  assert.equal(totals.core, templates.length);
  assert.ok(totals.provenanceEdges > 0);
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
  assert.equal(overlayCaches.length, 2);
  assert.equal(overlayCaches[0]?.programCacheHit, false);
  assert.equal(overlayCaches[1]?.programCacheHit, true);
  assert.ok((overlayCaches[0]?.stageReuse.computed.length ?? 0) > 0);

  const overlayMaterialization = materializationEvents.filter((evt) => evt.kind === "overlay");
  assert.equal(overlayMaterialization.length, 2);
  assert.equal(overlayMaterialization[1]?.programCacheHit, true);
  assert.ok(overlayMaterialization.every((evt) => evt.durationMs >= 0));

  assert.ok(provenanceEvents.length >= 1);
  const last = provenanceEvents.at(-1);
  assert.equal(last?.templateUri, uri);
  assert.ok((last?.overlayEdges ?? 0) > 0);
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
    ...overrides,
  });
}
