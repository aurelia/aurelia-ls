/**
 * Transform Package - Injection Tests
 *
 * Tests for $au injection and decorator removal.
 */

import { describe, it, expect } from "vitest";
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
      expect(transformed).not.toContain("@bindable");
      // Property should remain
      expect(transformed).toContain('name: string = "World"');
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
      expect(transformed).not.toContain("@bindable");
      // Properties should remain
      expect(transformed).toContain("label: string");
      expect(transformed).toContain("value: string");
      expect(transformed).toContain('type: string = "text"');
      // Warning should indicate removal count
      expect(result.warnings.some((w: string) => w.includes("3 @bindable"))).toBe(true);
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
      expect(transformed).toContain("  value: string");
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
      expect(transformed).toContain("@bindable");
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
    expect(importLine).toContain("customElement");
    expect(importLine).not.toContain("bindable");
    expect(result.removedSpecifiers).toEqual(["bindable"]);
  });

  it("removes entire import when all specifiers are unused", () => {
    const source = `import { bindable } from "aurelia";

export class Greeting {
  name: string;
}`;

    const result = generateImportCleanupEdits(source, ["bindable"]);
    const transformed = applyEdits(source, result.edits);

    // Import should be completely removed
    expect(transformed).not.toContain('from "aurelia"');
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
    expect(importLine).toContain("customElement");
    expect(importLine).not.toContain("bindable");
    expect(importLine).not.toContain("BindingMode");
  });

  it("handles @aurelia/ scoped packages", () => {
    const source = `import { bindable } from "@aurelia/runtime-html";

export class MyComp {
  @bindable value: string;
}`;

    const result = generateImportCleanupEdits(source, ["bindable"]);
    const transformed = applyEdits(source, result.edits);

    expect(transformed).not.toContain("import");
    expect(transformed).not.toContain("@aurelia/runtime-html");
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
    expect(transformed).toContain('import { Something } from "other-lib"');
    // Should remove aurelia import
    expect(transformed).not.toContain('from "aurelia"');
  });

  it("returns empty when no specifiers to remove", () => {
    const source = `import { customElement } from "aurelia";`;

    const result = generateImportCleanupEdits(source, ["bindable"]);

    expect(result.edits.length).toBe(0);
    expect(result.removedSpecifiers.length).toBe(0);
  });

  it("handles first specifier removal correctly", () => {
    const source = `import { bindable, customElement } from "aurelia";`;

    const result = generateImportCleanupEdits(source, ["bindable"]);
    const transformed = applyEdits(source, result.edits);

    expect(transformed).toContain('import { customElement } from "aurelia"');
    expect(transformed).not.toContain("bindable");
  });

  it("handles middle specifier removal correctly", () => {
    const source = `import { customElement, bindable, Aurelia } from "aurelia";`;

    const result = generateImportCleanupEdits(source, ["bindable"]);
    const transformed = applyEdits(source, result.edits);

    expect(transformed).toContain("customElement");
    expect(transformed).toContain("Aurelia");
    expect(transformed).not.toContain("bindable");
  });
});
