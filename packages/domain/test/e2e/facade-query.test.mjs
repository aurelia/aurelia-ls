import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { compileTemplate, getExpressionParser, DEFAULT_SYNTAX } from "../../out/index.js";

const vmStub = {
  getRootVmTypeExpr: () => "MyVm",
  getSyntheticPrefix: () => "__AU_TTC_",
};

const html = `<template>
  <div title.bind="msg">${"${msg}"}</div>
</template>`;

const exprParser = getExpressionParser();
const attrParser = DEFAULT_SYNTAX;

function build(customHtml = html) {
  return compileTemplate({
    html: customHtml,
    templateFilePath: "C:/mem/facade-query.html",
    isJs: false,
    vm: vmStub,
    attrParser,
    exprParser,
  });
}
describe("Facade", () => {
  test("mapping aligns overlay and HTML", () => {
    const { overlay, mapping } = build();
    assert.ok(mapping.entries.length >= 2, "expected at least two mapping entries");
    const overlayExprIds = new Set(overlay.calls.map((c) => c.exprId));
    for (const entry of mapping.entries) {
      assert.ok(overlayExprIds.has(entry.exprId), `exprId ${entry.exprId} missing in overlay calls`);
      assert.ok(entry.overlayRange[0] < entry.overlayRange[1], "overlay range must be non-empty");
      assert.ok(entry.htmlSpan.start < entry.htmlSpan.end, "html span must be non-empty");
    }
  });

  test("query.exprAt locates expressions", () => {
    const { query } = build();
    const attrExprOffset = html.indexOf("msg\"");
    const exprHit = query.exprAt(attrExprOffset);
    assert.ok(exprHit, "exprAt should find the attribute expression");
    assert.ok(exprHit?.span.start <= attrExprOffset && exprHit?.span.end >= attrExprOffset);
  });

  test("query.nodeAt + bindables/controller", () => {
    const { query } = build();
    const nodeOffset = html.indexOf("<div") + 1;
    const node = query.nodeAt(nodeOffset);
    assert.ok(node, "nodeAt should return a node");
    assert.equal(node?.kind, "element");
    assert.equal(node?.hostKind, "native");

    const bindables = node ? query.bindablesFor(node) : null;
    assert.ok(bindables && bindables.some((b) => b.name === "title"), "bindables should include 'title'");

    // plain div should not have a controller
    assert.equal(query.controllerAt(nodeOffset), null);
  });

  test("nested controllers: nodeAt/controllerAt/exprAt cover inner templates with frameIds", () => {
    const html = `
      <div repeat.for="item of items">
        <template if.bind="item.ok">
          <span title.bind="item.name">\${item.name}</span>
        </template>
      </div>
    `;
    const { query, mapping } = build(html);
    const spanOffset = html.indexOf("<span") + 2;
    const node = query.nodeAt(spanOffset);
    assert.ok(node, "should find inner span node");
    assert.equal(node?.hostKind, "native");

    const ifOffset = html.indexOf("if.bind");
    const controller = query.controllerAt(ifOffset);
    assert.ok(controller);
    assert.equal(controller?.kind, "if");

    const exprOffset = html.indexOf("item.name");
    const exprHit = query.exprAt(exprOffset);
    assert.ok(exprHit?.frameId !== undefined, "expr should carry frameId from nested frame");
    assert.ok(mapping.entries.some((m) => m.exprId === exprHit?.exprId));
  });

  test("mapping spans include member-level offsets for rename/refs", () => {
    const html = `<div>\${user.address.street}</div>`;
    const { mapping } = build(html);
    const entry = mapping.entries.find((e) => e.htmlSpan.start > 0 && (e.segments?.length ?? 0) > 0);
    assert.ok(entry, "expected mapping entry with segments");
    const member = entry?.segments?.find((s) => s.path.endsWith("street"));
    assert.ok(member, "expected member segment for street");
    assert.ok(member?.overlaySpan[1] > member?.overlaySpan[0]);
    assert.ok(member?.htmlSpan.end > member?.htmlSpan.start);
  });

  test.skip("bindablesFor merges custom element/attribute/native schemas", () => {
    const html = `<my-thing foo.bind="vmFoo" bar.attr="x" baz="y"></my-thing>`;
    const { query } = build(html);
    // TODO: assert bindablesFor lists CE bindables, native props, and custom attribute bindables when present.
    void query;
  });

  test("expectedTypeOf surfaces target/expr hints (Phase 40)", () => {
    const html = `<input value.bind="user.name" checked.bind="flag" />`;
    const { query } = build(html);
    const valueOffset = html.indexOf("user.name");
    const valueExpr = query.exprAt(valueOffset);
    assert.ok(valueExpr);
    const expectedValueType = valueExpr ? query.expectedTypeOf(valueExpr) : null;
    assert.equal(expectedValueType, "string");

    const node = query.nodeAt(html.indexOf("<input") + 1);
    const bindables = node ? query.bindablesFor(node) : null;
    const checkedType = bindables?.find((b) => b.name === "checked")?.type;
    assert.equal(checkedType, "boolean");
  });

  test.skip("controllerAt reflects branches (switch/promise) with spans", () => {
    const html = `
      <template switch.bind="mode">
        <template case="a">\${foo}</template>
        <template default>\${bar}</template>
      </template>
    `;
    const { query } = build(html);
    // TODO: assert controllerAt hits switch/case/default spans inside nested templates.
    void query;
  });

  test.skip("slot/projection awareness for nodeAt/bindables", () => {
    const html = `
      <custom-layout>
        <div slot="header">\${title}</div>
        <div>\${body}</div>
      </custom-layout>
    `;
    const { query } = build(html);
    // TODO: assert nodeAt maps projected nodes and bindables consider slot context.
    void query;
  });

  test.skip("containerless/surrogate mapping survives DOM reshaping", () => {
    const html = `
      <div as-element="au-marker" containerless>
        <span>\${msg}</span>
      </div>
    `;
    const { mapping } = build(html);
    // TODO: assert mapping spans still point to authored spans despite markers/surrogates.
    void mapping;
  });
});

