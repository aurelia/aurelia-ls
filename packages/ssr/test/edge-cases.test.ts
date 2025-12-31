/**
 * SSR Edge Case Tests
 *
 * Tests for edge cases and boundary conditions:
 * - Empty collections in repeat.for
 * - Null/undefined values
 * - Deeply nested conditionals
 * - Mixed template controllers
 * - Large collections
 */

import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";

import { compileAndRenderAot, compileWithAot } from "@aurelia-ls/ssr";
import { createComponent, countOccurrences } from "./_helpers/test-utils.js";

// =============================================================================
// Empty Collections
// =============================================================================

describe("SSR Edge Cases: Empty Collections", () => {
  it("renders empty repeat.for gracefully", async () => {
    const TestApp = createComponent(
      "test-app",
      '<ul><li repeat.for="item of items" class="item">${item}</li></ul>',
      { items: [] },
    );

    const result = await compileAndRenderAot(TestApp);

    // Should render the ul but no li elements
    expect(result.html).toContain("<ul");
    expect(result.html).toContain("</ul>");
    expect(result.html).not.toContain("<li");
  });

  it("renders if.bind around empty repeat correctly", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div>
        <ul if.bind="items.length > 0">
          <li repeat.for="item of items" class="item">\${item}</li>
        </ul>
        <p if.bind="items.length === 0" class="empty">No items</p>
      </div>`,
      { items: [] },
    );

    const result = await compileAndRenderAot(TestApp);

    // Should render the empty message, not the list
    expect(result.html).toContain("No items");
    expect(result.html).not.toContain("<ul");
  });

  it("manifest is correct for empty repeat", async () => {
    const TestApp = createComponent(
      "test-app",
      '<div repeat.for="item of items">${item}</div>',
      { items: [] },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.manifest).toBeTruthy();

    // Find the repeat in manifest
    const rootScope = result.manifest.manifest;
    const repeatChild = rootScope.children?.find(
      (child: any) => child.type === "repeat",
    );

    expect(repeatChild).toBeTruthy();
    // Empty repeat should have empty views array
    expect(repeatChild?.views).toEqual([]);
  });
});

// =============================================================================
// Null/Undefined Values
// =============================================================================

describe("SSR Edge Cases: Null/Undefined Values", () => {
  it("renders 'undefined' text for undefined interpolation", async () => {
    const TestApp = createComponent(
      "test-app",
      '<span>${missingValue}</span>',
      {}, // missingValue not defined
    );

    const result = await compileAndRenderAot(TestApp);

    // Aurelia renders undefined values as "undefined" text
    // NOTE: This may be undesirable UX - consider rendering empty string instead
    expect(result.html).toContain("<span");
    expect(result.html).toContain("undefined");
  });

  it("renders 'null' text for null interpolation", async () => {
    const TestApp = createComponent(
      "test-app",
      '<span>${nullValue}</span>',
      { nullValue: null },
    );

    const result = await compileAndRenderAot(TestApp);

    // Aurelia renders null values as "null" text
    // NOTE: This may be undesirable UX - consider rendering empty string instead
    expect(result.html).toContain("<span");
    expect(result.html).toContain("null");
  });

  it("handles undefined in if.bind", async () => {
    const TestApp = createComponent(
      "test-app",
      '<div if.bind="maybeValue">Has value</div>',
      { maybeValue: undefined },
    );

    const result = await compileAndRenderAot(TestApp);

    // Undefined is falsy, so content should not render
    expect(result.html).not.toContain(">Has value<");
  });

  it("treats null as empty collection in repeat.for", async () => {
    const TestApp = createComponent(
      "test-app",
      '<div repeat.for="item of items">${item}</div>',
      { items: null },
    );

    // Aurelia treats null/undefined as empty collection - renders markers only
    const result = await compileAndRenderAot(TestApp);

    // Should have hydration markers but no div content
    expect(result.html).toContain("<!--au-->");
    expect(result.html).not.toContain("<div");
  });

  it("renders 'undefined' for nested undefined access", async () => {
    const TestApp = createComponent(
      "test-app",
      '<span>${user.profile.name}</span>',
      { user: {} }, // profile is undefined
    );

    // Aurelia's expression evaluator returns undefined, which renders as "undefined" text
    // NOTE: This may be undesirable UX - consider rendering empty string instead
    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("<span");
    expect(result.html).toContain("undefined");
  });
});

// =============================================================================
// Deeply Nested Conditionals
// =============================================================================

describe("SSR Edge Cases: Deeply Nested Conditionals", () => {
  it("renders 3-level nested if.bind", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="level1">
        <div if.bind="level2" class="l2">
          <div if.bind="level3" class="l3">
            Deep content
          </div>
        </div>
      </div>`,
      { level1: true, level2: true, level3: true },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Deep content");
    expect(result.html).toContain('class="l3"');
  });

  it("renders only up to false level", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="level1">
        Level 1
        <div if.bind="level2" class="l2">
          Level 2
          <div if.bind="level3" class="l3">
            Level 3
          </div>
        </div>
      </div>`,
      { level1: true, level2: false, level3: true },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Level 1");
    expect(result.html).not.toContain("Level 2");
    expect(result.html).not.toContain("Level 3");
  });

  it("renders if inside repeat inside if", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="showList">
        <ul>
          <li repeat.for="item of items">
            <span if.bind="item.visible" class="visible">\${item.text}</span>
            <span else class="hidden">Hidden</span>
          </li>
        </ul>
      </div>`,
      {
        showList: true,
        items: [
          { text: "A", visible: true },
          { text: "B", visible: false },
          { text: "C", visible: true },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    expect(doc.querySelectorAll(".visible").length).toBe(2);
    expect(doc.querySelectorAll(".hidden").length).toBe(1);

    expect(result.html).toContain(">A<");
    expect(result.html).toContain(">C<");
    expect(result.html).toContain(">Hidden<");

    dom.window.close();
  });
});

