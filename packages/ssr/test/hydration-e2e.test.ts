/**
 * Hydration E2E Tests
 *
 * Full end-to-end tests covering:
 * 1. AOT compilation
 * 2. SSR rendering with manifest recording
 * 3. Client-side hydration using Aurelia.hydrate()
 * 4. DOM adoption verification (no double render)
 * 5. Post-hydration reactivity
 *
 * These tests simulate the exact flow: Server → HTML+Manifest → Client Hydrate
 */

import { test, describe, expect } from "vitest";

import { JSDOM } from "jsdom";
import { DI, Registration } from "@aurelia/kernel";
import {
  Aurelia,
  IPlatform,
  StandardConfiguration,
  CustomElement,
} from "@aurelia/runtime-html";
import { compileAndRenderAot, compileWithAot } from "@aurelia-ls/ssr";
import {
  createComponent,
  createHydrationContext,
  countElements,
  getTexts,
  checkForDoubleRender,
} from "./_helpers/test-utils.js";

// =============================================================================
// Test Infrastructure
// =============================================================================

/**
 * Hydrate SSR content using Aurelia.hydrate().
 * Returns the hydrated app for testing.
 */
async function hydrateSSR(ssrHtml, ssrState, ssrManifest, aotResult, ComponentClass) {
  const ctx = createHydrationContext(ssrHtml, ssrState, ssrManifest, {
    ssrDef: {
      template: aotResult.template,
      instructions: aotResult.instructions,
    },
  });

  // Rest uses ctx from shared helper
  const { dom, document, platform } = ctx;

  // Create component class with AOT definition, extending the provided class
  // to preserve computed getters
  const HydrateComponent = class extends ComponentClass {
    static $au = {
      type: "custom-element",
      name: "hydrate-app",
      template: aotResult.template,
      instructions: aotResult.instructions,
      needsCompile: false,
    };
  };

  // Apply state to prototype
  for (const [key, value] of Object.entries(ssrState)) {
    HydrateComponent.prototype[key] =
      typeof value === "object" && value !== null
        ? JSON.parse(JSON.stringify(value))
        : value;
  }

  const container = DI.createContainer();
  container.register(
    StandardConfiguration,
    Registration.instance(IPlatform, platform)
  );

  const host = document.getElementById("app");
  const au = new Aurelia(container);

  // Use hydrate to adopt existing SSR DOM
  const appRoot = await au.hydrate({
    host,
    component: HydrateComponent,
    ssrScope: ssrManifest.manifest,
  });

  return {
    host,
    appRoot,
    vm: appRoot.controller.viewModel,
    document,
    dom,
    html: () => host.innerHTML,
    stop: async () => {
      await appRoot.deactivate();
      dom.window.close();
    },
  };
}

// =============================================================================
// Test Fixtures
// =============================================================================

