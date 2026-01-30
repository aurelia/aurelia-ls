import { describe, it, expect, beforeEach } from "vitest";
import {
  createMockFileSystem,
  detectSiblings,
  findTemplateSibling,
  findStylesheetSibling,
  classMatchesFileName,
  buildFilePair,
  detectSiblingsBatch,
  findOrphanTemplates,
  findSourcesWithoutTemplates,
} from "@aurelia-ls/compiler";
import type { MockFileSystemContext } from "@aurelia-ls/compiler";

/**
 * Unit tests for sibling file detection.
 *
 * These tests verify the core sibling detection logic that powers
 * the sibling-file convention: foo.ts + foo.html → custom element.
 */
describe("Sibling Detection", () => {
  let fs: MockFileSystemContext;

  beforeEach(() => {
    fs = createMockFileSystem({
      files: {
        // Standard component with template and stylesheet
        "/src/my-app.ts": "export class MyApp {}",
        "/src/my-app.html": "<template></template>",
        "/src/my-app.css": ".my-app { }",

        // Component with only template (no stylesheet)
        "/src/nav-bar.ts": "export class NavBar {}",
        "/src/nav-bar.html": "<nav></nav>",

        // Component with only source (inline template)
        "/src/inline.ts": "export class Inline { static template = '<div></div>'; }",

        // Orphan template (no matching source)
        "/src/orphan.html": "<template></template>",

        // Component in subdirectory
        "/src/components/user-card.ts": "export class UserCard {}",
        "/src/components/user-card.html": "<div class='card'></div>",
        "/src/components/user-card.scss": ".card { }",
      },
    });
  });

  // ==========================================================================
  // detectSiblings
  // ==========================================================================

  describe("detectSiblings", () => {
    it("detects template sibling", () => {
      const siblings = detectSiblings("/src/my-app.ts", fs, {
        templateExtensions: [".html"],
        styleExtensions: [],
      });

      expect(siblings).toEqual([
        { path: "/src/my-app.html", extension: ".html", baseName: "my-app" },
      ]);
    });

    it("detects template and stylesheet siblings", () => {
      const siblings = detectSiblings("/src/my-app.ts", fs, {
        templateExtensions: [".html"],
        styleExtensions: [".css"],
      });

      expect(siblings).toEqual([
        { path: "/src/my-app.html", extension: ".html", baseName: "my-app" },
        { path: "/src/my-app.css", extension: ".css", baseName: "my-app" },
      ]);
    });

    it("returns empty array when no siblings exist", () => {
      const siblings = detectSiblings("/src/inline.ts", fs, {
        templateExtensions: [".html"],
        styleExtensions: [".css"],
      });

      expect(siblings).toEqual([]);
    });

    it("works in subdirectories", () => {
      const siblings = detectSiblings("/src/components/user-card.ts", fs, {
        templateExtensions: [".html"],
        styleExtensions: [".scss"],
      });

      expect(siblings).toEqual([
        { path: "/src/components/user-card.html", extension: ".html", baseName: "user-card" },
        { path: "/src/components/user-card.scss", extension: ".scss", baseName: "user-card" },
      ]);
    });

    it("uses default extensions when options not provided", () => {
      const siblings = detectSiblings("/src/my-app.ts", fs);

      // Default: templateExtensions=['.html'], styleExtensions=['.css', '.scss']
      expect(siblings).toEqual([
        { path: "/src/my-app.html", extension: ".html", baseName: "my-app" },
        { path: "/src/my-app.css", extension: ".css", baseName: "my-app" },
      ]);
    });
  });

  // ==========================================================================
  // findTemplateSibling / findStylesheetSibling
  // ==========================================================================

  describe("findTemplateSibling", () => {
    it("finds HTML template", () => {
      const template = findTemplateSibling("/src/my-app.ts", fs, [".html"]);

      expect(template).toEqual({
        path: "/src/my-app.html",
        extension: ".html",
        baseName: "my-app",
      });
    });

    it("returns undefined when no template exists", () => {
      const template = findTemplateSibling("/src/inline.ts", fs, [".html"]);

      expect(template).toBeUndefined();
    });
  });

  describe("findStylesheetSibling", () => {
    it("finds CSS stylesheet", () => {
      const stylesheet = findStylesheetSibling("/src/my-app.ts", fs, [".css"]);

      expect(stylesheet).toEqual({
        path: "/src/my-app.css",
        extension: ".css",
        baseName: "my-app",
      });
    });

    it("finds SCSS stylesheet", () => {
      const stylesheet = findStylesheetSibling("/src/components/user-card.ts", fs, [".scss"]);

      expect(stylesheet).toEqual({
        path: "/src/components/user-card.scss",
        extension: ".scss",
        baseName: "user-card",
      });
    });

    it("respects priority order (returns first match)", () => {
      // Add both CSS and SCSS for my-app
      fs.addFile("/src/my-app.scss", ".my-app { }");

      const stylesheet = findStylesheetSibling("/src/my-app.ts", fs, [".css", ".scss"]);

      // Should return .css since it comes first in priority order
      expect(stylesheet?.extension).toBe(".css");
    });

    it("returns undefined when no stylesheet exists", () => {
      const stylesheet = findStylesheetSibling("/src/nav-bar.ts", fs, [".css", ".scss"]);

      expect(stylesheet).toBeUndefined();
    });
  });

  // ==========================================================================
  // classMatchesFileName
  // ==========================================================================

  describe("classMatchesFileName", () => {
    it("matches PascalCase class to kebab-case file", () => {
      expect(classMatchesFileName("MyApp", "/src/my-app.ts")).toBe(true);
      expect(classMatchesFileName("NavBar", "/src/nav-bar.ts")).toBe(true);
      expect(classMatchesFileName("UserCard", "/src/user-card.ts")).toBe(true);
    });

    it("matches PascalCase class to PascalCase file", () => {
      expect(classMatchesFileName("MyApp", "/src/MyApp.ts")).toBe(true);
    });

    it("matches class with CustomElement suffix", () => {
      expect(classMatchesFileName("MyAppCustomElement", "/src/my-app.ts")).toBe(true);
      expect(classMatchesFileName("NavBarCustomElement", "/src/nav-bar.ts")).toBe(true);
    });

    it("matches class with Element suffix", () => {
      expect(classMatchesFileName("MyAppElement", "/src/my-app.ts")).toBe(true);
    });

    it("rejects non-matching class names", () => {
      expect(classMatchesFileName("SomethingElse", "/src/my-app.ts")).toBe(false);
      expect(classMatchesFileName("MyAppService", "/src/my-app.ts")).toBe(false);
    });

    it("handles multi-segment kebab-case", () => {
      expect(classMatchesFileName("CortexDeviceList", "/src/cortex-device-list.ts")).toBe(true);
      expect(classMatchesFileName("CortexDeviceListCustomElement", "/src/cortex-device-list.ts")).toBe(true);
    });
  });

  // ==========================================================================
  // buildFilePair
  // ==========================================================================

  describe("buildFilePair", () => {
    it("builds complete file pair with template and stylesheet", () => {
      const pair = buildFilePair("/src/my-app.ts" as any, fs, {
        templateExtensions: [".html"],
        styleExtensions: [".css"],
      });

      expect(pair.source.path).toBe("/src/my-app.ts");
      expect(pair.source.baseName).toBe("my-app");
      expect(pair.source.extension).toBe(".ts");
      expect(pair.source.type).toBe("source");

      expect(pair.template).toBeDefined();
      expect(pair.template!.path).toBe("/src/my-app.html");
      expect(pair.template!.type).toBe("template");

      expect(pair.stylesheet).toBeDefined();
      expect(pair.stylesheet!.path).toBe("/src/my-app.css");
      expect(pair.stylesheet!.type).toBe("stylesheet");

      expect(pair.detection.kind).toBe("sibling");
    });

    it("builds file pair without stylesheet", () => {
      const pair = buildFilePair("/src/nav-bar.ts" as any, fs, {
        templateExtensions: [".html"],
        styleExtensions: [".css"],
      });

      expect(pair.template).toBeDefined();
      expect(pair.stylesheet).toBeUndefined();
    });

    it("builds file pair without template", () => {
      const pair = buildFilePair("/src/inline.ts" as any, fs, {
        templateExtensions: [".html"],
        styleExtensions: [".css"],
      });

      expect(pair.template).toBeUndefined();
      expect(pair.stylesheet).toBeUndefined();
    });
  });

  // ==========================================================================
  // Batch Detection
  // ==========================================================================

  describe("detectSiblingsBatch", () => {
    it("detects siblings for multiple sources", () => {
      const results = detectSiblingsBatch(
        ["/src/my-app.ts", "/src/nav-bar.ts", "/src/inline.ts"],
        fs,
        { templateExtensions: [".html"], styleExtensions: [] }, // Only HTML, no styles
      );

      expect(results.size).toBe(2); // my-app and nav-bar have siblings
      expect(results.get("/src/my-app.ts")).toHaveLength(1);
      expect(results.get("/src/nav-bar.ts")).toHaveLength(1);
      expect(results.has("/src/inline.ts")).toBe(false); // no siblings
    });
  });

  // ==========================================================================
  // Orphan Detection
  // ==========================================================================

  describe("findOrphanTemplates", () => {
    it("finds templates without matching source", () => {
      const templates = ["/src/my-app.html", "/src/nav-bar.html", "/src/orphan.html"];
      const sources = ["/src/my-app.ts", "/src/nav-bar.ts"];

      const orphans = findOrphanTemplates(templates, sources, fs);

      expect(orphans).toEqual(["/src/orphan.html"]);
    });

    it("returns empty array when all templates have sources", () => {
      const templates = ["/src/my-app.html", "/src/nav-bar.html"];
      const sources = ["/src/my-app.ts", "/src/nav-bar.ts"];

      const orphans = findOrphanTemplates(templates, sources, fs);

      expect(orphans).toEqual([]);
    });
  });

  describe("findSourcesWithoutTemplates", () => {
    it("finds sources without matching template", () => {
      const sources = ["/src/my-app.ts", "/src/nav-bar.ts", "/src/inline.ts"];
      const templates = ["/src/my-app.html", "/src/nav-bar.html"];

      const withoutTemplates = findSourcesWithoutTemplates(sources, templates, fs);

      expect(withoutTemplates).toEqual(["/src/inline.ts"]);
    });

    it("returns empty array when all sources have templates", () => {
      const sources = ["/src/my-app.ts", "/src/nav-bar.ts"];
      const templates = ["/src/my-app.html", "/src/nav-bar.html"];

      const withoutTemplates = findSourcesWithoutTemplates(sources, templates, fs);

      expect(withoutTemplates).toEqual([]);
    });
  });
});

