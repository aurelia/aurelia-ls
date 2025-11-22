import test from "node:test";
import assert from "node:assert/strict";

import { buildTemplateMapping } from "../../out/compiler/mapping.js";
import { buildTemplateQuery } from "../../out/compiler/query.js";
import { resolveSourceFile } from "../../out/compiler/model/source.js";

test("mapping pairs overlay spans with HTML/member spans", () => {
  const exprId = "e1";
  const ir = {
    version: "aurelia-ir@1",
    templates: [{
      dom: { kind: "template", id: "0", ns: "html", attrs: [], children: [], loc: null },
      rows: [{
        target: "0/1",
        instructions: [{
          type: "propertyBinding",
          to: "value",
          mode: "toView",
          from: { id: exprId, code: "user.name", loc: { start: 100, end: 110, file: "comp.html" } },
        }],
      }],
    }],
    exprTable: [{
      id: exprId,
      expressionType: "IsProperty",
      ast: {
        $kind: "AccessMember",
        object: { $kind: "AccessScope", name: "user", ancestor: 0, span: { start: 0, end: 4 } },
        name: "name",
        optional: false,
        span: { start: 0, end: 9 },
      },
    }],
  };

  const overlayMapping = [{
    exprId,
    start: 10,
    end: 20,
    segments: [{ kind: "member", path: "user.name", span: [12, 16] }],
  }];

  const { mapping, exprSpans } = buildTemplateMapping({
    overlayMapping,
    ir,
    exprTable: ir.exprTable,
    fallbackFile: resolveSourceFile("comp.html"),
    exprToFrame: { [exprId]: 1 },
  });

  const entry = mapping.entries[0];

  assert.equal(exprSpans.get(exprId)?.start, 100);
  assert.deepEqual(entry.overlayRange, [10, 20]);
  assert.equal(entry.frameId, 1);
  assert.deepEqual(entry.htmlSpan, { start: 100, end: 110, file: "comp.html" });
  assert.deepEqual(entry.segments?.[0].htmlSpan, { start: 100, end: 109, file: "comp.html" });
  assert.deepEqual(entry.segments?.[0].overlaySpan, [12, 16]);
});

test("mapping keeps member segments through optional chaining", () => {
  const exprId = "eOptional";
  const ir = {
    version: "aurelia-ir@1",
    templates: [{
      dom: { kind: "template", id: "0", ns: "html", attrs: [], children: [], loc: null },
      rows: [{
        target: "0/1",
        instructions: [{
          type: "propertyBinding",
          to: "value",
          mode: "toView",
          from: { id: exprId, code: "user?.profile?.name", loc: { start: 10, end: 30, file: "comp.html" } },
        }],
      }],
    }],
    exprTable: [{
      id: exprId,
      expressionType: "IsProperty",
      ast: {
        $kind: "AccessMember",
        object: {
          $kind: "AccessMember",
          object: { $kind: "AccessScope", name: "user", ancestor: 0, span: { start: 0, end: 4 } },
          name: "profile",
          optional: true,
          span: { start: 0, end: 12 },
        },
        name: "name",
        optional: true,
        span: { start: 0, end: 17 },
      },
    }],
  };

  const overlayMapping = [{
    exprId,
    start: 0,
    end: 10,
    segments: [{ kind: "member", path: "user.profile.name", span: [2, 8] }],
  }];

  const { mapping } = buildTemplateMapping({
    overlayMapping,
    ir,
    exprTable: ir.exprTable,
    fallbackFile: resolveSourceFile("comp.html"),
  });

  const seg = mapping.entries[0]?.segments?.[0];
  assert.equal(seg?.path, "user.profile.name");
  assert.ok(seg?.htmlSpan.start !== undefined);
});

test("query facade exposes node/expr/controller/bindable lookups", () => {
  const exprId = "e1";
  const dom = {
    kind: "template",
    id: "0",
    ns: "html",
    attrs: [],
    children: [{
      kind: "element",
      id: "0/1",
      ns: "html",
      tag: "div",
      attrs: [],
      children: [],
      loc: { start: 90, end: 130 },
    }],
    loc: { start: 0, end: 150 },
  };

  const templateIr = {
    dom,
    rows: [{
      target: "0/1",
      instructions: [{
        type: "propertyBinding",
        to: "value",
        mode: "toView",
        from: { id: exprId, code: "user.name", loc: { start: 100, end: 110, file: "comp.html" } },
      }],
    }],
  };

  const ir = { version: "aurelia-ir@1", templates: [templateIr], exprTable: [] };

  const linked = {
    version: "aurelia-linked@1",
    templates: [{
      dom,
      rows: [{
        target: "0/1",
        node: {
          kind: "element",
          tag: "div",
          native: { def: { tag: "div", props: { value: { type: { kind: "ts", name: "string" } } } } },
        },
        instructions: [
          {
            kind: "propertyBinding",
            to: "value",
            from: { id: exprId, code: "user.name" },
            effectiveMode: "toView",
            target: { kind: "element.nativeProp", prop: { type: { kind: "ts", name: "string" } } },
          },
          {
            kind: "hydrateTemplateController",
            res: "if",
            def: templateIr,
            props: [],
            loc: { start: 90, end: 95 },
          },
        ],
      }],
    }],
    diags: [],
  };

  const { mapping } = buildTemplateMapping({
    overlayMapping: [{ exprId, start: 0, end: 5, segments: [] }],
    ir,
    exprTable: [],
    fallbackFile: resolveSourceFile("comp.html"),
    exprToFrame: { [exprId]: 2 },
  });

  const query = buildTemplateQuery(ir, linked, mapping, { expectedByExpr: new Map([[exprId, "string"]]) });

  const node = query.nodeAt(100);
  assert.equal(node?.id, "0/1");
  assert.equal(node?.hostKind, "native");

  const bindables = query.bindablesFor(node);
  assert.deepEqual(bindables?.[0], { name: "value", mode: "toView", source: "native", type: "string" });

  const exprHit = query.exprAt(100);
  assert.equal(exprHit?.exprId, exprId);
  assert.equal(exprHit?.frameId, 2);
  assert.equal(exprHit ? query.expectedTypeOf(exprHit) : null, "string");

  const controller = query.controllerAt(92);
  assert.equal(controller?.kind, "if");
});
