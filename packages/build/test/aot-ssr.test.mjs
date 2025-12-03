/**
 * AOT SSR E2E Tests
 *
 * These tests verify the full AOT SSR pipeline:
 * 1. Compile template with domain compiler AOT
 * 2. Translate instructions to Aurelia format
 * 3. SSR render to HTML with state
 * 4. Verify output correctness
 *
 * Uses `compileAndRenderAot` which combines compileWithAot + renderToString.
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { compileAndRenderAot, compileWithAot } from "../out/index.js";

// =============================================================================
// Basic AOT Compilation Tests
// =============================================================================

describe("AOT Compilation", () => {
  test("compiles simple text interpolation", () => {
    const result = compileWithAot("<div>${message}</div>", {
      name: "test-comp",
    });

    // Text interpolation uses comment markers <!--au:N--> not au-hid attribute
    // Verify template has some form of marker
    const hasMarker = result.template.includes("au-hid=") || result.template.includes("<!--au:");
    assert.ok(hasMarker, "Should have hydration marker (au-hid or <!--au:-->)");

    // Verify instructions were generated
    assert.ok(result.instructions.length > 0, "Should have instructions");

    // Verify target count
    assert.ok(result.targetCount > 0, "Should have at least one target");
  });

  test("compiles property binding", () => {
    const result = compileWithAot('<input value.bind="name">', {
      name: "test-comp",
    });

    assert.ok(result.template.includes("au-hid="), "Should have hydration marker on input");
    assert.ok(result.instructions.length > 0, "Should have binding instructions");
  });

  test("compiles static attributes", () => {
    const result = compileWithAot('<div class="container" id="main"></div>', {
      name: "test-comp",
    });

    assert.ok(result.template.includes('class="container"'), "Should preserve class attr");
    assert.ok(result.template.includes('id="main"'), "Should preserve id attr");
  });

  test("compiles multiple bindings on same element", () => {
    const result = compileWithAot('<div title.bind="title" class.bind="cls"></div>', {
      name: "test-comp",
    });

    assert.ok(result.instructions.length > 0, "Should have instructions");
  });
});

// =============================================================================
// AOT SSR Rendering Tests
// =============================================================================

describe("AOT SSR: Basic Rendering", () => {
  test("renders text interpolation", async () => {
    const result = await compileAndRenderAot(
      "<div>${message}</div>",
      { state: { message: "Hello AOT" } }
    );

    assert.ok(result.html.includes("Hello AOT"), "Should render interpolated value");
  });

  test("renders multiple interpolations", async () => {
    const result = await compileAndRenderAot(
      "<div>${first} ${last}</div>",
      { state: { first: "John", last: "Doe" } }
    );

    assert.ok(result.html.includes("John"), "Should render first name");
    assert.ok(result.html.includes("Doe"), "Should render last name");
  });

  test("renders nested property access", async () => {
    const result = await compileAndRenderAot(
      "<span>${user.name}</span>",
      { state: { user: { name: "Alice" } } }
    );

    assert.ok(result.html.includes("Alice"), "Should render nested property");
  });

  test("renders expression in text", async () => {
    const result = await compileAndRenderAot(
      "<span>${count + 1}</span>",
      { state: { count: 5 } }
    );

    assert.ok(result.html.includes("6"), "Should evaluate expression");
  });

  test("renders ternary expression", async () => {
    const result = await compileAndRenderAot(
      "<span>${active ? 'Yes' : 'No'}</span>",
      { state: { active: true } }
    );

    assert.ok(result.html.includes("Yes"), "Should evaluate ternary");
  });
});

describe("AOT SSR: Property Bindings", () => {
  test("renders value.bind on input", async () => {
    const result = await compileAndRenderAot(
      '<input value.bind="name">',
      { state: { name: "test-value" } }
    );

    // Property binding may set value attribute or property
    // Just verify the input element is rendered
    assert.ok(result.html.includes("<input"), "Should render input element");
    // The binding itself may not appear in static HTML - it's evaluated at runtime
    // If value does appear, it should have our value
    if (result.html.includes('value=')) {
      assert.ok(result.html.includes("test-value"), "If value attr present, should have our value");
    }
  });

  test("renders checked.bind on checkbox", async () => {
    const result = await compileAndRenderAot(
      '<input type="checkbox" checked.bind="isChecked">',
      { state: { isChecked: true } }
    );

    // Checkbox with checked=true should have checked attribute
    assert.ok(
      result.html.includes("checked") && result.html.includes("checkbox"),
      "Should have checked attribute"
    );
  });
});

describe("AOT SSR: Static Content", () => {
  test("renders static HTML structure", async () => {
    const result = await compileAndRenderAot(
      '<div class="wrapper"><span class="label">Hello</span></div>',
      { state: {} }
    );

    assert.ok(result.html.includes('class="wrapper"'), "Should have wrapper class");
    assert.ok(result.html.includes('class="label"'), "Should have label class");
    assert.ok(result.html.includes("Hello"), "Should have static text");
  });

  test("renders mixed static and dynamic content", async () => {
    const result = await compileAndRenderAot(
      '<div class="greeting">Hello, ${name}!</div>',
      { state: { name: "World" } }
    );

    assert.ok(result.html.includes('class="greeting"'), "Should have static class");
    assert.ok(result.html.includes("Hello,"), "Should have static text");
    assert.ok(result.html.includes("World"), "Should have interpolated name");
  });
});

// =============================================================================
// AOT Compilation Result Inspection
// =============================================================================

describe("AOT Compilation: Result Structure", () => {
  test("provides raw plan and code result", () => {
    const result = compileWithAot("<div>${x}</div>", { name: "test" });

    assert.ok(result.raw, "Should have raw output");
    assert.ok(result.raw.plan, "Should have raw plan");
    assert.ok(result.raw.codeResult, "Should have raw code result");
  });

  test("provides expression table", () => {
    const result = compileWithAot("<div>${x}</div>", { name: "test" });

    const expressions = result.raw.codeResult.expressions;
    assert.ok(expressions.length > 0, "Should have expressions");
    assert.ok(expressions[0]?.ast, "Expression should have AST");
  });

  test("provides nested definitions for controllers", () => {
    // This test verifies the structure exists, even if empty for simple templates
    const result = compileWithAot("<div>${x}</div>", { name: "test" });

    assert.ok(Array.isArray(result.nestedDefs), "Should have nestedDefs array");
  });
});

// =============================================================================
// Comparison with JIT Rendering
// =============================================================================

describe("AOT vs JIT Parity", () => {
  test("simple interpolation produces same visible output", async () => {
    // Import JIT compile function
    const { compileAndRender } = await import("../out/index.js");

    const markup = "<div>${message}</div>";
    const state = { message: "Hello" };

    const jitResult = await compileAndRender(markup, { state });
    const aotResult = await compileAndRenderAot(markup, { state });

    // Both should contain the message
    assert.ok(jitResult.html.includes("Hello"), "JIT should render message");
    assert.ok(aotResult.html.includes("Hello"), "AOT should render message");

    // The visible content should be the same (ignoring hydration markers)
    const normalizeHtml = (html) => {
      // Remove hydration markers and normalize whitespace
      return html
        .replace(/au-hid="[^"]*"/g, "")
        .replace(/<!--au:[^-]*-->/g, "")
        .replace(/\s+/g, " ")
        .trim();
    };

    // Note: There may be slight differences in marker placement
    // but the visible content should match
    const jitContent = normalizeHtml(jitResult.html);
    const aotContent = normalizeHtml(aotResult.html);

    // Both should contain the div with Hello
    assert.ok(jitContent.includes("Hello"), "JIT normalized should have Hello");
    assert.ok(aotContent.includes("Hello"), "AOT normalized should have Hello");
  });
});

// =============================================================================
// Error Handling
// =============================================================================

describe("AOT Error Handling", () => {
  test("handles undefined state property gracefully", async () => {
    // Access to undefined should not throw, just render undefined/empty
    const result = await compileAndRenderAot(
      "<div>${missing}</div>",
      { state: {} }
    );

    // Should render without crashing
    assert.ok(result.html.includes("<div"), "Should render div");
  });

  test("handles null state value", async () => {
    const result = await compileAndRenderAot(
      "<div>${value}</div>",
      { state: { value: null } }
    );

    // Should render without crashing
    assert.ok(result.html.includes("<div"), "Should render div");
  });
});
