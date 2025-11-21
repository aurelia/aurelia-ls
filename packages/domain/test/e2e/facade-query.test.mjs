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

function build() {
  return compileTemplate({
    html,
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

  test.skip("nested controllers: nodeAt/controllerAt/exprAt cover inner templates with frameIds", () => {
    const html = `
      <div repeat.for="item of items">
        <template if.bind="item.ok">
          <span title.bind="item.name">\${item.name}</span>
        </template>
      </div>
    `;
    const { query, mapping } = build(html);
    // TODO: assert nodeAt hits inner span, controllerAt finds if+repeat, exprAt carries frameId for repeat inner bindings.
    void query;
    void mapping;
  });

  test.skip("mapping spans include member-level offsets for rename/refs", () => {
    const html = `<div>\${user.address.street}</div>`;
    const { mapping } = build(html);
    // TODO: assert mapping entries include inner member offsets (street) for rename/refs.
    void mapping;
  });

  test.skip("bindablesFor merges custom element/attribute/native schemas", () => {
    const html = `<my-thing foo.bind="vmFoo" bar.attr="x" baz="y"></my-thing>`;
    const { query } = build(html);
    // TODO: assert bindablesFor lists CE bindables, native props, and custom attribute bindables when present.
    void query;
  });

  test.skip("expectedTypeOf surfaces target/expr hints (Phase 40)", () => {
    const html = `<input value.bind="user.name" maxlength.bind="user.name.length" />`;
    const { query } = build(html);
    // TODO: assert expectedTypeOf(bindable/value expr) returns string/number hints.
    void query;
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

