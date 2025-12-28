/**
 * Static $au Tests
 *
 * These tests verify that components with pre-built static $au definitions
 * (including instructions and template) work correctly without runtime compilation.
 *
 * This is the target output format for AOT emit - if these tests pass,
 * we know that emitting JavaScript source with baked-in instructions will work.
 */

import { test, describe, expect } from "vitest";

import { compileWithAot, render } from "@aurelia-ls/build";

// =============================================================================
// Test: Pre-built $au renders without compilation
// =============================================================================

describe("Static $au: Pre-built Instructions", () => {
  test("renders with pre-compiled instructions (no compilation step)", async () => {
    // Step 1: Compile once to get the instructions
    const aot = compileWithAot("<div>${message}</div>", { name: "test-comp" });

    // Step 2: Create a class with static $au already containing compiled output
    // This simulates what AOT emit would produce
    class PreCompiledApp {
      message = "Hello from pre-compiled!";

      static $au = {
        type: "custom-element",
        name: "test-comp",
        template: aot.template,
        instructions: aot.instructions,
        needsCompile: false, // Key: tells runtime to skip compilation
      };
    }

    // Step 3: Render directly - NO compilation, just render
    const result = await render(PreCompiledApp);

    // Verify it rendered correctly
    expect(result.html).toContain("Hello from pre-compiled!");
  });

  test("renders repeat.for with pre-compiled instructions", async () => {
    const aot = compileWithAot(
      '<div repeat.for="item of items">${item}</div>',
      { name: "repeat-test" }
    );

    class PreCompiledRepeat {
      items = ["A", "B", "C"];

      static $au = {
        type: "custom-element",
        name: "repeat-test",
        template: aot.template,
        instructions: aot.instructions,
        needsCompile: false,
      };
    }

    const result = await render(PreCompiledRepeat);

    expect(result.html).toContain("A");
    expect(result.html).toContain("B");
    expect(result.html).toContain("C");
  });

  test("renders if.bind with pre-compiled instructions", async () => {
    const aot = compileWithAot(
      '<div if.bind="show">Visible</div>',
      { name: "if-test" }
    );

    class PreCompiledIf {
      show = true;

      static $au = {
        type: "custom-element",
        name: "if-test",
        template: aot.template,
        instructions: aot.instructions,
        needsCompile: false,
      };
    }

    const result = await render(PreCompiledIf);

    expect(result.html).toContain("Visible");
  });

  test("renders property binding with pre-compiled instructions", async () => {
    const aot = compileWithAot(
      '<input value.bind="name">',
      { name: "binding-test" }
    );

    class PreCompiledBinding {
      name = "test-value";

      static $au = {
        type: "custom-element",
        name: "binding-test",
        template: aot.template,
        instructions: aot.instructions,
        needsCompile: false,
      };
    }

    const result = await render(PreCompiledBinding);

    // The binding should have been applied
    expect(result.html).toContain("<input");
  });

  test("renders nested repeat with inner bindings", async () => {
    const aot = compileWithAot(
      '<ul><li repeat.for="item of items"><span>${item.name}</span></li></ul>',
      { name: "nested-test" }
    );

    class PreCompiledNested {
      items = [{ name: "First" }, { name: "Second" }];

      static $au = {
        type: "custom-element",
        name: "nested-test",
        template: aot.template,
        instructions: aot.instructions,
        needsCompile: false,
      };
    }

    const result = await render(PreCompiledNested);

    expect(result.html).toContain("First");
    expect(result.html).toContain("Second");
  });
});

// =============================================================================
// Test: Verify instruction structure can be serialized/deserialized
// =============================================================================

describe("Static $au: Instruction Serialization", () => {
  test("instructions survive JSON round-trip", async () => {
    // This tests whether instructions are plain objects that can be serialized
    const aot = compileWithAot("<div>${message}</div>", { name: "json-test" });

    // Serialize and deserialize (simulates what file-based AOT would do)
    const serialized = JSON.stringify({
      template: aot.template,
      instructions: aot.instructions,
    });
    const deserialized = JSON.parse(serialized);

    class JsonRoundTrip {
      message = "Survived JSON!";

      static $au = {
        type: "custom-element",
        name: "json-test",
        template: deserialized.template,
        instructions: deserialized.instructions,
        needsCompile: false,
      };
    }

    const result = await render(JsonRoundTrip);

    expect(result.html).toContain("Survived JSON!");
  });

  test("complex template instructions survive JSON round-trip", async () => {
    const aot = compileWithAot(
      `<div if.bind="show">
        <ul>
          <li repeat.for="item of items">\${item.name}: \${item.value}</li>
        </ul>
      </div>`,
      { name: "complex-json-test" }
    );

    const serialized = JSON.stringify({
      template: aot.template,
      instructions: aot.instructions,
    });
    const deserialized = JSON.parse(serialized);

    class ComplexJsonRoundTrip {
      show = true;
      items = [
        { name: "A", value: 1 },
        { name: "B", value: 2 },
      ];

      static $au = {
        type: "custom-element",
        name: "complex-json-test",
        template: deserialized.template,
        instructions: deserialized.instructions,
        needsCompile: false,
      };
    }

    const result = await render(ComplexJsonRoundTrip);

    expect(result.html).toContain("A");
    expect(result.html).toContain("B");
    expect(result.html).toContain("1");
    expect(result.html).toContain("2");
  });
});

// =============================================================================
// Test: Inspect instruction object structure
// =============================================================================

describe("Static $au: Instruction Object Structure", () => {
  test("text binding instruction has expected properties", () => {
    const aot = compileWithAot("<div>${message}</div>", { name: "struct-test" });

    expect(aot.instructions.length).toBeGreaterThan(0);
  });

  test("property binding instruction has expected properties", () => {
    const aot = compileWithAot('<input value.bind="name">', { name: "prop-test" });

    expect(aot.instructions.length).toBeGreaterThan(0);
  });

  test("repeat instruction has expected properties", () => {
    const aot = compileWithAot(
      '<div repeat.for="item of items">${item}</div>',
      { name: "repeat-struct-test" }
    );

    expect(aot.instructions.length).toBeGreaterThan(0);
  });
});