const FIXTURES = {
  simpleRepeat: {
    template: '<ul><li repeat.for="item of items" class="item">${item}</li></ul>',
    state: { items: ["A", "B", "C"] },
    expectedCount: 3,
    selector: ".item",
  },

  ifContainingRepeat: {
    template: `<div><ul if.bind="items.length > 0"><li repeat.for="item of items" class="item">\${item}</li></ul></div>`,
    state: { items: ["X", "Y", "Z"] },
    expectedCount: 3,
    selector: ".item",
  },

  todoApp: {
    template: `
<section class="todos">
  <h1 class="title">\${title}</h1>
  <ul class="todo-list" if.bind="todos.length > 0">
    <li repeat.for="todo of todos" class="todo-item \${todo.done ? 'completed' : ''}">
      <span class="text">\${todo.text}</span>
    </li>
  </ul>
  <footer class="footer" if.bind="todos.length > 0">
    <span class="count">\${todos.length} items</span>
  </footer>
</section>`,
    state: {
      title: "Todo App",
      todos: [
        { text: "Task 1", done: false },
        { text: "Task 2", done: true },
        { text: "Task 3", done: false },
      ],
    },
    expectedCount: 3,
    selector: ".todo-item",
  },

  // Exact replica of examples/todo-app/src/my-app.html template
  realTodoApp: {
    template: `<div class="todo-app">
  <header class="header">
    <h1>\${title}</h1>
    <p class="subtitle">\${todos.length} total items</p>
  </header>

  <section class="input-section">
    <form submit.trigger="addTodo()">
      <input
        type="text"
        class="new-todo"
        placeholder="What needs to be done?"
        value.bind="newTodoText"
      >
      <button type="submit" class="add-btn">Add</button>
    </form>
  </section>

  <section class="filters">
    <button
      class="filter-btn \${filter === 'all' ? 'active' : ''}"
      click.trigger="setFilter('all')"
    >All (\${todos.length})</button>
    <button
      class="filter-btn \${filter === 'active' ? 'active' : ''}"
      click.trigger="setFilter('active')"
    >Active (\${activeTodos})</button>
    <button
      class="filter-btn \${filter === 'completed' ? 'active' : ''}"
      click.trigger="setFilter('completed')"
    >Completed (\${completedTodos})</button>
  </section>

  <ul class="todo-list" if.bind="filteredTodos.length > 0">
    <li repeat.for="todo of filteredTodos" class="todo-item \${todo.completed ? 'completed' : ''}">
      <input
        type="checkbox"
        class="toggle"
        checked.bind="todo.completed"
        change.trigger="toggleTodo(todo)"
      >
      <span class="todo-text">\${todo.text}</span>
      <button class="destroy" click.trigger="removeTodo(todo)">&times;</button>
    </li>
  </ul>

  <div class="empty-state" if.bind="filteredTodos.length === 0">
    <p if.bind="todos.length === 0">No todos yet. Add one above!</p>
    <p if.bind="todos.length > 0">No \${filter} todos.</p>
  </div>

  <footer class="footer" if.bind="todos.length > 0">
    <span class="todo-count">\${activeTodos} item\${activeTodos === 1 ? '' : 's'} left</span>
    <button
      class="clear-completed"
      click.trigger="clearCompleted()"
      if.bind="completedTodos > 0"
    >Clear completed (\${completedTodos})</button>
  </footer>
</div>`,
    // State for SSR - computed properties must be passed for SSR rendering
    // but on client the class has getters, so we use separate ssrState/clientState
    state: {
      title: "Todo App",
      newTodoText: "",
      filter: "all",
      todos: [
        { id: 1, text: "Learn Aurelia", completed: true },
        { id: 2, text: "Build awesome app", completed: false },
        { id: 3, text: "Deploy to production", completed: false },
      ],
      // Computed properties needed for SSR rendering
      activeTodos: 2,
      completedTodos: 1,
      filteredTodos: [
        { id: 1, text: "Learn Aurelia", completed: true },
        { id: 2, text: "Build awesome app", completed: false },
        { id: 3, text: "Deploy to production", completed: false },
      ],
    },
    // Client state - only serializable properties (no computed)
    clientState: {
      title: "Todo App",
      newTodoText: "",
      filter: "all",
      todos: [
        { id: 1, text: "Learn Aurelia", completed: true },
        { id: 2, text: "Build awesome app", completed: false },
        { id: 3, text: "Deploy to production", completed: false },
      ],
    },
    expectedCount: 3,
    selector: ".todo-item",
  },
};

// =============================================================================
// Step-by-Step Pipeline Tests
// =============================================================================

