/**
 * Meta Element Emission Tests
 *
 * Tests that template meta elements (<import>, <bindable>, <containerless>, etc.)
 * are properly wired through the analysis pipeline and emitted in SerializedDefinition.
 */

import { describe, it, expect } from "vitest";
import {
  lowerDocument,
  resolveHost, buildSemanticsSnapshot,
  bindScopes,
  planAot,
  emitAotCode,
  getExpressionParser,
  DEFAULT_SYNTAX,
  DEFAULT_SEMANTICS,
  DiagnosticsRuntime,
} from "@aurelia-ls/compiler";
import { noopModuleResolver } from "../../_helpers/test-utils.js";

// Run full pipeline: markup → SerializedDefinition
function compileTemplate(markup: string) {
  const exprParser = getExpressionParser();
  const diagnostics = new DiagnosticsRuntime();
  const ir = lowerDocument(markup, {
    attrParser: DEFAULT_SYNTAX,
    exprParser,
    file: "test.html",
    name: "test",
    catalog: DEFAULT_SEMANTICS.catalog,
    diagnostics: diagnostics.forSource("lower"),
  });
  const linked = resolveHost(ir, buildSemanticsSnapshot(DEFAULT_SEMANTICS), {
    moduleResolver: noopModuleResolver,
    templateFilePath: "test.html",
    diagnostics: diagnostics.forSource("resolve-host"),
  });
  const scope = bindScopes(linked, { diagnostics: diagnostics.forSource("bind") });
  const plan = planAot(linked, scope, { templateFilePath: "test.html" });
  const result = emitAotCode(plan, { name: "test" });
  return result.definition;
}

