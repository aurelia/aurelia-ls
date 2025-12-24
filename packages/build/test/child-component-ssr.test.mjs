/**
 * Child Component SSR Tests
 *
 * These tests verify SSR rendering with real component classes and child components:
 * 1. Parent template uses child custom element
 * 2. Both parent and child are AOT-compiled
 * 3. Child class is patched with $au definition
 * 4. renderWithComponents renders the full tree
 *
 * This isolates the SSR pipeline from Vite/file loading to debug the
 * target count mismatch (AUR0757) error.
 */

import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { compileWithAot } from "../out/aot.js";
import { patchComponentDefinition } from "../out/ssr/patch.js";
import { renderWithComponents } from "../out/ssr/render.js";

// =============================================================================
// Test Component Classes (using static $au pattern)
// =============================================================================

/**
 * Simple child component with a bindable and a getter.
 */
class GreetingCard {
  name = "Guest";

  get greeting() {
    return `Hello, ${this.name}!`;
  }

  get nameLength() {
    return this.name.length;
  }

  static $au = {
    type: "custom-element",
    name: "greeting-card",
    bindables: {
      name: { mode: 2 }, // toView
    },
  };
}

/**
 * Root component that uses the child component.
 */
class MyApp {
  appTitle = "Child Component SSR Test";
  userName = "World";

  get timestamp() {
    return new Date().toISOString();
  }

  static $au = {
    type: "custom-element",
    name: "my-app",
    dependencies: [GreetingCard],
  };
}

/**
 * Even simpler child for minimal testing.
 */
class SimpleChild {
  message = "Default";

  static $au = {
    type: "custom-element",
    name: "simple-child",
    bindables: {
      message: { mode: 2 },
    },
  };
}

/**
 * Simple parent for minimal testing.
 */
class SimpleParent {
  static $au = {
    type: "custom-element",
    name: "simple-parent",
    dependencies: [SimpleChild],
  };
}

// =============================================================================
// Test: AOT Compilation for Components
// =============================================================================

describe("Child Component SSR: AOT Compilation", () => {
  test("compiles child component template", () => {
    const childTemplate = `<div class="greeting-card">
  <h2>\${greeting}</h2>
  <p>Name: "\${name}" (\${nameLength} characters)</p>
</div>`;

    const result = compileWithAot(childTemplate, {
      name: "greeting-card",
    });

    console.log("\n=== CHILD AOT COMPILATION ===");
    console.log("Template:", result.template);
    console.log("Instructions length:", result.instructions.length);
    console.log("Instructions:", JSON.stringify(result.instructions, null, 2));
    console.log("Target count:", result.targetCount);

    assert.ok(result.template, "Should produce template");
    assert.ok(result.instructions.length > 0, "Should have instructions");
    assert.ok(result.targetCount > 0, "Should have target count");
  });

  test("compiles parent component template with child element", () => {
    const parentTemplate = `<div>
  <h1>\${appTitle}</h1>
  <greeting-card name.bind="userName"></greeting-card>
  <p>Timestamp: \${timestamp}</p>
</div>`;

    const result = compileWithAot(parentTemplate, {
      name: "my-app",
      // Note: We need to provide semantics/resourceGraph for child element resolution
      // For now, test without it to see what happens
    });

    console.log("\n=== PARENT AOT COMPILATION ===");
    console.log("Template:", result.template);
    console.log("Instructions length:", result.instructions.length);
    console.log("Instructions:", JSON.stringify(result.instructions, null, 2));
    console.log("Target count:", result.targetCount);
    console.log("Nested defs:", result.nestedDefs.length);

    assert.ok(result.template, "Should produce template");
    // Parent should have instructions for its own bindings + child element
    assert.ok(result.instructions.length > 0, "Should have instructions");
  });
});

// =============================================================================
// Test: Component Patching
// =============================================================================