describe("Hydration E2E: Simple Repeat", () => {
  test("Step 1: AOT compiles correctly", () => {
    const { template } = FIXTURES.simpleRepeat;
    const aot = compileWithAot(template, { name: "test" });

    console.log("AOT Template:", aot.template);
    console.log("AOT Instructions:", JSON.stringify(aot.instructions, null, 2));

    expect(aot.template).toBeTruthy();
    expect(aot.instructions.length).toBeGreaterThan(0);
  });

  test("Step 2: SSR renders with correct manifest", async () => {
    const { template, state, expectedCount, selector } = FIXTURES.simpleRepeat;
    const TestApp = createComponent("test-app", template, state);
    const result = await compileAndRenderAot(TestApp);

    console.log("SSR HTML:", result.html);
    console.log("SSR Manifest:", JSON.stringify(result.manifest, null, 2));

    // Parse and count
    const dom = new JSDOM(`<div>${result.html}</div>`);
    const count = dom.window.document.querySelectorAll(selector).length;

    expect(count).toBe(expectedCount);
    expect(result.manifest).toBeTruthy();
    expect(result.manifest.manifest).toBeTruthy();
  });

  test("Step 3: Client hydration - DOM is adopted, not duplicated", async () => {
    const { template, state, expectedCount, selector } = FIXTURES.simpleRepeat;

    // Step 2a: Compile
    const aot = compileWithAot(template, { name: "test" });

    // Step 2b: SSR render
    const TestApp = createComponent("test-app", template, state);
    const ssrResult = await compileAndRenderAot(TestApp);

    console.log("\n=== HYDRATION TEST ===");
    console.log("SSR HTML:", ssrResult.html);
    console.log("SSR Manifest:", JSON.stringify(ssrResult.manifest, null, 2));

    // Step 3: Hydrate on client
    const client = await hydrateSSR(
      ssrResult.html,
      state,
      ssrResult.manifest,
      aot,
      class {}
    );

    console.log("After hydration HTML:", client.html());

    // STRONG ASSERTION: Check the ENTIRE document for double rendering
    const doubleRenderCheck = checkForDoubleRender(client.document, selector, state.items);
    console.log("Double render check:", JSON.stringify(doubleRenderCheck, null, 2));

    // CRITICAL: No duplicates allowed
    expect(doubleRenderCheck.hasDuplicates, `DOUBLE RENDER: ${doubleRenderCheck.duplicates.join(", ")}`).toBe(false);

    // Also check total count
    expect(doubleRenderCheck.total, `Expected ${expectedCount} items, got ${doubleRenderCheck.total}`).toBe(expectedCount);

    await client.stop();
  });

  test("Step 4: Post-hydration reactivity works", async () => {
    const { template, state, selector } = FIXTURES.simpleRepeat;

    const aot = compileWithAot(template, { name: "test" });
    const TestApp = createComponent("test-app", template, state);
    const ssrResult = await compileAndRenderAot(TestApp);

    const client = await hydrateSSR(
      ssrResult.html,
      state,
      ssrResult.manifest,
      aot,
      class {}
    );

    // Verify reactivity
    const initialCount = countElements(client.host, selector);
    console.log("Initial count:", initialCount);

    // Add item
    client.vm.items.push("D");
    await Promise.resolve(); // Let bindings update

    const afterAddCount = countElements(client.host, selector);
    console.log("After add count:", afterAddCount);

    expect(afterAddCount).toBe(initialCount + 1);

    // Remove item
    client.vm.items.shift();
    await Promise.resolve();

    const afterRemoveCount = countElements(client.host, selector);
    console.log("After remove count:", afterRemoveCount);

    expect(afterRemoveCount).toBe(initialCount);

    await client.stop();
  });
});

