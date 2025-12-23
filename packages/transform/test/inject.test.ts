/**
 * Transform Package - Injection Tests
 *
 * Tests for $au injection and decorator removal.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  generateInjectionEdits,
  findClassByName,
  applyEdits,
} from "@aurelia-ls/transform";

describe("generateInjectionEdits", () => {
  describe("@bindable decorator removal", () => {
    it("removes @bindable decorator from property", () => {
      const source = `
import { customElement, bindable } from "aurelia";

@customElement("greeting")
export class Greeting {
  @bindable name: string = "World";
}
`.trim();

      const classInfo = findClassByName(source, "Greeting")!;
      const result = generateInjectionEdits(source, classInfo, {
        className: "Greeting",
        artifactCode: "const greeting_$au = {};",
        definitionVar: "greeting_$au",
        removeDecorator: true,
        removeBindableDecorators: true,
      });

      const transformed = applyEdits(source, result.edits);

      // @bindable should be removed
      assert.ok(!transformed.includes("@bindable"));
      // Property should remain
      assert.ok(transformed.includes("name: string = \"World\""));
    });

    it("removes multiple @bindable decorators", () => {
      const source = `
import { customElement, bindable } from "aurelia";

@customElement("form-input")
export class FormInput {
  @bindable label: string;
  @bindable value: string;
  @bindable({ primary: true }) type: string = "text";
}
`.trim();

      const classInfo = findClassByName(source, "FormInput")!;
      const result = generateInjectionEdits(source, classInfo, {
        className: "FormInput",
        artifactCode: "const formInput_$au = {};",
        definitionVar: "formInput_$au",
        removeDecorator: true,
        removeBindableDecorators: true,
      });

      const transformed = applyEdits(source, result.edits);

      // All @bindable should be removed
      assert.ok(!transformed.includes("@bindable"));
      // Properties should remain
      assert.ok(transformed.includes("label: string"));
      assert.ok(transformed.includes("value: string"));
      assert.ok(transformed.includes("type: string = \"text\""));
      // Warning should indicate removal count
      assert.ok(result.warnings.some((w: string) => w.includes("3 @bindable")));
    });

    it("preserves property indentation", () => {
      const source = `
@customElement("my-comp")
export class MyComp {
  @bindable value: string;
}
`.trim();

      const classInfo = findClassByName(source, "MyComp")!;
      const result = generateInjectionEdits(source, classInfo, {
        className: "MyComp",
        artifactCode: "const myComp_$au = {};",
        definitionVar: "myComp_$au",
        removeDecorator: true,
        removeBindableDecorators: true,
      });

      const transformed = applyEdits(source, result.edits);

      // Property should have proper indentation (2 spaces)
      assert.ok(transformed.includes("  value: string"));
    });

    it("can skip @bindable removal", () => {
      const source = `
@customElement("greeting")
export class Greeting {
  @bindable name: string;
}
`.trim();

      const classInfo = findClassByName(source, "Greeting")!;
      const result = generateInjectionEdits(source, classInfo, {
        className: "Greeting",
        artifactCode: "const greeting_$au = {};",
        definitionVar: "greeting_$au",
        removeDecorator: true,
        removeBindableDecorators: false, // Skip bindable removal
      });

      const transformed = applyEdits(source, result.edits);

      // @bindable should still be there
      assert.ok(transformed.includes("@bindable"));
    });
  });
});
