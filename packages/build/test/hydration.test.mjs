/**
 * SSR E2E Tests
 *
 * These tests verify the full SSR rendering pipeline:
 * 1. Compile template with Aurelia runtime
 * 2. SSR render to HTML with state
 * 3. Verify output correctness
 * 4. For reactivity tests, start a fresh client app
 *
 * Uses the same `compileAndRender` infrastructure as ssr.test.mjs
 * to ensure consistency.
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { JSDOM } from "jsdom";
import { DI, Registration } from "@aurelia/kernel";
import { Aurelia, IPlatform, StandardConfiguration, CustomElement } from "@aurelia/runtime-html";
import { BrowserPlatform } from "@aurelia/platform-browser";
import { compileAndRender } from "../out/index.js";

// =============================================================================
// Test Infrastructure
// =============================================================================

/**
 * Creates a JSDOM-based test context.
 */
function createContext() {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    pretendToBeVisual: true,
    runScripts: "dangerously",
  });

  const window = dom.window;
  const document = window.document;
  const Event = window.Event;
  const platform = new BrowserPlatform(window);

  const container = DI.createContainer();
  container.register(
    StandardConfiguration,
    Registration.instance(IPlatform, platform)
  );

  return { dom, window, document, platform, container, Event };
}

/**
 * Start a client app with template and state for reactivity testing.
 */
async function startClientApp(template, initialState, methods = {}) {
  const context = createContext();

  // Define component dynamically using CustomElement.define
  const App = CustomElement.define({
    name: "test-app",
    template,
  }, class {
    constructor() {
      // Apply initial state
      for (const [key, value] of Object.entries(initialState)) {
        this[key] = typeof value === 'object' && value !== null
          ? JSON.parse(JSON.stringify(value))
          : value;
      }
      // Apply methods
      for (const [key, fn] of Object.entries(methods)) {
        this[key] = fn.bind(this);
      }
    }
  });

  const host = context.document.createElement("div");
  context.document.body.appendChild(host);

  const au = new Aurelia(context.container);
  au.app({ host, component: App });
  await au.start();

  const vm = au.root.controller.viewModel;

  return {
    host,
    vm,
    document: context.document,
    Event: context.Event,
    html: () => host.innerHTML,
    stop: async () => {
      await au.stop(true);
      context.dom.window.close();
    },
  };
}

// =============================================================================
// Test Helpers
// =============================================================================

function count(host, selector) {
  return host.querySelectorAll(selector).length;
}

function text(host, selector) {
  return host.querySelector(selector)?.textContent ?? "";
}

function texts(host, selector) {
  return Array.from(host.querySelectorAll(selector)).map(
    (el) => el.textContent ?? ""
  );
}

