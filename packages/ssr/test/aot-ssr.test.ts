/**
 * AOT SSR E2E Tests
 *
 * These tests verify the full AOT SSR pipeline:
 * 1. Compile template with AOT compiler
 * 2. Translate instructions to Aurelia format
 * 3. SSR render to HTML
 * 4. Verify output correctness
 *
 * Components define their own state naturally via class properties.
 * Uses `compileAndRenderAot` which combines compileWithAot + render.
 */

import { test, describe, expect } from "vitest";

import { compileAndRenderAot, compileWithAot } from "@aurelia-ls/ssr";
import { INSTRUCTION_TYPE } from "@aurelia-ls/compiler";
import { createComponent } from "./_helpers/test-utils.js";

// =============================================================================
// Basic AOT Compilation Tests
// =============================================================================

describe("AOT Compilation", () => {
  test("compiles simple text interpolation", () => {
    const result = compileWithAot("<div>${message}</div>", {
      name: "test-comp",
    });

    // All targets use <!--au--> marker comments
    expect(result.template).toContain("<!--au-->");

    // Verify instructions were generated
    expect(result.instructions.length).toBeGreaterThan(0);

    // Verify target count
    expect(result.targetCount).toBeGreaterThan(0);
  });

  test("compiles property binding", () => {
    const result = compileWithAot('<input value.bind="name">', {
      name: "test-comp",
    });

    expect(result.template).toContain("<!--au-->");
    expect(result.instructions.length).toBeGreaterThan(0);
  });

  test("compiles static attributes", () => {
    const result = compileWithAot('<div class="container" id="main"></div>', {
      name: "test-comp",
    });

    expect(result.template).toContain('class="container"');
    expect(result.template).toContain('id="main"');
  });

  test("compiles multiple bindings on same element", () => {
    const result = compileWithAot('<div title.bind="title" class.bind="cls"></div>', {
      name: "test-comp",
    });

    expect(result.instructions.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// AOT SSR Rendering Tests
// =============================================================================

describe("AOT SSR: Basic Rendering", () => {
  test("renders text interpolation", async () => {
    const TestApp = createComponent("test-app", "<div>${message}</div>", {
      message: "Hello AOT",
    });

    const result = await compileAndRenderAot(TestApp);
    expect(result.html).toContain("Hello AOT");
  });

  test("renders multiple interpolations", async () => {
    const TestApp = createComponent("test-app", "<div>${first} ${last}</div>", {
      first: "John",
      last: "Doe",
    });

    const result = await compileAndRenderAot(TestApp);
    expect(result.html).toContain("John");
    expect(result.html).toContain("Doe");
  });

  test("renders nested property access", async () => {
    const TestApp = createComponent("test-app", "<span>${user.name}</span>", {
      user: { name: "Alice" },
    });

    const result = await compileAndRenderAot(TestApp);
    expect(result.html).toContain("Alice");
  });

  test("renders expression in text", async () => {
    const TestApp = createComponent("test-app", "<span>${count + 1}</span>", {
      count: 5,
    });

    const result = await compileAndRenderAot(TestApp);
    expect(result.html).toContain("6");
  });

  test("renders ternary expression", async () => {
    const TestApp = createComponent("test-app", "<span>${active ? 'Yes' : 'No'}</span>", {
      active: true,
    });

    const result = await compileAndRenderAot(TestApp);
    expect(result.html).toContain("Yes");
  });
});

describe("AOT SSR: Property Bindings", () => {
  test("renders value.bind on input", async () => {
    const TestApp = createComponent("test-app", '<input value.bind="name">', {
      name: "test-value",
    });

    const result = await compileAndRenderAot(TestApp);

    // SSR should render the input element with the bound value
    expect(result.html).toContain("<input");
    expect(result.html).toContain('value="test-value"');
  });

  test("renders checked.bind on checkbox", async () => {
    const TestApp = createComponent("test-app", '<input type="checkbox" checked.bind="isChecked">', {
      isChecked: true,
    });

    const result = await compileAndRenderAot(TestApp);

    // Checkbox with checked=true should have checked attribute
    expect(result.html).toContain("checked");
    expect(result.html).toContain("checkbox");
  });
});

describe("AOT SSR: Static Content", () => {
  test("renders static HTML structure", async () => {
    const TestApp = createComponent(
      "test-app",
      '<div class="wrapper"><span class="label">Hello</span></div>',
      {}
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain('class="wrapper"');
    expect(result.html).toContain('class="label"');
    expect(result.html).toContain("Hello");
  });

  test("renders mixed static and dynamic content", async () => {
    const TestApp = createComponent("test-app", '<div class="greeting">Hello, ${name}!</div>', {
      name: "World",
    });

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain('class="greeting"');
    expect(result.html).toContain("Hello,");
    expect(result.html).toContain("World");
  });
});

// =============================================================================
// AOT Compilation Result Inspection
// =============================================================================

describe("AOT Compilation: Result Structure", () => {
  test("provides raw plan and code result", () => {
    const result = compileWithAot("<div>${x}</div>", { name: "test" });

    expect(result.raw).toBeTruthy();
    expect(result.raw.plan).toBeTruthy();
    expect(result.raw.codeResult).toBeTruthy();
  });

  test("provides expression table", () => {
    const result = compileWithAot("<div>${x}</div>", { name: "test" });

    const expressions = result.raw.codeResult.expressions;
    expect(expressions.length).toBeGreaterThan(0);
    expect(expressions[0]?.ast).toBeTruthy();
  });

  test("provides nested definitions for controllers", () => {
    // This test verifies the structure exists, even if empty for simple templates
    const result = compileWithAot("<div>${x}</div>", { name: "test" });

    expect(Array.isArray(result.nestedDefs)).toBe(true);
  });
});

// =============================================================================
// Error Handling
// =============================================================================

describe("AOT Error Handling", () => {
  test("renders 'undefined' text for undefined state property", async () => {
    const TestApp = createComponent("test-app", "<div>${missing}</div>", {});

    const result = await compileAndRenderAot(TestApp);

    // Aurelia renders undefined values as "undefined" text
    expect(result.html).toContain("undefined");
  });

  test("renders 'null' text for null state value", async () => {
    const TestApp = createComponent("test-app", "<div>${value}</div>", {
      value: null,
    });

    const result = await compileAndRenderAot(TestApp);

    // Aurelia renders null values as "null" text
    expect(result.html).toContain("null");
  });
});

// =============================================================================
// AOT Template Controllers
// =============================================================================

describe("AOT Template Controllers", () => {
  test("renders repeat.for controller", async () => {
    const TestApp = createComponent(
      "test-app",
      '<div repeat.for="item of items">${item}</div>',
      { items: ["A", "B", "C"] }
    );

    const result = await compileAndRenderAot(TestApp);

    // Should render all items
    expect(result.html).toContain("A");
    expect(result.html).toContain("B");
    expect(result.html).toContain("C");
  });

  test("renders if.bind controller - true condition", async () => {
    const TestApp = createComponent("test-app", '<div if.bind="show">Visible</div>', {
      show: true,
    });

    const result = await compileAndRenderAot(TestApp);
    expect(result.html).toContain("Visible");
  });

  test("renders if.bind controller - false condition", async () => {
    const TestApp = createComponent("test-app", '<div if.bind="show">Hidden</div>', {
      show: false,
    });

    const result = await compileAndRenderAot(TestApp);

    // When condition is false, the content text should not appear in rendered output
    // (the div may be replaced by a comment marker for hydration)
    expect(result.html).not.toContain(">Hidden<");
  });

  test("renders nested repeat with inner bindings", async () => {
    const TestApp = createComponent(
      "test-app",
      '<ul><li repeat.for="item of items"><span>${item.name}</span></li></ul>',
      { items: [{ name: "First" }, { name: "Second" }] }
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("First");
    expect(result.html).toContain("Second");
  });

  test("renders if containing repeat (todo app pattern)", async () => {
    const TestApp = createComponent(
      "test-app",
      `<ul if.bind="items.length > 0">
        <li repeat.for="item of items">\${item}</li>
      </ul>`,
      { items: ["A", "B", "C"] }
    );

    const result = await compileAndRenderAot(TestApp);

    // Should render all items since condition is true
    expect(result.html).toContain("A");
    expect(result.html).toContain("B");
    expect(result.html).toContain("C");
  });

  test("renders if containing repeat with false condition", async () => {
    const TestApp = createComponent(
      "test-app",
      `<ul if.bind="items.length > 0">
        <li repeat.for="item of items">\${item}</li>
      </ul>`,
      { items: [] }
    );

    const result = await compileAndRenderAot(TestApp);

    // Should not render items since condition is false
    expect(result.html).not.toContain("<li>");
  });

  test("renders repeat with element-level attribute binding", async () => {
    const TestApp = createComponent(
      "test-app",
      '<li repeat.for="item of items" class="${item.done ? \'done\' : \'pending\'}">${item.text}</li>',
      { items: [{ text: "Task 1", done: true }, { text: "Task 2", done: false }] }
    );

    const result = await compileAndRenderAot(TestApp);

    expect(result.html).toContain("Task 1");
    expect(result.html).toContain("Task 2");
    // Check class bindings
    expect(result.html).toContain("done");
    expect(result.html).toContain("pending");
  });

  test("renders todo app structure (if > repeat > inner content)", async () => {
    // This matches the exact structure from my-app.html:
    // <ul if.bind="filteredTodos.length > 0">
    //   <li repeat.for="todo of filteredTodos" class="...">
    //     <input ...>
    //     <span>${todo.text}</span>
    //     <button click.trigger="removeTodo(todo)">&times;</button>
    //   </li>
    // </ul>
    const TestApp = createComponent(
      "test-app",
      `<ul if.bind="todos.length > 0">
        <li repeat.for="todo of todos" class="todo-item \${todo.completed ? 'completed' : ''}">
          <span class="todo-text">\${todo.text}</span>
          <button class="destroy" click.trigger="removeTodo(todo)">&times;</button>
        </li>
      </ul>`,
      {
        todos: [
          { text: "Learn Aurelia", completed: true },
          { text: "Build app", completed: false },
        ],
      }
    );
    // Add the method that the template references
    TestApp.prototype.removeTodo = function(todo) {
      const index = this.todos.indexOf(todo);
      if (index > -1) this.todos.splice(index, 1);
    };

    const result = await compileAndRenderAot(TestApp);

    // Verify items are rendered
    expect(result.html).toContain("Learn Aurelia");
    expect(result.html).toContain("Build app");

    // Verify class interpolation works
    expect(result.html).toContain("completed");

    // Verify the button exists (with the click handler - it won't show in HTML but the element should)
    expect(result.html).toContain("destroy");
    // The × character may be rendered as entity or literal depending on serialization
    expect(result.html).toMatch(/×|&times;/);
  });

  test("compiles repeat.for with key.bind auxiliary binding", async () => {
    // key.bind enables efficient diffing by specifying unique identifier per item
    // Use compileWithAot to inspect the raw compilation output
    const compileResult = compileWithAot(
      '<li repeat.for="item of items; key.bind: item.id">${item.name}</li>',
      { name: "test-comp" }
    );

    // Verify the aux binding was emitted in the raw code result
    const codeResult = compileResult.raw.codeResult;
    const def = codeResult.definition;

    // Find the iteratorBinding instruction
    const htcInst = def.instructions.flat().find(i => i.type === INSTRUCTION_TYPE.hydrateTemplateController);
    expect(htcInst).toBeTruthy();

    // The iteratorBinding should be in the HTC's instructions
    const iteratorInst = htcInst.instructions.find(i => i.type === INSTRUCTION_TYPE.iteratorBinding);
    expect(iteratorInst).toBeTruthy();
    expect(iteratorInst.aux).toBeTruthy();
    expect(iteratorInst.aux.length).toBe(1);
    expect(iteratorInst.aux[0].name).toBe("key");
    expect(iteratorInst.aux[0].exprId).toBeTruthy();

    // Verify the expression exists in the expression table
    const keyExpr = codeResult.expressions.find(e => e.id === iteratorInst.aux[0].exprId);
    expect(keyExpr).toBeTruthy();
    expect(keyExpr.ast.$kind).toBe("AccessMember");

    // Also verify rendering works
    const TestApp = createComponent(
      "test-app",
      '<li repeat.for="item of items; key.bind: item.id">${item.name}</li>',
      { items: [{ id: 1, name: "First" }, { id: 2, name: "Second" }] }
    );
    const renderResult = await compileAndRenderAot(TestApp);
    expect(renderResult.html).toContain("First");
    expect(renderResult.html).toContain("Second");
  });

  test("compiles repeat.for with static key", async () => {
    // Static key (no .bind) uses the property name directly
    const TestApp = createComponent(
      "test-app",
      '<li repeat.for="item of items; key: id">${item.name}</li>',
      { items: [{ id: 1, name: "First" }, { id: 2, name: "Second" }] }
    );

    const result = await compileAndRenderAot(TestApp);

    // Should render correctly
    expect(result.html).toContain("First");
    expect(result.html).toContain("Second");
  });
});

// =============================================================================
// AOT SSR with String Markup Input
// =============================================================================

describe("AOT SSR: String Markup Input", () => {
  test("accepts string markup instead of component class", async () => {
    const result = await compileAndRenderAot(
      "<div>Hello from string markup</div>",
      { name: "string-app" },
    );

    expect(result.html).toContain("Hello from string markup");
    expect(result.aot).toBeDefined();
    expect(result.manifest).toBeDefined();
  });

  test("uses provided name for string markup component", async () => {
    const result = await compileAndRenderAot(
      "<span>${greeting}</span>",
      { name: "greeting-app" },
    );

    expect(result.manifest.root).toBe("greeting-app");
  });

  test("uses default name when not provided for string markup", async () => {
    const result = await compileAndRenderAot("<div>Default</div>");

    expect(result.manifest.root).toBe("generated-app");
  });
});