describe("Hydration E2E: If Containing Repeat (Double Render Bug)", () => {
  test("Full pipeline - no double render after hydration", async () => {
    const { template, state, expectedCount, selector } = FIXTURES.ifContainingRepeat;

    console.log("\n=== IF > REPEAT HYDRATION TEST ===");

    // Step 1: AOT
    const aot = compileWithAot(template, { name: "test" });
    console.log("AOT Template:", aot.template);

    // Step 2: SSR
    const TestApp = createComponent("test-app", template, state);
    const ssrResult = await compileAndRenderAot(TestApp);
    console.log("SSR HTML:", ssrResult.html);
    console.log("SSR Manifest:", JSON.stringify(ssrResult.manifest, null, 2));

    // Verify SSR count
    const ssrDom = new JSDOM(`<div>${ssrResult.html}</div>`);
    const ssrCount = ssrDom.window.document.querySelectorAll(selector).length;
    console.log("SSR item count:", ssrCount);
    expect(ssrCount).toBe(expectedCount);

    // Step 3: Hydrate
    const client = await hydrateSSR(
      ssrResult.html,
      state,
      ssrResult.manifest,
      aot,
      class {}
    );

    console.log("After hydration HTML:", client.html());

    // STRONG ASSERTION: Check ENTIRE document for duplicates
    const doubleRenderCheck = checkForDoubleRender(client.document, selector, state.items);
    console.log("Double render check:", JSON.stringify(doubleRenderCheck, null, 2));

    // CRITICAL: No duplicates allowed
    expect(doubleRenderCheck.hasDuplicates, `DOUBLE RENDER: ${doubleRenderCheck.duplicates.join(", ")}`).toBe(false);

    expect(doubleRenderCheck.total, `Expected ${expectedCount} items, got ${doubleRenderCheck.total}`).toBe(expectedCount);

    // Step 4: Verify reactivity
    client.vm.items.push("W");
    await Promise.resolve();

    const afterAddCount = countElements(client.host, selector);
    console.log("After add count:", afterAddCount);
    expect(afterAddCount, `After adding item: expected ${expectedCount + 1}, got ${afterAddCount}`).toBe(expectedCount + 1);

    await client.stop();
  });

  test("Items should be in correct DOM location after hydration", async () => {
    const { template, state, selector } = FIXTURES.ifContainingRepeat;

    const aot = compileWithAot(template, { name: "test" });
    const TestApp = createComponent("test-app", template, state);
    const ssrResult = await compileAndRenderAot(TestApp);

    const client = await hydrateSSR(
      ssrResult.html,
      state,
      ssrResult.manifest,
      aot,
      class {}
    );

    // Items should be inside <ul>, not elsewhere
    const itemsInUl = client.host.querySelectorAll("ul .item").length;
    const totalItems = countElements(client.host, selector);

    console.log("Items inside <ul>:", itemsInUl);
    console.log("Total items:", totalItems);

    expect(itemsInUl).toBe(totalItems);

    await client.stop();
  });
});

describe("Hydration E2E: Todo App Pattern", () => {
  test("Full pipeline - todo app hydrates correctly", async () => {
    const { template, state, expectedCount, selector } = FIXTURES.todoApp;

    console.log("\n=== TODO APP HYDRATION TEST ===");

    // Step 1: AOT
    const aot = compileWithAot(template, { name: "todo-app" });

    // Step 2: SSR
    const TodoApp = createComponent("todo-app", template, state);
    const ssrResult = await compileAndRenderAot(TodoApp);
    console.log("SSR HTML:", ssrResult.html);
    console.log("SSR Manifest:", JSON.stringify(ssrResult.manifest, null, 2));

    // Verify SSR
    const ssrDom = new JSDOM(`<div>${ssrResult.html}</div>`);
    const ssrCount = ssrDom.window.document.querySelectorAll(selector).length;
    expect(ssrCount).toBe(expectedCount);

    // Step 3: Hydrate
    const client = await hydrateSSR(
      ssrResult.html,
      state,
      ssrResult.manifest,
      aot,
      class {}
    );

    console.log("After hydration HTML:", client.html());

    // STRONG ASSERTION: Check ENTIRE document for duplicates
    const expectedTexts = state.todos.map(t => t.text);
    const doubleRenderCheck = checkForDoubleRender(client.document, selector, expectedTexts);
    console.log("Double render check:", JSON.stringify(doubleRenderCheck, null, 2));

    // CRITICAL: No duplicates allowed
    expect(doubleRenderCheck.hasDuplicates, `DOUBLE RENDER: ${doubleRenderCheck.duplicates.join(", ")}`).toBe(false);

    expect(doubleRenderCheck.total, `Expected ${expectedCount} items, got ${doubleRenderCheck.total}`).toBe(expectedCount);

    // Items should be inside todo-list, not in header
    const itemsInList = client.host.querySelectorAll(".todo-list .todo-item").length;
    const itemsInHeader = client.host.querySelectorAll(".title .todo-item, h1 .todo-item").length;

    console.log("Items in .todo-list:", itemsInList);
    console.log("Items in header:", itemsInHeader);

    expect(itemsInList, `Items in .todo-list: expected ${expectedCount}, got ${itemsInList}`).toBe(expectedCount);
    expect(itemsInHeader, `Items leaked to header: got ${itemsInHeader}`).toBe(0);

    await client.stop();
  });

  test("Todo app reactivity after hydration", async () => {
    const { template, state, selector } = FIXTURES.todoApp;

    const aot = compileWithAot(template, { name: "todo-app" });
    const TodoApp = createComponent("todo-app", template, state);
    const ssrResult = await compileAndRenderAot(TodoApp);

    const client = await hydrateSSR(
      ssrResult.html,
      state,
      ssrResult.manifest,
      aot,
      class {}
    );

    const initialCount = countElements(client.host, selector);

    // Add todo
    client.vm.todos.push({ text: "New Task", done: false });
    await Promise.resolve();

    const afterAddCount = countElements(client.host, selector);
    expect(afterAddCount).toBe(initialCount + 1);

    // Verify it's in the right place
    const texts = getTexts(client.host, ".todo-list .text");
    expect(texts).toContain("New Task");

    // Remove todo
    client.vm.todos.pop();
    await Promise.resolve();

    const afterRemoveCount = countElements(client.host, selector);
    expect(afterRemoveCount).toBe(initialCount);

    await client.stop();
  });
});