describe("Child Component SSR: Patching", () => {
  test("patchComponentDefinition sets template and instructions", () => {
    // Create a fresh class for this test
    class TestChild {
      message = "Test";

      static $au = {
        type: "custom-element",
        name: "test-child",
        bindables: { message: { mode: 2 } },
      };
    }

    const aot = compileWithAot('<span>${message}</span>', {
      name: "test-child",
    });

    console.log("\n=== BEFORE PATCHING ===");
    console.log("$au.template:", TestChild.$au.template);
    console.log("$au.instructions:", TestChild.$au.instructions);
    console.log("$au.needsCompile:", TestChild.$au.needsCompile);

    patchComponentDefinition(TestChild, aot);

    console.log("\n=== AFTER PATCHING ===");
    console.log("$au.template:", TestChild.$au.template);
    console.log("$au.instructions:", JSON.stringify(TestChild.$au.instructions, null, 2));
    console.log("$au.needsCompile:", TestChild.$au.needsCompile);

    assert.strictEqual(TestChild.$au.template, aot.template, "Template should be patched");
    assert.deepStrictEqual(TestChild.$au.instructions, aot.instructions, "Instructions should be patched");
    assert.strictEqual(TestChild.$au.needsCompile, false, "needsCompile should be false");
    assert.ok(TestChild.$au.bindables, "Bindables should be preserved");
  });

  test("patching preserves bindables from original $au", () => {
    class TestBindableChild {
      static $au = {
        type: "custom-element",
        name: "test-bindable",
        bindables: {
          value: { mode: 2 },
          label: { mode: 1 },
        },
        containerless: true,
      };
    }

    const aot = compileWithAot('<span>${value}: ${label}</span>', {
      name: "test-bindable",
    });

    patchComponentDefinition(TestBindableChild, aot);

    console.log("\n=== PATCHED WITH BINDABLES ===");
    console.log("$au:", JSON.stringify(TestBindableChild.$au, null, 2));

    assert.ok(TestBindableChild.$au.bindables.value, "value bindable should be preserved");
    assert.ok(TestBindableChild.$au.bindables.label, "label bindable should be preserved");
    assert.strictEqual(TestBindableChild.$au.containerless, true, "containerless should be preserved");
  });
});

// =============================================================================
// Test: Minimal renderWithComponents
// =============================================================================

describe("Child Component SSR: Minimal Rendering", () => {
  test("renders simple component without children", async () => {
    // Create a fresh class
    class NoChildComponent {
      message = "Hello SSR";

      static $au = {
        type: "custom-element",
        name: "no-child",
      };
    }

    const aot = compileWithAot('<div>${message}</div>', {
      name: "no-child",
    });

    patchComponentDefinition(NoChildComponent, aot);

    console.log("\n=== RENDERING NO-CHILD COMPONENT ===");
    console.log("$au after patch:", JSON.stringify(NoChildComponent.$au, null, 2));

    const result = await renderWithComponents(NoChildComponent, {
      childComponents: [],
    });

    console.log("Rendered HTML:", result.html);
    console.log("Manifest:", JSON.stringify(result.manifest, null, 2));

    assert.ok(result.html.includes("Hello SSR"), "Should render message");
    assert.ok(result.html.includes("<div"), "Should render div");
  });

  test("renders component with static content only", async () => {
    class StaticComponent {
      static $au = {
        type: "custom-element",
        name: "static-comp",
      };
    }

    const aot = compileWithAot('<div class="static">No bindings here</div>', {
      name: "static-comp",
    });

    patchComponentDefinition(StaticComponent, aot);

    console.log("\n=== RENDERING STATIC COMPONENT ===");
    console.log("Template:", aot.template);
    console.log("Instructions:", aot.instructions);

    const result = await renderWithComponents(StaticComponent, {
      childComponents: [],
    });

    console.log("Rendered HTML:", result.html);

    assert.ok(result.html.includes("No bindings here"), "Should render static text");
    assert.ok(result.html.includes('class="static"'), "Should render class");
  });

  test("verifies instructions match target count", async () => {
    class CountTestComponent {
      a = "A";
      b = "B";
      c = "C";

      static $au = {
        type: "custom-element",
        name: "count-test",
      };
    }

    const template = '<div><span>${a}</span><span>${b}</span><span>${c}</span></div>';
    const aot = compileWithAot(template, { name: "count-test" });

    console.log("\n=== COUNT TEST ===");
    console.log("Template:", aot.template);
    console.log("Instructions array length:", aot.instructions.length);
    console.log("Target count:", aot.targetCount);
    console.log("Instructions:", JSON.stringify(aot.instructions, null, 2));

    // Critical check: instructions.length should match the number of targets
    // This is what AUR0757 checks
    assert.strictEqual(
      aot.instructions.length,
      aot.targetCount,
      `Instructions length (${aot.instructions.length}) should match target count (${aot.targetCount})`
    );

    patchComponentDefinition(CountTestComponent, aot);

    const result = await renderWithComponents(CountTestComponent, {
      childComponents: [],
    });

    console.log("Rendered HTML:", result.html);

    assert.ok(result.html.includes("A"), "Should render A");
    assert.ok(result.html.includes("B"), "Should render B");
    assert.ok(result.html.includes("C"), "Should render C");
  });
});

// =============================================================================
// Test: Child Component Rendering
// =============================================================================

