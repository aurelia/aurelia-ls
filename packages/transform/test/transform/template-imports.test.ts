/**
 * Template Import Transform Tests
 *
 * Tests for generating import statements and dependencies from template imports.
 */

import { describe, it, expect } from "vitest";
import { transform, type TemplateImport } from "../../src/transform/index.js";
import type { AotCodeResult } from "@aurelia-ls/compiler";

// Minimal AOT result for testing
function createMinimalAot(): AotCodeResult {
  return {
    definition: {
      name: "test-element",
      instructions: [],
      nestedTemplates: [],
    },
    expressions: [],
  };
}

// Minimal source for a custom element
const MINIMAL_SOURCE = `
import { customElement } from "@aurelia/runtime-html";

@customElement({ name: "my-app" })
export class MyApp {}
`;

describe("Template Import Transform", () => {
  describe("Simple imports (no aliases)", () => {
    it("generates namespace import for single template import", () => {
      const templateImports: TemplateImport[] = [
        { moduleSpecifier: "./foo" },
      ];

      const result = transform({
        source: MINIMAL_SOURCE,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        templateImports,
      });

      // Check that import statement was generated
      expect(result.code).toContain('import * as __myApp_dep0 from "./foo";');

      // Check that dependency was added
      expect(result.code).toContain("dependencies: [__myApp_dep0]");
    });

    it("generates namespace imports for multiple template imports", () => {
      const templateImports: TemplateImport[] = [
        { moduleSpecifier: "./components/nav-bar" },
        { moduleSpecifier: "./components/footer" },
        { moduleSpecifier: "@aurelia/router" },
      ];

      const result = transform({
        source: MINIMAL_SOURCE,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        templateImports,
      });

      // Check that all imports were generated
      expect(result.code).toContain('import * as __myApp_dep0 from "./components/nav-bar";');
      expect(result.code).toContain('import * as __myApp_dep1 from "./components/footer";');
      expect(result.code).toContain('import * as __myApp_dep2 from "@aurelia/router";');

      // Check that all dependencies were added
      expect(result.code).toContain("dependencies: [__myApp_dep0, __myApp_dep1, __myApp_dep2]");
    });
  });

  describe("Default alias (as attribute)", () => {
    it("generates aliasedResourcesRegistry for default alias", () => {
      const templateImports: TemplateImport[] = [
        { moduleSpecifier: "./foo", defaultAlias: "bar" },
      ];

      const result = transform({
        source: MINIMAL_SOURCE,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        templateImports,
      });

      // Check that aliasedResourcesRegistry import was added
      expect(result.code).toContain('import { aliasedResourcesRegistry } from "@aurelia/kernel";');

      // Check that import statement was generated
      expect(result.code).toContain('import * as __myApp_dep0 from "./foo";');

      // Check that aliased dependency was added
      expect(result.code).toContain('aliasedResourcesRegistry(__myApp_dep0, "bar")');
    });
  });

  describe("Named aliases (Export.as attribute)", () => {
    it("generates aliasedResourcesRegistry for named alias", () => {
      const templateImports: TemplateImport[] = [
        {
          moduleSpecifier: "./converters",
          namedAliases: [{ exportName: "DateFormat", alias: "df" }],
        },
      ];

      const result = transform({
        source: MINIMAL_SOURCE,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        templateImports,
      });

      // Check that aliasedResourcesRegistry import was added
      expect(result.code).toContain('import { aliasedResourcesRegistry } from "@aurelia/kernel";');

      // Check that aliased dependency was added
      expect(result.code).toContain('aliasedResourcesRegistry(__myApp_dep0.DateFormat, "df")');
    });

    it("generates multiple aliased dependencies for multiple named aliases", () => {
      const templateImports: TemplateImport[] = [
        {
          moduleSpecifier: "./utils",
          namedAliases: [
            { exportName: "Foo", alias: "foo" },
            { exportName: "Bar", alias: "bar" },
          ],
        },
      ];

      const result = transform({
        source: MINIMAL_SOURCE,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        templateImports,
      });

      // Check that both aliased dependencies were added
      expect(result.code).toContain('aliasedResourcesRegistry(__myApp_dep0.Foo, "foo")');
      expect(result.code).toContain('aliasedResourcesRegistry(__myApp_dep0.Bar, "bar")');
    });
  });

  describe("Mixed imports", () => {
    it("handles mix of simple and aliased imports", () => {
      const templateImports: TemplateImport[] = [
        { moduleSpecifier: "./simple" },
        { moduleSpecifier: "./aliased", defaultAlias: "renamed" },
        { moduleSpecifier: "./named", namedAliases: [{ exportName: "X", alias: "x" }] },
      ];

      const result = transform({
        source: MINIMAL_SOURCE,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        templateImports,
      });

      // Check all imports
      expect(result.code).toContain('import * as __myApp_dep0 from "./simple";');
      expect(result.code).toContain('import * as __myApp_dep1 from "./aliased";');
      expect(result.code).toContain('import * as __myApp_dep2 from "./named";');

      // Check dependencies include mix of simple and aliased
      expect(result.code).toContain("__myApp_dep0");
      expect(result.code).toContain('aliasedResourcesRegistry(__myApp_dep1, "renamed")');
      expect(result.code).toContain('aliasedResourcesRegistry(__myApp_dep2.X, "x")');
    });
  });

  describe("Merging with decorator dependencies", () => {
    it("merges template imports with existing decorator dependencies", () => {
      // Source with dependencies in decorator
      const sourceWithDeps = `
import { customElement } from "@aurelia/runtime-html";
import { NavBar } from "./nav-bar.js";

@customElement({ name: "my-app", dependencies: [NavBar] })
export class MyApp {}
`;

      const templateImports: TemplateImport[] = [
        { moduleSpecifier: "./footer" },
      ];

      const result = transform({
        source: sourceWithDeps,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        templateImports,
      });

      // Should have both NavBar (from decorator) and template import
      // Note: NavBar comes first (decorator deps), then template import
      expect(result.code).toContain("dependencies: [NavBar, __myApp_dep0]");
    });
  });

  describe("No template imports", () => {
    it("works normally when templateImports is empty", () => {
      const result = transform({
        source: MINIMAL_SOURCE,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        templateImports: [],
      });

      // Should not have any __dep imports
      expect(result.code).not.toContain("__myApp_dep");
      // Should not have aliasedResourcesRegistry import
      expect(result.code).not.toContain("aliasedResourcesRegistry");
    });

    it("works normally when templateImports is undefined", () => {
      const result = transform({
        source: MINIMAL_SOURCE,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        // templateImports not provided
      });

      // Should not have any __dep imports
      expect(result.code).not.toContain("__myApp_dep");
    });
  });

  describe("Warnings", () => {
    it("adds warning when template imports are added", () => {
      const templateImports: TemplateImport[] = [
        { moduleSpecifier: "./foo" },
        { moduleSpecifier: "./bar" },
      ];

      const result = transform({
        source: MINIMAL_SOURCE,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        templateImports,
      });

      const importWarning = result.warnings.find(w =>
        w.message.includes("template import")
      );
      expect(importWarning).toBeDefined();
      expect(importWarning!.message).toContain("2");
    });
  });

  describe("Both default and named aliases (T4 fix)", () => {
    it("handles both default and named aliases on same import", () => {
      const templateImports: TemplateImport[] = [
        {
          moduleSpecifier: "./components",
          defaultAlias: "mainComp",
          namedAliases: [
            { exportName: "Foo", alias: "f" },
            { exportName: "Bar", alias: "b" },
          ],
        },
      ];

      const result = transform({
        source: MINIMAL_SOURCE,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        templateImports,
      });

      // Check that aliasedResourcesRegistry import was added
      expect(result.code).toContain('import { aliasedResourcesRegistry } from "@aurelia/kernel";');

      // Check that import statement was generated
      expect(result.code).toContain('import * as __myApp_dep0 from "./components";');

      // Check that default alias is used
      expect(result.code).toContain('aliasedResourcesRegistry(__myApp_dep0, "mainComp")');

      // Check that named aliases are also registered
      expect(result.code).toContain('aliasedResourcesRegistry(__myApp_dep0.Foo, "f")');
      expect(result.code).toContain('aliasedResourcesRegistry(__myApp_dep0.Bar, "b")');
    });
  });

  describe("Insert position (T1 fix)", () => {
    it("inserts after existing imports", () => {
      const templateImports: TemplateImport[] = [
        { moduleSpecifier: "./new-dep" },
      ];

      const result = transform({
        source: MINIMAL_SOURCE,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        templateImports,
      });

      // Check that template import comes after existing imports
      const customElementImportPos = result.code.indexOf('from "@aurelia/runtime-html"');
      const templateImportPos = result.code.indexOf('import * as __myApp_dep0');
      expect(templateImportPos).toBeGreaterThan(customElementImportPos);
    });

    it("inserts after shebang line", () => {
      const sourceWithShebang = `#!/usr/bin/env node
export class MyApp {}
`;

      const templateImports: TemplateImport[] = [
        { moduleSpecifier: "./foo" },
      ];

      const result = transform({
        source: sourceWithShebang,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        templateImports,
      });

      // Shebang should still be at the beginning
      expect(result.code.startsWith("#!/usr/bin/env node")).toBe(true);

      // Template import should come after shebang
      const shebangEnd = result.code.indexOf("\n") + 1;
      const templateImportPos = result.code.indexOf('import * as __myApp_dep0');
      expect(templateImportPos).toBeGreaterThanOrEqual(shebangEnd);
    });

    it("inserts after use strict directive", () => {
      const sourceWithUseStrict = `"use strict";
export class MyApp {}
`;

      const templateImports: TemplateImport[] = [
        { moduleSpecifier: "./foo" },
      ];

      const result = transform({
        source: sourceWithUseStrict,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        templateImports,
      });

      // "use strict" should still be at the beginning
      expect(result.code.startsWith('"use strict"')).toBe(true);

      // Template import should come after "use strict"
      const useStrictEnd = result.code.indexOf(";") + 1;
      const templateImportPos = result.code.indexOf('import * as __myApp_dep0');
      expect(templateImportPos).toBeGreaterThan(useStrictEnd);
    });

    it("inserts after license comment header", () => {
      const sourceWithLicense = `/**
 * MIT License
 * Copyright (c) 2024
 */
export class MyApp {}
`;

      const templateImports: TemplateImport[] = [
        { moduleSpecifier: "./foo" },
      ];

      const result = transform({
        source: sourceWithLicense,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        templateImports,
      });

      // License comment should still be at the beginning
      expect(result.code.startsWith("/**")).toBe(true);
      expect(result.code).toContain("MIT License");

      // Template import should come after the license comment
      const licenseEnd = result.code.indexOf("*/") + 2;
      const templateImportPos = result.code.indexOf('import * as __myApp_dep0');
      expect(templateImportPos).toBeGreaterThan(licenseEnd);
    });

    it("does not corrupt file with shebang and imports", () => {
      const sourceWithShebangAndImports = `#!/usr/bin/env node
import { something } from "somewhere";

export class MyApp {}
`;

      const templateImports: TemplateImport[] = [
        { moduleSpecifier: "./foo" },
      ];

      const result = transform({
        source: sourceWithShebangAndImports,
        filePath: "my-app.ts",
        aot: createMinimalAot(),
        resource: { kind: "custom-element", name: "my-app", className: "MyApp" },
        template: "<div></div>",
        templateImports,
      });

      // Shebang should be first
      expect(result.code.startsWith("#!/usr/bin/env node")).toBe(true);

      // Existing import should be preserved
      expect(result.code).toContain('import { something } from "somewhere"');

      // Template import should come after existing imports
      const existingImportPos = result.code.indexOf('from "somewhere"');
      const templateImportPos = result.code.indexOf('import * as __myApp_dep0');
      expect(templateImportPos).toBeGreaterThan(existingImportPos);
    });
  });
});
