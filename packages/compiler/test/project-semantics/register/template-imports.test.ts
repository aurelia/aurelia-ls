/**
 * Template Import Registration Tests
 *
 * Tests that <import> elements in templates create local scope registrations.
 * This is the integration test for Phase 3 of the HTML meta elements feature.
 */

import { describe, it, expect, beforeAll } from "vitest";
import ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/compiler/model/identity.js";
import { DiagnosticsRuntime } from "@aurelia-ls/compiler/diagnostics/runtime.js";
import { discoverProjectSemantics, type ProjectSemanticsDiscoveryResult } from "../../../out/project-semantics/resolve.js";
import type { FileSystemContext } from "../../../out/project-semantics/project/context.js";

// Test app with template imports
const TEST_FILES: Record<string, string> = {
  // Main app component with sibling template
  "/app/out/my-app.ts": `
    import { customElement } from "@aurelia/runtime-html";

    @customElement({ name: "my-app" })
    export class MyApp {}
  `,

  // Template with imports
  "/app/out/my-app.html": `
    <import from="./components/nav-bar">
    <import from="./components/footer">
    <nav-bar></nav-bar>
    <div class="content">
      <slot></slot>
    </div>
    <footer-bar></footer-bar>
  `,

  // Imported components
  "/app/out/components/nav-bar.ts": `
    import { customElement } from "@aurelia/runtime-html";

    @customElement({ name: "nav-bar" })
    export class NavBar {}
  `,

  "/app/out/components/nav-bar.html": `
    <nav>Navigation</nav>
  `,

  "/app/out/components/footer.ts": `
    import { customElement } from "@aurelia/runtime-html";

    @customElement({ name: "footer-bar" })
    export class Footer {}
  `,

  "/app/out/components/footer.html": `
    <footer>Footer content</footer>
  `,

  // Main entry point
  "/app/out/main.ts": `
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

function createProgramFromFiles(files: Record<string, string>): ts.Program {
  const host = ts.createCompilerHost({});
  host.fileExists = (fileName) => fileName in files;
  host.readFile = (fileName) => files[fileName];
  host.getSourceFile = (fileName, languageVersion) => {
    const content = files[fileName];
    return content ? ts.createSourceFile(fileName, content, languageVersion) : undefined;
  };

  return ts.createProgram(
    Object.keys(files).filter((filePath) => filePath.endsWith(".ts")),
    { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
    host,
  );
}

function createMockFileSystemForFiles(files: Record<string, string>): FileSystemContext {
  return {
    fileExists: (path) => path in files,
    readFile: (path) => files[path],
    readDirectory: () => [],
    getSiblingFiles: (sourcePath, extensions) => {
      const dir = sourcePath.substring(0, sourcePath.lastIndexOf("/") + 1);
      const baseName = sourcePath.substring(sourcePath.lastIndexOf("/") + 1).replace(/\.(ts|js)$/, "");
      return extensions
        .map((extension) => {
          const siblingPath = `${dir}${baseName}${extension}`;
          if (!(siblingPath in files)) {
            return null;
          }
          return {
            path: siblingPath as NormalizedPath,
            extension,
            baseName,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
    },
    normalizePath: (path) => path as NormalizedPath,
    caseSensitive: true,
  };
}

const resolveWithDiagnostics = (
  program: Parameters<typeof discoverProjectSemantics>[0],
  config?: Omit<NonNullable<Parameters<typeof discoverProjectSemantics>[1]>, "diagnostics">,
) => {
  const diagnostics = new DiagnosticsRuntime();
  return discoverProjectSemantics(program, { ...config, diagnostics: diagnostics.forSource("project") });
};

describe("Template Import Registration", () => {
  let program: ts.Program;
  let fileSystem: FileSystemContext;
  let result: ProjectSemanticsDiscoveryResult;

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
        expect(site.evidence.component).toBe("/app/out/my-app.ts");
        expect(site.evidence.templateFile).toBe("/app/out/my-app.html");
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

  it("creates template-import sites from inline root templates", () => {
    const files: Record<string, string> = {
      "/app/inline-owner.ts": `
        import { customElement } from "@aurelia/runtime-html";

        @customElement({
          name: "inline-owner",
          template: "<import from='./widget'><my-widget></my-widget>"
        })
        export class InlineOwner {}
      `,
      "/app/widget.ts": `
        import { customElement } from "@aurelia/runtime-html";

        @customElement({ name: "my-widget" })
        export class MyWidget {}
      `,
    };

    const program = createProgramFromFiles(files);
    const fs = createMockFileSystemForFiles(files);
    const result = resolveWithDiagnostics(program, { fileSystem: fs });

    const templateImportSites = result.registration.sites.filter(
      (site) => site.evidence.kind === "template-import"
    );
    expect(templateImportSites).toHaveLength(1);

    const evidence = templateImportSites[0]!.evidence;
    if (evidence.kind === "template-import") {
      expect(evidence.origin).toBe("inline");
      expect(evidence.component).toBe("/app/inline-owner.ts");
      expect(evidence.templateFile).toBe("/app/inline-owner.ts");
      expect(evidence.className).toBe("InlineOwner");
    }
  });

  it("applies sibling template imports only to external-template owners in mixed inline/sibling files", () => {
    const files: Record<string, string> = {
      "/app/my-page.ts": `
        import { customElement } from "@aurelia/runtime-html";

        @customElement({ name: "inline-owner", template: "<div>inline</div>" })
        export class InlineOwner {}

        @customElement({ name: "my-page" })
        export class MyPage {}
      `,
      "/app/my-page.html": `
        <import from="./widget">
        <my-widget></my-widget>
      `,
      "/app/widget.ts": `
        import { customElement } from "@aurelia/runtime-html";

        @customElement({ name: "my-widget" })
        export class MyWidget {}
      `,
    };

    const program = createProgramFromFiles(files);
    const fs = createMockFileSystemForFiles(files);
    const result = resolveWithDiagnostics(program, { fileSystem: fs });

    const templateImportSites = result.registration.sites.filter(
      (site) => site.evidence.kind === "template-import"
    );

    expect(templateImportSites).toHaveLength(1);
    const evidence = templateImportSites[0]!.evidence;
    if (evidence.kind === "template-import") {
      expect(evidence.className).toBe("MyPage");
      expect(evidence.component).toBe("/app/my-page.ts");
      expect(evidence.templateFile).toBe("/app/my-page.html");
    }
  });

  it("emits unresolved ownership when multiple external-template owners are ambiguous", () => {
    const files: Record<string, string> = {
      "/app/multi-owner.ts": `
        import { customElement } from "@aurelia/runtime-html";

        @customElement({ name: "first-owner" })
        export class FirstOwner {}

        @customElement({ name: "second-owner" })
        export class SecondOwner {}
      `,
      "/app/multi-owner.html": `
        <import from="./widget">
      `,
      "/app/widget.ts": `
        import { customElement } from "@aurelia/runtime-html";

        @customElement({ name: "my-widget" })
        export class MyWidget {}
      `,
    };

    const program = createProgramFromFiles(files);
    const fs = createMockFileSystemForFiles(files);
    const result = resolveWithDiagnostics(program, { fileSystem: fs });

    const templateImportSites = result.registration.sites.filter(
      (site) => site.evidence.kind === "template-import"
    );
    expect(templateImportSites).toHaveLength(0);

    const ambiguousOwnership = result.registration.unresolved.filter(
      (entry) =>
        entry.pattern.kind === "other" &&
        entry.pattern.description === "template-import-owner-ambiguous"
    );

    expect(ambiguousOwnership).toHaveLength(1);
    expect(ambiguousOwnership[0]!.file).toBe("/app/multi-owner.html");
    expect(ambiguousOwnership[0]!.reason).toContain("Candidate owners");
  });

  it("selects the basename-matching resource as template-import owner", () => {
    const files: Record<string, string> = {
      "/app/dashboard.ts": `
        import { customElement } from "@aurelia/runtime-html";

        @customElement({ name: "dashboard" })
        export class DashboardPage {}

        @customElement({ name: "secondary-panel" })
        export class SecondaryPanel {}
      `,
      "/app/dashboard.html": `
        <import from="./widget">
      `,
      "/app/widget.ts": `
        import { customElement } from "@aurelia/runtime-html";

        @customElement({ name: "my-widget" })
        export class MyWidget {}
      `,
    };

    const program = createProgramFromFiles(files);
    const fs = createMockFileSystemForFiles(files);
    const result = resolveWithDiagnostics(program, { fileSystem: fs });

    const templateImportSites = result.registration.sites.filter(
      (site) => site.evidence.kind === "template-import"
    );
    expect(templateImportSites).toHaveLength(1);

    const evidence = templateImportSites[0]!.evidence;
    if (evidence.kind === "template-import") {
      expect(evidence.className).toBe("DashboardPage");
      expect(evidence.templateFile).toBe("/app/dashboard.html");
    }

    const ambiguousOwnership = result.registration.unresolved.filter(
      (entry) =>
        entry.pattern.kind === "other" &&
        entry.pattern.description === "template-import-owner-ambiguous"
    );
    expect(ambiguousOwnership).toHaveLength(0);
  });

  it("creates active local-template import sites for sibling templates with lexical scope ownership", () => {
    const files: Record<string, string> = {
      "/app/my-page.ts": `
        import { customElement } from "@aurelia/runtime-html";

        @customElement({ name: "my-page" })
        export class MyPage {}
      `,
      "/app/my-page.html": `
        <import from="./root-import">
        <template as-custom-element="local-widget">
          <import from="./local-import">
        </template>
      `,
      "/app/root-import.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement({ name: "root-import" })
        export class RootImport {}
      `,
      "/app/local-import.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement({ name: "local-import" })
        export class LocalImport {}
      `,
    };

    const program = createProgramFromFiles(files);
    const fs = createMockFileSystemForFiles(files);
    const result = resolveWithDiagnostics(program, { fileSystem: fs });

    const templateImportSites = result.registration.sites.filter(
      (site) => site.evidence.kind === "template-import",
    );

    expect(templateImportSites).toHaveLength(2);

    const localTemplateSite = templateImportSites.find(
      (site) =>
        site.evidence.kind === "template-import" &&
        site.evidence.localTemplateName === "local-widget",
    );
    expect(localTemplateSite).toBeDefined();
    expect(localTemplateSite?.scope.kind).toBe("local");
    if (localTemplateSite?.scope.kind === "local") {
      expect(localTemplateSite.scope.owner).toContain("::local-template:local-widget");
    }
    if (localTemplateSite?.evidence.kind === "template-import") {
      expect(localTemplateSite.evidence.origin).toBe("sibling");
      expect(localTemplateSite.evidence.localTemplateName).toBe("local-widget");
    }
    const deferred = result.registration.unresolved.filter(
      (entry) =>
        entry.pattern.kind === "other" &&
        entry.pattern.description === "template-import-local-template-deferred",
    );
    expect(deferred).toHaveLength(0);
  });

  it("creates active local-template import sites for inline templates", () => {
    const files: Record<string, string> = {
      "/app/inline-owner.ts": `
        import { customElement } from "@aurelia/runtime-html";

        @customElement({
          name: "inline-owner",
          template: "<template as-custom-element='local-widget'><import from='./local-import'></template><div></div>"
        })
        export class InlineOwner {}
      `,
      "/app/local-import.ts": `
        import { customElement } from "@aurelia/runtime-html";
        @customElement({ name: "local-import" })
        export class LocalImport {}
      `,
    };

    const program = createProgramFromFiles(files);
    const fs = createMockFileSystemForFiles(files);
    const result = resolveWithDiagnostics(program, { fileSystem: fs });

    const localTemplateSites = result.registration.sites.filter(
      (site) =>
        site.evidence.kind === "template-import" &&
        site.evidence.localTemplateName === "local-widget",
    );

    expect(localTemplateSites).toHaveLength(1);
    const localTemplateSite = localTemplateSites[0]!;
    if (localTemplateSite.evidence.kind === "template-import") {
      expect(localTemplateSite.evidence.origin).toBe("inline");
      expect(localTemplateSite.evidence.localTemplateName).toBe("local-widget");
    }
    expect(localTemplateSite.scope.kind).toBe("local");
    if (localTemplateSite.scope.kind === "local") {
      expect(localTemplateSite.scope.owner).toContain("::local-template:local-widget");
    }
    const deferred = result.registration.unresolved.filter(
      (entry) =>
        entry.pattern.kind === "other" &&
        entry.pattern.description === "template-import-local-template-deferred",
    );
    expect(deferred).toHaveLength(0);
  });
});
