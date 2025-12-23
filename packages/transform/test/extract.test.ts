/**
 * Transform Package - Extraction Tests
 *
 * Tests for extracting metadata from decorators.
 * These tests document what needs to be implemented.
 *
 * Run: npm test -- --test-name-pattern "extract"
 *
 * See: docs/aot-build-requirements.md Phase A
 * See: docs/aot-testing-strategy.md
 */

import { describe, it, todo } from "node:test";
import assert from "node:assert";
import {
  extractDependencies,
  extractDecoratorConfig,
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

      assert.strictEqual(deps.length, 2);
      assert.deepStrictEqual(deps[0], { type: "identifier", name: "ChildA" });
      assert.deepStrictEqual(deps[1], { type: "identifier", name: "ChildB" });
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

      assert.strictEqual(deps.length, 2);
      // Namespaced access should be preserved
      assert.deepStrictEqual(deps[0], { type: "identifier", name: "components.ChildA" });
      assert.deepStrictEqual(deps[1], { type: "identifier", name: "components.ChildB" });
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

      assert.strictEqual(deps.length, 1);
      assert.strictEqual(deps[0]!.type, "dynamic");
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

      assert.strictEqual(deps.length, 2);
      assert.deepStrictEqual(deps[0], { type: "identifier", name: "Static" });
      assert.strictEqual(deps[1]!.type, "dynamic");
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

      assert.deepStrictEqual(deps, []);
    });
  });

  describe("edge cases", () => {
    it("returns empty array when no decorator", () => {
      const source = `
        export class PlainClass {}
      `;

      const classInfo = findClassByName(source, "PlainClass")!;
      const deps = extractDependencies(source, classInfo);

      assert.deepStrictEqual(deps, []);
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

      assert.deepStrictEqual(deps, []);
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

      assert.deepStrictEqual(deps, []);
    });
  });
});

/* =============================================================================
 * DECORATOR CONFIG EXTRACTION
 * ============================================================================= */

describe("extractDecoratorConfig", () => {
  todo("extracts name from string argument");
  todo("extracts name from config object");
  todo("extracts template identifier");
  todo("extracts aliases array");
  todo("extracts containerless flag");
  todo("extracts all config properties together");
});

/* =============================================================================
 * FUTURE: BINDABLE EXTRACTION
 * These tests are placeholders for Phase A step A2
 * ============================================================================= */

describe("extractBindables", () => {
  todo("extracts @bindable property decorators");
  todo("extracts @bindable with mode option");
  todo("extracts @bindable with primary option");
  todo("extracts bindables from decorator config");
  todo("handles mixed decorator and config bindables");
});

/* =============================================================================
 * FUTURE: OTHER RESOURCE TYPES
 * These tests are placeholders for Phase A step A5
 * ============================================================================= */

describe("extractValueConverterConfig", () => {
  todo("extracts name from @valueConverter decorator");
});

describe("extractCustomAttributeConfig", () => {
  todo("extracts name from @customAttribute decorator");
  todo("extracts bindables from @customAttribute");
});

describe("extractBindingBehaviorConfig", () => {
  todo("extracts name from @bindingBehavior decorator");
});
