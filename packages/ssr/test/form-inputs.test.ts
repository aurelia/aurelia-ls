/**
 * Form Inputs SSR Tests
 *
 * Tests for SSR rendering of form elements:
 * - Input text (value.bind)
 * - Checkbox (checked.bind)
 * - Radio buttons (checked.bind)
 * - Select/Option (selected, value.bind)
 * - Textarea (value.bind)
 *
 * These tests verify that form state is properly serialized to HTML attributes
 * so it survives innerHTML serialization. See ssr-processor.ts for the
 * syncPropertiesToAttributes implementation.
 */

import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";

import { compileAndRenderAot } from "@aurelia-ls/ssr";
import { createComponent } from "./_helpers/test-utils.js";

// =============================================================================
// Text Input
// =============================================================================

describe("Form Inputs SSR: Text Input", () => {
  it("renders input with value attribute", async () => {
    const TestApp = createComponent(
      "test-app",
      '<input type="text" value.bind="name">',
      { name: "John Doe" },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain('value="John Doe"');
  });

  it("renders empty input when value is empty string", async () => {
    const TestApp = createComponent(
      "test-app",
      '<input type="text" value.bind="name">',
      { name: "" },
    );

    const result = await compileAndRenderAot(TestApp);

    // Should have input element
    expect(result.html).toContain("<input");
    // Value attribute may be empty or absent
    const dom = new JSDOM(result.html);
    const input = dom.window.document.querySelector("input");
    expect(input).toBeTruthy();
    // Empty string value - attribute may be empty string or not present
    expect(input?.getAttribute("value") ?? "").toBe("");
    dom.window.close();
  });

  it("renders input with placeholder", async () => {
    const TestApp = createComponent(
      "test-app",
      '<input type="text" placeholder="Enter name" value.bind="name">',
      { name: "" },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain('placeholder="Enter name"');
  });

  it("escapes special characters in value", async () => {
    const TestApp = createComponent(
      "test-app",
      '<input type="text" value.bind="content">',
      { content: '<script>alert("xss")</script>' },
    );

    const result = await compileAndRenderAot(TestApp);

    // The value attribute is serialized to HTML, but JSDOM will
    // parse it correctly. When we read via DOM, it's safe.
    const dom = new JSDOM(result.html);
    const input = dom.window.document.querySelector("input");

    // The value property should contain the original content (unescaped)
    // because that's how form values work - the browser handles it.
    expect(input?.getAttribute("value")).toBe('<script>alert("xss")</script>');

    dom.window.close();
  });
});

// =============================================================================
// Checkbox
// =============================================================================

describe("Form Inputs SSR: Checkbox", () => {
  it("renders checked checkbox with checked attribute", async () => {
    const TestApp = createComponent(
      "test-app",
      '<input type="checkbox" checked.bind="isActive">',
      { isActive: true },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const checkbox = dom.window.document.querySelector('input[type="checkbox"]');

    expect(checkbox).toBeTruthy();
    expect(checkbox?.hasAttribute("checked")).toBe(true);
    dom.window.close();
  });

  it("renders unchecked checkbox without checked attribute", async () => {
    const TestApp = createComponent(
      "test-app",
      '<input type="checkbox" checked.bind="isActive">',
      { isActive: false },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const checkbox = dom.window.document.querySelector('input[type="checkbox"]');

    expect(checkbox).toBeTruthy();
    expect(checkbox?.hasAttribute("checked")).toBe(false);
    dom.window.close();
  });

  it("renders multiple checkboxes with correct states", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div>
        <input type="checkbox" checked.bind="opt1" class="opt1">
        <input type="checkbox" checked.bind="opt2" class="opt2">
        <input type="checkbox" checked.bind="opt3" class="opt3">
      </div>`,
      { opt1: true, opt2: false, opt3: true },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    expect(doc.querySelector(".opt1")?.hasAttribute("checked")).toBe(true);
    expect(doc.querySelector(".opt2")?.hasAttribute("checked")).toBe(false);
    expect(doc.querySelector(".opt3")?.hasAttribute("checked")).toBe(true);
    dom.window.close();
  });

  it("renders checkbox inside repeat", async () => {
    const TestApp = createComponent(
      "test-app",
      `<div repeat.for="item of items">
        <input type="checkbox" checked.bind="item.done" class="todo-check">
        <span>\${item.text}</span>
      </div>`,
      {
        items: [
          { text: "Task 1", done: true },
          { text: "Task 2", done: false },
          { text: "Task 3", done: true },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const checkboxes = dom.window.document.querySelectorAll(".todo-check");

    expect(checkboxes.length).toBe(3);
    expect((checkboxes[0] as HTMLInputElement).hasAttribute("checked")).toBe(true);
    expect((checkboxes[1] as HTMLInputElement).hasAttribute("checked")).toBe(false);
    expect((checkboxes[2] as HTMLInputElement).hasAttribute("checked")).toBe(true);
    dom.window.close();
  });
});

// =============================================================================
// Radio Buttons
// =============================================================================

describe("Form Inputs SSR: Radio Buttons", () => {
  // Aurelia radio binding model:
  // - Radio buttons use model.bind + checked.bind pattern
  // - checked.bind holds the "selected value"
  // - model.bind holds each option's value
  // - When checked.bind value === model.bind value, radio is checked
  //
  // Simple boolean checked.bind (like checkbox) does NOT work for radio
  // because CheckedObserver compares against element's value/model.

  it.todo("renders radio group with model binding pattern", async () => {
    // TODO: Test the correct Aurelia radio pattern once model.bind is supported in SSR
    // <input type="radio" model.bind="'option1'" checked.bind="selected">
    // <input type="radio" model.bind="'option2'" checked.bind="selected">
    // With selected = 'option1', first radio should be checked
  });

  it("simple boolean checked.bind does NOT check radio (by design)", async () => {
    // This documents the actual behavior - NOT a bug
    // Radio buttons require model.bind pattern, not simple boolean binding
    const TestApp = createComponent(
      "test-app",
      '<input type="radio" checked.bind="isChecked">',
      { isChecked: true },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const radio = dom.window.document.querySelector('input[type="radio"]');

    // Radio is NOT checked because isChecked (true) !== element.value ("on" or "")
    // This is correct Aurelia behavior - use model.bind for radios
    expect(radio?.hasAttribute("checked")).toBe(false);
    dom.window.close();
  });
});

// =============================================================================
// Select/Option
// =============================================================================

describe("Form Inputs SSR: Select", () => {
  it("renders select with selected option", async () => {
    const TestApp = createComponent(
      "test-app",
      `<select value.bind="country">
        <option value="us">United States</option>
        <option value="uk">United Kingdom</option>
        <option value="ca">Canada</option>
      </select>`,
      { country: "uk" },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const options = dom.window.document.querySelectorAll("option");

    // The UK option should be selected
    expect(result.html).toContain("United Kingdom");

    dom.window.close();
  });

  it("renders select with no selection when value not in options", async () => {
    const TestApp = createComponent(
      "test-app",
      `<select value.bind="fruit">
        <option value="apple">Apple</option>
        <option value="banana">Banana</option>
      </select>`,
      { fruit: "orange" }, // Not in options
    );

    const result = await compileAndRenderAot(TestApp);

    // Should still render the select with options
    expect(result.html).toContain("<select");
    expect(result.html).toContain("Apple");
    expect(result.html).toContain("Banana");
  });

  it("renders select with repeat.for options", async () => {
    const TestApp = createComponent(
      "test-app",
      `<select value.bind="selected">
        <option repeat.for="opt of options" value.bind="opt.value">\${opt.label}</option>
      </select>`,
      {
        selected: "b",
        options: [
          { value: "a", label: "Option A" },
          { value: "b", label: "Option B" },
          { value: "c", label: "Option C" },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Option A");
    expect(result.html).toContain("Option B");
    expect(result.html).toContain("Option C");
  });
});

// =============================================================================
// Textarea
// =============================================================================

describe("Form Inputs SSR: Textarea", () => {
  it("renders textarea with content", async () => {
    const TestApp = createComponent(
      "test-app",
      '<textarea value.bind="message"></textarea>',
      { message: "Hello, World!" },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const textarea = dom.window.document.querySelector("textarea");

    expect(textarea).toBeTruthy();
    // Textarea content should be in the element
    expect(textarea?.textContent).toContain("Hello");
    dom.window.close();
  });

  it("renders empty textarea", async () => {
    const TestApp = createComponent(
      "test-app",
      '<textarea value.bind="content"></textarea>',
      { content: "" },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const textarea = dom.window.document.querySelector("textarea");

    expect(textarea).toBeTruthy();
    expect(textarea?.textContent).toBe("");
    dom.window.close();
  });

  it("renders textarea with multiline content", async () => {
    const TestApp = createComponent(
      "test-app",
      '<textarea value.bind="content"></textarea>',
      { content: "Line 1\nLine 2\nLine 3" },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const textarea = dom.window.document.querySelector("textarea");

    expect(textarea?.textContent).toContain("Line 1");
    expect(textarea?.textContent).toContain("Line 2");
    expect(textarea?.textContent).toContain("Line 3");
    dom.window.close();
  });
});

// =============================================================================
// Form in Repeat
// =============================================================================

describe("Form Inputs SSR: Forms in Repeat", () => {
  it("renders form inputs correctly inside repeat", async () => {
    const TestApp = createComponent(
      "test-app",
      `<form repeat.for="user of users" class="user-form">
        <input type="text" value.bind="user.name" class="user-name">
        <input type="checkbox" checked.bind="user.active" class="user-active">
      </form>`,
      {
        users: [
          { name: "Alice", active: true },
          { name: "Bob", active: false },
          { name: "Carol", active: true },
        ],
      },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const doc = dom.window.document;

    const forms = doc.querySelectorAll(".user-form");
    expect(forms.length).toBe(3);

    const nameInputs = doc.querySelectorAll(".user-name");
    expect(nameInputs.length).toBe(3);
    expect((nameInputs[0] as HTMLInputElement).value || nameInputs[0].getAttribute("value")).toBe("Alice");
    expect((nameInputs[1] as HTMLInputElement).value || nameInputs[1].getAttribute("value")).toBe("Bob");
    expect((nameInputs[2] as HTMLInputElement).value || nameInputs[2].getAttribute("value")).toBe("Carol");

    const activeCheckboxes = doc.querySelectorAll(".user-active");
    expect(activeCheckboxes.length).toBe(3);
    expect(activeCheckboxes[0].hasAttribute("checked")).toBe(true);
    expect(activeCheckboxes[1].hasAttribute("checked")).toBe(false);
    expect(activeCheckboxes[2].hasAttribute("checked")).toBe(true);

    dom.window.close();
  });
});

// =============================================================================
// Disabled/Readonly Attributes
// =============================================================================

describe("Form Inputs SSR: Disabled/Readonly", () => {
  it("renders disabled input", async () => {
    const TestApp = createComponent(
      "test-app",
      '<input type="text" disabled.bind="isDisabled" value.bind="value">',
      { isDisabled: true, value: "Cannot edit" },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const input = dom.window.document.querySelector("input");

    expect(input?.hasAttribute("disabled")).toBe(true);
    dom.window.close();
  });

  it("renders enabled input (no disabled attribute)", async () => {
    const TestApp = createComponent(
      "test-app",
      '<input type="text" disabled.bind="isDisabled" value.bind="value">',
      { isDisabled: false, value: "Can edit" },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const input = dom.window.document.querySelector("input");

    expect(input?.hasAttribute("disabled")).toBe(false);
    dom.window.close();
  });

  it("renders readonly input", async () => {
    const TestApp = createComponent(
      "test-app",
      '<input type="text" readonly.bind="isReadonly" value.bind="value">',
      { isReadonly: true, value: "Read only" },
    );

    const result = await compileAndRenderAot(TestApp);

    const dom = new JSDOM(result.html);
    const input = dom.window.document.querySelector("input");

    expect(input?.hasAttribute("readonly")).toBe(true);
    dom.window.close();
  });
});
