import { test, expect, describe, vi } from "vitest";
import { handleGetResources } from "@aurelia-ls/language-server/api";

/**
 * Property: origin classification is deterministic and complete.
 * Every resource gets exactly one origin based on: package field → origin field → default.
 *
 * Boundary: catalog resources → ResourceExplorerItem.origin
 *
 * Silent failure being tested: a resource with package set but no origin
 * could silently classify as "project" if detectOrigin checks origin before package.
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

describe("resource origin classification property", () => {
  test("resource with package field → origin 'package' regardless of origin field", () => {
    const ctx = createMockContext(createCatalog({
      elements: {
        "my-el": { name: "my-el", className: "MyEl", package: "my-plugin", origin: undefined, bindables: {} },
      },
    }));
    const result = handleGetResources(ctx as never);
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].origin).toBe("package");
  });

  test("resource with origin 'builtin' and no package → origin 'framework'", () => {
    const ctx = createMockContext(createCatalog({
      elements: {
        "au-slot": { name: "au-slot", className: "AuSlot", origin: "builtin", bindables: {} },
      },
    }));
    const result = handleGetResources(ctx as never);
    expect(result.resources[0].origin).toBe("framework");
  });

  test("resource with origin 'config' and no package → origin 'framework'", () => {
    const ctx = createMockContext(createCatalog({
      attributes: {
        "my-attr": { kind: "attribute", name: "my-attr", origin: "config", bindables: {} },
      },
    }));
    const result = handleGetResources(ctx as never);
    expect(result.resources[0].origin).toBe("framework");
  });

  test("resource with no origin and no package → origin 'project'", () => {
    const ctx = createMockContext(createCatalog({
      elements: {
        "my-el": { name: "my-el", className: "MyEl", file: "/src/my-el.ts", bindables: {} },
      },
    }));
    const result = handleGetResources(ctx as never);
    expect(result.resources[0].origin).toBe("project");
  });

  test("package field takes precedence over builtin origin", () => {
    // Router resources: origin may be "builtin" but they come from @aurelia/router package
    const ctx = createMockContext(createCatalog({
      elements: {
        "au-viewport": { name: "au-viewport", className: "AuViewport", origin: "builtin", package: "@aurelia/router", bindables: {} },
      },
    }));
    const result = handleGetResources(ctx as never);
    expect(result.resources[0].origin).toBe("package");
  });

  test("every resource in the catalog gets exactly one origin", () => {
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
    const validOrigins = ["project", "package", "framework"];
    for (const resource of result.resources) {
      expect(validOrigins).toContain(resource.origin);
    }
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
    expect(ifTC!.origin).toBe("framework");
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
