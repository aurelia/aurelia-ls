/**
 * Transform Package - Injection Tests
 *
 * Tests for $au injection and decorator removal.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  generateInjectionEdits,
  generateImportCleanupEdits,
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

describe("generateImportCleanupEdits", () => {
  it("removes single import specifier from multi-specifier import", () => {
    const source = `import { customElement, bindable } from "aurelia";

@customElement("greeting")
export class Greeting {
  @bindable name: string;
}`;

    const result = generateImportCleanupEdits(source, ["bindable"]);
    const transformed = applyEdits(source, result.edits);

    // Check the import line specifically
    const importLine = transformed.split("\n")[0]!;
    assert.ok(importLine.includes("customElement"));
    assert.ok(!importLine.includes("bindable"));
    assert.deepStrictEqual(result.removedSpecifiers, ["bindable"]);
  });

  it("removes entire import when all specifiers are unused", () => {
    const source = `import { bindable } from "aurelia";

export class Greeting {
  name: string;
}`;

    const result = generateImportCleanupEdits(source, ["bindable"]);
    const transformed = applyEdits(source, result.edits);

    // Import should be completely removed
    assert.ok(!transformed.includes('from "aurelia"'));
  });

  it("removes multiple specifiers from same import", () => {
    const source = `import { customElement, bindable, BindingMode } from "aurelia";

export class Greeting {
  name: string;
}`;

    const result = generateImportCleanupEdits(source, ["bindable", "BindingMode"]);
    const transformed = applyEdits(source, result.edits);

    // Check the import line specifically
    const importLine = transformed.split("\n")[0]!;
    assert.ok(importLine.includes("customElement"));
    assert.ok(!importLine.includes("bindable"));
    assert.ok(!importLine.includes("BindingMode"));
  });

  it("handles @aurelia/ scoped packages", () => {
    const source = `import { bindable } from "@aurelia/runtime-html";

export class MyComp {
  @bindable value: string;
}`;

    const result = generateImportCleanupEdits(source, ["bindable"]);
    const transformed = applyEdits(source, result.edits);

    assert.ok(!transformed.includes("import"));
    assert.ok(!transformed.includes("@aurelia/runtime-html"));
  });

  it("preserves non-aurelia imports", () => {
    const source = `import { Something } from "other-lib";
import { bindable } from "aurelia";

export class MyComp {
  @bindable value: string;
}`;

    const result = generateImportCleanupEdits(source, ["bindable", "Something"]);
    const transformed = applyEdits(source, result.edits);

    // Should preserve non-aurelia import
    assert.ok(transformed.includes('import { Something } from "other-lib"'));
    // Should remove aurelia import
    assert.ok(!transformed.includes('from "aurelia"'));
  });

  it("returns empty when no specifiers to remove", () => {
    const source = `import { customElement } from "aurelia";`;

    const result = generateImportCleanupEdits(source, ["bindable"]);

    assert.strictEqual(result.edits.length, 0);
    assert.strictEqual(result.removedSpecifiers.length, 0);
  });

  it("handles first specifier removal correctly", () => {
    const source = `import { bindable, customElement } from "aurelia";`;

    const result = generateImportCleanupEdits(source, ["bindable"]);
    const transformed = applyEdits(source, result.edits);

    assert.ok(transformed.includes('import { customElement } from "aurelia"'));
    assert.ok(!transformed.includes("bindable"));
  });

  it("handles middle specifier removal correctly", () => {
    const source = `import { customElement, bindable, Aurelia } from "aurelia";`;

    const result = generateImportCleanupEdits(source, ["bindable"]);
    const transformed = applyEdits(source, result.edits);

    assert.ok(transformed.includes("customElement"));
    assert.ok(transformed.includes("Aurelia"));
    assert.ok(!transformed.includes("bindable"));
  });
});
