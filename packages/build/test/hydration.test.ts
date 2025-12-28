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

import { test, describe, expect } from "vitest";

import { JSDOM } from "jsdom";
import { DI, Registration } from "@aurelia/kernel";
import { Aurelia, IPlatform, StandardConfiguration, CustomElement } from "@aurelia/runtime-html";
import { BrowserPlatform } from "@aurelia/platform-browser";
import { compileAndRenderAot } from "@aurelia-ls/build";
import { createComponent } from "./_helpers/test-utils.js";

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

    const TestApp = createComponent("test-app", template, state);
    const result = await compileAndRenderAot(TestApp);

    // Verify structure
    expect(result.html).toContain("todo-app");
    expect(result.html).toContain("todo-list");
    expect(result.html).toContain("todo-item");

    // Verify content
    expect(result.html).toContain("Active task");
    expect(result.html).toContain("Done task");

    // Verify conditional (if/else) - strikethrough for completed
    expect(result.html).toContain("<s>");

    // Verify footer
    expect(result.html).toContain("footer");
    expect(result.html).toContain("1 item");
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

    const TestApp = createComponent("test-app", template, state);
    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Fruits");
    expect(result.html).toContain("Veggies");
    expect(result.html).toContain("Apple");
    expect(result.html).toContain("Banana");
    expect(result.html).toContain("Carrot");
    expect(result.html).toContain("Potato");
  });

  test("SSR renders empty state correctly", async () => {
    const template = `
      <ul><li repeat.for="item of items">\${item}</li></ul>
      <div class="empty" if.bind="items.length === 0">No items</div>
    `;

    const TestApp = createComponent("test-app", template, { items: [] });
    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("No items");
    expect(result.html).not.toContain("<li>");
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
      expect(count(host, ".item")).toBe(3);
      expect(texts(host, ".item")).toEqual(["A", "B", "C"]);

      // Push
      vm.items.push("D");
      expect(count(host, ".item")).toBe(4);

      // Shift
      vm.items.shift();
      expect(texts(host, ".item")).toEqual(["B", "C", "D"]);

      // Replace
      vm.items = ["X", "Y"];
      expect(texts(host, ".item")).toEqual(["X", "Y"]);
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
      expect(count(host, ".shown")).toBe(1);
      expect(count(host, ".hidden")).toBe(0);

      // Toggle
      vm.show = false;
      await Promise.resolve();
      expect(count(host, ".shown")).toBe(0);
      expect(count(host, ".hidden")).toBe(1);

      // Toggle back
      vm.show = true;
      await Promise.resolve();
      expect(count(host, ".shown")).toBe(1);
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
      expect(count(host, ".inactive")).toBe(1);
      expect(count(host, ".active")).toBe(0);

      // Toggle
      vm.active = true;
      await Promise.resolve();
      expect(count(host, ".active")).toBe(1);
      expect(count(host, ".inactive")).toBe(0);
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
      expect(text(host, ".output")).toBe("initial");

      // Update from VM propagates to DOM
      vm.text = "updated";
      await Promise.resolve();
      expect(text(host, ".output")).toBe("updated");
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
      expect(text(host, ".output")).toBe("Alice");

      // Update nested property
      vm.user.name = "Bob";
      await Promise.resolve();
      expect(text(host, ".output")).toBe("Bob");
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
      expect(vm.count).toBe(0);

      click(host, ".btn");
      expect(vm.count).toBe(1);

      click(host, ".btn");
      click(host, ".btn");
      expect(vm.count).toBe(3);
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
      expect(count(host, ".group")).toBe(2);
      expect(count(host, ".item")).toBe(3);

      // Add to nested
      vm.groups[0].items.push("new");
      expect(count(host, ".item")).toBe(4);

      // Add new group
      vm.groups.push({ name: "C", items: ["x", "y"] });
      expect(count(host, ".group")).toBe(3);
      expect(count(host, ".item")).toBe(6);
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
      expect(count(host, ".todo-item")).toBe(1);
      expect(text(host, ".title")).toBe("First");

      // Add todo via VM
      vm.todos.push({ title: "Second", completed: false });
      expect(count(host, ".todo-item")).toBe(2);

      // Remove first todo via VM
      vm.todos.shift();
      expect(count(host, ".todo-item")).toBe(1);
      expect(text(host, ".title")).toBe("Second");

      // Clear all
      vm.todos = [];
      expect(count(host, ".todo-item")).toBe(0);

      // Add multiple
      vm.todos.push(
        { title: "A", completed: false },
        { title: "B", completed: false },
        { title: "C", completed: false }
      );
      expect(count(host, ".todo-item")).toBe(3);
      expect(texts(host, ".title")).toEqual(["A", "B", "C"]);
    } finally {
      await stop();
    }
  });
});