// =============================================================================
// Mixed Template Controllers
// =============================================================================

describe("SSR Edge Cases: Mixed Template Controllers", () => {
  // Note: Multiple template controllers on the same element is an edge case.
  // The behavior depends on attribute order (first TC wraps subsequent ones).
  // This is generally discouraged in favor of <template> wrappers.

  it.skip("renders if and repeat on same element (if first)", async () => {
    // SKIPPED: Multiple TCs on same element may not compile correctly in AOT.
    // Use nested elements or <template> instead: <template if.bind="show"><div repeat.for...>
    const TestApp = createComponent(
      "test-app",
      `<div if.bind="show" repeat.for="item of items" class="item">\${item}</div>`,
      { show: true, items: ["A", "B", "C"] },
    );

    const result = await compileAndRenderAot(TestApp);

    const itemCount = countOccurrences(result.html, 'class="item"');
    expect(itemCount).toBe(3);
  });

  it("renders repeat with nested if/else", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div repeat.for="item of items">
        <span if.bind="item.type === 'good'" class="good">\${item.name} is good</span>
        <span else class="bad">\${item.name} is bad</span>
      </div>`,
      {
        items: [
          { name: "Apple", type: "good" },
          { name: "Bug", type: "bad" },
          { name: "Cake", type: "good" },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    expect(doc.querySelectorAll(".good").length).toBe(2);
    expect(doc.querySelectorAll(".bad").length).toBe(1);

    expect(result.html).toContain("Apple is good");
    expect(result.html).toContain("Bug is bad");
    expect(result.html).toContain("Cake is good");

    dom.window.close();
  });

  it("renders nested repeats", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div repeat.for="group of groups" class="group">
        <h3>\${group.name}</h3>
        <span repeat.for="item of group.items" class="item">\${item}</span>
      </div>`,
      {
        groups: [
          { name: "Group 1", items: ["A", "B"] },
          { name: "Group 2", items: ["C", "D", "E"] },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    expect(doc.querySelectorAll(".group").length).toBe(2);
    expect(doc.querySelectorAll(".item").length).toBe(5);

    expect(result.html).toContain("Group 1");
    expect(result.html).toContain("Group 2");
    expect(result.html).toContain(">A<");
    expect(result.html).toContain(">E<");

    dom.window.close();
  });
});

// =============================================================================
// Large Collections
// =============================================================================

describe("SSR Edge Cases: Large Collections", () => {
  it("renders 100 items efficiently", async () => {
    const items = Array.from({ length: 100 }, (_, i) => `Item ${i + 1}`);

    const TestApp = createComponent(
      "test-app",
      '<div repeat.for="item of items" class="item">${item}</div>',
      { items },
    );

    const start = Date.now();
    const result = await compileAndRenderAot(TestApp);
    const duration = Date.now() - start;

    const itemCount = countOccurrences(result.html, 'class="item"');
    expect(itemCount).toBe(100);

    // Should complete reasonably fast (under 5 seconds)
    expect(duration).toBeLessThan(5000);
  });

  it("renders 100 items with nested content", async () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      active: i % 2 === 0,
    }));

    const TestApp = createComponent(
      "test-app",
      `<div repeat.for="item of items" class="item">
        <span class="id">\${item.id}</span>
        <span class="name">\${item.name}</span>
        <span if.bind="item.active" class="active">Active</span>
      </div>`,
      { items },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    expect(doc.querySelectorAll(".item").length).toBe(100);
    // Half should be active
    expect(doc.querySelectorAll(".active").length).toBe(50);

    dom.window.close();
  });
});

