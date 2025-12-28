/**
 * Child Component SSR Tests
 *
 * These tests verify SSR rendering with real component classes and child components:
 * 1. Parent template uses child custom element
 * 2. Both parent and child are AOT-compiled
 * 3. Child class is patched with $au definition
 * 4. renderWithComponents renders the full tree
 */

import { test, describe, expect } from "vitest";

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

    // Template should be produced with markers
    expect(result.template).toContain('class="greeting-card"');
    expect(result.template).toContain("<!--au-->");

    // Critical: instruction count must match target count
    expect(result.instructions.length).toBe(result.targetCount);
    // Should have at least 2 instructions (h2 interpolation + p interpolation)
    expect(result.instructions.length).toBeGreaterThanOrEqual(2);
  });

  test("compiles parent component template with child element", () => {
    const parentTemplate = `<div>
  <h1>\${appTitle}</h1>
  <greeting-card name.bind="userName"></greeting-card>
  <p>Timestamp: \${timestamp}</p>
</div>`;

    const result = compileWithAot(parentTemplate, {
      name: "my-app",
    });

    expect(result.template).toBeTruthy();
    // Parent has: appTitle interpolation, greeting-card element, timestamp interpolation
    expect(result.instructions.length).toBe(3);
    expect(result.targetCount).toBe(3);
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

    // Before patching
    expect(TestChild.$au.template).toBe(undefined);
    expect(TestChild.$au.instructions).toBe(undefined);

    patchComponentDefinition(TestChild, aot);

    // After patching
    expect(TestChild.$au.template).toBe(aot.template);
    expect(TestChild.$au.instructions).toEqual(aot.instructions);
    expect(TestChild.$au.needsCompile).toBe(false);
    expect(TestChild.$au.bindables).toBeTruthy();
    expect(TestChild.$au.bindables).toEqual({ message: { mode: 2 } });
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

    expect(TestBindableChild.$au.bindables).toEqual({
      value: { mode: 2 },
      label: { mode: 1 },
    });
    expect(TestBindableChild.$au.containerless).toBe(true);
    expect(TestBindableChild.$au.needsCompile).toBe(false);
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

    const result = await renderWithComponents(NoChildComponent, {
      childComponents: [],
    });

    expect(result.html).toContain("Hello SSR");
    expect(result.html).toContain("<div");
    expect(result.manifest).toBeTruthy();
    expect(result.manifest.root).toBe("no-child");
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

    // Static content has no instructions
    expect(aot.instructions.length).toBe(0);
    expect(aot.targetCount).toBe(0);

    patchComponentDefinition(StaticComponent, aot);

    const result = await renderWithComponents(StaticComponent, {
      childComponents: [],
    });

    expect(result.html).toContain("No bindings here");
    expect(result.html).toContain('class="static"');
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

    // Critical: instructions.length must match targetCount (AUR0757 check)
    expect(aot.instructions.length).toBe(aot.targetCount);
    expect(aot.instructions.length).toBe(3);

    patchComponentDefinition(CountTestComponent, aot);

    const result = await renderWithComponents(CountTestComponent, {
      childComponents: [],
    });

    expect(result.html).toContain(">A<");
    expect(result.html).toContain(">B<");
    expect(result.html).toContain(">C<");
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

    const parentAot = compileWithAot(
      '<div class="parent"><span>${parentValue}</span><test-child></test-child></div>',
      { name: "test-parent" }
    );

    // Patch both
    patchComponentDefinition(Child, childAot);
    patchComponentDefinition(Parent, parentAot);

    // Render
    const result = await renderWithComponents(Parent, {
      childComponents: [Child],
    });

    expect(result.html).toContain("Parent Value");
    expect(result.html).toContain('class="parent"');
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

    // Compile child
    const childTemplate = `<div class="greeting-card">
  <h2>\${greeting}</h2>
  <p>Name: "\${name}" (\${nameLength} characters)</p>
</div>`;

    const childAot = compileWithAot(childTemplate, { name: "diag-child" });

    // Count markers in template (all targets use <!--au-->)
    const auMarkerMatches = childAot.template.match(/<!--au-->/g) ?? [];

    // Check the critical condition that causes AUR0757
    const markersCount = auMarkerMatches.length;
    const instructionsLength = childAot.instructions.length;

    // Verify alignment
    expect(instructionsLength).toBe(markersCount);
    expect(instructionsLength).toBeGreaterThanOrEqual(2);

    // Patch and try to render
    patchComponentDefinition(DiagChild, childAot);

    const result = await renderWithComponents(DiagChild, {
      childComponents: [],
    });

    expect(result.html).toContain("Hello, Guest!");
    expect(result.html).toContain("5 characters");
  });
});