function setInputValue(host, selector, value, Event) {
  const el = host.querySelector(selector);
  if (!el) throw new Error(`No element matching: ${selector}`);
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function click(host, selector) {
  const el = host.querySelector(selector);
  if (!el) throw new Error(`No element matching: ${selector}`);
  el.click();
}

function toggleCheckbox(host, selector, Event) {
  const el = host.querySelector(selector);
  if (!el) throw new Error(`No element matching: ${selector}`);
  el.checked = !el.checked;
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

// =============================================================================
// E2E Tests: SSR Output Verification
// =============================================================================

describe("E2E: SSR Output", () => {
  test("SSR renders todo app state correctly", async () => {
    const template = `
      <div class="todo-app">
        <input class="new-todo" value.bind="newTodoText">
        <ul class="todo-list">
          <li repeat.for="todo of todos" class="todo-item">
            <span if.bind="!todo.completed">\${todo.title}</span>
            <s else>\${todo.title}</s>
          </li>
        </ul>
        <div class="footer" if.bind="todos.length > 0">
          \${remainingCount} item\${remainingCount === 1 ? '' : 's'} left
        </div>
      </div>
    `;

    const state = {
      newTodoText: "Buy milk",
      todos: [
        { title: "Active task", completed: false },
        { title: "Done task", completed: true },
      ],
      remainingCount: 1,
    };

    const result = await compileAndRender(template, { state });

    // Verify structure
    assert.ok(result.html.includes("todo-app"), "Should have todo-app div");
    assert.ok(result.html.includes("todo-list"), "Should have todo-list ul");
    assert.ok(result.html.includes("todo-item"), "Should have todo-item li");

    // Verify content
    assert.ok(result.html.includes("Active task"), "Should render active task");
    assert.ok(result.html.includes("Done task"), "Should render done task");

    // Verify conditional (if/else) - strikethrough for completed
    assert.ok(result.html.includes("<s>"), "Should have <s> for completed task");

    // Verify footer
    assert.ok(result.html.includes("footer"), "Should have footer");
    assert.ok(result.html.includes("1 item"), "Should show remaining count");
  });

  test("SSR renders nested repeat correctly", async () => {
    const template = `
      <div repeat.for="group of groups" class="group">
        <h3>\${group.name}</h3>
        <span repeat.for="item of group.items" class="item">\${item}</span>
      </div>
    `;

    const state = {
      groups: [
        { name: "Fruits", items: ["Apple", "Banana"] },
        { name: "Veggies", items: ["Carrot", "Potato"] },
      ],
    };

    const result = await compileAndRender(template, { state });

    assert.ok(result.html.includes("Fruits"), "Should have Fruits group");
    assert.ok(result.html.includes("Veggies"), "Should have Veggies group");
    assert.ok(result.html.includes("Apple"), "Should have Apple");
    assert.ok(result.html.includes("Banana"), "Should have Banana");
    assert.ok(result.html.includes("Carrot"), "Should have Carrot");
    assert.ok(result.html.includes("Potato"), "Should have Potato");
  });

  test("SSR renders empty state correctly", async () => {
    const template = `
      <ul><li repeat.for="item of items">\${item}</li></ul>
      <div class="empty" if.bind="items.length === 0">No items</div>
    `;

    const result = await compileAndRender(template, { state: { items: [] } });

    assert.ok(result.html.includes("No items"), "Should show empty message");
    assert.ok(!result.html.includes("<li>"), "Should not have list items");
  });
});

// =============================================================================
// E2E Tests: Client Reactivity
// =============================================================================

describe("E2E: Client Reactivity", () => {
  test("repeat.for responds to array mutations", async () => {
    const template = `<ul><li repeat.for="item of items" class="item">\${item}</li></ul>`;

    const { host, vm, stop } = await startClientApp(
      template,
      { items: ["A", "B", "C"] }
    );

    try {
      // Initial state
      assert.equal(count(host, ".item"), 3);
      assert.deepEqual(texts(host, ".item"), ["A", "B", "C"]);

      // Push
      vm.items.push("D");
      assert.equal(count(host, ".item"), 4);

      // Shift
      vm.items.shift();
      assert.deepEqual(texts(host, ".item"), ["B", "C", "D"]);

      // Replace
      vm.items = ["X", "Y"];
      assert.deepEqual(texts(host, ".item"), ["X", "Y"]);
    } finally {
      await stop();
    }
  });

  test("if.bind responds to condition changes", async () => {
    const template = `
      <div class="shown" if.bind="show">Visible</div>
      <div class="hidden" if.bind="!show">Hidden</div>
    `;

    const { host, vm, stop } = await startClientApp(
      template,
      { show: true }
    );

    try {
      // Initial: shown
      assert.equal(count(host, ".shown"), 1);
      assert.equal(count(host, ".hidden"), 0);

      // Toggle
      vm.show = false;
      await Promise.resolve();
      assert.equal(count(host, ".shown"), 0);
      assert.equal(count(host, ".hidden"), 1);

      // Toggle back
      vm.show = true;
      await Promise.resolve();
      assert.equal(count(host, ".shown"), 1);
    } finally {
      await stop();
    }
  });

  test("if/else renders correct branch", async () => {
    const template = `
      <span if.bind="active" class="active">Active</span>
      <span else class="inactive">Inactive</span>
    `;

    const { host, vm, stop } = await startClientApp(
      template,
      { active: false }
    );

    try {
      // Initial: else
      assert.equal(count(host, ".inactive"), 1);
      assert.equal(count(host, ".active"), 0);

      // Toggle
      vm.active = true;
      await Promise.resolve();
      assert.equal(count(host, ".active"), 1);
      assert.equal(count(host, ".inactive"), 0);
    } finally {
      await stop();
    }
  });

  test("text interpolation updates when VM changes", async () => {
    const template = `<span class="output">\${text}</span>`;

    const { host, vm, stop } = await startClientApp(
      template,
      { text: "initial" }
    );

    try {
      // Initial - VM value reflected in DOM
      assert.equal(text(host, ".output"), "initial");

      // Update from VM propagates to DOM
      vm.text = "updated";
      await Promise.resolve();
      assert.equal(text(host, ".output"), "updated");
    } finally {
      await stop();
    }
  });

  test("object property interpolation updates", async () => {
    const template = `<span class="output">\${user.name}</span>`;

    const { host, vm, stop } = await startClientApp(
      template,
      { user: { name: "Alice" } }
    );

    try {
      // Initial
      assert.equal(text(host, ".output"), "Alice");

      // Update nested property
      vm.user.name = "Bob";
      await Promise.resolve();
      assert.equal(text(host, ".output"), "Bob");
    } finally {
      await stop();
    }
  });

  test("click.trigger invokes method", async () => {
    const template = `
      <button class="btn" click.trigger="increment()">Click</button>
      <span class="count">\${count}</span>
    `;

    const { host, vm, stop } = await startClientApp(
      template,
      { count: 0 },
      { increment() { this.count++; } }
    );

    try {
      assert.equal(vm.count, 0);

      click(host, ".btn");
      assert.equal(vm.count, 1);

      click(host, ".btn");
      click(host, ".btn");
      assert.equal(vm.count, 3);
    } finally {
      await stop();
    }
  });

  test("nested repeat handles mutations", async () => {
    // Single-line template to avoid multiline parsing issues
    const template = `<div repeat.for="group of groups" class="group"><h3>\${group.name}</h3><span repeat.for="item of group.items" class="item">\${item}</span></div>`;

    const { host, vm, stop } = await startClientApp(
      template,
      {
        groups: [
          { name: "A", items: ["1", "2"] },
          { name: "B", items: ["3"] },
        ],
      }
    );

    try {
      assert.equal(count(host, ".group"), 2);
      assert.equal(count(host, ".item"), 3);

      // Add to nested
      vm.groups[0].items.push("new");
      assert.equal(count(host, ".item"), 4);

      // Add new group
      vm.groups.push({ name: "C", items: ["x", "y"] });
      assert.equal(count(host, ".group"), 3);
      assert.equal(count(host, ".item"), 6);
    } finally {
      await stop();
    }
  });
});

// =============================================================================
// E2E Tests: Todo App Integration
// =============================================================================

describe("E2E: Todo App Integration", () => {
  test("full todo app flow via VM manipulation", async () => {
    // Test todo app reactivity by manipulating the VM directly
    const template = `<ul class="todo-list"><li repeat.for="todo of todos" class="todo-item"><span class="title">\${todo.title}</span></li></ul>`;

    const { host, vm, stop } = await startClientApp(
      template,
      {
        todos: [{ title: "First", completed: false }],
      }
    );

    try {
      // Initial state
      assert.equal(count(host, ".todo-item"), 1);
      assert.equal(text(host, ".title"), "First");

      // Add todo via VM
      vm.todos.push({ title: "Second", completed: false });
      assert.equal(count(host, ".todo-item"), 2);

      // Remove first todo via VM
      vm.todos.shift();
      assert.equal(count(host, ".todo-item"), 1);
      assert.equal(text(host, ".title"), "Second");

      // Clear all
      vm.todos = [];
      assert.equal(count(host, ".todo-item"), 0);

      // Add multiple
      vm.todos.push(
        { title: "A", completed: false },
        { title: "B", completed: false },
        { title: "C", completed: false }
      );
      assert.equal(count(host, ".todo-item"), 3);
      assert.deepEqual(texts(host, ".title"), ["A", "B", "C"]);
    } finally {
      await stop();
    }
  });
});
