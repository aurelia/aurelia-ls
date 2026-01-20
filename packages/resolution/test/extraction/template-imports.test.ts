/**
 * Template Import Extraction Tests
 *
 * Tests for extracting <import> and <require> elements from templates.
 */

import { describe, it, expect } from "vitest";
import { extractTemplateImports } from "../../src/extraction/template-imports.js";
import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { FileSystemContext } from "../../src/project/context.js";

// Mock file system
function createMockFs(files: Record<string, string>): FileSystemContext {
  return {
    fileExists: (path: string) => path in files,
    readFile: (path: string) => files[path],
    readDirectory: () => [],
    getSiblingFiles: () => [],
    normalizePath: (p: string) => p as NormalizedPath,
    caseSensitive: true,
  };
}

describe("Template Import Extraction", () => {
  describe("extractTemplateImports", () => {
    it("extracts simple import", () => {
      const fs = createMockFs({
        "/app/my.html": `<import from="./foo"><div></div>`,
      });

      const imports = extractTemplateImports("/app/my.html" as NormalizedPath, fs);

      expect(imports).toHaveLength(1);
      expect(imports[0]!.moduleSpecifier).toBe("./foo");
      expect(imports[0]!.defaultAlias).toBeNull();
      expect(imports[0]!.namedAliases).toHaveLength(0);
    });

    it("extracts import with default alias", () => {
      const fs = createMockFs({
        "/app/my.html": `<import from="./foo" as="bar"><div></div>`,
      });

      const imports = extractTemplateImports("/app/my.html" as NormalizedPath, fs);

      expect(imports).toHaveLength(1);
      expect(imports[0]!.moduleSpecifier).toBe("./foo");
      expect(imports[0]!.defaultAlias?.value).toBe("bar");
    });

    it("extracts import with named alias", () => {
      const fs = createMockFs({
        "/app/my.html": `<import from="./converters" DateFormat.as="df"><div></div>`,
      });

      const imports = extractTemplateImports("/app/my.html" as NormalizedPath, fs);

      expect(imports).toHaveLength(1);
      expect(imports[0]!.moduleSpecifier).toBe("./converters");
      expect(imports[0]!.namedAliases).toHaveLength(1);
      expect(imports[0]!.namedAliases[0]?.exportName.value).toBe("DateFormat");
      expect(imports[0]!.namedAliases[0]?.alias.value).toBe("df");
    });

    it("extracts import with multiple named aliases", () => {
      const fs = createMockFs({
        "/app/my.html": `<import from="./utils" Foo.as="foo" Bar.as="bar"><div></div>`,
      });

      const imports = extractTemplateImports("/app/my.html" as NormalizedPath, fs);

      expect(imports).toHaveLength(1);
      expect(imports[0]!.namedAliases).toHaveLength(2);
      expect(imports[0]!.namedAliases[0]?.exportName.value).toBe("Foo");
      expect(imports[0]!.namedAliases[0]?.alias.value).toBe("foo");
      expect(imports[0]!.namedAliases[1]?.exportName.value).toBe("Bar");
      expect(imports[0]!.namedAliases[1]?.alias.value).toBe("bar");
    });

    it("extracts multiple imports", () => {
      const fs = createMockFs({
        "/app/my.html": `
          <import from="./a">
          <import from="./b">
          <import from="./c">
          <div></div>
        `,
      });

      const imports = extractTemplateImports("/app/my.html" as NormalizedPath, fs);

      expect(imports).toHaveLength(3);
      expect(imports[0]!.moduleSpecifier).toBe("./a");
      expect(imports[1]!.moduleSpecifier).toBe("./b");
      expect(imports[2]!.moduleSpecifier).toBe("./c");
    });

    it("handles <require> as legacy alias", () => {
      const fs = createMockFs({
        "/app/my.html": `<require from="./legacy"><div></div>`,
      });

      const imports = extractTemplateImports("/app/my.html" as NormalizedPath, fs);

      expect(imports).toHaveLength(1);
      expect(imports[0]!.moduleSpecifier).toBe("./legacy");
    });

    it("returns empty array for file without imports", () => {
      const fs = createMockFs({
        "/app/my.html": `<div>content</div>`,
      });

      const imports = extractTemplateImports("/app/my.html" as NormalizedPath, fs);

      expect(imports).toHaveLength(0);
    });

    it("returns empty array for non-existent file", () => {
      const fs = createMockFs({});

      const imports = extractTemplateImports("/app/missing.html" as NormalizedPath, fs);

      expect(imports).toHaveLength(0);
    });

    it("preserves span for import element", () => {
      const html = `<import from="./foo">`;
      const fs = createMockFs({
        "/app/my.html": html,
      });

      const imports = extractTemplateImports("/app/my.html" as NormalizedPath, fs);

      expect(imports[0]!.span.start).toBe(0);
      expect(imports[0]!.span.end).toBe(html.length);
    });

    it("preserves span for module specifier", () => {
      const fs = createMockFs({
        "/app/my.html": `<import from="./my-component">`,
      });

      const imports = extractTemplateImports("/app/my.html" as NormalizedPath, fs);

      const specSpan = imports[0]!.moduleSpecifierSpan;
      const html = `<import from="./my-component">`;
      expect(html.slice(specSpan.start, specSpan.end)).toBe("./my-component");
    });

    it("extracts package imports", () => {
      const fs = createMockFs({
        "/app/my.html": `<import from="@aurelia/router"><div></div>`,
      });

      const imports = extractTemplateImports("/app/my.html" as NormalizedPath, fs);

      expect(imports).toHaveLength(1);
      expect(imports[0]!.moduleSpecifier).toBe("@aurelia/router");
    });

    it("skips imports inside as-custom-element", () => {
      const fs = createMockFs({
        "/app/my.html": `
          <import from="./global">
          <template as-custom-element="local">
            <import from="./local">
          </template>
        `,
      });

      const imports = extractTemplateImports("/app/my.html" as NormalizedPath, fs);

      // Should only find the global import
      expect(imports).toHaveLength(1);
      expect(imports[0]!.moduleSpecifier).toBe("./global");
    });
  });
});
