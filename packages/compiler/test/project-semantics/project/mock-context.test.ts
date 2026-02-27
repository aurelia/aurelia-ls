import { describe, it, expect, beforeEach } from "vitest";
import { createMockFileSystem } from "@aurelia-ls/compiler";
import type { MockFileSystemContext } from "@aurelia-ls/compiler";

/**
 * Unit tests for MockFileSystemContext.
 *
 * These tests verify the mock file system behaves correctly,
 * which is essential since all other file discovery tests depend on it.
 */
describe("MockFileSystemContext", () => {
  let fs: MockFileSystemContext;

  beforeEach(() => {
    fs = createMockFileSystem();
  });

  // ==========================================================================
  // Basic File Operations
  // ==========================================================================

  describe("file operations", () => {
    it("reports non-existent file correctly", () => {
      expect(fs.fileExists("/does/not/exist.ts")).toBe(false);
      expect(fs.readFile("/does/not/exist.ts")).toBeUndefined();
    });

    it("adds and reads a file", () => {
      fs.addFile("/src/foo.ts", "export class Foo {}");

      expect(fs.fileExists("/src/foo.ts")).toBe(true);
      expect(fs.readFile("/src/foo.ts")).toBe("export class Foo {}");
    });

    it("overwrites existing file", () => {
      fs.addFile("/src/foo.ts", "original");
      fs.addFile("/src/foo.ts", "updated");

      expect(fs.readFile("/src/foo.ts")).toBe("updated");
    });

    it("removes a file", () => {
      fs.addFile("/src/foo.ts", "content");
      expect(fs.fileExists("/src/foo.ts")).toBe(true);

      fs.remove("/src/foo.ts");
      expect(fs.fileExists("/src/foo.ts")).toBe(false);
    });

    it("clears all files", () => {
      fs.addFile("/a.ts", "a");
      fs.addFile("/b.ts", "b");
      fs.addFile("/c.ts", "c");

      fs.clear();

      expect(fs.getAllFiles()).toEqual([]);
    });
  });

  // ==========================================================================
  // Directory Operations
  // ==========================================================================

  describe("directory operations", () => {
    it("creates parent directories automatically", () => {
      fs.addFile("/src/components/deep/nested/foo.ts", "content");

      expect(fs.isDirectory("/src")).toBe(true);
      expect(fs.isDirectory("/src/components")).toBe(true);
      expect(fs.isDirectory("/src/components/deep")).toBe(true);
      expect(fs.isDirectory("/src/components/deep/nested")).toBe(true);
    });

    it("reads directory contents", () => {
      fs.addFile("/src/foo.ts", "foo");
      fs.addFile("/src/bar.ts", "bar");
      fs.addFile("/src/baz.html", "baz");

      const entries = fs.readDirectory("/src").sort();
      expect(entries).toEqual(["bar.ts", "baz.html", "foo.ts"]);
    });

    it("does not include nested files in directory listing", () => {
      fs.addFile("/src/foo.ts", "foo");
      fs.addFile("/src/sub/bar.ts", "bar");

      const entries = fs.readDirectory("/src").sort();
      expect(entries).toEqual(["foo.ts", "sub"]);
    });

    it("distinguishes files from directories", () => {
      fs.addFile("/src/foo.ts", "content");
      fs.addDirectory("/src/components");

      expect(fs.isDirectory("/src/foo.ts")).toBe(false);
      expect(fs.isDirectory("/src/components")).toBe(true);
    });
  });

  // ==========================================================================
  // Path Normalization
  // ==========================================================================

  describe("path normalization", () => {
    it("normalizes forward slashes", () => {
      fs.addFile("/src/foo.ts", "content");

      expect(fs.normalizePath("/src/foo.ts")).toBe("/src/foo.ts");
    });

    it("normalizes backslashes to forward slashes", () => {
      fs.addFile("\\src\\foo.ts", "content");

      expect(fs.fileExists("/src/foo.ts")).toBe(true);
    });

    it("resolves . and .. segments", () => {
      const normalized = fs.normalizePath("/src/./components/../foo.ts");
      expect(normalized).toBe("/src/foo.ts");
    });

    it("resolves relative path from file", () => {
      const resolved = fs.resolvePath("/src/components/bar.ts", "../foo.ts");
      expect(resolved).toBe("/src/foo.ts");
    });

    it("resolves absolute path ignoring base", () => {
      const resolved = fs.resolvePath("/src/components/bar.ts", "/other/file.ts");
      expect(resolved).toBe("/other/file.ts");
    });
  });

  // ==========================================================================
  // Sibling File Detection
  // ==========================================================================

  describe("getSiblingFiles", () => {
    beforeEach(() => {
      // Set up a typical component structure
      fs.addFile("/src/foo.ts", "export class Foo {}");
      fs.addFile("/src/foo.html", "<template></template>");
      fs.addFile("/src/foo.css", ".foo { }");
      fs.addFile("/src/bar.ts", "export class Bar {}");
      // bar has no siblings
    });

    it("finds HTML sibling", () => {
      const siblings = fs.getSiblingFiles("/src/foo.ts", [".html"]);

      expect(siblings).toEqual([
        {
          path: "/src/foo.html",
          extension: ".html",
          baseName: "foo",
        },
      ]);
    });

    it("finds multiple siblings", () => {
      const siblings = fs.getSiblingFiles("/src/foo.ts", [".html", ".css"]);

      expect(siblings).toEqual([
        {
          path: "/src/foo.html",
          extension: ".html",
          baseName: "foo",
        },
        {
          path: "/src/foo.css",
          extension: ".css",
          baseName: "foo",
        },
      ]);
    });

    it("returns empty array when no siblings exist", () => {
      const siblings = fs.getSiblingFiles("/src/bar.ts", [".html"]);

      expect(siblings).toEqual([]);
    });

    it("returns empty array for non-existent source", () => {
      const siblings = fs.getSiblingFiles("/src/does-not-exist.ts", [".html"]);

      expect(siblings).toEqual([]);
    });

    it("respects extension filter", () => {
      const siblings = fs.getSiblingFiles("/src/foo.ts", [".scss"]);

      expect(siblings).toEqual([]);
    });
  });

  // ==========================================================================
  // Glob Pattern Matching
  // ==========================================================================

  describe("glob", () => {
    beforeEach(() => {
      fs.addFile("/src/foo.ts", "");
      fs.addFile("/src/bar.ts", "");
      fs.addFile("/src/components/nav.ts", "");
      fs.addFile("/src/components/nav.html", "");
      fs.addFile("/src/deep/nested/file.ts", "");
    });

    it("matches exact extension", () => {
      const matches = fs.glob("**/*.ts", { cwd: "/src" }).sort();

      expect(matches).toEqual([
        "/src/bar.ts",
        "/src/components/nav.ts",
        "/src/deep/nested/file.ts",
        "/src/foo.ts",
      ]);
    });

    it("matches in subdirectory", () => {
      const matches = fs.glob("**/*.html", { cwd: "/src" });

      expect(matches).toEqual(["/src/components/nav.html"]);
    });

    it("matches with single wildcard", () => {
      const matches = fs.glob("*.ts", { cwd: "/src" }).sort();

      expect(matches).toEqual(["/src/bar.ts", "/src/foo.ts"]);
    });

    it("respects ignore patterns", () => {
      fs.addFile("/src/node_modules/pkg/index.ts", "");

      const matches = fs.glob("**/*.ts", {
        cwd: "/src",
        ignore: ["node_modules"],
      });

      expect(matches).not.toContain("/src/node_modules/pkg/index.ts");
    });

    it("returns relative paths when absolute is false", () => {
      const matches = fs.glob("*.ts", { cwd: "/src", absolute: false }).sort();

      expect(matches).toEqual(["bar.ts", "foo.ts"]);
    });
  });

  // ==========================================================================
  // Case Sensitivity
  // ==========================================================================

  describe("case sensitivity", () => {
    it("is case-sensitive by default", () => {
      const caseSensitiveFs = createMockFileSystem({ caseSensitive: true });
      caseSensitiveFs.addFile("/src/Foo.ts", "content");

      expect(caseSensitiveFs.fileExists("/src/Foo.ts")).toBe(true);
      expect(caseSensitiveFs.fileExists("/src/foo.ts")).toBe(false);
    });

    it("can be case-insensitive", () => {
      const caseInsensitiveFs = createMockFileSystem({ caseSensitive: false });
      caseInsensitiveFs.addFile("/src/Foo.ts", "content");

      expect(caseInsensitiveFs.fileExists("/src/Foo.ts")).toBe(true);
      expect(caseInsensitiveFs.fileExists("/src/foo.ts")).toBe(true);
      expect(caseInsensitiveFs.fileExists("/src/FOO.TS")).toBe(true);
    });
  });

  // ==========================================================================
  // File Stats
  // ==========================================================================

  describe("stat", () => {
    it("returns undefined for non-existent file", () => {
      expect(fs.stat("/does/not/exist")).toBeUndefined();
    });

    it("returns stats for file", () => {
      fs.addFile("/src/foo.ts", "12345");
      const stat = fs.stat("/src/foo.ts");

      expect(stat).toBeDefined();
      expect(stat!.isFile).toBe(true);
      expect(stat!.isDirectory).toBe(false);
      expect(stat!.size).toBe(5);
    });

    it("returns stats for directory", () => {
      fs.addDirectory("/src/components");
      const stat = fs.stat("/src/components");

      expect(stat).toBeDefined();
      expect(stat!.isFile).toBe(false);
      expect(stat!.isDirectory).toBe(true);
    });
  });

  // ==========================================================================
  // Watch Callbacks
  // ==========================================================================

  describe("watch", () => {
    it("notifies on file creation", () => {
      const events: Array<{ type: string; path: string }> = [];
      const disposable = fs.watch("/src", (event) => {
        events.push({ type: event.type, path: event.path });
      });

      fs.addFile("/src/new-file.ts", "content");

      expect(events).toEqual([{ type: "create", path: "/src/new-file.ts" }]);
      disposable.dispose();
    });

    it("notifies on file change", () => {
      fs.addFile("/src/foo.ts", "original");

      const events: Array<{ type: string; path: string }> = [];
      const disposable = fs.watch("/src", (event) => {
        events.push({ type: event.type, path: event.path });
      });

      fs.addFile("/src/foo.ts", "updated");

      expect(events).toEqual([{ type: "change", path: "/src/foo.ts" }]);
      disposable.dispose();
    });

    it("notifies on file deletion", () => {
      fs.addFile("/src/foo.ts", "content");

      const events: Array<{ type: string; path: string }> = [];
      const disposable = fs.watch("/src", (event) => {
        events.push({ type: event.type, path: event.path });
      });

      fs.remove("/src/foo.ts");

      expect(events).toEqual([{ type: "delete", path: "/src/foo.ts" }]);
      disposable.dispose();
    });

    it("stops notifying after dispose", () => {
      const events: Array<{ type: string }> = [];
      const disposable = fs.watch("/src", (event) => {
        events.push({ type: event.type });
      });

      disposable.dispose();
      fs.addFile("/src/new.ts", "content");

      expect(events).toEqual([]);
    });
  });

  // ==========================================================================
  // Snapshot
  // ==========================================================================

  describe("snapshot", () => {
    it("captures current state", () => {
      fs.addFile("/src/a.ts", "a content");
      fs.addFile("/src/b.ts", "b content");

      const snapshot = fs.snapshot();

      expect(snapshot.files).toEqual({
        "/src/a.ts": "a content",
        "/src/b.ts": "b content",
      });
    });

    it("can recreate from snapshot", () => {
      fs.addFile("/src/foo.ts", "content");
      const snapshot = fs.snapshot();

      const recreated = createMockFileSystem(snapshot);

      expect(recreated.readFile("/src/foo.ts")).toBe("content");
    });
  });

  // ==========================================================================
  // Initialization with Files
  // ==========================================================================

  describe("initialization", () => {
    it("creates with initial files", () => {
      const fsWithFiles = createMockFileSystem({
        files: {
          "/src/foo.ts": "export class Foo {}",
          "/src/foo.html": "<template></template>",
        },
      });

      expect(fsWithFiles.fileExists("/src/foo.ts")).toBe(true);
      expect(fsWithFiles.fileExists("/src/foo.html")).toBe(true);
      expect(fsWithFiles.readFile("/src/foo.ts")).toBe("export class Foo {}");
    });
  });
});
