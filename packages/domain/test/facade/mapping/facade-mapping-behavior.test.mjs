import test from "node:test";
import assert from "node:assert/strict";

import { compileMarkup, vmStub } from "../../_helpers/facade-harness.mjs";

test("overlay calls align 1:1 with mapping entries", () => {
  const html = `<template><div>\${user.name}</div><div>\${user.count}</div></template>`;
  const res = compileMarkup(html);
  assert.equal(res.overlay.calls.length, res.mapping.entries.length);
  for (const entry of res.mapping.entries) {
    assert.ok(entry.overlaySpan.end > entry.overlaySpan.start);
    assert.ok(entry.htmlSpan.end > entry.htmlSpan.start);
  }
});

test("mapping segments capture optional chaining members", () => {
  const html = `<div>\${user?.address?.street}</div>`;
  const { mapping } = compileMarkup(html);
  const entry = mapping.entries.find((e) => (e.segments?.length ?? 0) > 0);
  assert.ok(entry, "expected mapping entry with segments");
  const member = entry?.segments?.find((s) => s.path.endsWith("address.street"));
  assert.ok(member, "expected member segment for optional chain");
  assert.ok(member?.overlaySpan.end > member?.overlaySpan.start);
  assert.ok(member?.htmlSpan.end > member?.htmlSpan.start);
});

test("frameIds and exprIds stay distinct across nested frames", () => {
  const html = `<template><div repeat.for="item of items">\${item.name}</div><span>\${user.name}</span></template>`;
  const res = compileMarkup(html, "C:/mem/frame-ids.html");
  const repeatExpr = res.mapping.entries.find((e) => e.htmlSpan.start <= html.indexOf("item.name") && e.htmlSpan.end >= html.indexOf("item.name"));
  const rootExpr = res.mapping.entries.find((e) => e.htmlSpan.start <= html.indexOf("user.name") && e.htmlSpan.end >= html.indexOf("user.name"));
  assert.ok(repeatExpr && rootExpr);
  assert.notStrictEqual(repeatExpr.frameId, rootExpr.frameId);

  const exprIds = new Set(res.mapping.entries.map((e) => e.exprId));
  assert.equal(exprIds.size, res.mapping.entries.length, "each mapping entry should carry a unique exprId");
});
