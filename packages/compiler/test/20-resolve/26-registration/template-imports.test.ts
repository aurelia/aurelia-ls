/**
 * Template Import Registration Tests
 *
 * Tests that <import> elements in templates create local scope registrations.
 * This is the integration test for Phase 3 of the HTML meta elements feature.
 */

import { describe, it, expect, beforeAll } from "vitest";
import ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/compiler";
import { DiagnosticsRuntime } from "@aurelia-ls/compiler";
import { resolve, type ResolutionResult } from "../../../src/analysis/20-resolve/resolution/resolve.js";
import type { FileSystemContext } from "../../../src/analysis/20-resolve/resolution/project/context.js";

// Test app with template imports
const TEST_FILES: Record<string, string> = {
  // Main app component with sibling template
  "/app/src/my-app.ts": `
    import { customElement } from "@aurelia/runtime-html";

    @customElement({ name: "my-app" })
    export class MyApp {}
  `,

  // Template with imports
  "/app/src/my-app.html": `
    <import from="./components/nav-bar">
    <import from="./components/footer">
    <nav-bar></nav-bar>
    <div class="content">
      <slot></slot>
    </div>
    <footer-bar></footer-bar>
  `,

  // Imported components
  "/app/src/components/nav-bar.ts": `
    import { customElement } from "@aurelia/runtime-html";

    @customElement({ name: "nav-bar" })
    export class NavBar {}
  `,

  "/app/src/components/nav-bar.html": `
    <nav>Navigation</nav>
  `,

  "/app/src/components/footer.ts": `
    import { customElement } from "@aurelia/runtime-html";

    @customElement({ name: "footer-bar" })
    export class Footer {}
  `,

  "/app/src/components/footer.html": `
    <footer>Footer content</footer>
  `,

  // Main entry point
  "/app/src/main.ts": `
    import Aurelia from "aurelia";
    import { MyApp } from "./my-app.js";

    Aurelia.app(MyApp).start();
  `,
};