// =============================================================================
// Boolean Attributes
// =============================================================================

describe("SSR Edge Cases: Boolean Attributes", () => {
  it("renders hidden attribute", async () => {
    const TestApp = createComponent(
      "test-app",
      '<div hidden.bind="isHidden">Content</div>',
      { isHidden: true },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const div = dom.window.document.querySelector("div");

    expect(div?.hasAttribute("hidden")).toBe(true);
    dom.window.close();
  });

  it("renders required attribute", async () => {
    const TestApp = createComponent(
      "test-app",
      '<input type="text" required.bind="isRequired">',
      { isRequired: true },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const input = dom.window.document.querySelector("input");

    expect(input?.hasAttribute("required")).toBe(true);
    dom.window.close();
  });

  it("renders multiple boolean attributes correctly", async () => {
    const TestApp = createComponent(
      "test-app",
      '<button disabled.bind="isDisabled" hidden.bind="isHidden">Click</button>',
      { isDisabled: true, isHidden: false },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const button = dom.window.document.querySelector("button");

    expect(button?.hasAttribute("disabled")).toBe(true);
    expect(button?.hasAttribute("hidden")).toBe(false);
    dom.window.close();
  });
});

// =============================================================================
// Special Characters
// =============================================================================

describe("SSR Edge Cases: Special Characters", () => {
  it("escapes HTML entities in interpolation", async () => {
    const TestApp = createComponent(
      "test-app",
      '<div>${content}</div>',
      { content: "<b>bold</b> & <i>italic</i>" },
    );

    const result = await compileAndRenderAot(TestApp);

    // Should escape the HTML tags
    expect(result.html).not.toContain("<b>bold</b>");
    expect(result.html).toContain("&lt;b&gt;");
  });

  it("handles unicode in interpolation", async () => {
    const TestApp = createComponent(
      "test-app",
      '<div>${message}</div>',
      { message: "Hello 世界! 🌍" },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Hello");
    expect(result.html).toContain("世界");
    // Emoji may or may not be preserved depending on encoding
  });

  it("handles newlines in interpolation", async () => {
    const TestApp = createComponent(
      "test-app",
      '<pre>${text}</pre>',
      { text: "Line 1\nLine 2\nLine 3" },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Line 1");
    expect(result.html).toContain("Line 2");
    expect(result.html).toContain("Line 3");
  });
});

// =============================================================================
// Template Structure Edge Cases
// =============================================================================

describe("SSR Edge Cases: Template Structure", () => {
  it("handles empty template", async () => {
    const TestApp = createComponent(
      "test-app",
      "",
      {},
    );

    const result = await compileAndRenderAot(TestApp);

    // Should not crash on empty template
    expect(result.html).toBeDefined();
  });

  it("handles template with only whitespace", async () => {
    const TestApp = createComponent(
      "test-app",
      "   \n   \t   ",
      {},
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toBeDefined();
  });

  it("handles template with only comments", async () => {
    const TestApp = createComponent(
      "test-app",
      "<!-- This is a comment -->",
      {},
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toBeDefined();
  });
});
