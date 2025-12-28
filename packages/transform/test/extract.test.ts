/**
 * Transform Package - Extraction Tests
 *
 * Tests for extracting metadata from decorators.
 * These tests document what needs to be implemented.
 *
 * Run: npm test -- --test-name-pattern "extract"
 *
 * See: docs/aot-build-requirements.md Phase A
 * See: docs/testing.md (Known Gaps > Transform Package)
 */

import { describe, it, expect } from "vitest";
import {
  extractDependencies,
  extractDecoratorConfig,
  extractBindables,
  findClassByName,
} from "@aurelia-ls/transform";

/* =============================================================================
 * DEPENDENCIES EXTRACTION
 * ============================================================================= */

describe("extractDependencies", () => {
  describe("from @customElement config object", () => {
    it("extracts simple identifier dependencies", () => {
      const source = `
        import { customElement } from "aurelia";
        import { ChildA } from "./child-a";
        import { ChildB } from "./child-b";

        @customElement({
          name: "parent",
          template: "<child-a></child-a><child-b></child-b>",
          dependencies: [ChildA, ChildB],
        })
        export class Parent {}
      `;

      const classInfo = findClassByName(source, "Parent")!;
      const deps = extractDependencies(source, classInfo);

      expect(deps.length).toBe(2);
      expect(deps[0]).toEqual({ type: "identifier", name: "ChildA" });
      expect(deps[1]).toEqual({ type: "identifier", name: "ChildB" });
    });

    it("extracts namespaced dependencies", () => {
      const source = `
        import { customElement } from "aurelia";
        import * as components from "./components";

        @customElement({
          name: "parent",
          dependencies: [components.ChildA, components.ChildB],
        })
        export class Parent {}
      `;

      const classInfo = findClassByName(source, "Parent")!;
      const deps = extractDependencies(source, classInfo);

      expect(deps.length).toBe(2);
      // Namespaced access should be preserved
      expect(deps[0]).toEqual({ type: "identifier", name: "components.ChildA" });
      expect(deps[1]).toEqual({ type: "identifier", name: "components.ChildB" });
    });

    it("handles spread in dependencies array", () => {
      const source = `
        import { customElement } from "aurelia";
        import * as children from "./children";

        @customElement({
          name: "parent",
          dependencies: [...Object.values(children)],
        })
        export class Parent {}
      `;

      const classInfo = findClassByName(source, "Parent")!;
      const deps = extractDependencies(source, classInfo);

      expect(deps.length).toBe(1);
      expect(deps[0]!.type).toBe("dynamic");
      // Dynamic expression should capture the spread
    });

    it("handles mixed static and spread dependencies", () => {
      const source = `
        import { customElement } from "aurelia";
        import { Static } from "./static";
        import * as dynamic from "./dynamic";

        @customElement({
          name: "parent",
          dependencies: [Static, ...Object.values(dynamic)],
        })
        export class Parent {}
      `;

      const classInfo = findClassByName(source, "Parent")!;
      const deps = extractDependencies(source, classInfo);

      expect(deps.length).toBe(2);
      expect(deps[0]).toEqual({ type: "identifier", name: "Static" });
      expect(deps[1]!.type).toBe("dynamic");
    });
  });

  describe("from @customElement string argument", () => {
    it("returns empty array when only name is provided", () => {
      const source = `
        import { customElement } from "aurelia";

        @customElement("simple-element")
        export class SimpleElement {}
      `;

      const classInfo = findClassByName(source, "SimpleElement")!;
      const deps = extractDependencies(source, classInfo);

      expect(deps).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("returns empty array when no decorator", () => {
      const source = `
        export class PlainClass {}
      `;

      const classInfo = findClassByName(source, "PlainClass")!;
      const deps = extractDependencies(source, classInfo);

      expect(deps).toEqual([]);
    });

    it("returns empty array when dependencies not specified", () => {
      const source = `
        import { customElement } from "aurelia";

        @customElement({
          name: "no-deps",
          template: "<div>Hello</div>",
        })
        export class NoDeps {}
      `;

      const classInfo = findClassByName(source, "NoDeps")!;
      const deps = extractDependencies(source, classInfo);

      expect(deps).toEqual([]);
    });

    it("handles empty dependencies array", () => {
      const source = `
        import { customElement } from "aurelia";

        @customElement({
          name: "empty-deps",
          dependencies: [],
        })
        export class EmptyDeps {}
      `;

      const classInfo = findClassByName(source, "EmptyDeps")!;
      const deps = extractDependencies(source, classInfo);

      expect(deps).toEqual([]);
    });
  });
});

/* =============================================================================
 * DECORATOR CONFIG EXTRACTION
 * ============================================================================= */

describe("extractDecoratorConfig", () => {
  it.todo("extracts name from string argument");
  it.todo("extracts name from config object");
  it.todo("extracts template identifier");
  it.todo("extracts aliases array");
  it.todo("extracts containerless flag");
  it.todo("extracts all config properties together");
});

/* =============================================================================
 * BINDABLE EXTRACTION
 * ============================================================================= */

describe("extractBindables", () => {
  it("extracts simple @bindable property decorator", () => {
    const source = `
      import { bindable } from "aurelia";

      export class Greeting {
        @bindable name: string = "World";
      }
    `;

    const classInfo = findClassByName(source, "Greeting")!;
    const bindables = extractBindables(source, classInfo);

    expect(bindables.length).toBe(1);
    expect(bindables[0]!.name).toBe("name");
    expect(bindables[0]!.mode).toBe(undefined);
    expect(bindables[0]!.primary).toBe(undefined);
  });

  it("extracts @bindable with mode option", () => {
    const source = `
      import { bindable, BindingMode } from "aurelia";

      export class MyComponent {
        @bindable({ mode: BindingMode.twoWay }) value: string;
      }
    `;

    const classInfo = findClassByName(source, "MyComponent")!;
    const bindables = extractBindables(source, classInfo);

    expect(bindables.length).toBe(1);
    expect(bindables[0]!.name).toBe("value");
    expect(bindables[0]!.mode).toBe(6); // twoWay = 6
  });

  it("extracts @bindable with mode as direct import", () => {
    const source = `
      import { bindable, twoWay } from "aurelia";

      export class MyComponent {
        @bindable({ mode: twoWay }) value: string;
      }
    `;

    const classInfo = findClassByName(source, "MyComponent")!;
    const bindables = extractBindables(source, classInfo);

    expect(bindables.length).toBe(1);
    expect(bindables[0]!.mode).toBe(6);
  });

  it("extracts @bindable with primary option", () => {
    const source = `
      import { bindable } from "aurelia";

      export class MyComponent {
        @bindable({ primary: true }) value: string;
      }
    `;

    const classInfo = findClassByName(source, "MyComponent")!;
    const bindables = extractBindables(source, classInfo);

    expect(bindables.length).toBe(1);
    expect(bindables[0]!.name).toBe("value");
    expect(bindables[0]!.primary).toBe(true);
  });

  it("extracts @bindable with attribute option", () => {
    const source = `
      import { bindable } from "aurelia";

      export class MyComponent {
        @bindable({ attribute: "my-value" }) myValue: string;
      }
    `;

    const classInfo = findClassByName(source, "MyComponent")!;
    const bindables = extractBindables(source, classInfo);

    expect(bindables.length).toBe(1);
    expect(bindables[0]!.name).toBe("myValue");
    expect(bindables[0]!.attribute).toBe("my-value");
  });

  it("extracts multiple bindables", () => {
    const source = `
      import { bindable, BindingMode } from "aurelia";

      export class FormInput {
        @bindable label: string;
        @bindable({ mode: BindingMode.twoWay }) value: string;
        @bindable({ primary: true }) type: string = "text";
      }
    `;

    const classInfo = findClassByName(source, "FormInput")!;
    const bindables = extractBindables(source, classInfo);

    expect(bindables.length).toBe(3);
    expect(bindables[0]!.name).toBe("label");
    expect(bindables[1]!.name).toBe("value");
    expect(bindables[1]!.mode).toBe(6);
    expect(bindables[2]!.name).toBe("type");
    expect(bindables[2]!.primary).toBe(true);
  });

  it("returns empty array when no bindables", () => {
    const source = `
      export class PlainClass {
        name: string = "World";
      }
    `;

    const classInfo = findClassByName(source, "PlainClass")!;
    const bindables = extractBindables(source, classInfo);

    expect(bindables).toEqual([]);
  });

  it("handles @bindable() with empty parens", () => {
    const source = `
      import { bindable } from "aurelia";

      export class MyComponent {
        @bindable() value: string;
      }
    `;

    const classInfo = findClassByName(source, "MyComponent")!;
    const bindables = extractBindables(source, classInfo);

    expect(bindables.length).toBe(1);
    expect(bindables[0]!.name).toBe("value");
  });

  it.todo("extracts bindables from decorator config");
});

/* =============================================================================
 * FUTURE: OTHER RESOURCE TYPES
 * These tests are placeholders for Phase A step A5
 * ============================================================================= */

describe("extractValueConverterConfig", () => {
  it.todo("extracts name from @valueConverter decorator");
});

describe("extractCustomAttributeConfig", () => {
  it.todo("extracts name from @customAttribute decorator");
  it.todo("extracts bindables from @customAttribute");
});

describe("extractBindingBehaviorConfig", () => {
  it.todo("extracts name from @bindingBehavior decorator");
});
