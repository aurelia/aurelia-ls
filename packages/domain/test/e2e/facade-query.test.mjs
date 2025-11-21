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
});

