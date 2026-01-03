/**
 * Form Elements Two-Way Binding Tests
 *
 * Tests for two-way bindings on form elements, verifying:
 * 1. Initial state preservation after client initialization
 * 2. User interaction updates the view model
 * 3. View model changes update the DOM
 * 4. Form elements inside repeat with mutations
 *
 * This covers client-side reactivity for form inputs using Aurelia's
 * JIT compiler (CustomElement.define at runtime).
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { DI, Registration } from "@aurelia/kernel";
import {
  Aurelia,
  IPlatform,
  StandardConfiguration,
  CustomElement,
} from "@aurelia/runtime-html";
import { BrowserPlatform } from "@aurelia/platform-browser";

// =============================================================================
// Test Infrastructure
// =============================================================================

interface TestContext {
  dom: JSDOM;
  window: Window & typeof globalThis;
  document: Document;
  platform: BrowserPlatform;
  Event: typeof Event;
  InputEvent: typeof InputEvent;
}

function createTestContext(): TestContext {
  const dom = new JSDOM("<!DOCTYPE html><html><body><div id='app'></div></body></html>", {
    runScripts: "dangerously",
    pretendToBeVisual: true,
  });

  const window = dom.window as Window & typeof globalThis;
  const document = window.document;
  const platform = new BrowserPlatform(window);

  return {
    dom,
    window,
    document,
    platform,
    Event: window.Event,
    InputEvent: window.InputEvent,
  };
}

interface AppContext {
  host: Element;
  vm: Record<string, unknown>;
  au: Aurelia;
  stop: () => Promise<void>;
  ctx: TestContext;
}

// Counter to generate unique element names AND templates per test (avoids caching conflicts)
let testCounter = 0;

async function startApp(
  template: string,
  state: Record<string, unknown>,
  methods: Record<string, Function> = {},
): Promise<AppContext> {
  const ctx = createTestContext();
  const { document, platform } = ctx;

  const container = DI.createContainer();
  container.register(
    StandardConfiguration,
    Registration.instance(IPlatform, platform),
  );

  // Each test gets a unique element name AND template to avoid caching conflicts
  // Add unique data attribute to make template string unique
  const uniqueId = ++testCounter;
  const uniqueTemplate = template.replace(/>/, ` data-test-id="${uniqueId}">`);

  const Component = CustomElement.define(
    { name: `test-app-${uniqueId}`, template: uniqueTemplate },
    class {
      constructor() {
        // Deep clone objects to avoid shared state
        for (const [key, value] of Object.entries(state)) {
          (this as Record<string, unknown>)[key] =
            typeof value === "object" && value !== null
              ? JSON.parse(JSON.stringify(value))
              : value;
        }
        for (const [name, fn] of Object.entries(methods)) {
          (this as Record<string, unknown>)[name] = fn.bind(this);
        }
      }
    },
  );

  const host = document.createElement("div");
  document.body.appendChild(host);

  const au = new Aurelia(container);
  au.app({ host, component: Component });
  await au.start();

  const vm = au.root.controller.viewModel as Record<string, unknown>;

  return {
    host,
    vm,
    au,
    stop: async () => {
      await au.stop(true);
      ctx.dom.window.close();
    },
    ctx,
  };
}

// Helper: simulate user typing in an input
function typeInInput(input: HTMLInputElement, value: string, ctx: TestContext): void {
  input.value = value;
  input.dispatchEvent(new ctx.InputEvent("input", { bubbles: true }));
  input.dispatchEvent(new ctx.Event("change", { bubbles: true }));
}

// Helper: simulate user clicking a checkbox
function clickCheckbox(checkbox: HTMLInputElement, ctx: TestContext): void {
  checkbox.checked = !checkbox.checked;
  checkbox.dispatchEvent(new ctx.Event("change", { bubbles: true }));
}

// Helper: simulate user selecting an option
function selectOption(select: HTMLSelectElement, value: string, ctx: TestContext): void {
  select.value = value;
  select.dispatchEvent(new ctx.Event("change", { bubbles: true }));
}

// Helper: flush microtasks
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

// =============================================================================
// Checkbox Two-Way Binding
// =============================================================================

describe("Form Two-Way: Checkbox", () => {
  it("preserves initial checked state", async () => {
    const { host, vm, stop } = await startApp(
      '<input type="checkbox" class="cb" checked.bind="isChecked">',
      { isChecked: true },
    );

    try {
      const checkbox = host.querySelector(".cb") as HTMLInputElement;
      expect(checkbox).not.toBeNull();
      expect(checkbox.checked).toBe(true);
      expect(vm.isChecked).toBe(true);
    } finally {
      await stop();
    }
  });

  it("user click updates view model", async () => {
    const { host, vm, stop, ctx } = await startApp(
      '<input type="checkbox" class="cb" checked.bind="isChecked">',
      { isChecked: false },
    );

    try {
      const checkbox = host.querySelector(".cb") as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      expect(vm.isChecked).toBe(false);

      // User clicks to check
      clickCheckbox(checkbox, ctx);
      await flush();

      expect(checkbox.checked).toBe(true);
      expect(vm.isChecked).toBe(true);

      // User clicks to uncheck
      clickCheckbox(checkbox, ctx);
      await flush();

      expect(checkbox.checked).toBe(false);
      expect(vm.isChecked).toBe(false);
    } finally {
      await stop();
    }
  });

  it("view model change updates checkbox", async () => {
    const { host, vm, stop } = await startApp(
      '<input type="checkbox" class="cb" checked.bind="isChecked">',
      { isChecked: false },
    );

    try {
      const checkbox = host.querySelector(".cb") as HTMLInputElement;
      expect(checkbox.checked).toBe(false);

      // VM change
      vm.isChecked = true;
      await flush();

      expect(checkbox.checked).toBe(true);

      // VM change back
      vm.isChecked = false;
      await flush();

      expect(checkbox.checked).toBe(false);
    } finally {
      await stop();
    }
  });

  it("checkbox in repeat: individual item toggle", async () => {
    const { host, vm, stop, ctx } = await startApp(
      `<div repeat.for="item of items" class="item">
        <input type="checkbox" class="cb" checked.bind="item.done">
        <span class="text">\${item.text}</span>
      </div>`,
      {
        items: [
          { text: "Task 1", done: false },
          { text: "Task 2", done: true },
          { text: "Task 3", done: false },
        ],
      },
    );

    try {
      const checkboxes = host.querySelectorAll(".cb") as NodeListOf<HTMLInputElement>;
      expect(checkboxes.length).toBe(3);

      // Initial states
      expect(checkboxes[0]!.checked).toBe(false);
      expect(checkboxes[1]!.checked).toBe(true);
      expect(checkboxes[2]!.checked).toBe(false);

      // Toggle first checkbox
      clickCheckbox(checkboxes[0]!, ctx);
      await flush();

      expect(checkboxes[0]!.checked).toBe(true);
      expect((vm.items as Array<{ done: boolean }>)[0]!.done).toBe(true);

      // Other checkboxes unchanged
      expect(checkboxes[1]!.checked).toBe(true);
      expect(checkboxes[2]!.checked).toBe(false);
    } finally {
      await stop();
    }
  });

  it("checkbox in repeat: VM mutation updates specific checkbox", async () => {
    const { host, vm, stop } = await startApp(
      `<div repeat.for="item of items" class="item">
        <input type="checkbox" class="cb" checked.bind="item.done">
      </div>`,
      {
        items: [
          { text: "Task 1", done: false },
          { text: "Task 2", done: false },
        ],
      },
    );

    try {
      const checkboxes = host.querySelectorAll(".cb") as NodeListOf<HTMLInputElement>;

      // Initial: both unchecked
      expect(checkboxes[0]!.checked).toBe(false);
      expect(checkboxes[1]!.checked).toBe(false);

      // VM mutation: check second item
      (vm.items as Array<{ done: boolean }>)[1]!.done = true;
      await flush();

      expect(checkboxes[0]!.checked).toBe(false);
      expect(checkboxes[1]!.checked).toBe(true);
    } finally {
      await stop();
    }
  });
});

// =============================================================================
// Text Input Two-Way Binding
// =============================================================================

describe("Form Two-Way: Text Input", () => {
  it("preserves initial value", async () => {
    const { host, vm, stop } = await startApp(
      '<input type="text" class="input" value.bind="name">',
      { name: "John Doe" },
    );

    try {
      const input = host.querySelector(".input") as HTMLInputElement;
      expect(input.value).toBe("John Doe");
      expect(vm.name).toBe("John Doe");
    } finally {
      await stop();
    }
  });

  it("user typing updates view model", async () => {
    const { host, vm, stop, ctx } = await startApp(
      '<input type="text" class="input" value.bind="name">',
      { name: "" },
    );

    try {
      const input = host.querySelector(".input") as HTMLInputElement;
      expect(input.value).toBe("");

      // User types
      typeInInput(input, "Hello World", ctx);
      await flush();

      expect(input.value).toBe("Hello World");
      expect(vm.name).toBe("Hello World");
    } finally {
      await stop();
    }
  });

  it("view model change updates input", async () => {
    const { host, vm, stop } = await startApp(
      '<input type="text" class="input" value.bind="name">',
      { name: "Initial" },
    );

    try {
      const input = host.querySelector(".input") as HTMLInputElement;
      expect(input.value).toBe("Initial");

      // VM change
      vm.name = "Updated";
      await flush();

      expect(input.value).toBe("Updated");
    } finally {
      await stop();
    }
  });

  it("input in repeat: individual editing", async () => {
    const { host, vm, stop, ctx } = await startApp(
      `<div repeat.for="user of users" class="user">
        <input type="text" class="name-input" value.bind="user.name">
      </div>`,
      {
        users: [
          { name: "Alice" },
          { name: "Bob" },
        ],
      },
    );

    try {
      const inputs = host.querySelectorAll(".name-input") as NodeListOf<HTMLInputElement>;
      expect(inputs.length).toBe(2);

      // Initial values
      expect(inputs[0]!.value).toBe("Alice");
      expect(inputs[1]!.value).toBe("Bob");

      // Edit first input
      typeInInput(inputs[0]!, "Alice Updated", ctx);
      await flush();

      expect(inputs[0]!.value).toBe("Alice Updated");
      expect((vm.users as Array<{ name: string }>)[0]!.name).toBe("Alice Updated");

      // Second input unchanged
      expect(inputs[1]!.value).toBe("Bob");
    } finally {
      await stop();
    }
  });
});

// =============================================================================
// Select Two-Way Binding
// =============================================================================

describe("Form Two-Way: Select", () => {
  it("preserves initial selection", async () => {
    const { host, vm, stop } = await startApp(
      `<select class="sel" value.bind="country">
        <option value="us">United States</option>
        <option value="uk">United Kingdom</option>
        <option value="ca">Canada</option>
      </select>`,
      { country: "uk" },
    );

    try {
      const select = host.querySelector(".sel") as HTMLSelectElement;
      expect(select.value).toBe("uk");
      expect(vm.country).toBe("uk");
    } finally {
      await stop();
    }
  });

  it("user selection updates view model", async () => {
    const { host, vm, stop, ctx } = await startApp(
      `<select class="sel" value.bind="country">
        <option value="us">United States</option>
        <option value="uk">United Kingdom</option>
        <option value="ca">Canada</option>
      </select>`,
      { country: "us" },
    );

    try {
      const select = host.querySelector(".sel") as HTMLSelectElement;
      expect(select.value).toBe("us");

      // User selects different option
      selectOption(select, "ca", ctx);
      await flush();

      expect(select.value).toBe("ca");
      expect(vm.country).toBe("ca");
    } finally {
      await stop();
    }
  });

  it("view model change updates selection", async () => {
    const { host, vm, stop } = await startApp(
      `<select class="sel" value.bind="country">
        <option value="us">United States</option>
        <option value="uk">United Kingdom</option>
        <option value="ca">Canada</option>
      </select>`,
      { country: "us" },
    );

    try {
      const select = host.querySelector(".sel") as HTMLSelectElement;
      expect(select.value).toBe("us");

      // VM change
      vm.country = "uk";
      await flush();

      expect(select.value).toBe("uk");
    } finally {
      await stop();
    }
  });

  it("select with repeat.for options", async () => {
    const { host, vm, stop, ctx } = await startApp(
      `<select class="sel" value.bind="selected">
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

    try {
      const select = host.querySelector(".sel") as HTMLSelectElement;
      expect(select.value).toBe("b");

      // User changes selection
      selectOption(select, "c", ctx);
      await flush();

      expect(select.value).toBe("c");
      expect(vm.selected).toBe("c");
    } finally {
      await stop();
    }
  });
});

// =============================================================================
// Textarea Two-Way Binding
// =============================================================================

describe("Form Two-Way: Textarea", () => {
  it("preserves initial content", async () => {
    const { host, vm, stop } = await startApp(
      '<textarea class="ta" value.bind="message"></textarea>',
      { message: "Hello, World!" },
    );

    try {
      const textarea = host.querySelector(".ta") as HTMLTextAreaElement;
      expect(textarea.value).toBe("Hello, World!");
      expect(vm.message).toBe("Hello, World!");
    } finally {
      await stop();
    }
  });

  it("user editing updates view model", async () => {
    const { host, vm, stop, ctx } = await startApp(
      '<textarea class="ta" value.bind="message"></textarea>',
      { message: "" },
    );

    try {
      const textarea = host.querySelector(".ta") as HTMLTextAreaElement;

      // Simulate typing
      textarea.value = "New content";
      textarea.dispatchEvent(new ctx.InputEvent("input", { bubbles: true }));
      await flush();

      expect(textarea.value).toBe("New content");
      expect(vm.message).toBe("New content");
    } finally {
      await stop();
    }
  });

  it("view model change updates textarea", async () => {
    const { host, vm, stop } = await startApp(
      '<textarea class="ta" value.bind="message"></textarea>',
      { message: "Initial" },
    );

    try {
      const textarea = host.querySelector(".ta") as HTMLTextAreaElement;
      expect(textarea.value).toBe("Initial");

      // VM change
      vm.message = "Updated message";
      await flush();

      expect(textarea.value).toBe("Updated message");
    } finally {
      await stop();
    }
  });
});

// =============================================================================
// Complex Scenarios
// =============================================================================

describe("Form Two-Way: Complex Scenarios", () => {
  it("form inputs inside if/else that toggles", async () => {
    const { host, vm, stop, ctx } = await startApp(
      `<div if.bind="showForm">
        <input type="text" class="input" value.bind="name">
      </div>
      <div else class="placeholder">Form hidden</div>`,
      { showForm: true, name: "Test" },
    );

    try {
      let input = host.querySelector(".input") as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.value).toBe("Test");

      // Edit while visible
      typeInInput(input, "Edited", ctx);
      await flush();
      expect(vm.name).toBe("Edited");

      // Hide form
      vm.showForm = false;
      await flush();

      expect(host.querySelector(".input")).toBeNull();
      expect(host.querySelector(".placeholder")).not.toBeNull();

      // Show form again - value should be preserved in VM
      vm.showForm = true;
      await flush();

      input = host.querySelector(".input") as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.value).toBe("Edited");
    } finally {
      await stop();
    }
  });

  it("form inputs in repeat with array push", async () => {
    const { host, vm, stop, ctx } = await startApp(
      `<div repeat.for="todo of todos" class="todo">
        <input type="checkbox" class="done" checked.bind="todo.done">
        <input type="text" class="text" value.bind="todo.text">
      </div>`,
      {
        todos: [
          { text: "First", done: false },
        ],
      },
    );

    try {
      expect(host.querySelectorAll(".todo").length).toBe(1);

      // Push new item
      (vm.todos as Array<{ text: string; done: boolean }>).push({ text: "Second", done: true });
      await flush();

      expect(host.querySelectorAll(".todo").length).toBe(2);

      const checkboxes = host.querySelectorAll(".done") as NodeListOf<HTMLInputElement>;
      const inputs = host.querySelectorAll(".text") as NodeListOf<HTMLInputElement>;

      expect(checkboxes[0]!.checked).toBe(false);
      expect(checkboxes[1]!.checked).toBe(true);
      expect(inputs[0]!.value).toBe("First");
      expect(inputs[1]!.value).toBe("Second");

      // Edit new item
      typeInInput(inputs[1]!, "Second Updated", ctx);
      await flush();

      expect((vm.todos as Array<{ text: string }>)[1]!.text).toBe("Second Updated");
    } finally {
      await stop();
    }
  });

  it("todo app: checkbox toggle updates completed state", async () => {
    const { host, vm, stop, ctx } = await startApp(
      `<ul class="todo-list">
        <li repeat.for="todo of todos" class="todo-item \${todo.completed ? 'completed' : ''}">
          <input type="checkbox" class="toggle" checked.bind="todo.completed">
          <span class="text">\${todo.text}</span>
        </li>
      </ul>`,
      {
        todos: [
          { text: "Learn Aurelia", completed: true },
          { text: "Build app", completed: false },
          { text: "Deploy", completed: false },
        ],
      },
    );

    try {
      const checkboxes = host.querySelectorAll(".toggle") as NodeListOf<HTMLInputElement>;
      const items = host.querySelectorAll(".todo-item");

      // Initial state
      expect(checkboxes[0]!.checked).toBe(true);
      expect(checkboxes[1]!.checked).toBe(false);
      expect(checkboxes[2]!.checked).toBe(false);
      expect(items[0]!.classList.contains("completed")).toBe(true);
      expect(items[1]!.classList.contains("completed")).toBe(false);

      // Toggle second todo
      clickCheckbox(checkboxes[1]!, ctx);
      await flush();

      expect(checkboxes[1]!.checked).toBe(true);
      expect((vm.todos as Array<{ completed: boolean }>)[1]!.completed).toBe(true);

      // Class should update (if binding works)
      const updatedItems = host.querySelectorAll(".todo-item");
      expect(updatedItems[1]!.classList.contains("completed")).toBe(true);
    } finally {
      await stop();
    }
  });

  it("combined: text input with checkbox toggle", async () => {
    const { host, vm, stop, ctx } = await startApp(
      `<form class="user-form">
        <input type="text" class="name" value.bind="name">
        <input type="checkbox" class="active" checked.bind="isActive">
        <span class="status">\${isActive ? 'Active' : 'Inactive'}: \${name}</span>
      </form>`,
      { name: "John", isActive: true },
    );

    try {
      const nameInput = host.querySelector(".name") as HTMLInputElement;
      const activeCheckbox = host.querySelector(".active") as HTMLInputElement;
      const status = host.querySelector(".status")!;

      expect(nameInput.value).toBe("John");
      expect(activeCheckbox.checked).toBe(true);
      expect(status.textContent).toContain("Active: John");

      // Update name
      typeInInput(nameInput, "Jane", ctx);
      await flush();

      expect(vm.name).toBe("Jane");
      expect(status.textContent).toContain("Jane");

      // Toggle active
      clickCheckbox(activeCheckbox, ctx);
      await flush();

      expect(vm.isActive).toBe(false);
      expect(status.textContent).toContain("Inactive");
    } finally {
      await stop();
    }
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("Form Two-Way: Edge Cases", () => {
  it("handles empty string to value and back", async () => {
    const { host, vm, stop, ctx } = await startApp(
      '<input type="text" class="input" value.bind="value">',
      { value: "Initial" },
    );

    try {
      const input = host.querySelector(".input") as HTMLInputElement;

      // Clear input
      typeInInput(input, "", ctx);
      await flush();

      expect(input.value).toBe("");
      expect(vm.value).toBe("");

      // Type again
      typeInInput(input, "New value", ctx);
      await flush();

      expect(input.value).toBe("New value");
      expect(vm.value).toBe("New value");
    } finally {
      await stop();
    }
  });

  it("handles rapid checkbox toggles", async () => {
    const { host, vm, stop, ctx } = await startApp(
      '<input type="checkbox" class="cb" checked.bind="checked">',
      { checked: false },
    );

    try {
      const checkbox = host.querySelector(".cb") as HTMLInputElement;

      // Rapid toggles
      clickCheckbox(checkbox, ctx);
      clickCheckbox(checkbox, ctx);
      clickCheckbox(checkbox, ctx);
      await flush();

      // Should end up checked (odd number of toggles)
      expect(checkbox.checked).toBe(true);
      expect(vm.checked).toBe(true);
    } finally {
      await stop();
    }
  });

  it("handles null/undefined initial values gracefully", async () => {
    const { host, vm, stop } = await startApp(
      '<input type="text" class="input" value.bind="value">',
      { value: null as unknown as string },
    );

    try {
      const input = host.querySelector(".input") as HTMLInputElement;
      // null should become empty string in input
      expect(input.value).toBe("");
    } finally {
      await stop();
    }
  });
});