function createMockFileSystem(): FileSystemContext {
  return {
    fileExists: (path: string) => path in TEST_FILES,
    readFile: (path: string) => TEST_FILES[path],
    readDirectory: (path: string) => {
      const prefix = path.endsWith("/") ? path : path + "/";
      return Object.keys(TEST_FILES)
        .filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"))
        .map((p) => p.slice(prefix.length));
    },
    getSiblingFiles: (sourcePath: string, extensions: readonly string[]) => {
      const dir = sourcePath.substring(0, sourcePath.lastIndexOf("/") + 1);
      const baseName = sourcePath.substring(sourcePath.lastIndexOf("/") + 1).replace(/\.(ts|js)$/, "");

      return extensions
        .map((ext) => {
          const siblingPath = `${dir}${baseName}${ext}`;
          if (TEST_FILES[siblingPath]) {
            return {
              path: siblingPath as NormalizedPath,
              extension: ext,
              baseName,
            };
          }
          return null;
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
    },
    normalizePath: (p: string) => p as NormalizedPath,
    caseSensitive: true,
  };
}

function createProgram(): ts.Program {
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    esModuleInterop: true,
  };

  const host = ts.createCompilerHost(compilerOptions);

  // Override file operations to use our mock files
  const originalFileExists = host.fileExists;
  host.fileExists = (fileName: string) => {
    if (fileName in TEST_FILES) return true;
    return originalFileExists(fileName);
  };

  const originalReadFile = host.readFile;
  host.readFile = (fileName: string) => {
    if (fileName in TEST_FILES) return TEST_FILES[fileName];
    return originalReadFile(fileName);
  };

  host.getSourceFile = (fileName: string, languageVersion: ts.ScriptTarget) => {
    const content = TEST_FILES[fileName];
    if (content) {
      return ts.createSourceFile(fileName, content, languageVersion);
    }
    return undefined;
  };

  const tsFiles = Object.keys(TEST_FILES).filter((f) => f.endsWith(".ts"));
  return ts.createProgram(tsFiles, compilerOptions, host);
}

const resolveWithDiagnostics = (
  program: Parameters<typeof resolve>[0],
  config?: Omit<NonNullable<Parameters<typeof resolve>[1]>, "diagnostics">,
) => {
  const diagnostics = new DiagnosticsRuntime();
  return resolve(program, { ...config, diagnostics: diagnostics.forSource("resolution") });
};

describe("Template Import Registration", () => {
  let program: ts.Program;
  let fileSystem: FileSystemContext;
  let result: ResolutionResult;

  beforeAll(() => {
    program = createProgram();
    fileSystem = createMockFileSystem();
    result = resolveWithDiagnostics(program, { fileSystem });
  });

  it("creates registration sites from template imports in sibling HTML", () => {
    // Template imports should create registration sites with template-import evidence
    // The test verifies this through observable behavior (sites created) not internal structure
    const templateImportSites = result.registration.sites.filter(
      (site) => site.evidence.kind === "template-import"
    );

    // Should have exactly 2 template import sites (nav-bar and footer)
    expect(templateImportSites.length).toBe(2);

    // Verify the module specifiers are captured in unresolved refs
    // (In mock setup without full module resolution, these remain unresolved)
    const moduleSpecifiers = templateImportSites
      .filter((s) => s.resourceRef.kind === "unresolved")
      .map((s) => s.resourceRef.kind === "unresolved" ? s.resourceRef.name : null)
      .filter(Boolean)
      .sort();

    expect(moduleSpecifiers).toContain("./components/nav-bar");
    expect(moduleSpecifiers).toContain("./components/footer");
  });

  it("template import sites have local scope", () => {
    const templateImportSites = result.registration.sites.filter(
      (site) => site.evidence.kind === "template-import"
    );

    for (const site of templateImportSites) {
      expect(site.scope.kind).toBe("local");
    }
  });

  it("template import evidence includes component and template paths", () => {
    const templateImportSites = result.registration.sites.filter(
      (site) => site.evidence.kind === "template-import"
    );

    for (const site of templateImportSites) {
      if (site.evidence.kind === "template-import") {
        expect(site.evidence.component).toBe("/app/src/my-app.ts");
        expect(site.evidence.templateFile).toBe("/app/src/my-app.html");
        expect(site.evidence.className).toBe("MyApp");
      }
    }
  });

  it("creates unresolved refs when module resolution is not available", () => {
    // In this mock test setup, module resolution isn't fully wired.
    // Template imports create sites, but resolvedPath may be null.
    // In a real program with proper module resolution, imports would resolve.
    const unresolvedSites = result.registration.sites.filter(
      (site) =>
        site.evidence.kind === "template-import" &&
        site.resourceRef.kind === "unresolved"
    );

    // Without module resolution, imports are unresolved
    expect(unresolvedSites.length).toBeGreaterThanOrEqual(1);

    // Unresolved refs should have the module specifier as name
    for (const site of unresolvedSites) {
      if (site.resourceRef.kind === "unresolved") {
        expect(site.resourceRef.name).toMatch(/\.\/(components\/)?/);
      }
    }
  });

  it("preserves span information from template", () => {
    const templateImportSites = result.registration.sites.filter(
      (site) => site.evidence.kind === "template-import"
    );

    for (const site of templateImportSites) {
      // Span should point to the template file
      expect(site.span.file).toContain("my-app.html");
      // Span should have valid start/end positions
      expect(site.span.start).toBeGreaterThanOrEqual(0);
      expect(site.span.end).toBeGreaterThan(site.span.start);
    }
  });
});

describe("Template Import - Edge Cases", () => {
  it("handles files without sibling templates", () => {
    const files: Record<string, string> = {
      "/app/lonely.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement({ name: "lonely" })
        export class Lonely {}
      `,
    };

    const host = ts.createCompilerHost({});
    host.fileExists = (f) => f in files;
    host.readFile = (f) => files[f];
    host.getSourceFile = (f, v) => {
      const c = files[f];
      return c ? ts.createSourceFile(f, c, v) : undefined;
    };

    const program = ts.createProgram(
      Object.keys(files).filter((f) => f.endsWith(".ts")),
      { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
      host
    );

    const fs: FileSystemContext = {
      fileExists: (p) => p in files,
      readFile: (p) => files[p],
      readDirectory: () => [],
      getSiblingFiles: () => [], // No siblings
      normalizePath: (p) => p as NormalizedPath,
      caseSensitive: true,
    };

    const result = resolveWithDiagnostics(program, { fileSystem: fs });

    // Component without sibling template should produce no template-import sites
    const templateImportSites = result.registration.sites.filter(
      (s) => s.evidence.kind === "template-import"
    );
    expect(templateImportSites).toHaveLength(0);
  });

  it("handles templates without imports", () => {
    const files: Record<string, string> = {
      "/app/simple.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement({ name: "simple" })
        export class Simple {}
      `,
      "/app/simple.html": `<div>Just plain content</div>`,
    };

    const host = ts.createCompilerHost({});
    host.fileExists = (f) => f in files;
    host.readFile = (f) => files[f];
    host.getSourceFile = (f, v) => {
      const c = files[f];
      return c ? ts.createSourceFile(f, c, v) : undefined;
    };

    const program = ts.createProgram(
      Object.keys(files).filter((f) => f.endsWith(".ts")),
      { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
      host
    );

    const fs: FileSystemContext = {
      fileExists: (p) => p in files,
      readFile: (p) => files[p],
      readDirectory: () => [],
      getSiblingFiles: (src, exts) => {
        if (src === "/app/simple.ts" && exts.includes(".html")) {
          return [{ path: "/app/simple.html" as NormalizedPath, extension: ".html", baseName: "simple" }];
        }
        return [];
      },
      normalizePath: (p) => p as NormalizedPath,
      caseSensitive: true,
    };

    const result = resolveWithDiagnostics(program, { fileSystem: fs });

    // Template without <import> elements should produce no template-import sites
    const templateImportSites = result.registration.sites.filter(
      (s) => s.evidence.kind === "template-import"
    );
    expect(templateImportSites).toHaveLength(0);
  });
});
