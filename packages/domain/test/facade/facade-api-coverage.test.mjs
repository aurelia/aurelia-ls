import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_SYNTAX,
  compileTemplate,
  compileTemplateToOverlay,
  compileTemplateToSSR,
  getExpressionParser,
  mapHtmlOffsetToOverlay,
  mapOverlayOffsetToHtml,
  pickNarrowestContaining,
  provenanceSpan,
  preferOrigin,
  spanContainsOffset,
  spanLength,
} from "../../out/index.js";
import { vmStub } from "../_helpers/facade-harness.mjs";

describe("Facade API coverage", () => {
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

    const htmlNarrow = mapHtmlOffsetToOverlay(mapping, 12);
    assert.ok(htmlNarrow?.segment);
    assert.equal(htmlNarrow.segment?.path, "user.address.street", "narrowest HTML span should win");

    const overlayFallback = mapOverlayOffsetToHtml(mapping, 35);
    assert.ok(overlayFallback);
    assert.equal(overlayFallback.segment, null, "missing segment should fallback to entry");
    assert.equal(overlayFallback.entry.exprId, "expr-1");

    const htmlFallback = mapHtmlOffsetToOverlay(mapping, 45);
    assert.ok(htmlFallback);
    assert.equal(htmlFallback.segment, null, "HTML offset outside segments should fallback to entry");
  });

  test("diagnostics are aggregated and grouped by source", () => {
    const html = `
      <template>
        <let foo.bind="message"></let>
        <let foo.bind="'again'"></let>
        <div nope.trigger="doIt()"></div>
        <input value.bind="123" />
      </template>
    `;

    const compilation = compileTemplate({
      html,
      templateFilePath: "C:/mem/facade-diags.html",
      isJs: false,
      vm: vmStub(),
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
    });

    const { all, bySource } = compilation.diagnostics;

    const resolveCodes = (bySource["resolve-host"] ?? []).map((d) => d.code);
    assert.ok(resolveCodes.includes("AU1103") || resolveCodes.includes("AU1104"), "resolve-host diags should surface");

    const bindCodes = (bySource.bind ?? []).map((d) => d.code);
    assert.ok(bindCodes.includes("AU1202"), "bind diags should surface");

    const typecheckCodes = (bySource.typecheck ?? []).map((d) => d.code);
    assert.ok(typecheckCodes.includes("AU1301"), "typecheck diags should surface");

    const groupedCount = Object.values(bySource).reduce((sum, diags) => sum + (diags?.length ?? 0), 0);
    assert.equal(groupedCount, all.length, "grouped diagnostic counts should cover the flat list");

    const diagWithSpan = all.find((d) => d.span);
    assert.ok(diagWithSpan?.span?.file, "diagnostics should carry SourceSpan with file id");
  });

  test("mapping helpers translate overlay/html offsets with and without member segments", () => {
    const html = `<template><div>\${user.address.street}</div><span>\${1 + 2}</span></template>`;
    const compilation = compileTemplate({
      html,
      templateFilePath: "C:/mem/facade-mapping.html",
      isJs: false,
      vm: vmStub(),
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
    });

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
  });

  test("diagnostics carry origin traces for resolve-host and bind stages", () => {
    const html = `
      <template>
        <let foo.bind="1"></let>
        <let foo.bind="2"></let>
        <div nope.trigger="fn()"></div>
      </template>
    `;
    const compilation = compileTemplate({
      html,
      templateFilePath: "C:/mem/facade-origin.html",
      isJs: false,
      vm: vmStub(),
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
    });

    const resolveDiag = compilation.diagnostics.all.find((d) => d.code === "AU1103");
    assert.ok(resolveDiag?.origin?.trace?.some((t) => t.by === "resolve-host"), "resolve-host diag should have origin trace");

    const bindDiag = compilation.diagnostics.all.find((d) => d.code === "AU1202");
    assert.ok(bindDiag?.origin?.trace?.some((t) => t.by === "bind"), "bind diag should have origin trace");
  });

  test("typecheck diagnostics map to mapping entries by exprId and span", () => {
    const html = `<template><input value.bind="user.count" /><div>\${user.name}</div></template>`;
    const vm = vmStub({ getRootVmTypeExpr: () => "({ user: { count: number, name: string } })" });
    const compilation = compileTemplate({
      html,
      templateFilePath: "C:/mem/diag-map.html",
      isJs: false,
      vm,
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
    });

    const typeDiag = compilation.typecheck.diags.find((d) => d.code === "AU1301");
    assert.ok(typeDiag, "expected AU1301 typecheck diagnostic");
    assert.ok(typeDiag?.exprId, "typecheck diagnostic should carry exprId");
    assert.ok(typeDiag?.span, "typecheck diagnostic should carry span");

    const entry = compilation.mapping.entries.find((e) => e.exprId === typeDiag?.exprId);
    assert.ok(entry, "mapping entry should exist for diagnostic expr");
    assert.deepEqual(
      { start: typeDiag.span?.start, end: typeDiag.span?.end, file: typeDiag.span?.file },
      { start: entry.htmlSpan.start, end: entry.htmlSpan.end, file: entry.htmlSpan.file },
      "diagnostic span should align with mapping html span",
    );
  });

  test("resolve-host diagnostics preserve authored span in HTML", () => {
    const html = `<template><div badprop.bind="user.count"></div></template>`;
    const compilation = compileTemplate({
      html,
      templateFilePath: "C:/mem/resolve-span.html",
      isJs: false,
      vm: vmStub({ getRootVmTypeExpr: () => "({ user: { count: number } })" }),
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
    });

    const diag = compilation.linked.diags.find((d) => d.code === "AU1104");
    assert.ok(diag, "expected resolve-host AU1104 diagnostic");
    assert.ok(diag?.span?.file?.includes("resolve-span.html"), "diag span should include authored file id");
    const snippet = html.slice(diag?.span?.start ?? 0, diag?.span?.end ?? 0);
    assert.ok(snippet.includes("badprop"), "diag span should cover offending attribute");
  });

  test("stage metadata reports cache keys and flips fromCache after persistence", async () => {
    const cacheDir = await mkdtemp(path.join(os.tmpdir(), "au-facade-cache-"));
    const opts = {
      html: `<template>\${msg}</template>`,
      templateFilePath: path.join(cacheDir, "cache.html"),
      isJs: false,
      vm: vmStub(),
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
      cache: { persist: true, dir: cacheDir },
    };
    const stageKeys = ["10-lower", "20-link", "30-scope", "40-typecheck", "50-plan-overlay", "60-emit-overlay"];

    const first = compileTemplate(opts);
    for (const key of stageKeys) {
      const meta = first.meta[key];
      assert.ok(meta, `expected meta for ${key}`);
      assert.equal(meta.fromCache, false);
      assert.ok(meta.cacheKey.length > 0);
      assert.ok(meta.artifactHash.length > 0);
    }

    const second = compileTemplate(opts);
    for (const key of stageKeys) {
      const meta = second.meta[key];
      assert.ok(meta, `expected meta for ${key} on cache hit`);
      assert.equal(meta.fromCache, true, `${key} should come from cache on the second compile`);
      assert.equal(meta?.cacheKey, first.meta[key]?.cacheKey);
      assert.equal(meta?.artifactHash, first.meta[key]?.artifactHash);
    }
  });

  test("compileTemplateToOverlay exposes overlay + mapping aligned to calls", () => {
    const html = `<template>\${msg}</template>`;
    const overlay = compileTemplateToOverlay({
      html,
      templateFilePath: "C:/mem/overlay-only.html",
      isJs: false,
      vm: vmStub(),
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
    });

    assert.ok(overlay.mapping, "overlay facade should surface mapping");
    assert.equal(overlay.calls.length, overlay.mapping?.entries.length);
    const call = overlay.calls[0];
    const entry = overlay.mapping?.entries.find((e) => e.exprId === call.exprId);
    assert.ok(entry, "mapping should align with calls by exprId");
    assert.ok(entry?.htmlSpan.file?.includes("overlay-only.html"));
    assert.equal(entry?.overlaySpan.start, call.overlayStart, "overlay span start should match call");
    assert.equal(entry?.overlaySpan.end, call.overlayEnd, "overlay span end should match call");
    assert.deepEqual(entry?.htmlSpan, call.htmlSpan, "html span should stay consistent between mapping and calls");
  });

  test("compileTemplate and compileTemplateToOverlay stay aligned on overlay text and mapping", () => {
    const html = `<template>\${msg}</template>`;
    const templatePath = "C:/mem/overlay-align.html";

    const compilation = compileTemplate({
      html,
      templateFilePath: templatePath,
      isJs: false,
      vm: vmStub(),
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
    });

    const overlayOnly = compileTemplateToOverlay({
      html,
      templateFilePath: templatePath,
      isJs: false,
      vm: vmStub(),
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
    });

    assert.equal(overlayOnly.text, compilation.overlay.text, "overlay text should match across facades");
    assert.equal(overlayOnly.overlayPath, compilation.overlay.overlayPath, "overlay path should match across facades");
    assert.ok(overlayOnly.mapping, "overlay-only facade should include mapping");
    assert.equal(overlayOnly.mapping?.entries.length, compilation.mapping.entries.length, "mapping entry counts should match");
    assert.deepEqual(
      overlayOnly.mapping?.entries.map((e) => e.exprId),
      compilation.mapping.entries.map((e) => e.exprId),
      "exprIds should stay aligned across facades",
    );
  });

  test("compileTemplateToSSR honors custom base names", () => {
    const res = compileTemplateToSSR({
      html: `<template>\${msg}</template>`,
      templateFilePath: "C:/mem/custom-ssr.html",
      isJs: false,
      vm: vmStub(),
      overlayBaseName: "custom-output.ssr",
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
    });

    assert.ok(res.htmlPath.endsWith("custom-output.html"));
    assert.ok(res.manifestPath.endsWith("custom-output.json"));
    assert.ok(res.plan.templates?.length ?? 0);
    assert.ok(res.htmlText.length > 0);
    assert.ok(res.manifestText.length > 0);
  });

  test("expr and mapping spans carry normalized file ids", () => {
    const html = `<template>\${msg}</template>`;
    const templatePath = path.join(process.cwd(), "tmp", "facade-normalized.html");

    const compilation = compileTemplate({
      html,
      templateFilePath: templatePath,
      isJs: false,
      vm: vmStub(),
      attrParser: DEFAULT_SYNTAX,
      exprParser: getExpressionParser(),
    });

    const entry = compilation.mapping.entries[0];
    assert.ok(entry.htmlSpan.file, "htmlSpan should include a file id");
    assert.ok(String(entry.htmlSpan.file).includes("/"), "file id should be normalized with forward slashes");
    assert.equal(compilation.exprSpans.get(entry.exprId)?.file, entry.htmlSpan.file, "exprSpans and mapping should share the same file id");
  });

  test("span helpers stay consistent when exported through the facade", () => {
    const items = [
      { name: "wide", span: { start: 0, end: 20 } },
      { name: "narrow", span: { start: 5, end: 10 } },
      { name: "edge", span: { start: 10, end: 15 } },
    ];
    assert.ok(spanContainsOffset(items[0].span, 7));
    assert.equal(spanLength(items[0].span), 20);
    const hit = pickNarrowestContaining(items, 7, (i) => i.span);
    assert.equal(hit?.name, "narrow", "narrowest span should be selected");
  });

  test("provenance helpers surface spans and prefer richer origins", () => {
    const spanA = { start: 1, end: 3 };
    const spanB = { start: 2, end: 4 };
    const originA = { kind: "authored", span: spanA, trace: [{ by: "a" }] };
    const originB = { kind: "synthetic", span: spanB, trace: [{ by: "b" }] };

    const chosen = preferOrigin(originA, originB);
    assert.equal(chosen, originA, "preferOrigin should keep primary when present");

    assert.deepEqual(provenanceSpan(originA), spanA, "provenanceSpan should return origin span");
    assert.deepEqual(provenanceSpan({ origin: null, fallbackSpan: spanB }), spanB, "fallbackSpan should be used when origin is null");
  });
});
