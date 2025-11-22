import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  DEFAULT_SYNTAX,
  compileTemplate,
  getExpressionParser,
  mapHtmlOffsetToOverlay,
  mapOverlayOffsetToHtml,
  shrinkSpanToMapping,
} from "../../../out/index.js";
import { vmStub } from "../../_helpers/facade-harness.mjs";

const defaultParsers = { attrParser: DEFAULT_SYNTAX, exprParser: getExpressionParser() };

function compile(html, templateFilePath, overrides = {}) {
  return compileTemplate({
    html,
    templateFilePath,
    isJs: false,
    vm: vmStub(),
    ...defaultParsers,
    ...overrides,
  });
}

test("overlay/HTML mapping helpers pick narrowest segments and fallback cleanly", () => {
  const file = "mem.html";
  const mapping = {
    kind: "mapping",
    entries: [{
      exprId: "expr-1",
      htmlSpan: { start: 0, end: 50, file },
      overlaySpan: { start: 0, end: 50 },
      frameId: 1,
      segments: [
        { kind: "member", path: "user", htmlSpan: { start: 0, end: 30, file }, overlaySpan: { start: 0, end: 30 } },
        { kind: "member", path: "user.address.street", htmlSpan: { start: 10, end: 20, file }, overlaySpan: { start: 10, end: 20 } },
      ],
    }],
  };

  const narrow = mapOverlayOffsetToHtml(mapping, 12);
  assert.ok(narrow?.segment);
  assert.equal(narrow.segment?.path, "user.address.street", "narrowest segment should win for nested member");

  const boundaryHit = mapOverlayOffsetToHtml(mapping, 20);
  assert.ok(boundaryHit?.segment);
  assert.equal(boundaryHit.segment?.path, "user", "end boundary should fall back to the containing segment");

  const htmlNarrow = mapHtmlOffsetToOverlay(mapping, 12);
  assert.ok(htmlNarrow?.segment);
  assert.equal(htmlNarrow.segment?.path, "user.address.street", "narrowest HTML span should win");

  const tieBreakerMapping = {
    ...mapping,
    entries: [{
      ...mapping.entries[0],
      segments: [
        { kind: "member", path: "first", htmlSpan: { start: 30, end: 40, file }, overlaySpan: { start: 30, end: 40 } },
        { kind: "member", path: "second", htmlSpan: { start: 30, end: 40, file }, overlaySpan: { start: 30, end: 40 } },
      ],
    }],
  };
  const tieHit = mapHtmlOffsetToOverlay(tieBreakerMapping, 35);
  assert.ok(tieHit?.segment);
  assert.equal(tieHit.segment?.path, "first", "first segment should win deterministic ties on equal width");

  const overlayFallback = mapOverlayOffsetToHtml(mapping, 35);
  assert.ok(overlayFallback);
  assert.equal(overlayFallback.segment, null, "missing segment should fallback to entry");
  assert.equal(overlayFallback.entry.exprId, "expr-1");

  const shrunk = shrinkSpanToMapping({ start: 5, end: 25, file }, mapping);
  assert.equal(shrunk.start, 10, "shrinkSpanToMapping should prefer the narrowest overlapping segment");
  assert.equal(shrunk.end, 20);

  const htmlFallback = mapHtmlOffsetToOverlay(mapping, 45);
  assert.ok(htmlFallback);
  assert.equal(htmlFallback.segment, null, "HTML offset outside segments should fallback to entry");

  assert.equal(mapOverlayOffsetToHtml(mapping, -1), null, "overlay offsets before entries should return null");
  assert.equal(
    mapHtmlOffsetToOverlay(mapping, mapping.entries[0].htmlSpan.end + 5),
    null,
    "HTML offsets after entries should return null",
  );
});