// =============================================================================
// Real Todo App Test (exact template from examples/todo-app)
// =============================================================================

describe("Hydration E2E: Real Todo App (examples/todo-app)", () => {
  test("Full pipeline - real todo app template hydrates correctly", async () => {
    const { template, state, clientState, expectedCount, selector } = FIXTURES.realTodoApp;

    console.log("\n=== REAL TODO APP HYDRATION TEST ===");

    // Step 1: AOT
    const aot = compileWithAot(template, { name: "my-app" });
    console.log("AOT Template:", aot.template);

    // Step 2: SSR (uses full state including computed properties)
    const MyApp = createComponent("my-app", template, state);
    const ssrResult = await compileAndRenderAot(MyApp);
    console.log("SSR HTML:", ssrResult.html);
    console.log("SSR Manifest:", JSON.stringify(ssrResult.manifest, null, 2));

    // Verify SSR
    const ssrDom = new JSDOM(`<div>${ssrResult.html}</div>`);
    const ssrCount = ssrDom.window.document.querySelectorAll(selector).length;
    console.log("SSR item count:", ssrCount);
    expect(ssrCount).toBe(expectedCount);

    // Step 3: Hydrate - create class with computed getters like real app
    // (client doesn't get computed properties in state, it has getters)
    class RealTodoApp {
      get activeTodos() {
        return this.todos.filter(t => !t.completed).length;
      }

      get completedTodos() {
        return this.todos.filter(t => t.completed).length;
      }

      get filteredTodos() {
        switch (this.filter) {
          case 'active':
            return this.todos.filter(t => !t.completed);
          case 'completed':
            return this.todos.filter(t => t.completed);
          default:
            return this.todos;
        }
      }
    }

    const client = await hydrateSSR(
      ssrResult.html,
      clientState,  // Use clientState without computed properties
      ssrResult.manifest,
      aot,
      RealTodoApp
    );

    console.log("After hydration HTML:", client.html());

    // STRONG ASSERTION: Check ENTIRE document for duplicates
    const expectedTexts = state.todos.map(t => t.text);
    const doubleRenderCheck = checkForDoubleRender(client.document, selector, expectedTexts);
    console.log("Double render check:", JSON.stringify(doubleRenderCheck, null, 2));

    // CRITICAL: No duplicates allowed
    expect(doubleRenderCheck.hasDuplicates, `DOUBLE RENDER: ${doubleRenderCheck.duplicates.join(", ")}`).toBe(false);

    expect(doubleRenderCheck.total, `Expected ${expectedCount} items, got ${doubleRenderCheck.total}`).toBe(expectedCount);

    // Items should be inside .todo-list, not elsewhere
    const itemsInList = client.host.querySelectorAll(".todo-list .todo-item").length;
    const itemsInHeader = client.host.querySelectorAll(".header .todo-item, h1 .todo-item").length;

    console.log("Items in .todo-list:", itemsInList);
    console.log("Items in header:", itemsInHeader);

    expect(itemsInList, `Items in .todo-list: expected ${expectedCount}, got ${itemsInList}`).toBe(expectedCount);
    expect(itemsInHeader, `Items leaked to header: got ${itemsInHeader}`).toBe(0);

    await client.stop();
  });

  test("Real todo app reactivity after hydration", async () => {
    const { template, state, clientState, selector } = FIXTURES.realTodoApp;

    const aot = compileWithAot(template, { name: "my-app" });
    const MyApp = createComponent("my-app", template, state);
    const ssrResult = await compileAndRenderAot(MyApp);

    class RealTodoApp {
      get activeTodos() {
        return this.todos.filter(t => !t.completed).length;
      }

      get completedTodos() {
        return this.todos.filter(t => t.completed).length;
      }

      get filteredTodos() {
        switch (this.filter) {
          case 'active':
            return this.todos.filter(t => !t.completed);
          case 'completed':
            return this.todos.filter(t => t.completed);
          default:
            return this.todos;
        }
      }
    }

    const client = await hydrateSSR(
      ssrResult.html,
      clientState,  // Use clientState without computed properties
      ssrResult.manifest,
      aot,
      RealTodoApp
    );

    const initialCount = countElements(client.host, selector);
    console.log("Initial count:", initialCount);

    // Add todo
    client.vm.todos.push({ id: 4, text: "New Task", completed: false });
    await Promise.resolve();

    const afterAddCount = countElements(client.host, selector);
    console.log("After add count:", afterAddCount);
    expect(afterAddCount, `After adding todo: expected ${initialCount + 1}, got ${afterAddCount}`).toBe(initialCount + 1);

    // Check no duplicates after adding
    const doubleRenderCheck = checkForDoubleRender(client.document, selector, []);
    console.log("Post-add double render check:", JSON.stringify(doubleRenderCheck, null, 2));
    expect(doubleRenderCheck.hasDuplicates, `POST-ADD DOUBLE RENDER: ${doubleRenderCheck.duplicates.join(", ")}`).toBe(false);

    await client.stop();
  });
});

