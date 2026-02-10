/**
 * Third-party resolution module tests.
 *
 * Tests for merge utilities, scan heuristics, and explicit resource building.
 */

import { describe, it, expect } from "vitest";
import {
  buildThirdPartyResources,
  hasThirdPartyResources,
  mergeResourceCollections,
  mergeScopeResources,
  shouldScanPackage,
} from "../../src/project-semantics/third-party/index.js";
import type { ResourceCollections } from "../../src/project-semantics/compiler.js";

// ============================================================================
// shouldScanPackage
// ============================================================================

describe("shouldScanPackage", () => {
  it("returns true for 'aurelia' package", async () => {
    expect(await shouldScanPackage("aurelia", "/fake")).toBe(true);
  });

  it("returns true for @aurelia/* scoped packages", async () => {
    expect(await shouldScanPackage("@aurelia/runtime-html", "/fake")).toBe(true);
    expect(await shouldScanPackage("@aurelia/router", "/fake")).toBe(true);
  });

  it("returns true for packages containing 'aurelia' in the name", async () => {
    expect(await shouldScanPackage("aurelia2-table", "/fake")).toBe(true);
    expect(await shouldScanPackage("my-aurelia-plugin", "/fake")).toBe(true);
  });

  it("returns false for unrelated packages with non-existent path", async () => {
    expect(await shouldScanPackage("lodash", "/non/existent/path")).toBe(false);
    expect(await shouldScanPackage("express", "/non/existent/path")).toBe(false);
  });
});

// ============================================================================
// hasThirdPartyResources
// ============================================================================

describe("hasThirdPartyResources", () => {
  it("returns false for empty object", () => {
    expect(hasThirdPartyResources({})).toBe(false);
  });

  it("returns false for collections with empty records", () => {
    expect(hasThirdPartyResources({ elements: {}, attributes: {} })).toBe(false);
  });

  it("returns true when elements are present", () => {
    expect(hasThirdPartyResources({
      elements: { "my-el": { kind: "element", name: "my-el", bindables: {} } },
    })).toBe(true);
  });

  it("returns true when attributes are present", () => {
    expect(hasThirdPartyResources({
      attributes: { "my-attr": { kind: "attribute", name: "my-attr", bindables: {} } },
    })).toBe(true);
  });

  it("returns true when value converters are present", () => {
    expect(hasThirdPartyResources({
      valueConverters: { "slugify": { name: "slugify", in: { kind: "unknown" }, out: { kind: "unknown" } } },
    })).toBe(true);
  });
});

// ============================================================================
// buildThirdPartyResources
// ============================================================================

describe("buildThirdPartyResources", () => {
  it("returns empty object for undefined config", () => {
    const result = buildThirdPartyResources(undefined);
    expect(hasThirdPartyResources(result)).toBe(false);
  });

  it("returns empty object for empty config", () => {
    const result = buildThirdPartyResources({});
    expect(hasThirdPartyResources(result)).toBe(false);
  });

  it("builds elements with bindables", () => {
    const result = buildThirdPartyResources({
      elements: {
        "my-element": {
          bindables: {
            value: {
              property: "displayData",
              attribute: "display-data",
              mode: "two-way",
              primary: true,
              type: "DisplayData",
              doc: "Display payload",
            },
            label: {},
          },
        },
      },
    });
    expect(result.elements).toBeDefined();
    const el = result.elements!["my-element"];
    expect(el).toBeDefined();
    expect(el!.name).toBe("my-element");
    expect(el!.bindables["displayData"]!.attribute).toBe("display-data");
    expect(el!.bindables["displayData"]!.mode).toBe("twoWay");
    expect(el!.bindables["displayData"]!.primary).toBe(true);
    expect(el!.bindables["displayData"]!.type).toEqual({ kind: "ts", name: "DisplayData" });
    expect(el!.bindables["displayData"]!.doc).toBe("Display payload");
    expect(el!.bindables["label"]!.name).toBe("label");
    expect(el!.bindables["label"]!.mode).toBeUndefined();
  });

  it("normalizes bindable type aliases for any and unknown", () => {
    const result = buildThirdPartyResources({
      elements: {
        "typed-el": {
          bindables: {
            anyProp: { type: "any" },
            unknownProp: { type: "unknown" },
          },
        },
      },
    });

    const el = result.elements!["typed-el"]!;
    expect(el.bindables["anyProp"]!.type).toEqual({ kind: "any" });
    expect(el.bindables["unknownProp"]!.type).toEqual({ kind: "unknown" });
  });

  it("builds attributes with template controller flag", () => {
    const result = buildThirdPartyResources({
      attributes: {
        "my-if": {
          bindables: {
            condition: {
              property: "condition",
              attribute: "if",
              mode: "to-view",
              primary: true,
              type: "boolean",
              doc: "Template branch condition",
            },
          },
          isTemplateController: true,
        },
      },
    });
    const attr = result.attributes!["my-if"];
    expect(attr).toBeDefined();
    expect(attr!.name).toBe("my-if");
    expect((attr as any).isTemplateController).toBe(true);
    expect(attr!.bindables["condition"]!.attribute).toBe("if");
    expect(attr!.bindables["condition"]!.mode).toBe("toView");
    expect(attr!.bindables["condition"]!.primary).toBe(true);
    expect(attr!.bindables["condition"]!.type).toEqual({ kind: "ts", name: "boolean" });
    expect(attr!.bindables["condition"]!.doc).toBe("Template branch condition");
  });

  it("builds value converters", () => {
    const result = buildThirdPartyResources({
      valueConverters: ["slugify", "titlecase"],
    });
    expect(result.valueConverters).toBeDefined();
    expect(result.valueConverters!["slugify"]).toBeDefined();
    expect(result.valueConverters!["titlecase"]).toBeDefined();
  });

  it("builds binding behaviors", () => {
    const result = buildThirdPartyResources({
      bindingBehaviors: ["debounce", "throttle"],
    });
    expect(result.bindingBehaviors).toBeDefined();
    expect(result.bindingBehaviors!["debounce"]!.name).toBe("debounce");
    expect(result.bindingBehaviors!["throttle"]!.name).toBe("throttle");
  });

  it("normalizes resource names to lowercase", () => {
    const result = buildThirdPartyResources({
      elements: { "MyElement": { bindables: {} } },
      attributes: { "MyAttr": {} },
    });
    expect(result.elements!["myelement"]).toBeDefined();
    expect(result.attributes!["myattr"]).toBeDefined();
  });

  it("converts all binding mode strings", () => {
    const result = buildThirdPartyResources({
      elements: {
        "test-el": {
          bindables: {
            a: { mode: "one-time" },
            b: { mode: "to-view" },
            c: { mode: "from-view" },
            d: { mode: "two-way" },
          },
        },
      },
    });
    const el = result.elements!["test-el"]!;
    expect(el.bindables["a"]!.mode).toBe("oneTime");
    expect(el.bindables["b"]!.mode).toBe("toView");
    expect(el.bindables["c"]!.mode).toBe("fromView");
    expect(el.bindables["d"]!.mode).toBe("twoWay");
  });
});

