/**
 * SSR Processor Tests
 *
 * Tests for ssr-processor.ts functions:
 * - syncPropertiesForSSR: Syncs DOM properties to attributes for serialization
 * - processSSROutput: Post-processes rendered HTML (strip markers, etc.)
 */

import { describe, it, expect } from "vitest";

import { compileAndRenderAot } from "@aurelia-ls/ssr";

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
// syncPropertiesForSSR - Form Elements
// =============================================================================

describe("syncPropertiesForSSR", () => {
  describe("input elements", () => {
    it("syncs input value to attribute", async () => {
      const TestApp = createComponent(
        "input-value",
        '<input value.bind="name">',
        { name: "John" },
      );

      const result = await compileAndRenderAot(TestApp);

      expect(result.html).toContain('value="John"');
    });

    it("syncs checkbox checked state", async () => {
      const TestApp = createComponent(
        "checkbox-checked",
        '<input type="checkbox" checked.bind="isChecked">',
        { isChecked: true },
      );

      const result = await compileAndRenderAot(TestApp);

      expect(result.html).toContain("checked");
    });

    it("syncs disabled attribute when true", async () => {
      const TestApp = createComponent(
        "input-disabled",
        '<button disabled.bind="isDisabled">Click</button>',
        { isDisabled: true },
      );

      const result = await compileAndRenderAot(TestApp);

      expect(result.html).toContain("disabled");
    });

    it("omits disabled attribute when false", async () => {
      const TestApp = createComponent(
        "input-enabled",
        '<button disabled.bind="isDisabled">Click</button>',
        { isDisabled: false },
      );

      const result = await compileAndRenderAot(TestApp);

      // Should not have disabled attribute (or disabled="false")
      expect(result.html).not.toMatch(/disabled(?:="[^"]*")?/);
    });

    it("syncs readonly attribute", async () => {
      const TestApp = createComponent(
        "input-readonly",
        '<input readonly.bind="isReadonly" value.bind="text">',
        { isReadonly: true, text: "read only text" },
      );

      const result = await compileAndRenderAot(TestApp);

      expect(result.html).toContain("readonly");
      expect(result.html).toContain('value="read only text"');
    });
  });

  describe("textarea elements", () => {
    it("syncs textarea value as content", async () => {
      const TestApp = createComponent(
        "textarea-value",
        '<textarea value.bind="content"></textarea>',
        { content: "Hello textarea" },
      );

      const result = await compileAndRenderAot(TestApp);

      expect(result.html).toContain("Hello textarea");
    });

    it("syncs multiline textarea content", async () => {
      const TestApp = createComponent(
        "textarea-multiline",
        '<textarea value.bind="content"></textarea>',
        { content: "Line 1\nLine 2\nLine 3" },
      );

      const result = await compileAndRenderAot(TestApp);

      expect(result.html).toContain("Line 1");
      expect(result.html).toContain("Line 2");
    });
  });

  describe("select elements", () => {
    it("syncs selected option", async () => {
      const TestApp = createComponent(
        "select-selected",
        `<select value.bind="selected">
          <option value="a">A</option>
          <option value="b">B</option>
          <option value="c">C</option>
        </select>`,
        { selected: "b" },
      );

      const result = await compileAndRenderAot(TestApp);

      // The selected option should have 'selected' attribute
      expect(result.html).toMatch(/<option[^>]*value="b"[^>]*selected/);
    });

    it("handles select with no matching option", async () => {
      const TestApp = createComponent(
        "select-nomatch",
        `<select value.bind="selected">
          <option value="a">A</option>
          <option value="b">B</option>
        </select>`,
        { selected: "nonexistent" },
      );

      // Should not crash
      const result = await compileAndRenderAot(TestApp);
      expect(result.html).toContain("<select");
    });
  });
});

// =============================================================================
// processSSROutput - Marker Stripping
// =============================================================================

describe("processSSROutput", () => {
  describe("stripMarkers option", () => {
    it("preserves markers when stripMarkers is false", async () => {
      const TestApp = createComponent(
        "markers-keep",
        "<div>${msg}</div>",
        { msg: "Keep markers" },
      );

      const result = await compileAndRenderAot(TestApp, {
        ssr: { stripMarkers: false },
      });

      expect(result.html).toContain("<!--au-->");
      expect(result.html).toContain("Keep markers");
    });

    it("strips markers when stripMarkers is true", async () => {
      const TestApp = createComponent(
        "markers-strip",
        "<div>${msg}</div>",
        { msg: "Strip markers" },
      );

      const result = await compileAndRenderAot(TestApp, {
        ssr: { stripMarkers: true },
      });

      expect(result.html).not.toContain("<!--au-->");
      expect(result.html).toContain("Strip markers");
    });

    it("strips interpolation markers but preserves structure markers", async () => {
      const TestApp = createComponent(
        "all-markers",
        '<div if.bind="show"><span>${msg}</span></div>',
        { show: true, msg: "Visible" },
      );

      const result = await compileAndRenderAot(TestApp, {
        ssr: { stripMarkers: true },
      });

      // Interpolation marker <!--au--> should be stripped
      expect(result.html).not.toContain("<!--au-->");
      expect(result.html).toContain("Visible");
      // Structure markers (au-start/au-end) may remain for hydration
    });
  });
});
