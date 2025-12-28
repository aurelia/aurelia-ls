/**
 * Transform Package - Analyze Tests
 *
 * Tests for TypeScript source analysis.
 */

import { describe, it, expect } from "vitest";
import {
  findClasses,
  findClassByName,
  detectDeclarationForm,
  isConventionName,
  deriveResourceName,
} from "@aurelia-ls/transform";
import { loadFixture, fixtures } from "./fixtures/index.js";

describe("findClasses", () => {
  it("finds a simple class", () => {
    const source = `
export class MyApp {
  message = "hello";
}
`;
    const classes = findClasses(source);
    expect(classes.length).toBe(1);
    const cls = classes[0]!;
    expect(cls.name).toBe("MyApp");
    expect(cls.exportType).toBe("named");
  });

  it("finds class with decorator", () => {
    const source = loadFixture("decorator-simple");
    const classes = findClasses(source);
    expect(classes.length).toBe(1);
    const cls = classes[0]!;
    expect(cls.name).toBe("MyElement");
    expect(cls.decorators.length).toBe(1);
    const dec = cls.decorators[0]!;
    expect(dec.name).toBe("customElement");
    expect(dec.isCall).toBe(true);
  });

  it("finds default export class", () => {
    const source = loadFixture("default-export");
    const classes = findClasses(source);
    expect(classes.length).toBe(1);
    const cls = classes[0]!;
    expect(cls.name).toBe("DefaultComponent");
    expect(cls.exportType).toBe("default");
  });

  it("finds class with existing static $au", () => {
    const source = loadFixture("static-au");
    const classes = findClasses(source);
    expect(classes.length).toBe(1);
    const cls = classes[0]!;
    expect(cls.name).toBe("StatusBadge");
    expect(cls.hasStaticAu).toBe(true);
    expect(cls.existingAuSpan).toBeTruthy();
  });

  it("finds multiple classes in same file", () => {
    const source = loadFixture("export-variations");
    const classes = findClasses(source);
    expect(classes.length).toBe(3);
    expect(classes.map(c => c.name)).toEqual(
      ["NamedExport", "InternalComponent", "LaterExport"]
    );
  });
});

describe("findClassByName", () => {
  it("finds specific class by name", () => {
    const source = loadFixture("export-variations");
    const classInfo = findClassByName(source, "InternalComponent");
    expect(classInfo).toBeTruthy();
    expect(classInfo!.name).toBe("InternalComponent");
  });

  it("returns null for non-existent class", () => {
    const source = loadFixture("decorator-simple");
    const classInfo = findClassByName(source, "NonExistent");
    expect(classInfo).toBe(null);
  });
});

describe("detectDeclarationForm", () => {
  it("detects decorator form", () => {
    const source = loadFixture("decorator-name-only");
    const classInfo = findClassByName(source, "CounterElement")!;
    const form = detectDeclarationForm(classInfo, "CounterElement");
    expect(form.form).toBe("decorator");
  });

  it("detects decorator-config form", () => {
    const source = loadFixture("decorator-config");
    const classInfo = findClassByName(source, "UserCard")!;
    const form = detectDeclarationForm(classInfo, "UserCard");
    expect(form.form).toBe("decorator-config");
  });

  it("detects static-au form", () => {
    const source = loadFixture("static-au");
    const classInfo = findClassByName(source, "StatusBadge")!;
    const form = detectDeclarationForm(classInfo, "StatusBadge");
    expect(form.form).toBe("static-au");
  });

  it("detects convention form", () => {
    const source = loadFixture("convention");
    const classInfo = findClassByName(source, "NavBarCustomElement")!;
    const form = detectDeclarationForm(classInfo, "NavBarCustomElement");
    expect(form.form).toBe("convention");
  });
});

describe("isConventionName", () => {
  it("recognizes CustomElement suffix", () => {
    expect(isConventionName("MyAppCustomElement")).toBe(true);
    expect(isConventionName("NavBarCustomElement")).toBe(true);
  });

  it("recognizes ValueConverter suffix", () => {
    expect(isConventionName("DateFormatValueConverter")).toBe(true);
  });

  it("recognizes BindingBehavior suffix", () => {
    expect(isConventionName("ThrottleBindingBehavior")).toBe(true);
  });

  it("recognizes CustomAttribute suffix", () => {
    expect(isConventionName("TooltipCustomAttribute")).toBe(true);
  });

  it("returns false for non-convention names", () => {
    expect(isConventionName("MyApp")).toBe(false);
    expect(isConventionName("Counter")).toBe(false);
    expect(isConventionName("Element")).toBe(false);
  });
});

describe("deriveResourceName", () => {
  it("converts PascalCase to kebab-case", () => {
    expect(deriveResourceName("MyAppCustomElement")).toBe("my-app");
    expect(deriveResourceName("NavBarCustomElement")).toBe("nav-bar");
    expect(deriveResourceName("UserProfileCardCustomElement")).toBe("user-profile-card");
  });

  it("handles consecutive capitals", () => {
    expect(deriveResourceName("XMLParserCustomElement")).toBe("xml-parser");
    expect(deriveResourceName("HTMLEditorCustomElement")).toBe("html-editor");
  });

  it("handles names without suffix", () => {
    expect(deriveResourceName("MyApp")).toBe("my-app");
    expect(deriveResourceName("Counter")).toBe("counter");
  });
});

describe("fixture coverage", () => {
  for (const fixture of fixtures) {
    it(`can parse ${fixture.name}`, () => {
      const source = loadFixture(fixture.name);
      const classInfo = findClassByName(source, fixture.className);
      expect(classInfo, `Class ${fixture.className} not found in ${fixture.name}`).toBeTruthy();
      expect(classInfo!.name).toBe(fixture.className);
    });
  }
});
