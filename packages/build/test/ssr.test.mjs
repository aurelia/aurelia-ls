/**
 * SSR Tests
 *
 * Tests the end-to-end SSR pipeline using the actual Aurelia runtime.
 * This ensures perfect parity with client-side rendering.
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { compileAndRender } from "../out/index.js";

describe("SSR - compileAndRender (runtime)", () => {
  test("renders simple text interpolation", async () => {
    const result = await compileAndRender(
      "${message}",
      { state: { message: "Hello World" } }
    );

    assert.ok(result.html.includes("Hello World"), `Expected 'Hello World' in: ${result.html}`);
  });

  test("renders element with text interpolation", async () => {
    const result = await compileAndRender(
      "<div>${greeting}</div>",
      { state: { greeting: "Hi there!" } }
    );

    assert.ok(result.html.includes("<div>"), "Expected <div>");
    assert.ok(result.html.includes("Hi there!"), "Expected greeting text");
    assert.ok(result.html.includes("</div>"), "Expected </div>");
  });

  test("renders property binding", async () => {
    // Note: value.bind sets the DOM property, not the attribute
    // So innerHTML won't show value="John" - that's expected behavior
    // The input element should still be present
    const result = await compileAndRender(
      '<input value.bind="name">',
      { state: { name: "John" } }
    );

    assert.ok(result.html.includes("<input"), `Expected <input> in: ${result.html}`);
  });

  test("renders attribute interpolation", async () => {
    const result = await compileAndRender(
      '<div title="Hello ${name}!"></div>',
      { state: { name: "World" } }
    );

    assert.ok(result.html.includes('title="Hello World!"'), `Expected title="Hello World!" in: ${result.html}`);
  });

  test("renders repeat controller", async () => {
    const result = await compileAndRender(
      '<div repeat.for="item of items">${item}</div>',
      { state: { items: ["A", "B", "C"] } }
    );

    // Should render all items
    assert.ok(result.html.includes("A"), "Expected item A");
    assert.ok(result.html.includes("B"), "Expected item B");
    assert.ok(result.html.includes("C"), "Expected item C");
  });

  test("renders repeat with $index", async () => {
    const result = await compileAndRender(
      '<div repeat.for="item of items">${$index}: ${item}</div>',
      { state: { items: ["X", "Y"] } }
    );

    assert.ok(result.html.includes("0") && result.html.includes("X"), `Expected "0" and "X" in: ${result.html}`);
    assert.ok(result.html.includes("1") && result.html.includes("Y"), `Expected "1" and "Y" in: ${result.html}`);
  });

  test("renders if controller - true condition", async () => {
    const result = await compileAndRender(
      '<div if.bind="show">Visible</div>',
      { state: { show: true } }
    );

    assert.ok(result.html.includes("Visible"), "Expected 'Visible' when show=true");
  });

  test("renders if controller - false condition", async () => {
    // Use a template with surrounding content to avoid empty render issues
    const result = await compileAndRender(
      '<span>Before</span><div if.bind="show">Visible</div><span>After</span>',
      { state: { show: false } }
    );

    assert.ok(!result.html.includes("Visible"), "Expected no 'Visible' when show=false");
    assert.ok(result.html.includes("Before"), "Expected 'Before'");
    assert.ok(result.html.includes("After"), "Expected 'After'");
  });

  test("renders nested expressions", async () => {
    const result = await compileAndRender(
      "<div>${user.name}</div>",
      { state: { user: { name: "Alice" } } }
    );

    assert.ok(result.html.includes("Alice"), "Expected 'Alice'");
  });

  test("renders binary expressions", async () => {
    const result = await compileAndRender(
      "<div>${a + b}</div>",
      { state: { a: 1, b: 2 } }
    );

    assert.ok(result.html.includes("3"), `Expected '3' in: ${result.html}`);
  });

  test("renders conditional expressions", async () => {
    const result = await compileAndRender(
      "<div>${active ? 'Yes' : 'No'}</div>",
      { state: { active: true } }
    );

    assert.ok(result.html.includes("Yes"), `Expected 'Yes' in: ${result.html}`);
  });

  test("renders string concatenation", async () => {
    const result = await compileAndRender(
      "<div>${first + ' ' + last}</div>",
      { state: { first: "John", last: "Doe" } }
    );

    assert.ok(result.html.includes("John Doe"), `Expected 'John Doe' in: ${result.html}`);
  });

  test("escapes HTML in text", async () => {
    const result = await compileAndRender(
      "<div>${content}</div>",
      { state: { content: "<script>alert('xss')</script>" } }
    );

    assert.ok(!result.html.includes("<script>"), "Expected script tag to be escaped");
    assert.ok(result.html.includes("&lt;script&gt;"), "Expected escaped script tag");
  });

  test("handles null/undefined gracefully", async () => {
    const result = await compileAndRender(
      "<div>${missing}</div>",
      { state: {} }
    );

    // Should not throw, and should render empty or placeholder
    assert.ok(result.html.includes("<div>"), "Expected div");
  });

  test("renders else branch", async () => {
    const result = await compileAndRender(
      '<div if.bind="show">Yes</div><div else>No</div>',
      { state: { show: false } }
    );

    assert.ok(!result.html.includes("Yes"), "Expected no 'Yes' when show=false");
    assert.ok(result.html.includes("No"), "Expected 'No' from else branch");
  });

  test("renders with controller", async () => {
    const result = await compileAndRender(
      '<div with.bind="user">${name}</div>',
      { state: { user: { name: "Bob" } } }
    );

    assert.ok(result.html.includes("Bob"), `Expected 'Bob' in: ${result.html}`);
  });
});