describe("Child Component SSR: Parent-Child Rendering", () => {
  test("renders parent with patched child component", async () => {
    // Create fresh classes
    class Child {
      value = "Child Value";

      static $au = {
        type: "custom-element",
        name: "test-child",
        bindables: { value: { mode: 2 } },
      };
    }

    class Parent {
      parentValue = "Parent Value";

      static $au = {
        type: "custom-element",
        name: "test-parent",
        dependencies: [Child],
      };
    }

    // Compile both templates
    const childAot = compileWithAot('<span class="child">${value}</span>', {
      name: "test-child",
    });

    // For parent, we need to compile with knowledge of the child element
    // This is where ResourceGraph would normally come in
    // For now, compile the parent template
    const parentAot = compileWithAot(
      '<div class="parent"><span>${parentValue}</span><test-child></test-child></div>',
      { name: "test-parent" }
    );

    console.log("\n=== PARENT-CHILD AOT ===");
    console.log("Child template:", childAot.template);
    console.log("Child instructions:", JSON.stringify(childAot.instructions, null, 2));
    console.log("Parent template:", parentAot.template);
    console.log("Parent instructions:", JSON.stringify(parentAot.instructions, null, 2));

    // Patch both
    patchComponentDefinition(Child, childAot);
    patchComponentDefinition(Parent, parentAot);

    console.log("\n=== PATCHED DEFINITIONS ===");
    console.log("Child $au:", JSON.stringify(Child.$au, null, 2));
    console.log("Parent $au:", JSON.stringify(Parent.$au, null, 2));

    // Render
    try {
      const result = await renderWithComponents(Parent, {
        childComponents: [Child],
      });

      console.log("\n=== RENDER RESULT ===");
      console.log("HTML:", result.html);
      console.log("Manifest:", JSON.stringify(result.manifest, null, 2));

      assert.ok(result.html.includes("Parent Value"), "Should render parent value");
      // Child rendering depends on whether the runtime recognizes test-child
    } catch (error) {
      console.log("\n=== RENDER ERROR ===");
      console.log("Error:", error.message);
      console.log("Stack:", error.stack);
      throw error;
    }
  });
});

// =============================================================================
// Diagnostic: Trace the AUR0757 Error
// =============================================================================

describe("Diagnostic: AUR0757 Target Count Mismatch", () => {
  test("trace what causes 0 instructions with N targets", async () => {
    // Simulate the child-component-app scenario
    class DiagChild {
      name = "Guest";

      get greeting() {
        return `Hello, ${this.name}!`;
      }

      get nameLength() {
        return this.name.length;
      }

      static $au = {
        type: "custom-element",
        name: "diag-child",
        bindables: { name: { mode: 2 } },
      };
    }

    class DiagParent {
      appTitle = "Test";
      userName = "World";

      static $au = {
        type: "custom-element",
        name: "diag-parent",
        dependencies: [DiagChild],
      };
    }

    // Compile child
    const childTemplate = `<div class="greeting-card">
  <h2>\${greeting}</h2>
  <p>Name: "\${name}" (\${nameLength} characters)</p>
</div>`;

    const childAot = compileWithAot(childTemplate, { name: "diag-child" });

    console.log("\n========== DIAGNOSTIC: AUR0757 ==========");
    console.log("\n--- CHILD COMPILATION ---");
    console.log("Input template:", childTemplate);
    console.log("Output template:", childAot.template);
    console.log("Instructions length:", childAot.instructions.length);
    console.log("Target count:", childAot.targetCount);
    console.log("Full instructions:", JSON.stringify(childAot.instructions, null, 2));

    // Count markers in template (all targets use <!--au-->)
    const auMarkerMatches = childAot.template.match(/<!--au-->/g) ?? [];
    console.log("\nMarkers in template:");
    console.log("  <!--au--> markers:", auMarkerMatches.length);

    // Check the critical condition that causes AUR0757
    const markersCount = auMarkerMatches.length;
    const instructionsLength = childAot.instructions.length;

    console.log("\n--- CRITICAL CHECK ---");
    console.log(`instructions.length = ${instructionsLength}`);
    console.log(`markers in template = ${markersCount}`);
    console.log(`Match: ${instructionsLength === markersCount ? "YES" : "NO - THIS CAUSES AUR0757!"}`);

    // Patch and try to render
    patchComponentDefinition(DiagChild, childAot);

    console.log("\n--- PATCHED $au ---");
    console.log(JSON.stringify(DiagChild.$au, null, 2));

    try {
      const result = await renderWithComponents(DiagChild, {
        childComponents: [],
      });
      console.log("\n--- RENDER SUCCESS ---");
      console.log("HTML:", result.html);
    } catch (error) {
      console.log("\n--- RENDER ERROR ---");
      console.log("Error:", error.message);

      // If this is AUR0757, extract the numbers
      const match = error.message.match(/AUR0757:(\d+),(\d+)/);
      if (match) {
        console.log(`\nAUR0757 details:`);
        console.log(`  Expected targets (instructions.length): ${match[1]}`);
        console.log(`  Actual targets (in template): ${match[2]}`);
      }
    }

    console.log("\n========== END DIAGNOSTIC ==========\n");
  });
});