describe("Meta Element Emission", () => {
  describe("<containerless>", () => {
    it("emits containerless: true in definition", () => {
      const def = compileTemplate(`<containerless><div></div>`);
      expect(def.containerless).toBe(true);
    });

    it("does not emit containerless when absent", () => {
      const def = compileTemplate(`<div></div>`);
      expect(def.containerless).toBeUndefined();
    });
  });

  describe("<use-shadow-dom>", () => {
    it("emits shadowOptions with default mode", () => {
      const def = compileTemplate(`<use-shadow-dom><div></div>`);
      expect(def.shadowOptions).toEqual({ mode: "open" });
    });

    it("emits shadowOptions with explicit open mode", () => {
      const def = compileTemplate(`<use-shadow-dom mode="open"><div></div>`);
      expect(def.shadowOptions).toEqual({ mode: "open" });
    });

    it("emits shadowOptions with closed mode", () => {
      const def = compileTemplate(`<use-shadow-dom mode="closed"><div></div>`);
      expect(def.shadowOptions).toEqual({ mode: "closed" });
    });

    it("does not emit shadowOptions when absent", () => {
      const def = compileTemplate(`<div></div>`);
      expect(def.shadowOptions).toBeUndefined();
    });
  });

  describe("<capture>", () => {
    it("emits capture: true in definition", () => {
      const def = compileTemplate(`<capture><div></div>`);
      expect(def.capture).toBe(true);
    });

    it("does not emit capture when absent", () => {
      const def = compileTemplate(`<div></div>`);
      expect(def.capture).toBeUndefined();
    });
  });

  describe("<alias>", () => {
    it("emits single alias", () => {
      const def = compileTemplate(`<alias name="my-alias"><div></div>`);
      expect(def.aliases).toEqual(["my-alias"]);
    });

    it("emits comma-separated aliases", () => {
      const def = compileTemplate(`<alias name="foo, bar, baz"><div></div>`);
      expect(def.aliases).toEqual(["foo", "bar", "baz"]);
    });

    it("emits aliases from multiple elements", () => {
      const def = compileTemplate(`<alias name="foo"><alias name="bar"><div></div>`);
      expect(def.aliases).toEqual(["foo", "bar"]);
    });

    it("does not emit aliases when absent", () => {
      const def = compileTemplate(`<div></div>`);
      expect(def.aliases).toBeUndefined();
    });
  });

  describe("<bindable>", () => {
    it("emits simple bindable", () => {
      const def = compileTemplate(`<bindable name="value"><div></div>`);
      expect(def.bindables).toEqual([{ name: "value" }]);
    });

    it("emits bindable with mode", () => {
      const def = compileTemplate(`<bindable name="items" mode="two-way"><div></div>`);
      expect(def.bindables).toEqual([{ name: "items", mode: "two-way" }]);
    });

    it("emits bindable with attribute", () => {
      const def = compileTemplate(`<bindable name="selectedItem" attribute="selected-item"><div></div>`);
      expect(def.bindables).toEqual([{ name: "selectedItem", attribute: "selected-item" }]);
    });

    it("emits bindable with mode and attribute", () => {
      const def = compileTemplate(`<bindable name="value" mode="from-view" attribute="val"><div></div>`);
      expect(def.bindables).toEqual([{ name: "value", mode: "from-view", attribute: "val" }]);
    });

    it("emits multiple bindables", () => {
      const def = compileTemplate(`<bindable name="a"><bindable name="b" mode="one-time"><div></div>`);
      expect(def.bindables).toEqual([
        { name: "a" },
        { name: "b", mode: "one-time" },
      ]);
    });

    it("does not emit bindables when absent", () => {
      const def = compileTemplate(`<div></div>`);
      expect(def.bindables).toBeUndefined();
    });
  });

  describe("hasSlot", () => {
    it("emits hasSlot: true when slot is present", () => {
      const def = compileTemplate(`<div><slot></slot></div>`);
      expect(def.hasSlot).toBe(true);
    });

    it("emits hasSlot: true for named slot", () => {
      const def = compileTemplate(`<div><slot name="header"></slot></div>`);
      expect(def.hasSlot).toBe(true);
    });

    it("does not emit hasSlot when no slot", () => {
      const def = compileTemplate(`<div>content</div>`);
      expect(def.hasSlot).toBeUndefined();
    });
  });

  describe("combined meta elements", () => {
    it("emits all meta properties together", () => {
      const def = compileTemplate(`
        <containerless>
        <use-shadow-dom mode="closed">
        <alias name="my-el">
        <bindable name="value" mode="two-way">
        <div><slot></slot></div>
      `);

      expect(def.containerless).toBe(true);
      expect(def.shadowOptions).toEqual({ mode: "closed" });
      expect(def.aliases).toEqual(["my-el"]);
      expect(def.bindables).toEqual([{ name: "value", mode: "two-way" }]);
      expect(def.hasSlot).toBe(true);
    });
  });

  describe("template attribute form", () => {
    it("emits containerless from template attribute", () => {
      const def = compileTemplate(`<template containerless><div></div></template>`);
      expect(def.containerless).toBe(true);
    });

    it("emits shadowOptions from template attribute", () => {
      const def = compileTemplate(`<template use-shadow-dom><div></div></template>`);
      expect(def.shadowOptions).toEqual({ mode: "open" });
    });

    it("emits shadowOptions=closed from template attribute", () => {
      const def = compileTemplate(`<template use-shadow-dom="closed"><div></div></template>`);
      expect(def.shadowOptions).toEqual({ mode: "closed" });
    });

    it("emits bindables from template bindable attribute", () => {
      const def = compileTemplate(`<template bindable="firstName, lastName"><div></div></template>`);
      expect(def.bindables).toEqual([
        { name: "firstName" },
        { name: "lastName" },
      ]);
    });

    it("emits aliases from template alias attribute", () => {
      const def = compileTemplate(`<template alias="foo, bar"><div></div></template>`);
      expect(def.aliases).toEqual(["foo", "bar"]);
    });
  });

  describe("meta elements are stripped from DOM", () => {
    it("meta elements don't create hydration targets", () => {
      const def = compileTemplate(`
        <import from="./foo">
        <bindable name="value">
        <containerless>
        <div class="content"></div>
      `);

      // Only the <div> should create any targets (if it had bindings)
      // Meta elements should not contribute to target count
      expect(def.targetCount).toBe(0); // Just static div
    });
  });
});


