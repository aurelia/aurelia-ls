import { describe, it, expect } from "vitest";
import {
  createProjectFile,
  getBaseName,
  getDirectory,
  getExtension,
  getFileType,
  pathsEqual,
} from "@aurelia-ls/compiler/project-semantics/project/context.js";
import type { NormalizedPath } from "@aurelia-ls/compiler/model/identity.js";
/**
 * Unit tests for context.ts utility functions.
 *
 * These are foundational utilities used throughout the file discovery system.
 * They must be rock-solid since sibling detection, scanning, and conventions
 * all depend on them.
 */
describe("Context Utilities", () => {
  // ==========================================================================
  // getFileType
  // ==========================================================================

  describe("getFileType", () => {
    describe("source files", () => {
      it("classifies .ts as source", () => {
        expect(getFileType(".ts")).toBe("source");
      });

      it("classifies .js as source", () => {
        expect(getFileType(".js")).toBe("source");
      });

      it("classifies .tsx as source", () => {
        expect(getFileType(".tsx")).toBe("source");
      });

      it("classifies .jsx as source", () => {
        expect(getFileType(".jsx")).toBe("source");
      });

      it("classifies .mts as source", () => {
        expect(getFileType(".mts")).toBe("source");
      });

      it("classifies .mjs as source", () => {
        expect(getFileType(".mjs")).toBe("source");
      });
    });

    describe("template files", () => {
      it("classifies .html as template", () => {
        expect(getFileType(".html")).toBe("template");
      });

      it("classifies .htm as template", () => {
        expect(getFileType(".htm")).toBe("template");
      });
    });

    describe("stylesheet files", () => {
      it("classifies .css as stylesheet", () => {
        expect(getFileType(".css")).toBe("stylesheet");
      });

      it("classifies .scss as stylesheet", () => {
        expect(getFileType(".scss")).toBe("stylesheet");
      });

      it("classifies .sass as stylesheet", () => {
        expect(getFileType(".sass")).toBe("stylesheet");
      });

      it("classifies .less as stylesheet", () => {
        expect(getFileType(".less")).toBe("stylesheet");
      });

      it("classifies .styl as stylesheet", () => {
        expect(getFileType(".styl")).toBe("stylesheet");
      });
    });

    describe("config files", () => {
      it("classifies .json as config", () => {
        expect(getFileType(".json")).toBe("config");
      });
    });

    describe("other files", () => {
      it("classifies .md as other", () => {
        expect(getFileType(".md")).toBe("other");
      });

      it("classifies .txt as other", () => {
        expect(getFileType(".txt")).toBe("other");
      });

      it("classifies .png as other", () => {
        expect(getFileType(".png")).toBe("other");
      });

      it("classifies empty string as other", () => {
        expect(getFileType("")).toBe("other");
      });

      it("classifies unknown extension as other", () => {
        expect(getFileType(".xyz")).toBe("other");
      });
    });

    describe("case sensitivity", () => {
      it("handles uppercase .TS as source", () => {
        expect(getFileType(".TS")).toBe("source");
      });

      it("handles uppercase .HTML as template", () => {
        expect(getFileType(".HTML")).toBe("template");
      });

      it("handles mixed case .Css as stylesheet", () => {
        expect(getFileType(".Css")).toBe("stylesheet");
      });

      it("handles uppercase .JSON as config", () => {
        expect(getFileType(".JSON")).toBe("config");
      });
    });
  });

  // ==========================================================================
  // createProjectFile
  // ==========================================================================

  describe("createProjectFile", () => {
    it("creates ProjectFile with correct properties", () => {
      const file = createProjectFile(
        "/src/my-app.ts" as NormalizedPath,
        "my-app",
        ".ts",
        "/src" as NormalizedPath,
      );

      expect(file.path).toBe("/src/my-app.ts");
      expect(file.baseName).toBe("my-app");
      expect(file.extension).toBe(".ts");
      expect(file.directory).toBe("/src");
      expect(file.type).toBe("source");
    });

    it("infers type from extension for templates", () => {
      const file = createProjectFile(
        "/src/my-app.html" as NormalizedPath,
        "my-app",
        ".html",
        "/src" as NormalizedPath,
      );

      expect(file.type).toBe("template");
    });

    it("infers type from extension for stylesheets", () => {
      const file = createProjectFile(
        "/src/styles.scss" as NormalizedPath,
        "styles",
        ".scss",
        "/src" as NormalizedPath,
      );

      expect(file.type).toBe("stylesheet");
    });

    it("handles deeply nested paths", () => {
      const file = createProjectFile(
        "/src/features/admin/components/user-table.ts" as NormalizedPath,
        "user-table",
        ".ts",
        "/src/features/admin/components" as NormalizedPath,
      );

      expect(file.path).toBe("/src/features/admin/components/user-table.ts");
      expect(file.directory).toBe("/src/features/admin/components");
    });

    it("handles Windows-style paths", () => {
      const file = createProjectFile(
        "C:/projects/app/src/my-app.ts" as NormalizedPath,
        "my-app",
        ".ts",
        "C:/projects/app/src" as NormalizedPath,
      );

      expect(file.path).toBe("C:/projects/app/src/my-app.ts");
    });
  });

  // ==========================================================================
  // pathsEqual
  // ==========================================================================

  describe("pathsEqual", () => {
    describe("case-sensitive comparison", () => {
      it("matches identical paths", () => {
        expect(pathsEqual("/src/foo.ts", "/src/foo.ts", true)).toBe(true);
      });

      it("rejects paths differing only in case", () => {
        expect(pathsEqual("/src/Foo.ts", "/src/foo.ts", true)).toBe(false);
      });

      it("rejects completely different paths", () => {
        expect(pathsEqual("/src/foo.ts", "/src/bar.ts", true)).toBe(false);
      });
    });

    describe("case-insensitive comparison", () => {
      it("matches identical paths", () => {
        expect(pathsEqual("/src/foo.ts", "/src/foo.ts", false)).toBe(true);
      });

      it("matches paths differing only in case", () => {
        expect(pathsEqual("/src/Foo.ts", "/src/foo.ts", false)).toBe(true);
        expect(pathsEqual("/src/FOO.TS", "/src/foo.ts", false)).toBe(true);
        expect(pathsEqual("/SRC/foo.ts", "/src/foo.ts", false)).toBe(true);
      });

      it("rejects completely different paths", () => {
        expect(pathsEqual("/src/foo.ts", "/src/bar.ts", false)).toBe(false);
      });
    });

    describe("edge cases", () => {
      it("handles empty strings", () => {
        expect(pathsEqual("", "", true)).toBe(true);
        expect(pathsEqual("", "", false)).toBe(true);
        expect(pathsEqual("", "/src/foo.ts", true)).toBe(false);
      });

      it("handles Windows paths with drive letters", () => {
        expect(pathsEqual("C:/foo.ts", "c:/foo.ts", true)).toBe(false);
        expect(pathsEqual("C:/foo.ts", "c:/foo.ts", false)).toBe(true);
      });
    });
  });

  // ==========================================================================
  // getBaseName
  // ==========================================================================

  describe("getBaseName", () => {
    it("extracts base name from simple path", () => {
      expect(getBaseName("/src/my-app.ts")).toBe("my-app");
    });

    it("extracts base name from deeply nested path", () => {
      expect(getBaseName("/src/features/admin/user-table.ts")).toBe("user-table");
    });

    it("handles multiple dots in filename", () => {
      expect(getBaseName("/src/my.component.spec.ts")).toBe("my.component.spec");
    });

    it("handles single-letter base name", () => {
      expect(getBaseName("/src/a.ts")).toBe("a");
    });

    it("handles numeric base name", () => {
      expect(getBaseName("/src/404.html")).toBe("404");
    });

    it("handles file with no extension", () => {
      expect(getBaseName("/src/Makefile")).toBe("Makefile");
    });

    it("handles hidden files (dot-prefixed)", () => {
      // .gitignore has no extension, so base name is the whole thing
      expect(getBaseName("/src/.gitignore")).toBe(".gitignore");
      // .eslintrc.json has extension .json, base is .eslintrc
      expect(getBaseName("/src/.eslintrc.json")).toBe(".eslintrc");
    });

    it("handles Windows-style forward slashes", () => {
      expect(getBaseName("C:/projects/app/src/my-app.ts")).toBe("my-app");
    });

    it("handles Windows-style backslashes", () => {
      expect(getBaseName("C:\\projects\\app\\src\\my-app.ts")).toBe("my-app");
    });

    it("handles filename only (no path)", () => {
      expect(getBaseName("my-app.ts")).toBe("my-app");
    });
  });

  // ==========================================================================
  // getExtension
  // ==========================================================================

  describe("getExtension", () => {
    it("extracts extension from simple path", () => {
      expect(getExtension("/src/my-app.ts")).toBe(".ts");
    });

    it("extracts extension from deeply nested path", () => {
      expect(getExtension("/src/features/admin/user-table.html")).toBe(".html");
    });

    it("extracts last extension from multiple dots", () => {
      expect(getExtension("/src/my.component.spec.ts")).toBe(".ts");
    });

    it("handles various extensions", () => {
      expect(getExtension("/src/foo.ts")).toBe(".ts");
      expect(getExtension("/src/foo.js")).toBe(".js");
      expect(getExtension("/src/foo.html")).toBe(".html");
      expect(getExtension("/src/foo.css")).toBe(".css");
      expect(getExtension("/src/foo.scss")).toBe(".scss");
      expect(getExtension("/src/foo.json")).toBe(".json");
    });

    it("returns empty string for file with no extension", () => {
      expect(getExtension("/src/Makefile")).toBe("");
    });

    it("handles hidden files", () => {
      expect(getExtension("/src/.gitignore")).toBe("");
      expect(getExtension("/src/.eslintrc.json")).toBe(".json");
    });

    it("handles Windows-style paths", () => {
      expect(getExtension("C:\\projects\\app.ts")).toBe(".ts");
    });

    it("handles filename only", () => {
      expect(getExtension("my-app.ts")).toBe(".ts");
    });
  });

  // ==========================================================================
  // getDirectory
  // ==========================================================================

  describe("getDirectory", () => {
    it("extracts directory from simple path", () => {
      expect(getDirectory("/src/my-app.ts")).toBe("/src");
    });

    it("extracts directory from deeply nested path", () => {
      expect(getDirectory("/src/features/admin/user-table.ts")).toBe("/src/features/admin");
    });

    it("handles root-level file", () => {
      expect(getDirectory("/my-app.ts")).toBe("");
    });

    it("returns . for filename only", () => {
      expect(getDirectory("my-app.ts")).toBe(".");
    });

    it("handles Windows-style forward slashes", () => {
      expect(getDirectory("C:/projects/app/src/my-app.ts")).toBe("C:/projects/app/src");
    });

    it("handles Windows-style backslashes", () => {
      expect(getDirectory("C:\\projects\\app\\src\\my-app.ts")).toBe("C:\\projects\\app\\src");
    });

    it("handles mixed slashes (prefers last found)", () => {
      // The function uses Math.max to find the last slash of either type
      expect(getDirectory("C:/projects\\app/src\\my-app.ts")).toBe("C:/projects\\app/src");
    });

    it("handles trailing slash in path", () => {
      expect(getDirectory("/src/components/")).toBe("/src/components");
    });
  });
});