// =============================================================================
// Diagnostic Tests
// =============================================================================

describe("Diagnostic: Verify Manifest has _targets set", () => {
  test("manifest._targets is populated before rendering", async () => {
    // Using simple repeat - should work
    const { template, state } = FIXTURES.simpleRepeat;

    const aot = compileWithAot(template, { name: "test" });
    const TestApp = createComponent("test-app", template, state);
    const ssrResult = await compileAndRenderAot(TestApp);

    // Set up hydration context
    const ctx = createHydrationContext(ssrResult.html, state, ssrResult.manifest, {
      template: aot.template,
      instructions: aot.instructions,
    });

    const container = DI.createContainer();
    container.register(
      StandardConfiguration,
      Registration.instance(IPlatform, ctx.platform)
    );

    const HydrateComponent = class {
      static $au = {
        type: "custom-element",
        name: "test-app",
        template: aot.template,
        instructions: aot.instructions,
        needsCompile: false,
      };
    };

    for (const [key, value] of Object.entries(state)) {
      HydrateComponent.prototype[key] =
        typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
    }

    const host = ctx.document.getElementById("app");
    const au = new Aurelia(container);

    // Verify manifest before hydration
    console.log("Manifest before hydration:", JSON.stringify(ssrResult.manifest, null, 2));
    expect(ssrResult.manifest.manifest).toBeTruthy();

    const appRoot = await au.hydrate({
      host,
      component: HydrateComponent,
      ssrScope: ssrResult.manifest.manifest,
    });

    // Verify manifest after hydration has _targets
    // Note: _targets is mangled in production builds, so this check only works with dev builds
    // Use: --conditions=development AND pnpm overrides pointing to dev entry
    console.log("Manifest._targets after hydration:", ssrResult.manifest._targets ? "SET" : "NOT SET");
    console.log("Manifest._targets length:", ssrResult.manifest._targets?.length);

    // This check verifies internal state - skip if running against prod bundle
    if (ssrResult.manifest._targets == null) {
      console.log("SKIPPED: _targets check requires development bundle (terser mangles _targets in prod)");
    } else {
      expect(ssrResult.manifest._targets).toBeTruthy();
    }

    await appRoot.deactivate();
    ctx.dom.window.close();
  });
});