// ==========================================================================
// Edge Cases and Real-World Scenarios
// ==========================================================================

describe("Sibling Detection: Edge Cases", () => {
  let fs: MockFileSystemContext;

  beforeEach(() => {
    fs = createMockFileSystem();
  });

  it("handles Windows-style paths", () => {
    fs.addFile("\\src\\my-app.ts", "export class MyApp {}");
    fs.addFile("\\src\\my-app.html", "<template></template>");

    const siblings = detectSiblings("\\src\\my-app.ts", fs, {
      templateExtensions: [".html"],
    });

    expect(siblings).toHaveLength(1);
    expect(siblings[0]!.extension).toBe(".html");
  });

  it("handles deeply nested paths", () => {
    fs.addFile("/src/features/admin/components/user-table.ts", "");
    fs.addFile("/src/features/admin/components/user-table.html", "");

    const siblings = detectSiblings(
      "/src/features/admin/components/user-table.ts",
      fs,
      { templateExtensions: [".html"] },
    );

    expect(siblings).toHaveLength(1);
    expect(siblings[0]!.baseName).toBe("user-table");
  });

  it("handles file names with multiple dots", () => {
    fs.addFile("/src/my.component.spec.ts", "");
    fs.addFile("/src/my.component.spec.html", ""); // Unlikely but valid

    const siblings = detectSiblings("/src/my.component.spec.ts", fs, {
      templateExtensions: [".html"],
    });

    expect(siblings).toHaveLength(1);
    expect(siblings[0]!.baseName).toBe("my.component.spec");
  });

  it("handles single-letter file names", () => {
    fs.addFile("/src/a.ts", "");
    fs.addFile("/src/a.html", "");

    const siblings = detectSiblings("/src/a.ts", fs, {
      templateExtensions: [".html"],
    });

    expect(siblings).toEqual([
      { path: "/src/a.html", extension: ".html", baseName: "a" },
    ]);
  });

  it("handles numeric file names", () => {
    fs.addFile("/src/404.ts", "export class NotFound {}");
    fs.addFile("/src/404.html", "<h1>Not Found</h1>");

    const siblings = detectSiblings("/src/404.ts", fs, {
      templateExtensions: [".html"],
    });

    expect(siblings).toEqual([
      { path: "/src/404.html", extension: ".html", baseName: "404" },
    ]);
  });
});

describe("classMatchesFileName: Edge Cases", () => {
  it("handles single-word names", () => {
    expect(classMatchesFileName("App", "/src/app.ts")).toBe(true);
    expect(classMatchesFileName("AppCustomElement", "/src/app.ts")).toBe(true);
  });

  it("handles all-caps acronyms in class name", () => {
    // This is a known edge case - how should we handle "HTMLParser" vs "html-parser"?
    // Current behavior: normalize both to same form
    expect(classMatchesFileName("HtmlParser", "/src/html-parser.ts")).toBe(true);
  });

  it("handles underscores in file names", () => {
    // Underscores are less common but should work
    expect(classMatchesFileName("MyApp", "/src/my_app.ts")).toBe(true);
  });

  it("rejects class names that don't match file structure", () => {
    expect(classMatchesFileName("CompletelyDifferent", "/src/my-app.ts")).toBe(false);
    expect(classMatchesFileName("MyAppComponent", "/src/my-app.ts")).toBe(false); // Not a recognized suffix
  });
});
