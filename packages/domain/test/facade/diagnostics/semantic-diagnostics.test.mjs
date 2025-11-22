import test from "node:test";
import assert from "node:assert/strict";

import { compileMarkup, vmStub } from "../../_helpers/facade-harness.mjs";
import { deepMergeSemantics } from "../../_helpers/semantics-merge.mjs";
import { DEFAULT } from "../../../out/compiler/language/registry.js";
import { lowerDocument } from "../../../out/compiler/phases/10-lower/lower.js";
import { resolveHost } from "../../../out/compiler/phases/20-resolve-host/resolve.js";
import { DEFAULT_SYNTAX } from "../../../out/compiler/language/syntax.js";
import { getExpressionParser } from "../../../out/index.js";

function collectCodes(diags) {
  return diags.map((d) => d.code);
}

test("clean template produces no diagnostics", () => {
  const ok = compileMarkup(`<template><div repeat.for="item of items"></div><input value.bind="foo" /></template>`, "C:/mem/clean.html", {
    vm: vmStub(),
  });
  assert.equal(ok.linked.diags.length, 0);
});

test("AU1101: unknown controller emits, known controller does not", () => {
  // Craft an IR with a template controller, then force its res to an unknown name.
  const lowered = lowerDocument(`<template><div repeat.for="i of items"></div></template>`, {
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
    file: "mem.html",
    name: "mem",
    sem: DEFAULT,
  });
  const mutated = structuredClone(lowered);
  mutated.templates[0].rows.forEach((row) => {
    row.instructions.forEach((ins) => {
      if (ins.type === "hydrateTemplateController") ins.res = "nope-controller";
    });
  });
  const linkedUnknown = resolveHost(mutated, DEFAULT);
  assert.ok(collectCodes(linkedUnknown.diags).includes("AU1101"), "expected AU1101 for unknown controller");

  const known = compileMarkup(`<template><div repeat.for="i of items"></div></template>`, "C:/mem/known-controller.html", {
    vm: vmStub(),
  });
  assert.ok(!collectCodes(known.linked.diags).includes("AU1101"), "repeat controller should not emit AU1101");
});

test("AU1103: unknown event emits, known event does not", () => {
  const unknown = compileMarkup(`<template><div foo.trigger="doIt()"></div></template>`, "C:/mem/unknown-event.html", {
    vm: vmStub(),
  });
  assert.ok(collectCodes(unknown.linked.diags).includes("AU1103"), "expected AU1103 for unknown event");

  const known = compileMarkup(`<template><div click.trigger="doIt()"></div></template>`, "C:/mem/known-event.html", {
    vm: vmStub(),
  });
  assert.ok(!collectCodes(known.linked.diags).includes("AU1103"), "known event should not emit AU1103");
});

test("AU1104: missing property target emits, known target does not", () => {
  const missing = compileMarkup(`<template><input notreal.bind="x" /></template>`, "C:/mem/missing-target.html", {
    vm: vmStub(),
  });
  assert.ok(collectCodes(missing.linked.diags).includes("AU1104"), "expected AU1104 for missing target");

  const ok = compileMarkup(`<template><input value.bind="x" /></template>`, "C:/mem/real-target.html", {
    vm: vmStub(),
  });
  assert.ok(!collectCodes(ok.linked.diags).includes("AU1104"), "known target should not emit AU1104");
});

test("AU1106: repeat tail option mismatch emits, known options do not", () => {
  const bad = compileMarkup(`<template><div repeat.for="item of items; nope.bind: val"></div></template>`, "C:/mem/repeat-tail-bad.html", {
    vm: vmStub(),
  });
  assert.ok(collectCodes(bad.linked.diags).includes("AU1106"), "expected AU1106 for unknown repeat tail option");

  const good = compileMarkup(`<template><div repeat.for="item of items"></div></template>`, "C:/mem/repeat-tail-good.html", {
    vm: vmStub(),
  });
  assert.ok(!collectCodes(good.linked.diags).includes("AU1106"), "valid repeat header should not emit AU1106");
});

test("unknown au-slot bindable emits AU1104", () => {
  const html = `<template><au-slot nope.bind="x"></au-slot></template>`;
  const res = compileMarkup(html, "C:/mem/unknown-slot-bindable.html", { vm: vmStub() });
  assert.ok(collectCodes(res.linked.diags).includes("AU1104"));
});
