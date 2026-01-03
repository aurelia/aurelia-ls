import { describe, it, expect } from "vitest";
import { buildExportBindingMap, lookupExportBinding } from "@aurelia-ls/resolution";
import { extractAllFacts, resolveImports } from "@aurelia-ls/resolution";
import { createProgramFromMemory } from "../_helpers/inline-program.js";

/**
 * Helper to build export bindings from in-memory files.
 */
function buildBindings(files: Record<string, string>) {
  const { program, host } = createProgramFromMemory(files);
  const facts = extractAllFacts(program, { moduleResolutionHost: host });
  const resolved = resolveImports(facts);
  return buildExportBindingMap(resolved);
}

describe("Export Binding Resolution", () => {
  describe("Direct exports", () => {
    it("binds exported class to its definition", () => {
      const map = buildBindings({
        "/src/foo.ts": `
          export class Foo {}
        `,
      });

      const binding = lookupExportBinding(map, "/src/foo.ts" as any, "Foo");
      expect(binding).toEqual({
        definitionPath: "/src/foo.ts",
        definitionName: "Foo",
      });
    });

    it("binds multiple exported classes", () => {
      const map = buildBindings({
        "/src/multi.ts": `
          export class Alpha {}
          export class Beta {}
          export class Gamma {}
        `,
      });

      expect(lookupExportBinding(map, "/src/multi.ts" as any, "Alpha")).toEqual({
        definitionPath: "/src/multi.ts",
        definitionName: "Alpha",
      });
      expect(lookupExportBinding(map, "/src/multi.ts" as any, "Beta")).toEqual({
        definitionPath: "/src/multi.ts",
        definitionName: "Beta",
      });
      expect(lookupExportBinding(map, "/src/multi.ts" as any, "Gamma")).toEqual({
        definitionPath: "/src/multi.ts",
        definitionName: "Gamma",
      });
    });

    it("does not bind non-exported classes", () => {
      const map = buildBindings({
        "/src/partial.ts": `
          export class Exported {}
          class NotExported {}
        `,
      });

      expect(lookupExportBinding(map, "/src/partial.ts" as any, "Exported")).not.toBeNull();
      expect(lookupExportBinding(map, "/src/partial.ts" as any, "NotExported")).toBeNull();
    });
  });

  describe("Named exports", () => {
    it("binds class exported via export { }", () => {
      const map = buildBindings({
        "/src/named.ts": `
          class MyClass {}
          export { MyClass };
        `,
      });

      const binding = lookupExportBinding(map, "/src/named.ts" as any, "MyClass");
      expect(binding).toEqual({
        definitionPath: "/src/named.ts",
        definitionName: "MyClass",
      });
    });

    it("binds multiple classes in single export statement", () => {
      const map = buildBindings({
        "/src/multi-named.ts": `
          class A {}
          class B {}
          export { A, B };
        `,
      });

      expect(lookupExportBinding(map, "/src/multi-named.ts" as any, "A")).not.toBeNull();
      expect(lookupExportBinding(map, "/src/multi-named.ts" as any, "B")).not.toBeNull();
    });
  });

  describe("Default exports", () => {
    it("binds default export class by name", () => {
      const map = buildBindings({
        "/src/default.ts": `
          export default class DefaultClass {}
        `,
      });

      // Both "default" and the class name should resolve
      expect(lookupExportBinding(map, "/src/default.ts" as any, "default")).toEqual({
        definitionPath: "/src/default.ts",
        definitionName: "DefaultClass",
      });
      expect(lookupExportBinding(map, "/src/default.ts" as any, "DefaultClass")).toEqual({
        definitionPath: "/src/default.ts",
        definitionName: "DefaultClass",
      });
    });
  });

  describe("Re-export named", () => {
    it("resolves re-exported class to original definition", () => {
      const map = buildBindings({
        "/src/original.ts": `
          export class Original {}
        `,
        "/src/barrel.ts": `
          export { Original } from "./original.js";
        `,
      });

      const binding = lookupExportBinding(map, "/src/barrel.ts" as any, "Original");
      expect(binding).toEqual({
        definitionPath: "/src/original.ts",
        definitionName: "Original",
      });
    });

    it("resolves re-exported class with alias", () => {
      const map = buildBindings({
        "/src/source.ts": `
          export class SourceClass {}
        `,
        "/src/alias-barrel.ts": `
          export { SourceClass as AliasedClass } from "./source.js";
        `,
      });

      // Lookup by the aliased name
      const binding = lookupExportBinding(map, "/src/alias-barrel.ts" as any, "AliasedClass");
      expect(binding).toEqual({
        definitionPath: "/src/source.ts",
        definitionName: "SourceClass",
      });

      // Original name should NOT be exported from barrel
      expect(lookupExportBinding(map, "/src/alias-barrel.ts" as any, "SourceClass")).toBeNull();
    });

    it("handles multiple re-exports from same source", () => {
      const map = buildBindings({
        "/src/components.ts": `
          export class Button {}
          export class Input {}
          export class Label {}
        `,
        "/src/index.ts": `
          export { Button, Input, Label } from "./components.js";
        `,
      });

      expect(lookupExportBinding(map, "/src/index.ts" as any, "Button")).toEqual({
        definitionPath: "/src/components.ts",
        definitionName: "Button",
      });
      expect(lookupExportBinding(map, "/src/index.ts" as any, "Input")).toEqual({
        definitionPath: "/src/components.ts",
        definitionName: "Input",
      });
      expect(lookupExportBinding(map, "/src/index.ts" as any, "Label")).toEqual({
        definitionPath: "/src/components.ts",
        definitionName: "Label",
      });
    });
  });

  describe("Re-export all", () => {
    it("resolves export * to original definitions", () => {
      const map = buildBindings({
        "/src/widgets.ts": `
          export class Widget {}
          export class SpecialWidget {}
        `,
        "/src/barrel.ts": `
          export * from "./widgets.js";
        `,
      });

      expect(lookupExportBinding(map, "/src/barrel.ts" as any, "Widget")).toEqual({
        definitionPath: "/src/widgets.ts",
        definitionName: "Widget",
      });
      expect(lookupExportBinding(map, "/src/barrel.ts" as any, "SpecialWidget")).toEqual({
        definitionPath: "/src/widgets.ts",
        definitionName: "SpecialWidget",
      });
    });

    it("aggregates exports from multiple sources", () => {
      const map = buildBindings({
        "/src/elements.ts": `
          export class NavBar {}
        `,
        "/src/attributes.ts": `
          export class Tooltip {}
        `,
        "/src/index.ts": `
          export * from "./elements.js";
          export * from "./attributes.js";
        `,
      });

      expect(lookupExportBinding(map, "/src/index.ts" as any, "NavBar")).toEqual({
        definitionPath: "/src/elements.ts",
        definitionName: "NavBar",
      });
      expect(lookupExportBinding(map, "/src/index.ts" as any, "Tooltip")).toEqual({
        definitionPath: "/src/attributes.ts",
        definitionName: "Tooltip",
      });
    });

    it("first export wins for conflicts", () => {
      const map = buildBindings({
        "/src/first.ts": `
          export class Shared {}
        `,
        "/src/second.ts": `
          export class Shared {}
        `,
        "/src/barrel.ts": `
          export * from "./first.js";
          export * from "./second.js";
        `,
      });

      // First one should win
      const binding = lookupExportBinding(map, "/src/barrel.ts" as any, "Shared");
      expect(binding?.definitionPath).toBe("/src/first.ts");
    });
  });

  describe("Re-export chains", () => {
    it("follows two-level re-export chain", () => {
      const map = buildBindings({
        "/src/deep/impl.ts": `
          export class DeepClass {}
        `,
        "/src/deep/index.ts": `
          export { DeepClass } from "./impl.js";
        `,
        "/src/index.ts": `
          export { DeepClass } from "./deep/index.js";
        `,
      });

      const binding = lookupExportBinding(map, "/src/index.ts" as any, "DeepClass");
      expect(binding).toEqual({
        definitionPath: "/src/deep/impl.ts",
        definitionName: "DeepClass",
      });
    });

    it("follows three-level re-export chain with aliases", () => {
      const map = buildBindings({
        "/src/core/base.ts": `
          export class BaseComponent {}
        `,
        "/src/core/index.ts": `
          export { BaseComponent as CoreComponent } from "./base.js";
        `,
        "/src/lib/index.ts": `
          export { CoreComponent as LibComponent } from "../core/index.js";
        `,
        "/src/index.ts": `
          export { LibComponent as AppComponent } from "./lib/index.js";
        `,
      });

      const binding = lookupExportBinding(map, "/src/index.ts" as any, "AppComponent");
      expect(binding).toEqual({
        definitionPath: "/src/core/base.ts",
        definitionName: "BaseComponent",
      });
    });

    it("follows mixed chain (export * + named re-export)", () => {
      const map = buildBindings({
        "/src/impl.ts": `
          export class Impl {}
        `,
        "/src/mid.ts": `
          export * from "./impl.js";
        `,
        "/src/top.ts": `
          export { Impl as TopImpl } from "./mid.js";
        `,
      });

      const binding = lookupExportBinding(map, "/src/top.ts" as any, "TopImpl");
      expect(binding).toEqual({
        definitionPath: "/src/impl.ts",
        definitionName: "Impl",
      });
    });
  });

  describe("Import + re-export pattern", () => {
    it("resolves import then re-export pattern", () => {
      const map = buildBindings({
        "/src/source.ts": `
          export class Source {}
        `,
        "/src/reexporter.ts": `
          import { Source } from "./source.js";
          export { Source };
        `,
      });

      const binding = lookupExportBinding(map, "/src/reexporter.ts" as any, "Source");
      expect(binding).toEqual({
        definitionPath: "/src/source.ts",
        definitionName: "Source",
      });
    });

    it("resolves import with alias then re-export", () => {
      const map = buildBindings({
        "/src/original.ts": `
          export class OriginalName {}
        `,
        "/src/wrapper.ts": `
          import { OriginalName as LocalAlias } from "./original.js";
          export { LocalAlias };
        `,
      });

      // Exported as LocalAlias
      const binding = lookupExportBinding(map, "/src/wrapper.ts" as any, "LocalAlias");
      expect(binding).toEqual({
        definitionPath: "/src/original.ts",
        definitionName: "OriginalName",
      });
    });
  });

  describe("Cycle detection", () => {
    it("handles circular re-exports without infinite loop", () => {
      const map = buildBindings({
        "/src/a.ts": `
          export * from "./b.js";
          export class A {}
        `,
        "/src/b.ts": `
          export * from "./a.js";
          export class B {}
        `,
      });

      // Should not hang - cycle detection kicks in
      expect(lookupExportBinding(map, "/src/a.ts" as any, "A")).not.toBeNull();
      expect(lookupExportBinding(map, "/src/a.ts" as any, "B")).not.toBeNull();
      expect(lookupExportBinding(map, "/src/b.ts" as any, "A")).not.toBeNull();
      expect(lookupExportBinding(map, "/src/b.ts" as any, "B")).not.toBeNull();
    });

    it("handles self-referential export (edge case)", () => {
      const map = buildBindings({
        "/src/self.ts": `
          export class Self {}
          export * from "./self.js";
        `,
      });

      // Should not hang
      const binding = lookupExportBinding(map, "/src/self.ts" as any, "Self");
      expect(binding).not.toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("returns null for unknown file", () => {
      const map = buildBindings({
        "/src/foo.ts": `export class Foo {}`,
      });

      expect(lookupExportBinding(map, "/nonexistent.ts" as any, "Foo")).toBeNull();
    });

    it("returns null for unknown export name", () => {
      const map = buildBindings({
        "/src/foo.ts": `export class Foo {}`,
      });

      expect(lookupExportBinding(map, "/src/foo.ts" as any, "Bar")).toBeNull();
    });

    it("handles empty file", () => {
      const map = buildBindings({
        "/src/empty.ts": ``,
      });

      expect(lookupExportBinding(map, "/src/empty.ts" as any, "Anything")).toBeNull();
    });

    it("handles file with only imports", () => {
      const map = buildBindings({
        "/src/source.ts": `export class Source {}`,
        "/src/importer.ts": `import { Source } from "./source.js";`,
      });

      // Source is imported but not re-exported
      expect(lookupExportBinding(map, "/src/importer.ts" as any, "Source")).toBeNull();
    });
  });

  describe("Real-world patterns", () => {
    it("resolves typical barrel file structure", () => {
      const map = buildBindings({
        "/src/elements/nav-bar.ts": `export class NavBar {}`,
        "/src/elements/user-card.ts": `export class UserCard {}`,
        "/src/elements/index.ts": `
          export { NavBar } from "./nav-bar.js";
          export { UserCard } from "./user-card.js";
        `,
        "/src/attributes/tooltip.ts": `export class Tooltip {}`,
        "/src/attributes/highlight.ts": `export class Highlight {}`,
        "/src/attributes/index.ts": `
          export { Tooltip } from "./tooltip.js";
          export { Highlight } from "./highlight.js";
        `,
        "/src/resources/index.ts": `
          export * from "../elements/index.js";
          export * from "../attributes/index.js";
        `,
        "/src/index.ts": `
          export * from "./resources/index.js";
        `,
      });

      // All resources should resolve to their original definitions
      expect(lookupExportBinding(map, "/src/index.ts" as any, "NavBar")).toEqual({
        definitionPath: "/src/elements/nav-bar.ts",
        definitionName: "NavBar",
      });
      expect(lookupExportBinding(map, "/src/index.ts" as any, "UserCard")).toEqual({
        definitionPath: "/src/elements/user-card.ts",
        definitionName: "UserCard",
      });
      expect(lookupExportBinding(map, "/src/index.ts" as any, "Tooltip")).toEqual({
        definitionPath: "/src/attributes/tooltip.ts",
        definitionName: "Tooltip",
      });
      expect(lookupExportBinding(map, "/src/index.ts" as any, "Highlight")).toEqual({
        definitionPath: "/src/attributes/highlight.ts",
        definitionName: "Highlight",
      });
    });

    it("resolves namespace import + member access pattern", () => {
      // This tests the pattern: import * as widgets from "./widgets"
      // then: Aurelia.register(widgets.SpecialWidget)
      // The binding map needs to resolve "SpecialWidget" from the barrel
      const map = buildBindings({
        "/src/widgets/special.ts": `export class SpecialWidget {}`,
        "/src/widgets/index.ts": `export { SpecialWidget } from "./special.js";`,
      });

      const binding = lookupExportBinding(map, "/src/widgets/index.ts" as any, "SpecialWidget");
      expect(binding).toEqual({
        definitionPath: "/src/widgets/special.ts",
        definitionName: "SpecialWidget",
      });
    });
  });
});
