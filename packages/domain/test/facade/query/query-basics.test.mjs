import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { getExpressionParser, DEFAULT_SYNTAX } from "../../../out/index.js";
import { compileMarkup, vmStub } from "../../_helpers/facade-harness.mjs";

const baseHtml = `<template>
  <div title.bind="msg">\${msg}</div>
</template>`;

const exprParser = getExpressionParser();
const attrParser = DEFAULT_SYNTAX;

function build(customHtml = baseHtml) {
  return compileMarkup(customHtml, "C:/mem/facade-query.html", {
    isJs: false,
    vm: vmStub({ getRootVmTypeExpr: () => "MyVm" }),
    attrParser,
    exprParser,
  });
}

describe("Facade.query basics", () => {
  test("mapping aligns overlay and HTML spans", () => {
    const { overlay, mapping } = build();
    assert.ok(mapping.entries.length >= 2, "expected at least two mapping entries");
    const overlayExprIds = new Set(overlay.calls.map((c) => c.exprId));
    for (const entry of mapping.entries) {
      assert.ok(overlayExprIds.has(entry.exprId), `exprId ${entry.exprId} missing in overlay calls`);
      assert.ok(entry.overlaySpan.start < entry.overlaySpan.end, "overlay range must be non-empty");
      assert.ok(entry.htmlSpan.start < entry.htmlSpan.end, "html span must be non-empty");
    }
  });

  test("exprAt locates attribute + interpolation spans and carries frameIds in nested controllers", () => {
    const html = `
      <div repeat.for="item of items">
        <template if.bind="item.active">
          <span title.bind="item.name">\${item.name}</span>
        </template>
      </div>
    `;
    const { query } = build(html);
    const attrOffset = html.indexOf("title.bind");
    const attrExpr = query.exprAt(attrOffset);
    assert.ok(attrExpr, "exprAt should find the attribute expression");
    assert.ok(attrExpr?.span.start <= attrOffset && attrExpr?.span.end > attrOffset);

    const nestedOffset = html.indexOf("item.name");
    const nestedExpr = query.exprAt(nestedOffset);
    assert.ok(nestedExpr, "exprAt should hit nested interpolation");
    assert.ok(nestedExpr?.frameId !== undefined, "nested expressions should carry frameId");
  });

  test("controllerAt locates controllers with spans", () => {
    const html = `
      <div repeat.for="item of items">
        <template if.bind="item.active">
          <span title.bind="item.name">hi</span>
        </template>
      </div>
    `;
    const { query } = build(html);
    const ifOffset = html.indexOf("if.bind");
    const ifCtrl = query.controllerAt(ifOffset);
    assert.equal(ifCtrl?.kind, "if");
    assert.ok(ifCtrl?.span.start <= ifOffset && ifCtrl?.span.end >= ifOffset);
  });

  test("nodeAt exposes hostKind + bindables and controllerAt stays null for plain nodes", () => {
    const { query } = build();
    const nodeOffset = baseHtml.indexOf("<div") + 1;
    const node = query.nodeAt(nodeOffset);
    assert.ok(node, "nodeAt should return a node");
    assert.equal(node?.kind, "element");
    assert.equal(node?.hostKind, "native");

    const bindables = node ? query.bindablesFor(node) : null;
    assert.ok(bindables && bindables.some((b) => b.name === "title"), "bindables should include 'title'");

    // plain div should not have a controller
    assert.equal(query.controllerAt(nodeOffset), null);
  });

  test("bindablesFor surfaces native types and falls back to null when none exist", () => {
    const html = `<template><input value.bind="user.name" checked.bind="user.active" /></template>`;
    const { query } = build(html);
    const node = query.nodeAt(html.indexOf("<input") + 1);
    const bindables = node ? query.bindablesFor(node) : null;
    assert.ok(bindables);
    assert.ok(bindables?.some((b) => b.name === "value" && b.type === "string"));
    assert.ok(bindables?.some((b) => b.name === "checked" && b.type === "boolean"));

    const emptyHtml = `<template><!-- comment only --></template>`;
    const empty = build(emptyHtml);
    const emptyNode = empty.query.nodeAt(emptyHtml.indexOf("<template") + 1);
    assert.equal(emptyNode ? empty.query.bindablesFor(emptyNode) : null, null);
  });

  test("expectedTypeOf resolves hints and returns unknown for unmapped expressions", () => {
    const html = `<template><input value.bind="user.name" /><span>\${unknownThing}</span></template>`;
    const { query } = build(html);
    const valueOffset = html.indexOf("user.name");
    const valueExpr = query.exprAt(valueOffset);
    assert.ok(valueExpr);
    assert.equal(query.expectedTypeOf(valueExpr), "string");

    const unknownOffset = html.indexOf("unknownThing");
    const unknownExpr = query.exprAt(unknownOffset);
    assert.ok(unknownExpr);
    assert.equal(query.expectedTypeOf(unknownExpr), "unknown");
  });

  test("mapping spans include member-level offsets for rename/refs", () => {
    const html = `<div>\${user.address.street}</div>`;
    const { mapping } = build(html);
    const entry = mapping.entries.find((e) => e.htmlSpan.start > 0 && (e.segments?.length ?? 0) > 0);
    assert.ok(entry, "expected mapping entry with segments");
    const member = entry?.segments?.find((s) => s.path.endsWith("street"));
    assert.ok(member, "expected member segment for street");
    assert.ok(member?.overlaySpan.end > member?.overlaySpan.start);
    assert.ok(member?.htmlSpan.end > member?.htmlSpan.start);
  });

  test("controllerAt returns null when no controller exists at offset", () => {
    const html = `<template><div title.bind="msg"></div></template>`;
    const { query } = build(html);
    const offset = html.indexOf("title.bind");
    assert.equal(query.controllerAt(offset), null);
  });

  test("exprAt treats spans as [start, end) and ignores offsets outside any expression", () => {
    const html = `<div>\${user.name}</div>`;
    const { query } = build(html);
    const exprEnd = html.indexOf("user.name") + "user.name".length;
    const inside = query.exprAt(exprEnd - 1);
    assert.ok(inside, "exprAt should include offsets strictly inside the span");
    assert.ok(inside?.span.end >= exprEnd);
    assert.equal(query.exprAt(exprEnd), null, "exprAt should treat span end as exclusive");
    assert.equal(query.exprAt(html.length + 10), null, "exprAt should bail when offset is outside the template");
  });
});
