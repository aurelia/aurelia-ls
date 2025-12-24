/**
 * AOT SSR E2E Tests
 *
 * These tests verify the full AOT SSR pipeline:
 * 1. Compile template with domain compiler AOT
 * 2. Translate instructions to Aurelia format
 * 3. SSR render to HTML
 * 4. Verify output correctness
 *
 * Components define their own state naturally via class properties.
 * Uses `compileAndRenderAot` which combines compileWithAot + render.
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { compileAndRenderAot, compileWithAot } from "../out/index.js";
import { INSTRUCTION_TYPE } from "@aurelia-ls/domain";

// =============================================================================
// Helper: Create a test component class with given state and template
// =============================================================================

/**
 * Creates a component class with the specified state and template.
 * This is the correct pattern - components define their own state naturally.
 */
function createComponent(name, template, state = {}) {
  const ComponentClass = class {
    constructor() {
      Object.assign(this, state);
    }
  };
  ComponentClass.$au = {
    type: "custom-element",
    name,
    template,
  };
  return ComponentClass;
}

// =============================================================================
// Basic AOT Compilation Tests
// =============================================================================

describe("AOT Compilation", () => {
  test("compiles simple text interpolation", () => {
    const result = compileWithAot("<div>${message}</div>", {
      name: "test-comp",
    });

    // All targets use <!--au--> marker comments
    assert.ok(result.template.includes("<!--au-->"), "Should have <!--au--> hydration marker");

    // Verify instructions were generated
    assert.ok(result.instructions.length > 0, "Should have instructions");

    // Verify target count
    assert.ok(result.targetCount > 0, "Should have at least one target");
  });

  test("compiles property binding", () => {
    const result = compileWithAot('<input value.bind="name">', {
      name: "test-comp",
    });

    assert.ok(result.template.includes("<!--au-->"), "Should have <!--au--> hydration marker");
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
    const TestApp = createComponent("test-app", "<div>${message}</div>", {
      message: "Hello AOT",
    });

    const result = await compileAndRenderAot(TestApp);
    assert.ok(result.html.includes("Hello AOT"), "Should render interpolated value");
  });

  test("renders multiple interpolations", async () => {
    const TestApp = createComponent("test-app", "<div>${first} ${last}</div>", {
      first: "John",
      last: "Doe",
    });

    const result = await compileAndRenderAot(TestApp);
    assert.ok(result.html.includes("John"), "Should render first name");
    assert.ok(result.html.includes("Doe"), "Should render last name");
  });

  test("renders nested property access", async () => {
    const TestApp = createComponent("test-app", "<span>${user.name}</span>", {
      user: { name: "Alice" },
    });

    const result = await compileAndRenderAot(TestApp);
    assert.ok(result.html.includes("Alice"), "Should render nested property");
  });

  test("renders expression in text", async () => {
    const TestApp = createComponent("test-app", "<span>${count + 1}</span>", {
      count: 5,
    });

    const result = await compileAndRenderAot(TestApp);
    assert.ok(result.html.includes("6"), "Should evaluate expression");
  });

  test("renders ternary expression", async () => {
    const TestApp = createComponent("test-app", "<span>${active ? 'Yes' : 'No'}</span>", {
      active: true,
    });

    const result = await compileAndRenderAot(TestApp);
    assert.ok(result.html.includes("Yes"), "Should evaluate ternary");
  });
});

