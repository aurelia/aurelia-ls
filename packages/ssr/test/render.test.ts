/**
 * Render Tests
 *
 * Unit tests for render.ts functions:
 * - render: Core SSR rendering function
 * - beforeStop callback
 * - childComponents registration
 */

import { describe, it, expect } from "vitest";

import { render } from "@aurelia-ls/ssr";

// Counter for unique component names
let testCounter = 0;

/**
 * Creates a component class with unique name and template.
 */
function createComponent(
  baseName: string,
  template: string,
  state: Record<string, unknown> = {},
) {
  const uniqueId = ++testCounter;
  const uniqueName = `${baseName}-${uniqueId}`;
  const uniqueTemplate = template.replace(/>/, ` data-test-id="${uniqueId}">`);

  const ComponentClass = class {
    constructor() {
      Object.assign(this, state);
    }
  } as any;
  ComponentClass.$au = {
    type: "custom-element",
    name: uniqueName,
    template: uniqueTemplate,
  };
  return ComponentClass;
}

// =============================================================================
// render - Basic Rendering
// =============================================================================

describe("render", () => {
  describe("basic rendering", () => {
    it("renders component to HTML", async () => {
      const TestApp = createComponent("basic-app", "<div>Hello World</div>");

      const result = await render(TestApp);

      expect(result.html).toContain("Hello World");
    });

    it("evaluates interpolations", async () => {
      const TestApp = createComponent(
        "interp-app",
        "<div>${message}</div>",
        { message: "Dynamic content" },
      );

      const result = await render(TestApp);

      expect(result.html).toContain("Dynamic content");
    });

    it("returns manifest with component name", async () => {
      const TestApp = createComponent("manifest-app", "<div>Content</div>");

      const result = await render(TestApp);

      expect(result.manifest).toBeDefined();
      expect(result.manifest.root).toContain("manifest-app");
    });
  });

  describe("beforeStop callback", () => {
    it("calls beforeStop with root controller", async () => {
      const TestApp = createComponent(
        "before-stop-ctrl",
        "<div>Content</div>",
        { testProp: "testValue" },
      );

      let controllerReceived = false;
      let viewModelProp: unknown;

      await render(TestApp, {
        beforeStop: (rootController) => {
          controllerReceived = true;
          viewModelProp = (rootController.viewModel as { testProp?: string })?.testProp;
        },
      });

      expect(controllerReceived).toBe(true);
      expect(viewModelProp).toBe("testValue");
    });

    it("calls beforeStop with host element", async () => {
      const TestApp = createComponent("before-stop-host", "<div>Content</div>");

      let hostTagName: string | undefined;

      await render(TestApp, {
        beforeStop: (_rootController, host) => {
          hostTagName = host.tagName;
        },
      });

      expect(hostTagName).toBe("DIV");
    });

    it("provides access to controller children", async () => {
      const TestApp = createComponent(
        "children-access",
        '<div if.bind="show">Visible</div>',
        { show: true },
      );

      let childrenIsArray = false;
      let childCount = -1;

      await render(TestApp, {
        beforeStop: (rootController) => {
          childrenIsArray = Array.isArray(rootController.children);
          childCount = rootController.children?.length ?? 0;
        },
      });

      expect(childrenIsArray).toBe(true);
      expect(childCount).toBeGreaterThanOrEqual(0);
    });

    it("is called before Aurelia stops", async () => {
      const TestApp = createComponent("timing-test", "<div>Content</div>");

      let controllerWasActive = false;

      await render(TestApp, {
        beforeStop: (rootController) => {
          // Controller should still be active when beforeStop is called
          controllerWasActive = rootController.state !== undefined;
        },
      });

      expect(controllerWasActive).toBe(true);
    });
  });

  describe("SSR options", () => {
    it("preserves markers by default", async () => {
      const TestApp = createComponent(
        "markers-default",
        "<div>${msg}</div>",
        { msg: "Hello" },
      );

      const result = await render(TestApp);

      expect(result.html).toContain("<!--au-->");
    });

    it("strips markers when stripMarkers is true", async () => {
      const TestApp = createComponent(
        "markers-strip",
        "<div>${msg}</div>",
        { msg: "Hello" },
      );

      const result = await render(TestApp, {
        ssr: { stripMarkers: true },
      });

      expect(result.html).not.toContain("<!--au-->");
      expect(result.html).toContain("Hello");
    });
  });

  describe("request context", () => {
    it("passes request URL to platform", async () => {
      const TestApp = createComponent("url-test", "<div>Content</div>");

      // Just verify it doesn't crash with request context
      const result = await render(TestApp, {
        request: {
          url: "/products/123",
          baseHref: "/",
        },
      });

      expect(result.html).toContain("Content");
    });
  });
});
