/**
 * Patch Tests
 *
 * Unit tests for patch.ts functions:
 * - hasComponentDefinition: Type guard for component classes
 * - getComponentName: Extract/derive component name from class
 * - patchComponentDefinition: Apply AOT artifacts to component $au
 */

import { describe, it, expect } from "vitest";

import {
  compileWithAot,
  patchComponentDefinition,
  hasComponentDefinition,
  getComponentName,
  type ComponentClass,
} from "@aurelia-ls/ssr";

// =============================================================================
// hasComponentDefinition
// =============================================================================

describe("hasComponentDefinition", () => {
  it("returns true for class with $au object", () => {
    class WithAu {
      static $au = { type: "custom-element", name: "with-au" };
    }

    expect(hasComponentDefinition(WithAu)).toBe(true);
  });

  it("returns false for class without $au", () => {
    class WithoutAu {
      static foo = "bar";
    }

    expect(hasComponentDefinition(WithoutAu)).toBe(false);
  });

  it("returns false for null", () => {
    expect(hasComponentDefinition(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(hasComponentDefinition(undefined)).toBe(false);
  });

  it("returns false for plain object (non-function)", () => {
    expect(hasComponentDefinition({ $au: {} })).toBe(false);
  });

  it("returns false for $au that is a string", () => {
    class StringAu {
      static $au = "not an object";
    }

    expect(hasComponentDefinition(StringAu)).toBe(false);
  });

  it("returns false for $au that is null", () => {
    class NullAu {
      static $au = null;
    }

    expect(hasComponentDefinition(NullAu)).toBe(false);
  });

  it("returns false for $au that is a number", () => {
    class NumberAu {
      static $au = 42;
    }

    expect(hasComponentDefinition(NumberAu)).toBe(false);
  });

  it("returns false for $au that is an array", () => {
    // Arrays are objects but not valid component definitions
    class ArrayAu {
      static $au = [];
    }

    expect(hasComponentDefinition(ArrayAu)).toBe(false);
  });
});

// =============================================================================
// getComponentName
// =============================================================================

describe("getComponentName", () => {
  it("returns $au.name when explicitly defined", () => {
    class WithName {
      static $au = { name: "custom-name" };
    }

    expect(getComponentName(WithName as ComponentClass)).toBe("custom-name");
  });

  it("converts PascalCase class name to kebab-case", () => {
    class MyCustomElement {
      static $au = {};
    }

    expect(getComponentName(MyCustomElement as ComponentClass)).toBe("my-custom-element");
  });

  it("handles single word class name", () => {
    class Button {
      static $au = {};
    }

    expect(getComponentName(Button as ComponentClass)).toBe("button");
  });

  it("handles consecutive capitals (acronyms)", () => {
    class HTMLElement {
      static $au = {};
    }

    expect(getComponentName(HTMLElement as ComponentClass)).toBe("html-element");
  });

  it("handles class with no $au property", () => {
    class NoAu {}

    expect(getComponentName(NoAu as unknown as ComponentClass)).toBe("no-au");
  });

  it("handles class name with numbers (no dash before digits)", () => {
    // Note: The regex only inserts dashes between letters, not before numbers
    class Button2Component {
      static $au = {};
    }

    expect(getComponentName(Button2Component as ComponentClass)).toBe("button2component");
  });
});

// =============================================================================
// patchComponentDefinition
// =============================================================================

describe("patchComponentDefinition", () => {
  it("sets needsCompile to false", () => {
    class TestComponent {
      static $au = {
        name: "test-component",
      };
    }

    const aot = compileWithAot("<div>content</div>", { name: "test-component" });
    patchComponentDefinition(TestComponent as ComponentClass, aot);

    expect(TestComponent.$au.needsCompile).toBe(false);
  });

  it("preserves existing bindables", () => {
    class WithBindables {
      static $au = {
        name: "with-bindables",
        bindables: { value: { mode: 2 } },
      };
    }

    const aot = compileWithAot("<div>${value}</div>", { name: "with-bindables" });
    patchComponentDefinition(WithBindables as ComponentClass, aot);

    expect(WithBindables.$au.bindables).toEqual({ value: { mode: 2 } });
    expect(WithBindables.$au.needsCompile).toBe(false);
  });

  it("preserves containerless option", () => {
    class Containerless {
      static $au = {
        name: "containerless-el",
        containerless: true,
      };
    }

    const aot = compileWithAot("<span>content</span>", { name: "containerless-el" });
    patchComponentDefinition(Containerless as ComponentClass, aot);

    expect((Containerless.$au as { containerless?: boolean }).containerless).toBe(true);
  });

  it("uses provided name in options", () => {
    class NoName {
      static $au = {};
    }

    const aot = compileWithAot("<div>test</div>", { name: "override-name" });
    patchComponentDefinition(NoName as ComponentClass, aot, { name: "override-name" });

    expect(NoName.$au.name).toBe("override-name");
  });

  it("applies template from AOT output", () => {
    class TemplateComponent {
      static $au = {
        name: "template-component",
        template: "<div>original</div>",
      };
    }

    const aot = compileWithAot("<span>compiled</span>", { name: "template-component" });
    patchComponentDefinition(TemplateComponent as ComponentClass, aot);

    // Template should be updated to AOT output
    expect(TemplateComponent.$au.template).toContain("<span>compiled</span>");
    expect(TemplateComponent.$au.template).not.toContain("original");
  });

  it("applies instructions from AOT output", () => {
    class InstructionComponent {
      static $au = {
        name: "instruction-component",
      };
    }

    const aot = compileWithAot("<div>${value}</div>", { name: "instruction-component" });
    patchComponentDefinition(InstructionComponent as ComponentClass, aot);

    // Should have instructions property
    expect((InstructionComponent.$au as { instructions?: unknown }).instructions).toBeDefined();
  });
});