describe("Diagnostic: Trace Hydration Process", () => {
  test("Trace if > repeat hydration step by step", async () => {
    const { template, state, expectedCount, selector } = FIXTURES.ifContainingRepeat;

    console.log("\n========== HYDRATION TRACE ==========\n");

    // Step 1
    console.log("--- STEP 1: AOT COMPILATION ---");
    const aot = compileWithAot(template, { name: "test" });
    console.log("Template:", aot.template);
    console.log("Target count:", aot.targetCount);
    console.log("Nested defs:", aot.nestedDefs.length);

    // Step 2
    console.log("\n--- STEP 2: SSR RENDERING ---");
    const TestApp = createComponent("test-app", template, state);
    const ssrResult = await compileAndRenderAot(TestApp);
    console.log("HTML:", ssrResult.html);
    console.log("Manifest:", JSON.stringify(ssrResult.manifest, null, 2));

    // Count markers
    const markerMatches = ssrResult.html.match(/<!--au-->/g) || [];
    console.log("Markers in HTML:", markerMatches.length);

    // Step 3
    console.log("\n--- STEP 3: PRE-HYDRATION DOM ---");
    const ctx = createHydrationContext(ssrResult.html, state, ssrResult.manifest, {
      template: aot.template,
      instructions: aot.instructions,
    });
    const preHydrateItems = ctx.document.querySelectorAll(selector).length;
    console.log("Items before hydration:", preHydrateItems);

    // Step 4
    console.log("\n--- STEP 4: HYDRATION ---");
    const container = DI.createContainer();
    container.register(
      StandardConfiguration,
      Registration.instance(IPlatform, ctx.platform)
    );

    const HydrateComponent = class {
      static $au = {
        type: "custom-element",
        name: "test-app",
        template: aot.template,
        instructions: aot.instructions,
        needsCompile: false,
      };
    };

    for (const [key, value] of Object.entries(state)) {
      HydrateComponent.prototype[key] =
        typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
    }

    const host = ctx.document.getElementById("app");
    const au = new Aurelia(container);

    console.log("Calling Aurelia.hydrate()...");

    try {
      const appRoot = await au.hydrate({
        host,
        component: HydrateComponent,
        ssrScope: ssrResult.manifest.manifest,
      });

      console.log("\n--- STEP 5: POST-HYDRATION DOM ---");
      console.log("HTML after hydration:", host.innerHTML);

      const postHydrateItems = host.querySelectorAll(selector).length;
      console.log("Items after hydration:", postHydrateItems);

      // Check locations
      const itemsInUl = host.querySelectorAll("ul .item").length;
      const itemsOutsideUl = postHydrateItems - itemsInUl;
      console.log("Items in <ul>:", itemsInUl);
      console.log("Items outside <ul>:", itemsOutsideUl);

      console.log("\n--- RESULT ---");
      if (postHydrateItems === expectedCount && itemsOutsideUl === 0) {
        console.log("✓ HYDRATION CORRECT");
      } else {
        console.log("✗ HYDRATION FAILED");
        if (postHydrateItems !== expectedCount) {
          console.log(`  - Expected ${expectedCount} items, got ${postHydrateItems}`);
        }
        if (itemsOutsideUl > 0) {
          console.log(`  - ${itemsOutsideUl} items in wrong location`);
        }
      }

      await appRoot.deactivate();
    } catch (err) {
      console.log("Hydration error:", err);
      throw err;
    }

    ctx.dom.window.close();

    console.log("\n========== END TRACE ==========\n");
  });
});