// ============================================================================
// mergeResourceCollections
// ============================================================================

describe("mergeResourceCollections", () => {
  const base: ResourceCollections = {
    elements: { "el-a": { kind: "element", name: "el-a", bindables: {} } },
    attributes: { "attr-a": { kind: "attribute", name: "attr-a", bindables: {} } },
    controllers: {},
    valueConverters: {},
    bindingBehaviors: {},
  };

  it("returns base when extra is empty", () => {
    const result = mergeResourceCollections(base, {});
    expect(result.elements).toBe(base.elements);
    expect(result.attributes).toBe(base.attributes);
  });

  it("merges extra elements into base", () => {
    const extra = {
      elements: { "el-b": { kind: "element" as const, name: "el-b", bindables: {} } },
    };
    const result = mergeResourceCollections(base, extra);
    expect(result.elements["el-a"]).toBeDefined();
    expect(result.elements["el-b"]).toBeDefined();
  });

  it("extra overrides base for same key", () => {
    const extra = {
      elements: { "el-a": { kind: "element" as const, name: "el-a-override", bindables: { x: { name: "x" } } } },
    };
    const result = mergeResourceCollections(base, extra);
    expect(result.elements["el-a"]!.name).toBe("el-a-override");
  });

  it("merges explicit bindable fields into resolved collections", () => {
    const baseWithBindable: ResourceCollections = {
      elements: {
        "el-a": {
          kind: "element",
          name: "el-a",
          bindables: {
            displayData: {
              name: "displayData",
              mode: "toView",
            },
          },
        },
      },
      attributes: {},
      controllers: {},
      valueConverters: {},
      bindingBehaviors: {},
    };

    const extra = buildThirdPartyResources({
      elements: {
        "el-a": {
          bindables: {
            displayData: {
              mode: "two-way",
              primary: true,
              attribute: "display-data",
              type: "DisplayData",
              doc: "Payload from explicit config",
            },
          },
        },
      },
    });

    const result = mergeResourceCollections(baseWithBindable, extra);
    const bindable = result.elements["el-a"]!.bindables["displayData"]!;
    expect(bindable.name).toBe("displayData");
    expect(bindable.attribute).toBe("display-data");
    expect(bindable.mode).toBe("twoWay");
    expect(bindable.primary).toBe(true);
    expect(bindable.type).toEqual({ kind: "ts", name: "DisplayData" });
    expect(bindable.doc).toBe("Payload from explicit config");
  });
});

// ============================================================================
// mergeScopeResources
// ============================================================================

describe("mergeScopeResources", () => {
  it("handles undefined base", () => {
    const extra = {
      elements: { "el-a": { kind: "element" as const, name: "el-a", bindables: {} } },
    };
    const result = mergeScopeResources(undefined, extra);
    expect(result.elements!["el-a"]).toBeDefined();
  });

  it("merges attributes from both sides", () => {
    const base = {
      attributes: { "a": { kind: "attribute" as const, name: "a", bindables: {} } },
    };
    const extra = {
      attributes: { "b": { kind: "attribute" as const, name: "b", bindables: {} } },
    };
    const result = mergeScopeResources(base, extra);
    expect(result.attributes!["a"]).toBeDefined();
    expect(result.attributes!["b"]).toBeDefined();
  });
});
