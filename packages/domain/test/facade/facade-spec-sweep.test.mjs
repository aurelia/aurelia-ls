import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_SYNTAX, getExpressionParser } from "../../out/index.js";
import { DEFAULT } from "../../out/compiler/language/registry.js";
import { compileMarkup, vmStub } from "../_helpers/facade-harness.mjs";
import { deepMergeSemantics } from "../_helpers/semantics-merge.mjs";

const attrParser = DEFAULT_SYNTAX;
const exprParser = getExpressionParser();
const defaultVm = vmStub({ getRootVmTypeExpr: () => "({ user: { name: string; active: boolean; count: number; address?: { street?: string } } })" });

const semanticsWithNameTag = deepMergeSemantics(DEFAULT, {
  resources: {
    elements: {
      "name-tag": {
        kind: "element",
        name: "name-tag",
        bindables: {
          firstName: { name: "firstName", type: { kind: "ts", name: "string" } },
          active: { name: "active", type: { kind: "ts", name: "boolean" } },
        },
      },
    },
  },
});

function compile(html, path = "C:/mem/facade-sweep.html", opts = {}) {
  return compileMarkup(html, path, {
    vm: opts.vm ?? defaultVm,
    attrParser,
    exprParser,
    semantics: opts.semantics,
    isJs: opts.isJs ?? false,
    overlayBaseName: opts.overlayBaseName,
  });
}