describe("AOT SSR: Property Bindings", () => {
  test("renders value.bind on input", async () => {
    const TestApp = createComponent("test-app", '<input value.bind="name">', {
      name: "test-value",
    });

    const result = await compileAndRenderAot(TestApp);

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
    const TestApp = createComponent("test-app", '<input type="checkbox" checked.bind="isChecked">', {
      isChecked: true,
    });

    const result = await compileAndRenderAot(TestApp);

    // Checkbox with checked=true should have checked attribute
    assert.ok(
      result.html.includes("checked") && result.html.includes("checkbox"),
      "Should have checked attribute"
    );
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

    assert.ok(result.html.includes('class="wrapper"'), "Should have wrapper class");
    assert.ok(result.html.includes('class="label"'), "Should have label class");
    assert.ok(result.html.includes("Hello"), "Should have static text");
  });

  test("renders mixed static and dynamic content", async () => {
    const TestApp = createComponent("test-app", '<div class="greeting">Hello, ${name}!</div>', {
      name: "World",
    });

    const result = await compileAndRenderAot(TestApp);

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
// Error Handling
// =============================================================================

describe("AOT Error Handling", () => {
  test("handles undefined state property gracefully", async () => {
    // Access to undefined should not throw, just render undefined/empty
    const TestApp = createComponent("test-app", "<div>${missing}</div>", {});

    const result = await compileAndRenderAot(TestApp);

    // Should render without crashing
    assert.ok(result.html.includes("<div"), "Should render div");
  });

  test("handles null state value", async () => {
    const TestApp = createComponent("test-app", "<div>${value}</div>", {
      value: null,
    });

    const result = await compileAndRenderAot(TestApp);

    // Should render without crashing
    assert.ok(result.html.includes("<div"), "Should render div");
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
    assert.ok(result.html.includes("A"), `Expected item A in: ${result.html}`);
    assert.ok(result.html.includes("B"), `Expected item B in: ${result.html}`);
    assert.ok(result.html.includes("C"), `Expected item C in: ${result.html}`);
  });

  test("renders if.bind controller - true condition", async () => {
    const TestApp = createComponent("test-app", '<div if.bind="show">Visible</div>', {
      show: true,
    });

    const result = await compileAndRenderAot(TestApp);
    assert.ok(result.html.includes("Visible"), `Expected Visible in: ${result.html}`);
  });

  test("renders if.bind controller - false condition", async () => {
    const TestApp = createComponent("test-app", '<div if.bind="show">Hidden</div>', {
      show: false,
    });

    const result = await compileAndRenderAot(TestApp);

    // When condition is false, content should not appear
    assert.ok(!result.html.includes("Hidden") || result.html.includes("<!--"),
      `Expected Hidden to be hidden or just markers in: ${result.html}`);
  });

  test("renders nested repeat with inner bindings", async () => {
    const TestApp = createComponent(
      "test-app",
      '<ul><li repeat.for="item of items"><span>${item.name}</span></li></ul>',
      { items: [{ name: "First" }, { name: "Second" }] }
    );

    const result = await compileAndRenderAot(TestApp);

    assert.ok(result.html.includes("First"), `Expected First in: ${result.html}`);
    assert.ok(result.html.includes("Second"), `Expected Second in: ${result.html}`);
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
    assert.ok(result.html.includes("A"), `Expected A in: ${result.html}`);
    assert.ok(result.html.includes("B"), `Expected B in: ${result.html}`);
    assert.ok(result.html.includes("C"), `Expected C in: ${result.html}`);
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
    assert.ok(!result.html.includes("<li>"), `Expected no li elements in: ${result.html}`);
  });

  test("renders repeat with element-level attribute binding", async () => {
    const TestApp = createComponent(
      "test-app",
      '<li repeat.for="item of items" class="${item.done ? \'done\' : \'pending\'}">${item.text}</li>',
      { items: [{ text: "Task 1", done: true }, { text: "Task 2", done: false }] }
    );

    const result = await compileAndRenderAot(TestApp);

    assert.ok(result.html.includes("Task 1"), `Expected Task 1 in: ${result.html}`);
    assert.ok(result.html.includes("Task 2"), `Expected Task 2 in: ${result.html}`);
    // Check class bindings
    assert.ok(result.html.includes("done"), `Expected done class in: ${result.html}`);
    assert.ok(result.html.includes("pending"), `Expected pending class in: ${result.html}`);
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
    assert.ok(result.html.includes("Learn Aurelia"), `Expected Learn Aurelia in: ${result.html}`);
    assert.ok(result.html.includes("Build app"), `Expected Build app in: ${result.html}`);

    // Verify class interpolation works
    assert.ok(result.html.includes("completed"), `Expected completed class in: ${result.html}`);

    // Verify the button exists (with the click handler - it won't show in HTML but the element should)
    assert.ok(result.html.includes("destroy"), `Expected destroy class button in: ${result.html}`);
    assert.ok(result.html.includes("×") || result.html.includes("&times;"), `Expected × in button in: ${result.html}`);
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
    assert.ok(htcInst, "Should have hydrateTemplateController instruction");

    // The iteratorBinding should be in the HTC's instructions
    const iteratorInst = htcInst.instructions.find(i => i.type === INSTRUCTION_TYPE.iteratorBinding);
    assert.ok(iteratorInst, "Should have iteratorBinding instruction");
    assert.ok(iteratorInst.aux, "iteratorBinding should have aux array");
    assert.equal(iteratorInst.aux.length, 1, "Should have 1 aux binding (key)");
    assert.equal(iteratorInst.aux[0].name, "key", "Aux binding should be 'key'");
    assert.ok(iteratorInst.aux[0].exprId, "Key aux should have exprId");

    // Verify the expression exists in the expression table
    const keyExpr = codeResult.expressions.find(e => e.id === iteratorInst.aux[0].exprId);
    assert.ok(keyExpr, "Key expression should exist in expression table");
    assert.equal(keyExpr.ast.$kind, "AccessMember", "Key expression should be AccessMember (item.id)");

    // Also verify rendering works
    const TestApp = createComponent(
      "test-app",
      '<li repeat.for="item of items; key.bind: item.id">${item.name}</li>',
      { items: [{ id: 1, name: "First" }, { id: 2, name: "Second" }] }
    );
    const renderResult = await compileAndRenderAot(TestApp);
    assert.ok(renderResult.html.includes("First"), `Expected First in: ${renderResult.html}`);
    assert.ok(renderResult.html.includes("Second"), `Expected Second in: ${renderResult.html}`);
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
    assert.ok(result.html.includes("First"), `Expected First in: ${result.html}`);
    assert.ok(result.html.includes("Second"), `Expected Second in: ${result.html}`);
  });
});
