import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT } from "../../../out/compiler/language/registry.js";
import { deepMergeSemantics } from "../../_helpers/semantics-merge.mjs";
import { compileMarkup, vmStub } from "../../_helpers/facade-harness.mjs";

// Custom Semantics to simulate a real project element registry.
const semanticsWithNameTag = deepMergeSemantics(DEFAULT, {
  resources: {
    elements: {
      "name-tag": {
        kind: "element",
        name: "name-tag",
        aliases: ["nameTag"],
        bindables: {
          firstName: { name: "firstName", type: { kind: "ts", name: "string" } },
          lastName: { name: "lastName", type: { kind: "ts", name: "string" } },
        },
      },
    },
  },
});

test("facade query exposes custom element bindables from Semantics", () => {
  // Use a template that binds to a custom element discovered via Semantics.
  const html = `<template>
  <name-tag first-name.bind="userName" last-name.bind="userLast"></name-tag>
</template>`;

  // Step 1: compile with custom Semantics so the linker knows about <name-tag>.
  const { query, linked } = compileMarkup(html, "C:/mem/custom-element.html", {
    semantics: semanticsWithNameTag,
    vm: vmStub({ getRootVmTypeExpr: () => "App" }),
  });

  // Step 2: locate the custom element node in the template.
  const nodeOffset = html.indexOf("<name-tag") + 2;
  const node = query.nodeAt(nodeOffset);
  assert.ok(node, "should locate the custom element node");
  assert.equal(node?.hostKind, "custom");

  // Step 3: surface bindables for that node (intellisense-style payload).
  const bindables = node ? query.bindablesFor(node) : null;
  assert.ok(bindables && bindables.length >= 2, "should surface bindables for the custom element");

  const first = bindables?.find((b) => b.name === "firstName");
  assert.ok(first, "expected firstName bindable");
  assert.equal(first?.source, "component");
  assert.equal(first?.type, "string");

  const last = bindables?.find((b) => b.name === "lastName");
  assert.ok(last, "expected lastName bindable");
  assert.equal(last?.type, "string");

  const unknownHtml = `<template><name-tag prop.bind="x"></name-tag></template>`;
  const { linked: linkedUnknown } = compileMarkup(unknownHtml, "C:/mem/custom-element-unknown.html", {
    semantics: semanticsWithNameTag,
    vm: vmStub(),
  });
  // Step 4: unknown bindable on the custom element should produce AU1104.
  const missingDiag = linkedUnknown.diags.find((d) => d.code === "AU1104");
  assert.ok(missingDiag, "expected AU1104 diagnostic for unknown bindable");
});

test("custom element semantics toggle diagnostics on/off", () => {
  const html = `<template><name-tag first-name.bind="userName"></name-tag></template>`;

  const defaultSemantics = compileMarkup(html, "C:/mem/name-tag-default.html", {
    semantics: DEFAULT,
    vm: vmStub(),
  });
  assert.ok(defaultSemantics.linked.diags.some((d) => d.code === "AU1104"), "default semantics should flag unknown bindable");

  const customSemantics = compileMarkup(html, "C:/mem/name-tag-custom.html", {
    semantics: semanticsWithNameTag,
    vm: vmStub(),
  });
  assert.ok(!customSemantics.linked.diags.some((d) => d.code === "AU1104"), "custom semantics should suppress AU1104 for known bindable");
});

test("custom semantics merge retains defaults elsewhere", () => {
  const html = `<template><input value.bind="user.name" /></template>`;
  const res = compileMarkup(html, "C:/mem/merge-defaults.html", { semantics: semanticsWithNameTag, vm: vmStub() });
  assert.equal(res.linked.diags.length, 0);
});
