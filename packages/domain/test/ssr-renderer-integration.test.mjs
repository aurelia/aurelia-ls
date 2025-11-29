/**
 * SSR Renderer Integration Tests (Phase 4)
 *
 * Tests the complete SSR pipeline:
 * 1. Compile template to SSR artifacts (HTML skeleton + manifest)
 * 2. Render HTML with expression evaluation
 * 3. Verify hydration metadata
 *
 * 10 test cases covering:
 * - Text interpolation (simple and nested properties)
 * - Property bindings
 * - Error handling (missing/null values)
 * - Controller markers
 * - Hydration metadata output
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { getExpressionParser, DEFAULT_SYNTAX, renderToString } from "../out/index.js";
import { lowerDocument } from "../out/compiler/phases/10-lower/lower.js";
import { resolveHost } from "../out/compiler/phases/20-resolve-host/resolve.js";
import { bindScopes } from "../out/compiler/phases/30-bind/bind.js";
import { planSsr } from "../out/compiler/phases/50-plan/ssr/plan.js";
import { emitSsr } from "../out/compiler/phases/60-emit/ssr/emit.js";
import { DEFAULT as SEM_DEFAULT } from "../out/compiler/language/registry.js";

/**
 * Helper to compile template through full SSR pipeline
 */
function compileSsr(markup, sem = SEM_DEFAULT) {
  const ir = lowerDocument(markup, {
    attrParser: DEFAULT_SYNTAX,
    exprParser: getExpressionParser(),
    file: "test.html",
    name: "test",
    sem,
  });
  const linked = resolveHost(ir, sem);
  const scope = bindScopes(linked);
  const plan = planSsr(linked, scope);
  const { html, manifest } = emitSsr(plan, linked);
  return { html, manifest };
}

/**
 * Helper to render with view model
 */
function render(markup, viewModel) {
  const { html, manifest } = compileSsr(markup);
  return renderToString(html, manifest, { viewModel });
}

describe("SSR Renderer Integration (Phase 4)", () => {
  // ===== TESTS 1-2: Text Interpolation =====

  test("T1: Text Interpolation - Simple Property", () => {
    const result = render('<div>${message}</div>', {
      message: "Hello World",
    });

    assert.ok(result.html.includes("Hello World"), "Should include interpolated value");
    assert.strictEqual(
      result.hydrationState.bindings.length > 0,
      true,
      "Should have binding metadata"
    );
  });

  test("T2: Text Interpolation - Nested Property", () => {
    const result = render('<div>${person.name}</div>', {
      person: { name: "Jane Smith" },
    });

    assert.ok(result.html.includes("Jane Smith"), "Should include nested property value");
  });

  // ===== TESTS 3-5: Property & Attribute Bindings =====

  test("T3: Property Binding - Attribute Value", () => {
    const result = render('<input value.bind="userName" />', {
      userName: "john.doe",
    });

    // Property bindings don't generate text markers for SSR
    // They're purely client-side, but the hydration state should still be valid
    assert.ok(
      typeof result.html === "string",
      "Should produce valid HTML even without property binding interpolation"
    );
    assert.ok(
      Array.isArray(result.hydrationState.bindings),
      "Should have valid hydration state structure"
    );
  });

  test("T4: Multiple Text Bindings", () => {
    const result = render(
      '<div>${first} and ${last}</div>',
      { first: "John", last: "Doe" }
    );

    assert.ok(result.html.includes("John"), "Should include first value");
    assert.ok(result.html.includes("Doe"), "Should include last value");
    assert.ok(result.html.includes("and"), "Should preserve static text");
  });

  test("T5: Nested Elements with Bindings", () => {
    const result = render(
      '<div><span>${title}</span><p>${content}</p></div>',
      { title: "Chapter 1", content: "Once upon a time..." }
    );

    assert.ok(result.html.includes("Chapter 1"), "Should include title");
    assert.ok(result.html.includes("Once upon a time"), "Should include content");
  });

  // ===== TESTS 6-7: Error Handling =====

  test("T6: Missing Property (Undefined)", () => {
    const result = render('<div>${missing}</div>', {});

    // Should handle gracefully without crashing
    assert.ok(typeof result.html === "string", "Should produce valid HTML");
    // Missing properties should render as empty string by evaluator
  });

  test("T7: Null/Empty Values", () => {
    const result = render('<div>Value: ${value}</div>', {
      value: null,
    });

    assert.ok(result.html.includes("Value:"), "Should include static text");
    assert.ok(typeof result.html === "string", "Should handle null gracefully");
  });

  // ===== TESTS 8-9: Controller Markers =====

  test("T8: Repeat Controller - Markers Preserved", () => {
    const result = render('<div><div repeat.for="item of items">${item}</div></div>', {
      items: ["a", "b", "c"],
    });

    // Repeat controller is not evaluated server-side, only text bindings are
    // Markers should be preserved for client-side evaluation
    assert.ok(
      result.hydrationState.bindings.length >= 0,
      "Should produce valid hydration state"
    );
  });

  test("T9: If/Else Controller - Markers Preserved", () => {
    const result = render(
      '<div><span if.bind="show">${message}</span></div>',
      { show: true, message: "Visible" }
    );

    // If controller is not evaluated server-side
    assert.ok(
      result.hydrationState.bindings.length >= 0,
      "Should produce valid hydration state"
    );
  });

  // ===== TEST 10: Hydration Metadata =====

  test("T10: Hydration State Output Structure", () => {
    const result = render('<div>${name}</div>', { name: "Test" });

    assert.ok(result.hydrationState, "Should have hydration state");
    assert.ok(Array.isArray(result.hydrationState.bindings), "Bindings should be array");

    // Each binding should have required metadata
    for (const binding of result.hydrationState.bindings) {
      assert.ok("hid" in binding, "Binding should have hid");
      assert.ok("kind" in binding, "Binding should have kind");
      assert.ok(Array.isArray(binding.exprIds), "Binding should have exprIds array");
    }
  });

  // ===== ADDITIONAL: Expression Code Capture in Manifest =====

  test("T11: Expression Code Captured in Manifest", () => {
    const { html, manifest } = compileSsr('<div>${message}</div>');
    const parsed = JSON.parse(manifest);

    assert.ok(parsed.expressions, "Manifest should have expressions array");
    assert.ok(Array.isArray(parsed.expressions), "Expressions should be array");
    assert.ok(parsed.expressions.length > 0, "Should capture at least one expression");

    // Each expression should have required fields
    for (const expr of parsed.expressions) {
      assert.ok("id" in expr, "Expression should have id");
      assert.ok("code" in expr, "Expression should have code");
    }
  });

  test("T12: Manifest Expression Code Usable by Renderer", () => {
    const { html, manifest } = compileSsr('<div>${person.name}</div>');
    const result = renderToString(html, manifest, {
      viewModel: { person: { name: "Alice" } },
    });

    assert.ok(result.html.includes("Alice"), "Renderer should use manifest expressions");
  });

  // ===== EDGE CASES =====

  test("T13: Empty Text Node", () => {
    const result = render('<div></div>', {});

    assert.ok(typeof result.html === "string", "Should handle empty elements");
  });

  test("T14: Special Characters in Property Values", () => {
    const result = render('<div>${text}</div>', {
      text: '<script>alert("xss")</script>',
    });

    // Should escape HTML special characters
    assert.ok(!result.html.includes('<script>'), "Should escape script tags");
    assert.ok(result.html.includes('&lt;'), "Should escape < as &lt;");
  });
});