// ==========================================================================
// Integration: Utility Functions Work Together
// ==========================================================================

describe("Context Utilities Integration", () => {
  it("parses a complete file path correctly", () => {
    const path = "/src/features/admin/components/user-table.ts";

    const baseName = getBaseName(path);
    const extension = getExtension(path);
    const directory = getDirectory(path);
    const type = getFileType(extension);

    expect(baseName).toBe("user-table");
    expect(extension).toBe(".ts");
    expect(directory).toBe("/src/features/admin/components");
    expect(type).toBe("source");

    // Can reconstruct with createProjectFile
    const file = createProjectFile(
      path as NormalizedPath,
      baseName,
      extension,
      directory as NormalizedPath,
    );

    expect(file.path).toBe(path);
    expect(file.baseName).toBe(baseName);
    expect(file.extension).toBe(extension);
    expect(file.directory).toBe(directory);
    expect(file.type).toBe(type);
  });

  it("handles all common Aurelia file types", () => {
    const testCases = [
      { path: "/src/my-app.ts", expectedType: "source" },
      { path: "/src/my-app.html", expectedType: "template" },
      { path: "/src/my-app.css", expectedType: "stylesheet" },
      { path: "/src/my-app.scss", expectedType: "stylesheet" },
      { path: "/src/tsconfig.json", expectedType: "config" },
    ];

    for (const { path, expectedType } of testCases) {
      const extension = getExtension(path);
      const type = getFileType(extension);
      expect(type).toBe(expectedType);
    }
  });

  it("enables path comparison for sibling matching", () => {
    const sourcePath = "/src/my-app.ts";
    const templatePath = "/src/my-app.html";

    const sourceBase = getBaseName(sourcePath);
    const templateBase = getBaseName(templatePath);

    // Sibling detection compares base names
    expect(sourceBase).toBe(templateBase);
    expect(sourceBase).toBe("my-app");

    // And directories should match
    const sourceDir = getDirectory(sourcePath);
    const templateDir = getDirectory(templatePath);

    expect(pathsEqual(sourceDir, templateDir, true)).toBe(true);
  });
});
