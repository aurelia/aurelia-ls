/**
 * Transform Package - Analyze Tests
 *
 * Tests for TypeScript source analysis.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import {
  findClasses,
  findClassByName,
  detectDeclarationForm,
  isConventionName,
  deriveResourceName,
} from "../src/ts/analyze.js";
import { loadFixture, fixtures } from "./fixtures/index.js";

describe("findClasses", () => {
  it("finds a simple class", () => {
    const source = `
export class MyApp {
  message = "hello";
}
`;
    const classes = findClasses(source);
    assert.strictEqual(classes.length, 1);
    const cls = classes[0]!;
    assert.strictEqual(cls.name, "MyApp");
    assert.strictEqual(cls.exportType, "named");
  });

  it("finds class with decorator", () => {
    const source = loadFixture("decorator-simple");
    const classes = findClasses(source);
    assert.strictEqual(classes.length, 1);
    const cls = classes[0]!;
    assert.strictEqual(cls.name, "MyElement");
    assert.strictEqual(cls.decorators.length, 1);
    const dec = cls.decorators[0]!;
    assert.strictEqual(dec.name, "customElement");
    assert.strictEqual(dec.isCall, true);
  });

  it("finds default export class", () => {
    const source = loadFixture("default-export");
    const classes = findClasses(source);
    assert.strictEqual(classes.length, 1);
    const cls = classes[0]!;
    assert.strictEqual(cls.name, "DefaultComponent");
    assert.strictEqual(cls.exportType, "default");
  });

  it("finds class with existing static $au", () => {
    const source = loadFixture("static-au");
    const classes = findClasses(source);
    assert.strictEqual(classes.length, 1);
    const cls = classes[0]!;
    assert.strictEqual(cls.name, "StatusBadge");
    assert.strictEqual(cls.hasStaticAu, true);
    assert.ok(cls.existingAuSpan);
  });

  it("finds multiple classes in same file", () => {
    const source = loadFixture("export-variations");
    const classes = findClasses(source);
    assert.strictEqual(classes.length, 3);
    assert.deepStrictEqual(
      classes.map(c => c.name),
      ["NamedExport", "InternalComponent", "LaterExport"]
    );
  });
});

describe("findClassByName", () => {
  it("finds specific class by name", () => {
    const source = loadFixture("export-variations");
    const classInfo = findClassByName(source, "InternalComponent");
    assert.ok(classInfo);
    assert.strictEqual(classInfo.name, "InternalComponent");
  });

  it("returns null for non-existent class", () => {
    const source = loadFixture("decorator-simple");
    const classInfo = findClassByName(source, "NonExistent");
    assert.strictEqual(classInfo, null);
  });
});

describe("detectDeclarationForm", () => {
  it("detects decorator form", () => {
    const source = loadFixture("decorator-name-only");
    const classInfo = findClassByName(source, "CounterElement")!;
    const form = detectDeclarationForm(classInfo, "CounterElement");
    assert.strictEqual(form.form, "decorator");
  });

  it("detects decorator-config form", () => {
    const source = loadFixture("decorator-config");
    const classInfo = findClassByName(source, "UserCard")!;
    const form = detectDeclarationForm(classInfo, "UserCard");
    assert.strictEqual(form.form, "decorator-config");
  });

  it("detects static-au form", () => {
    const source = loadFixture("static-au");
    const classInfo = findClassByName(source, "StatusBadge")!;
    const form = detectDeclarationForm(classInfo, "StatusBadge");
    assert.strictEqual(form.form, "static-au");
  });

  it("detects convention form", () => {
    const source = loadFixture("convention");
    const classInfo = findClassByName(source, "NavBarCustomElement")!;
    const form = detectDeclarationForm(classInfo, "NavBarCustomElement");
    assert.strictEqual(form.form, "convention");
  });
});

describe("isConventionName", () => {
  it("recognizes CustomElement suffix", () => {
    assert.strictEqual(isConventionName("MyAppCustomElement"), true);
    assert.strictEqual(isConventionName("NavBarCustomElement"), true);
  });

  it("recognizes ValueConverter suffix", () => {
    assert.strictEqual(isConventionName("DateFormatValueConverter"), true);
  });

  it("recognizes BindingBehavior suffix", () => {
    assert.strictEqual(isConventionName("ThrottleBindingBehavior"), true);
  });

  it("recognizes CustomAttribute suffix", () => {
    assert.strictEqual(isConventionName("TooltipCustomAttribute"), true);
  });

  it("returns false for non-convention names", () => {
    assert.strictEqual(isConventionName("MyApp"), false);
    assert.strictEqual(isConventionName("Counter"), false);
    assert.strictEqual(isConventionName("Element"), false);
  });
});

describe("deriveResourceName", () => {
  it("converts PascalCase to kebab-case", () => {
    assert.strictEqual(deriveResourceName("MyAppCustomElement"), "my-app");
    assert.strictEqual(deriveResourceName("NavBarCustomElement"), "nav-bar");
    assert.strictEqual(deriveResourceName("UserProfileCardCustomElement"), "user-profile-card");
  });

  it("handles consecutive capitals", () => {
    assert.strictEqual(deriveResourceName("XMLParserCustomElement"), "xml-parser");
    assert.strictEqual(deriveResourceName("HTMLEditorCustomElement"), "html-editor");
  });

  it("handles names without suffix", () => {
    assert.strictEqual(deriveResourceName("MyApp"), "my-app");
    assert.strictEqual(deriveResourceName("Counter"), "counter");
  });
});

describe("fixture coverage", () => {
  for (const fixture of fixtures) {
    it(`can parse ${fixture.name}`, () => {
      const source = loadFixture(fixture.name);
      const classInfo = findClassByName(source, fixture.className);
      assert.ok(classInfo, `Class ${fixture.className} not found in ${fixture.name}`);
      assert.strictEqual(classInfo.name, fixture.className);
    });
  }
});
