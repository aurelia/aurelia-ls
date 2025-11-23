import test from "node:test";
import assert from "node:assert/strict";

import { DefaultTemplateProgram } from "../../out/program/program.js";

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
  assert.equal(cleared.ssr, undefined);
  assert.equal(cleared.provenance.totalEdges, 0);
});

test("bulk builds cover all sources and SSR seeds core stages", () => {
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

  const ssr = program.buildAllSsr();
  assert.equal(ssr.size, templates.length);

  for (const tpl of templates) {
    const doc = program.getCacheStats(tpl.uri).documents[0];
    const seeded = doc.ssr?.stageReuse?.seeded ?? [];
    assert.ok(seeded.includes("10-lower"));
    assert.ok(doc.ssr?.stageReuse?.computed.length);
  }

  program.invalidateAll();
  const totals = program.getCacheStats().totals;
  assert.equal(totals.compilation, 0);
  assert.equal(totals.ssr, 0);
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
  assert.equal(stats.totals.ssr, 0);
  assert.equal(stats.totals.provenanceEdges, 0);
  assert.equal(doc.compilation, undefined);
  assert.equal(doc.ssr, undefined);
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
  program.buildAllSsr();

  const totals = program.getCacheStats().totals;
  assert.equal(totals.sources, templates.length);
  assert.equal(totals.compilation, templates.length);
  assert.equal(totals.ssr, templates.length);
  assert.equal(totals.core, templates.length);
  assert.ok(totals.provenanceEdges > 0);
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

function createProgram() {
  return new DefaultTemplateProgram({
    vm: createVmReflection(),
    isJs: false,
  });
}