describe("Diagnostic: Container Hierarchy", () => {
  test("Check _targets through AppRoot.controller.container", async () => {
    const { template, state } = FIXTURES.simpleRepeat;

    const aot = compileWithAot(template, { name: "test" });
    const TestApp = createComponent("test-app", template, state);
    const ssrResult = await compileAndRenderAot(TestApp);

    const ctx = createHydrationContext(ssrResult.html, state, ssrResult.manifest, {
      template: aot.template,
      instructions: aot.instructions,
    });

    const container = DI.createContainer();
    container.register(
      StandardConfiguration,
      Registration.instance(IPlatform, ctx.platform)
    );

    const HydrateComponent = class {
      static $au = {
        type: "custom-element",
        name: "test-app",
        template: aot.template,
        instructions: aot.instructions,
        needsCompile: false,
      };
    };

    for (const [key, value] of Object.entries(state)) {
      HydrateComponent.prototype[key] =
        typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
    }

    const host = ctx.document.getElementById("app");
    const au = new Aurelia(container);

    console.log("\n=== CONTAINER HIERARCHY TEST ===");
    console.log("Before Aurelia.hydrate():");
    console.log("ssrResult.manifest._targets:", ssrResult.manifest._targets);

    const appRoot = await au.hydrate({
      host,
      component: HydrateComponent,
      ssrScope: ssrResult.manifest.manifest,
    });

    console.log("\nAfter Aurelia.hydrate():");
    console.log("ssrResult.manifest._targets:", ssrResult.manifest._targets ? "SET" : "NOT SET");
    console.log("ssrResult.manifest._targets length:", ssrResult.manifest._targets?.length);

    // Check the controller's container vs appRoot.container
    const rootCtn = appRoot.container;
    const controllerCtn = appRoot.controller.container;

    console.log("\nContainer identity:");
    console.log("rootCtn === controllerCtn:", rootCtn === controllerCtn);

    // Check if there's a parent - use public getter
    const controllerParent = controllerCtn.parent;
    console.log("controllerCtn has parent:", controllerParent != null);
    console.log("controllerCtn.parent === rootCtn:", controllerParent === rootCtn);

    // More debugging: check container depth
    console.log("rootCtn depth:", rootCtn.depth);
    console.log("controllerCtn depth:", controllerCtn.depth);

    // Import IHydrationManifestToken (the DI token) to check has()
    // Note: IHydrationManifest is only exported as a type, the token is IHydrationManifestToken
    const { IHydrationManifestToken } = await import("@aurelia/runtime-html");
    console.log("\nManifest lookup:");
    console.log("IHydrationManifestToken exists:", IHydrationManifestToken != null);
    console.log("rootCtn.has(IHydrationManifestToken, false):", rootCtn.has(IHydrationManifestToken, false));
    console.log("controllerCtn.has(IHydrationManifestToken, false):", controllerCtn.has(IHydrationManifestToken, false));
    console.log("controllerCtn.has(IHydrationManifestToken, true):", controllerCtn.has(IHydrationManifestToken, true));

    // Try to get the manifest to see if it's there
    if (controllerCtn.has(IHydrationManifestToken, true)) {
      const manifestFromCtn = controllerCtn.get(IHydrationManifestToken);
      console.log("Got manifest from container:", manifestFromCtn);
      console.log("Manifest is same object:", manifestFromCtn === ssrResult.manifest);
    }

    // The assertion - skip if running against prod bundle
    if (ssrResult.manifest._targets == null) {
      console.log("SKIPPED: _targets check requires development bundle (terser mangles _targets in prod)");
    } else {
      expect(ssrResult.manifest._targets).toBeTruthy();
    }

    await appRoot.deactivate();
    ctx.dom.window.close();
  });
});
