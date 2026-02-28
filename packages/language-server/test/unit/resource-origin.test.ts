import { test, expect, describe, vi } from "vitest";
import { handleGetResources } from "@aurelia-ls/language-server/api";

/**
 * Property: origin passthrough is faithful to compiler's ResourceOrigin.
 * The language server passes through the compiler's origin field without
 * display-layer mapping. Display grouping (project/package/framework)
 * is the VS Code extension's concern.
 *
 * Boundary: catalog resources → ResourceExplorerItem.origin
 */

function createCatalog(resources: {
  elements?: Record<string, Record<string, unknown>>;
  attributes?: Record<string, Record<string, unknown>>;
  controllers?: Record<string, Record<string, unknown>>;
  valueConverters?: Record<string, Record<string, unknown>>;
  bindingBehaviors?: Record<string, Record<string, unknown>>;
}) {
  return {
    resources: {
      elements: resources.elements ?? {},
      attributes: resources.attributes ?? {},
      controllers: resources.controllers ?? {},
      valueConverters: resources.valueConverters ?? {},
      bindingBehaviors: resources.bindingBehaviors ?? {},
    },
    gapsByResource: {},
  };
}

function createMockContext(catalog: ReturnType<typeof createCatalog>, semantics: Record<string, unknown> = {}) {
  return {
    logger: { log: vi.fn(), info: vi.fn(), error: vi.fn(), warn: vi.fn() },
    workspace: {
      refresh: vi.fn(),
      snapshot: vi.fn(() => ({
        meta: { fingerprint: "test" },
        catalog,
        semantics: { elements: {}, attributes: {}, controllers: {}, valueConverters: {}, bindingBehaviors: {}, ...semantics },
        resourceGraph: null,
      })),
      templates: [],
      inlineTemplates: [],
    },
  };
}

describe("resource origin passthrough", () => {
  test("resource with package field passes through compiler origin as-is", () => {
    const ctx = createMockContext(createCatalog({
      elements: {
        "my-el": { name: "my-el", className: "MyEl", package: "my-plugin", origin: undefined, bindables: {} },
      },
    }));
    const result = handleGetResources(ctx as never);
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].origin).toBeUndefined();
    expect(result.resources[0].package).toBe("my-plugin");
  });

  test("builtin origin is passed through", () => {
    const ctx = createMockContext(createCatalog({
      elements: {
        "au-slot": { name: "au-slot", className: "AuSlot", origin: "builtin", bindables: {} },
      },
    }));
    const result = handleGetResources(ctx as never);
    expect(result.resources[0].origin).toBe("builtin");
  });

  test("config origin is passed through", () => {
    const ctx = createMockContext(createCatalog({
      attributes: {
        "my-attr": { kind: "attribute", name: "my-attr", origin: "config", bindables: {} },
      },
    }));
    const result = handleGetResources(ctx as never);
    expect(result.resources[0].origin).toBe("config");
  });

  test("resource with no origin passes through as undefined", () => {
    const ctx = createMockContext(createCatalog({
      elements: {
        "my-el": { name: "my-el", className: "MyEl", file: "/src/my-el.ts", bindables: {} },
      },
    }));
    const result = handleGetResources(ctx as never);
    expect(result.resources[0].origin).toBeUndefined();
  });

  test("package field is available for consumer-side grouping", () => {
    const ctx = createMockContext(createCatalog({
      elements: {
        "au-viewport": { name: "au-viewport", className: "AuViewport", origin: "builtin", package: "@aurelia/router", bindables: {} },
      },
    }));
    const result = handleGetResources(ctx as never);
    expect(result.resources[0].origin).toBe("builtin");
    expect(result.resources[0].package).toBe("@aurelia/router");
  });

  test("every resource in the catalog is present in the response", () => {
    const ctx = createMockContext(createCatalog({
      elements: {
        "project-el": { name: "project-el", className: "ProjectEl", file: "/src/el.ts", bindables: {} },
        "package-el": { name: "package-el", className: "PackageEl", package: "some-pkg", bindables: {} },
        "builtin-el": { name: "builtin-el", className: "BuiltinEl", origin: "builtin", bindables: {} },
      },
      valueConverters: {
        "my-vc": { name: "my-vc", in: { kind: "any" }, out: { kind: "any" } },
      },
    }));
    const result = handleGetResources(ctx as never);
    expect(result.resources).toHaveLength(4);
  });
});

describe("template controller origin via attribute cross-reference", () => {
  test("TC origin is derived from AttrRes entry when ControllerConfig lacks origin", () => {
    const ctx = createMockContext(createCatalog({
      controllers: {
        "if": { name: "if", trigger: { kind: "value", prop: "value" }, scope: "overlay", props: {} },
      },
      attributes: {
        "if": { kind: "attribute", name: "if", isTemplateController: true, origin: "builtin", bindables: { value: { name: "value" } } },
      },
    }));
    const result = handleGetResources(ctx as never);
    const ifTC = result.resources.find((r) => r.name === "if" && r.kind === "template-controller");
    expect(ifTC).toBeDefined();
    expect(ifTC!.origin).toBe("builtin");
  });

  test("TC is not duplicated when present in both controllers and attributes", () => {
    const ctx = createMockContext(createCatalog({
      controllers: {
        "if": { name: "if", trigger: { kind: "value", prop: "value" }, scope: "overlay" },
      },
      attributes: {
        "if": { kind: "attribute", name: "if", isTemplateController: true, origin: "builtin", bindables: {} },
      },
    }));
    const result = handleGetResources(ctx as never);
    const ifResources = result.resources.filter((r) => r.name === "if");
    expect(ifResources).toHaveLength(1);
  });
});