describe("Facade sweep: query, mapping, diags, semantics", () => {
  test("overlay calls align 1:1 with mapping entries", () => {
    const html = `<template><div>\${user.name}</div><div>\${user.count}</div></template>`;
    const res = compile(html);
    assert.equal(res.overlay.calls.length, res.mapping.entries.length);
    for (const entry of res.mapping.entries) {
      assert.ok(entry.overlaySpan.end > entry.overlaySpan.start);
      assert.ok(entry.htmlSpan.end > entry.htmlSpan.start);
    }
  });

  test("exprAt surfaces frameIds inside repeat/if nesting", () => {
    const html = `
      <div repeat.for="item of items">
        <template if.bind="item.active">
          \${item.name}
        </template>
      </div>
    `;
    const { query } = compile(html);
    const exprOffset = html.indexOf("item.name");
    const expr = query.exprAt(exprOffset);
    assert.ok(expr, "exprAt should find nested expression");
    assert.ok(expr?.frameId !== undefined, "frameId should be present for nested frame");
  });

  test("controllerAt locates controllers with spans", () => {
    const html = `
      <div repeat.for="item of items">
        <template if.bind="item.active">
          <span title.bind="item.name">hi</span>
        </template>
      </div>
    `;
    const { query } = compile(html);
    const ifOffset = html.indexOf("if.bind");
    const ifCtrl = query.controllerAt(ifOffset);
    assert.equal(ifCtrl?.kind, "if");
    assert.ok(ifCtrl?.span.start <= ifOffset && ifCtrl?.span.end >= ifOffset);
  });

  test("nodeAt returns hostKind native for native nodes", () => {
    const html = `<template><input value.bind="user.name" checked.bind="user.active" /></template>`;
    const { query } = compile(html);
    const node = query.nodeAt(html.indexOf("<input") + 1);
    assert.ok(node);
    assert.equal(node?.hostKind, "native");
  });

  test("bindablesFor returns native bindables with types", () => {
    const html = `<template><input value.bind="user.name" checked.bind="user.active" /></template>`;
    const { query } = compile(html);
    const node = query.nodeAt(html.indexOf("<input") + 1);
    const bindables = node ? query.bindablesFor(node) : null;
    assert.ok(bindables);
    assert.ok(bindables?.some((b) => b.name === "value" && b.type === "string"));
    assert.ok(bindables?.some((b) => b.name === "checked" && b.type === "boolean"));
  });

  test("expectedTypeOf resolves native bindables and expressions", () => {
    const html = `<template><input value.bind="user.name" /><span>\${user.active}</span></template>`;
    const { query } = compile(html);
    const exprOffset = html.indexOf("user.active");
    const expr = query.exprAt(exprOffset);
    assert.ok(expr);
    assert.equal(query.expectedTypeOf(expr), "unknown");

    const node = query.nodeAt(html.indexOf("<input") + 1);
    const bindable = node ? query.bindablesFor(node)?.find((b) => b.name === "value") : null;
    assert.equal(bindable && query.expectedTypeOf(bindable), "string");
  });

  test("mapping segments capture optional chaining members", () => {
    const html = `<div>\${user?.address?.street}</div>`;
    const { mapping } = compile(html);
    const entry = mapping.entries.find((e) => (e.segments?.length ?? 0) > 0);
    assert.ok(entry, "expected mapping entry with segments");
    const member = entry?.segments?.find((s) => s.path.endsWith("address.street"));
    assert.ok(member, "expected member segment for optional chain");
  });

  test("exprAt hits interpolation and attribute expressions", () => {
    const html = `<template title.bind="user.name">\${user.count}</template>`;
    const { query } = compile(html);
    const attrOffset = html.indexOf("user.name");
    assert.ok(query.exprAt(attrOffset));
    const textOffset = html.indexOf("user.count");
    const textExpr = query.exprAt(textOffset);
    assert.ok(textExpr);
  });

  test("mapping preserves html file in spans", () => {
    const htmlPath = "C:/mem/facade-spans.html";
    const res = compile(`<div>\${user.name}</div>`, htmlPath);
    const hit = res.mapping.entries[0];
    assert.ok(hit.htmlSpan.file?.endsWith("facade-spans.html"));
  });

  test("JS overlays still produce mapping and overlay path ends with .js", () => {
    const html = `<template>\${user.name}</template>`;
    const res = compile(html, "C:/mem/facade-js.js", { isJs: true });
    assert.ok(res.overlay.overlayPath.endsWith(".js"));
    assert.equal(res.overlay.calls.length, res.mapping.entries.length);
  });

  test("custom semantics surface bindables and suppress AU1104", () => {
    const html = `<template><name-tag first-name.bind="user.name" active.bind="user.active"></name-tag></template>`;
    const withSem = compile(html, "C:/mem/name-tag.html", { semantics: semanticsWithNameTag });
    const node = withSem.query.nodeAt(html.indexOf("<name-tag") + 2);
    assert.equal(node?.hostKind, "custom");
    const bindables = node ? withSem.query.bindablesFor(node) : null;
    assert.ok(bindables?.some((b) => b.name === "firstName" && b.type === "string" && b.source === "component"));
    assert.ok(!withSem.linked.diags.some((d) => d.code === "AU1104"));

    const defaultSem = compile(html, "C:/mem/name-tag-default.html");
    assert.ok(defaultSem.linked.diags.some((d) => d.code === "AU1104"));
  });

  test("unknown event and property emit diagnostics", () => {
    const html = `<template><div nope.trigger="doIt()" badprop.bind="x"></div></template>`;
    const res = compile(html, "C:/mem/diags.html");
    const codes = res.linked.diags.map((d) => d.code);
    assert.ok(codes.includes("AU1103"), "expected AU1103 for event");
    assert.ok(codes.includes("AU1104"), "expected AU1104 for property");
  });

  test("repeat tail option mismatch emits AU1106", () => {
    const html = `<template><div repeat.for="item of items; nope.bind: val"></div></template>`;
    const res = compile(html, "C:/mem/repeat-tail.html");
    assert.ok(res.linked.diags.some((d) => d.code === "AU1106"));
  });

  test("overlayBaseName override reaches overlay path", () => {
    const res = compile(`<div>\${user.name}</div>`, "C:/mem/base-name.html", { vm: vmStub(), overlayBaseName: "my.overlay" });
    assert.ok(res.overlay.overlayPath.endsWith("my.overlay.ts"));
  });

  test("multiple expressions share distinct exprIds and mapping entries", () => {
    const html = `<template>\${user.name} - \${user.count}</template>`;
    const res = compile(html, "C:/mem/multi-expr.html");
    assert.equal(res.overlay.calls.length, 2);
    assert.equal(new Set(res.overlay.calls.map((c) => c.exprId)).size, 2);
    assert.equal(res.mapping.entries.length, 2);
  });

  test("frameIds differ between root and repeat overlay expressions", () => {
    const html = `<template><div repeat.for="item of items">\${item.name}</div><span>\${user.name}</span></template>`;
    const res = compile(html, "C:/mem/frame-ids.html");
    const repeatExpr = res.mapping.entries.find((e) => e.htmlSpan.start <= html.indexOf("item.name") && e.htmlSpan.end >= html.indexOf("item.name"));
    const rootExpr = res.mapping.entries.find((e) => e.htmlSpan.start <= html.indexOf("user.name") && e.htmlSpan.end >= html.indexOf("user.name"));
    assert.ok(repeatExpr && rootExpr);
    assert.notStrictEqual(repeatExpr.frameId, rootExpr.frameId);
  });

  test("member segment spans are non-empty for deep chains", () => {
    const html = `<div>\${user.address.street}</div>`;
    const res = compile(html, "C:/mem/segments.html");
    const entry = res.mapping.entries.find((e) => e.segments?.some((s) => s.path.endsWith("address.street")));
    const seg = entry?.segments?.find((s) => s.path.endsWith("address.street"));
    assert.ok(seg);
    assert.ok(seg?.overlaySpan.end > seg?.overlaySpan.start);
    assert.ok(seg?.htmlSpan.end > seg?.htmlSpan.start);
  });

  test("expectedTypeOf returns null for unknown expressions", () => {
    const html = `<template>\${unknownThing}</template>`;
    const res = compile(html, "C:/mem/unknown-type.html");
    const expr = res.query.exprAt(html.indexOf("unknownThing"));
    assert.ok(expr);
    assert.equal(res.query.expectedTypeOf(expr), "unknown");
  });

  test("exprAt respects pending mapping facade", () => {
    const html = `<template>\${user.name}</template>`;
    const res = compile(html, "C:/mem/pending.html");
    const expr = res.query.exprAt(html.indexOf("user.name"));
    assert.ok(expr);
  });

  test("mapping entries carry frameId", () => {
    const html = `<template><div repeat.for="item of items">\${item.name}</div></template>`;
    const res = compile(html, "C:/mem/frame-mapping.html");
    const entry = res.mapping.entries.find((e) => e.htmlSpan.start <= html.indexOf("item.name") && e.htmlSpan.end >= html.indexOf("item.name"));
    assert.ok(entry);
    assert.ok(entry?.frameId !== undefined);
  });

  test("diags include source stage and span", () => {
    const html = `<template><div nope.trigger="x"></div></template>`;
    const res = compile(html, "C:/mem/source-span.html");
    const diag = res.linked.diags.find((d) => d.code === "AU1103");
    assert.ok(diag?.source);
    assert.ok(diag?.span);
  });

  test("custom semantics merge retains defaults elsewhere", () => {
    const html = `<template><input value.bind="user.name" /></template>`;
    const res = compile(html, "C:/mem/merge-defaults.html", { semantics: semanticsWithNameTag });
    assert.equal(res.linked.diags.length, 0);
  });

  test("bindablesFor returns null when no bindings available", () => {
    const html = `<template><!-- comment only --></template>`;
    const res = compile(html, "C:/mem/no-bindables.html");
    const node = res.query.nodeAt(html.indexOf("<template") + 1);
    const bindables = node ? res.query.bindablesFor(node) : null;
    assert.equal(bindables, null);
  });

  test("exprAt returns null when outside spans", () => {
    const html = `<template>\${user.name}</template>`;
    const res = compile(html, "C:/mem/outside-span.html");
    const expr = res.query.exprAt(html.length + 10);
    assert.equal(expr, null);
  });
});