test("mapping helpers translate overlay/html offsets with and without member segments", () => {
  const html = `<template><div>\${user.address.street}</div><span>\${1 + 2}</span></template>`;
  const compilation = compile(html, "C:/mem/facade-mapping.html");

  const { mapping, exprSpans } = compilation;
  const memberEntry = mapping.entries.find((e) => e.segments?.some((s) => s.path.endsWith("address.street")));
  assert.ok(memberEntry, "expected mapping entry with member segments");
  const memberSeg = memberEntry.segments?.find((s) => s.path.endsWith("address.street"));
  assert.ok(memberSeg, "expected member segment for address.street");

  const overlayHit = mapOverlayOffsetToHtml(mapping, memberSeg.overlaySpan.end - 1);
  assert.ok(overlayHit?.segment, "overlay->html should resolve to a member segment");
  assert.equal(overlayHit.segment?.path, memberSeg.path);
  assert.equal(overlayHit.entry.exprId, memberEntry.exprId);
  assert.equal(overlayHit.segment?.htmlSpan.file, memberEntry.htmlSpan.file);

  const htmlHit = mapHtmlOffsetToOverlay(mapping, memberSeg.htmlSpan.end - 1);
  assert.ok(htmlHit?.segment, "html->overlay should resolve to a member segment");
  assert.equal(htmlHit.segment?.path, memberSeg.path);
  assert.equal(htmlHit.entry.exprId, memberEntry.exprId);

  const literalEntry = mapping.entries.find((e) => html.slice(e.htmlSpan.start, e.htmlSpan.end).includes("1 + 2"));
  assert.ok(literalEntry, "expected mapping entry for literal expression");
  assert.ok(!literalEntry.segments || literalEntry.segments.length === 0, "literal expressions should not emit member segments");

  const literalHtmlOffset = html.indexOf("1 + 2");
  const literalHtmlHit = mapHtmlOffsetToOverlay(mapping, literalHtmlOffset);
  assert.ok(literalHtmlHit, "html->overlay should return an entry even without segments");
  assert.equal(literalHtmlHit.segment, null);

  const literalOverlayHit = mapOverlayOffsetToHtml(mapping, literalHtmlHit.entry.overlaySpan.start + 1);
  assert.ok(literalOverlayHit, "overlay->html should return the same entry");
  assert.equal(literalOverlayHit.segment, null);
  assert.equal(exprSpans.get(literalHtmlHit.entry.exprId)?.file, literalHtmlHit.entry.htmlSpan.file);

  assert.equal(mapHtmlOffsetToOverlay(mapping, 1), null, "HTML offsets outside any expression should return null");
});

test("member segments preserve authored HTML offsets from parser spans", () => {
  const html = "<template><div>${user.address.street}</div></template>";
  const templateFilePath = "C:/mem/facade-member-spans.html";
  const compilation = compile(html, templateFilePath);

  const entry = compilation.mapping.entries.find((e) => e.segments?.some((s) => s.path.endsWith("address.street")));
  assert.ok(entry, "expected mapping entry for member path");
  const seg = entry.segments?.find((s) => s.path.endsWith("address.street"));
  assert.ok(seg, "expected member segment for address.street");

  const expectedStart = html.indexOf("user.address.street");
  const expectedEnd = expectedStart + "user.address.street".length;

  assert.equal(seg.htmlSpan.start, expectedStart, "member html span should align to authored offset");
  assert.equal(seg.htmlSpan.end, expectedEnd, "member html span should cover the authored path only");
  assert.equal(seg.htmlSpan.file, entry.htmlSpan.file, "member spans should carry the same file id as the expression");
  assert.ok(
    seg.htmlSpan.start >= entry.htmlSpan.start && seg.htmlSpan.end <= entry.htmlSpan.end,
    "member span should stay within the owning expression span",
  );
});

test("exprTable aligns with mapping entries and exprSpans", () => {
  const html = `<template title.bind="user.name">\${user.count}</template>`;
  const compilation = compile(html, "C:/mem/facade-exprtable.html");

  const exprTableIds = new Set(compilation.exprTable.map((e) => e.id));
  assert.ok(exprTableIds.size >= 2, "exprTable should include entries for attribute and interpolation expressions");

  for (const entry of compilation.mapping.entries) {
    assert.ok(exprTableIds.has(entry.exprId), `exprTable should contain mapping exprId ${entry.exprId}`);
    const span = compilation.exprSpans.get(entry.exprId);
    assert.ok(span, `exprSpans should contain ${entry.exprId}`);
    assert.equal(span?.file, entry.htmlSpan.file, "expr span file should match mapping html span file");
  }
});

test("expr and mapping spans carry normalized file ids", () => {
  const html = `<template>\${msg}</template>`;
  const templatePath = path.join(process.cwd(), "tmp", "facade-normalized.html");

  const compilation = compile(html, templatePath);

  const entry = compilation.mapping.entries[0];
  assert.ok(entry.htmlSpan.file, "htmlSpan should include a file id");
  assert.ok(String(entry.htmlSpan.file).includes("/"), "file id should be normalized with forward slashes");
  assert.equal(compilation.exprSpans.get(entry.exprId)?.file, entry.htmlSpan.file, "exprSpans and mapping should share the same file id");
});
