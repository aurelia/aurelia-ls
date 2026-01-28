import { describe, it, expect, beforeEach } from "vitest";
import {
  createMockFileSystem,
  createProjectScanner,
  DEFAULT_CONVENTIONS,
} from "@aurelia-ls/compiler";
import type {
  MockFileSystemContext,
  ProjectScanner,
  ProjectScannerOptions,
  ProjectFile,
} from "@aurelia-ls/compiler";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Standard Aurelia app structure.
 * Covers: components, resources, pages, orphans, inline-only.
 */
const STANDARD_APP: Record<string, string> = {
  // Entry point
  "/app/src/main.ts": "export function configure() {}",

  // Root component with full triplet (ts + html + css)
  "/app/src/my-app.ts": "export class MyApp {}",
  "/app/src/my-app.html": "<template><router-view></router-view></template>",
  "/app/src/my-app.css": ".my-app { display: block; }",

  // Global resources (resources/ convention)
  "/app/src/resources/nav-bar.ts": "export class NavBar {}",
  "/app/src/resources/nav-bar.html": "<nav><slot></slot></nav>",
  "/app/src/resources/footer.ts": "export class Footer {}",
  "/app/src/resources/footer.html": "<footer></footer>",

  // Router pages (pages/ convention)
  "/app/src/pages/home.ts": "export class Home {}",
  "/app/src/pages/home.html": "<section class=\"home\"></section>",
  "/app/src/pages/about.ts": "export class About {}",
  "/app/src/pages/about.html": "<section class=\"about\"></section>",

  // Orphan template (no matching source)
  "/app/src/orphan.html": "<div>I have no source file</div>",

  // Source without template (inline template)
  "/app/src/inline-only.ts": "export class InlineOnly { static template = '<div>inline</div>'; }",

  // Value converter (no template expected)
  "/app/src/resources/date-format.ts": "export class DateFormatValueConverter {}",
};

/**
 * Deeply nested structure for testing path handling.
 */
const DEEP_NESTING: Record<string, string> = {
  "/app/src/features/auth/components/login-form.ts": "export class LoginForm {}",
  "/app/src/features/auth/components/login-form.html": "<form></form>",
  "/app/src/features/auth/components/login-form.scss": ".login-form {}",
  "/app/src/features/auth/pages/login.ts": "export class Login {}",
  "/app/src/features/auth/pages/login.html": "<main></main>",
  "/app/src/features/dashboard/widgets/stats-card.ts": "export class StatsCard {}",
  "/app/src/features/dashboard/widgets/stats-card.html": "<div class=\"card\"></div>",
};

/**
 * Multiple stylesheet formats.
 */
const MIXED_STYLES: Record<string, string> = {
  "/app/src/css-component.ts": "export class CssComponent {}",
  "/app/src/css-component.html": "<div></div>",
  "/app/src/css-component.css": ".css {}",

  "/app/src/scss-component.ts": "export class ScssComponent {}",
  "/app/src/scss-component.html": "<div></div>",
  "/app/src/scss-component.scss": ".scss {}",

  "/app/src/sass-component.ts": "export class SassComponent {}",
  "/app/src/sass-component.html": "<div></div>",
  "/app/src/sass-component.sass": ".sass",

  "/app/src/less-component.ts": "export class LessComponent {}",
  "/app/src/less-component.html": "<div></div>",
  "/app/src/less-component.less": ".less {}",
};

/**
 * JavaScript sources (not just TypeScript).
 */
const JS_SOURCES: Record<string, string> = {
  "/app/src/ts-file.ts": "export class TsFile {}",
  "/app/src/js-file.js": "export class JsFile {}",
  "/app/src/tsx-file.tsx": "export function TsxFile() { return <div/>; }",
  "/app/src/jsx-file.jsx": "export function JsxFile() { return <div/>; }",
};

/**
 * Files that should be excluded.
 */
const WITH_EXCLUDES: Record<string, string> = {
  "/app/src/valid.ts": "export class Valid {}",
  "/app/node_modules/pkg/index.ts": "export class Package {}",
  "/app/dist/bundle.js": "// compiled output",
  "/app/.git/config": "[core]",
  "/app/coverage/lcov.info": "coverage data",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a test scanner with the given files and options.
 */
function createTestScanner(
  files: Record<string, string>,
  options?: Partial<ProjectScannerOptions>,
): { fs: MockFileSystemContext; scanner: ProjectScanner } {
  const fs = createMockFileSystem({ files });
  const scanner = createProjectScanner(fs, {
    root: "/app",
    ...options,
  });
  return { fs, scanner };
}

/**
 * Extract paths from ProjectFile array for easier assertions.
 */
function getPaths(files: readonly ProjectFile[]): string[] {
  return files.map((f) => f.path).sort();
}

/**
 * Count files by extension.
 */
function countByExtension(files: readonly ProjectFile[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of files) {
    counts[f.extension] = (counts[f.extension] ?? 0) + 1;
  }
  return counts;
}

// ============================================================================
// Tests
// ============================================================================

describe("ProjectScanner", () => {
  // ==========================================================================
  // Factory & Options
  // ==========================================================================

  describe("Factory & Options", () => {
    it("creates scanner with default options", () => {
      const { scanner } = createTestScanner(STANDARD_APP);

      expect(scanner.options.root).toBe("/app");
      expect(scanner.options.detectPairs).toBe(true);
      expect(scanner.options.detectOrphans).toBe(true);
    });

    it("respects custom sourcePatterns", () => {
      const { scanner } = createTestScanner(
        {
          "/app/src/foo.ts": "export class Foo {}",
          "/app/lib/bar.ts": "export class Bar {}",
        },
        {
          sourcePatterns: ["lib/**/*.ts"], // Only lib, not src
        },
      );

      const sources = scanner.getSourceFiles();
      const paths = getPaths(sources);

      expect(paths).toEqual(["/app/lib/bar.ts"]);
      expect(paths).not.toContain("/app/src/foo.ts");
    });

    it("respects custom templatePatterns", () => {
      // Note: templatePatterns controls WHERE to look, but only known template
      // extensions (.html, .htm) are recognized as templates
      const { scanner } = createTestScanner(
        {
          "/app/src/foo.html": "<div>html</div>",
          "/app/templates/bar.html": "<div>template</div>",
        },
        {
          templatePatterns: ["**/templates/**/*.html"], // Only templates/ directory
        },
      );

      const templates = scanner.getTemplateFiles();
      const paths = getPaths(templates);

      // Only bar.html is in templates/ directory
      expect(paths).toEqual(["/app/templates/bar.html"]);
      expect(paths).not.toContain("/app/src/foo.html");
    });

    it("respects custom exclude patterns", () => {
      const { scanner } = createTestScanner(
        {
          "/app/src/valid.ts": "export {}",
          "/app/src/vendor/external.ts": "export {}",
          "/app/node_modules/pkg/index.ts": "export {}",
        },
        {
          exclude: ["node_modules", "vendor"], // Exclude vendor too
        },
      );

      const sources = scanner.getSourceFiles();
      const paths = getPaths(sources);

      expect(paths).toEqual(["/app/src/valid.ts"]);
    });

    it("respects detectPairs: false", () => {
      const { scanner } = createTestScanner(STANDARD_APP, {
        detectPairs: false,
      });

      const pairs = scanner.getFilePairs();

      expect(pairs).toEqual([]);
    });

    it("respects detectOrphans: false", () => {
      const { scanner } = createTestScanner(STANDARD_APP, {
        detectOrphans: false,
      });

      const orphans = scanner.getOrphanTemplates();
      const sourcesWithout = scanner.getSourcesWithoutTemplates();

      expect(orphans).toEqual([]);
      expect(sourcesWithout).toEqual([]);
    });

    it("accepts custom conventions", () => {
      const { scanner } = createTestScanner(
        {
          "/app/src/custom-area/foo.ts": "export class Foo {}",
        },
        {
          conventions: [
            {
              pattern: "**/custom-area/**",
              scope: { kind: "global" },
              priority: 100,
            },
          ],
        },
      );

      const matches = scanner.getConventionMatches();

      expect(matches.size).toBe(1);
      expect(matches.get("/app/src/custom-area/foo.ts" as any)?.scope.kind).toBe("global");
    });
  });

  // ==========================================================================
  // Source Scanning
  // ==========================================================================

  describe("Source Scanning", () => {
    it("finds TypeScript files", () => {
      const { scanner } = createTestScanner(STANDARD_APP);

      const sources = scanner.getSourceFiles();
      const paths = getPaths(sources);

      // All .ts files from STANDARD_APP
      expect(paths).toContain("/app/src/main.ts");
      expect(paths).toContain("/app/src/my-app.ts");
      expect(paths).toContain("/app/src/resources/nav-bar.ts");
      expect(paths).toContain("/app/src/pages/home.ts");
      expect(paths).toContain("/app/src/inline-only.ts");
    });

    it("finds JavaScript files", () => {
      const { scanner } = createTestScanner(JS_SOURCES);

      const sources = scanner.getSourceFiles();
      const extensions = countByExtension(sources);

      expect(extensions[".ts"]).toBe(1);
      expect(extensions[".js"]).toBe(1);
      expect(extensions[".tsx"]).toBe(1);
      expect(extensions[".jsx"]).toBe(1);
    });

    it("excludes node_modules by default", () => {
      const { scanner } = createTestScanner(WITH_EXCLUDES);

      const sources = scanner.getSourceFiles();
      const paths = getPaths(sources);

      expect(paths).toEqual(["/app/src/valid.ts"]);
      expect(paths).not.toContain("/app/node_modules/pkg/index.ts");
    });

    it("excludes dist by default", () => {
      const { scanner } = createTestScanner(WITH_EXCLUDES);

      const sources = scanner.getSourceFiles();
      const paths = getPaths(sources);

      expect(paths).not.toContain("/app/dist/bundle.js");
    });

    it("excludes .git by default", () => {
      const { scanner } = createTestScanner(WITH_EXCLUDES);

      const sources = scanner.getSourceFiles();
      const paths = getPaths(sources);

      // .git/config isn't a source file anyway, but verify exclusion works
      expect(paths.every((p) => !p.includes(".git"))).toBe(true);
    });

    it("handles empty project", () => {
      const { scanner } = createTestScanner({});

      const sources = scanner.getSourceFiles();

      expect(sources).toEqual([]);
    });

    it("returns correct ProjectFile structure", () => {
      const { scanner } = createTestScanner({
        "/app/src/components/my-element.ts": "export class MyElement {}",
      });

      const sources = scanner.getSourceFiles();

      expect(sources.length).toBe(1);
      expect(sources[0]).toMatchObject({
        path: "/app/src/components/my-element.ts",
        baseName: "my-element",
        extension: ".ts",
        directory: "/app/src/components",
      });
    });
  });

  // ==========================================================================
  // Template Scanning
  // ==========================================================================

  describe("Template Scanning", () => {
    it("finds HTML template files", () => {
      const { scanner } = createTestScanner(STANDARD_APP);

      const templates = scanner.getTemplateFiles();
      const paths = getPaths(templates);

      expect(paths).toContain("/app/src/my-app.html");
      expect(paths).toContain("/app/src/resources/nav-bar.html");
      expect(paths).toContain("/app/src/pages/home.html");
      expect(paths).toContain("/app/src/orphan.html");
    });

    it("does not include source files as templates", () => {
      const { scanner } = createTestScanner(STANDARD_APP);

      const templates = scanner.getTemplateFiles();

      expect(templates.every((t) => t.extension === ".html")).toBe(true);
    });

    it("handles project with no templates", () => {
      const { scanner } = createTestScanner({
        "/app/src/foo.ts": "export class Foo {}",
        "/app/src/bar.ts": "export class Bar {}",
      });

      const templates = scanner.getTemplateFiles();

      expect(templates).toEqual([]);
    });

    it("returns correct ProjectFile structure for templates", () => {
      const { scanner } = createTestScanner({
        "/app/src/my-element.html": "<template></template>",
      });

      const templates = scanner.getTemplateFiles();

      expect(templates.length).toBe(1);
      expect(templates[0]).toMatchObject({
        path: "/app/src/my-element.html",
        baseName: "my-element",
        extension: ".html",
        directory: "/app/src",
      });
    });
  });

  // ==========================================================================
  // Stylesheet Scanning
  // ==========================================================================

  describe("Stylesheet Scanning", () => {
    it("finds CSS files", () => {
      const { scanner } = createTestScanner(STANDARD_APP);

      const stylesheets = scanner.getStylesheetFiles();
      const paths = getPaths(stylesheets);

      expect(paths).toContain("/app/src/my-app.css");
    });

    it("finds all stylesheet formats", () => {
      const { scanner } = createTestScanner(MIXED_STYLES);

      const stylesheets = scanner.getStylesheetFiles();
      const extensions = countByExtension(stylesheets);

      expect(extensions[".css"]).toBe(1);
      expect(extensions[".scss"]).toBe(1);
      expect(extensions[".sass"]).toBe(1);
      expect(extensions[".less"]).toBe(1);
    });

    it("handles project with no stylesheets", () => {
      const { scanner } = createTestScanner({
        "/app/src/foo.ts": "export class Foo {}",
        "/app/src/foo.html": "<div></div>",
      });

      const stylesheets = scanner.getStylesheetFiles();

      expect(stylesheets).toEqual([]);
    });
  });

  // ==========================================================================
  // File Pairs
  // ==========================================================================

  describe("File Pairs", () => {
    it("matches source with template by base name", () => {
      const { scanner } = createTestScanner({
        "/app/src/my-app.ts": "export class MyApp {}",
        "/app/src/my-app.html": "<template></template>",
      });

      const pairs = scanner.getFilePairs();

      expect(pairs.length).toBe(1);
      expect(pairs[0].source.path).toBe("/app/src/my-app.ts");
      expect(pairs[0].template?.path).toBe("/app/src/my-app.html");
    });

    it("matches source with stylesheet by base name", () => {
      const { scanner } = createTestScanner({
        "/app/src/my-app.ts": "export class MyApp {}",
        "/app/src/my-app.css": ".my-app {}",
      });

      const pairs = scanner.getFilePairs();

      expect(pairs.length).toBe(1);
      expect(pairs[0].source.path).toBe("/app/src/my-app.ts");
      expect(pairs[0].stylesheet?.path).toBe("/app/src/my-app.css");
    });

    it("matches full triplet (source + template + stylesheet)", () => {
      const { scanner } = createTestScanner({
        "/app/src/my-app.ts": "export class MyApp {}",
        "/app/src/my-app.html": "<template></template>",
        "/app/src/my-app.css": ".my-app {}",
      });

      const pairs = scanner.getFilePairs();

      expect(pairs.length).toBe(1);
      expect(pairs[0].source.path).toBe("/app/src/my-app.ts");
      expect(pairs[0].template?.path).toBe("/app/src/my-app.html");
      expect(pairs[0].stylesheet?.path).toBe("/app/src/my-app.css");
    });

    it("handles source without siblings", () => {
      const { scanner } = createTestScanner({
        "/app/src/inline-only.ts": "export class InlineOnly {}",
      });

      const pairs = scanner.getFilePairs();

      expect(pairs.length).toBe(1);
      expect(pairs[0].source.path).toBe("/app/src/inline-only.ts");
      expect(pairs[0].template).toBeUndefined();
      expect(pairs[0].stylesheet).toBeUndefined();
    });

    it("creates pair for each source file", () => {
      const { scanner } = createTestScanner(STANDARD_APP);

      const pairs = scanner.getFilePairs();
      const sources = scanner.getSourceFiles();

      // Each source file should have a corresponding pair entry
      expect(pairs.length).toBe(sources.length);
    });

    it("handles deeply nested file pairs", () => {
      const { scanner } = createTestScanner(DEEP_NESTING);

      const pairs = scanner.getFilePairs();
      const loginFormPair = pairs.find((p) => p.source.path.includes("login-form.ts"));

      expect(loginFormPair).toBeDefined();
      expect(loginFormPair!.template?.path).toBe("/app/src/features/auth/components/login-form.html");
      expect(loginFormPair!.stylesheet?.path).toBe("/app/src/features/auth/components/login-form.scss");
    });

    it("respects different stylesheet extensions in pairs", () => {
      const { scanner } = createTestScanner(MIXED_STYLES);

      const pairs = scanner.getFilePairs();

      const cssPair = pairs.find((p) => p.source.path.includes("css-component"));
      expect(cssPair?.stylesheet?.path).toBe("/app/src/css-component.css");

      const scssPair = pairs.find((p) => p.source.path.includes("scss-component"));
      expect(scssPair?.stylesheet?.path).toBe("/app/src/scss-component.scss");

      const sassPair = pairs.find((p) => p.source.path.includes("sass-component"));
      expect(sassPair?.stylesheet?.path).toBe("/app/src/sass-component.sass");

      const lessPair = pairs.find((p) => p.source.path.includes("less-component"));
      expect(lessPair?.stylesheet?.path).toBe("/app/src/less-component.less");
    });
  });

  // ==========================================================================
  // Orphan Detection
  // ==========================================================================

  describe("Orphan Detection", () => {
    it("finds orphan templates (no matching source)", () => {
      const { scanner } = createTestScanner(STANDARD_APP);

      const orphans = scanner.getOrphanTemplates();
      const paths = getPaths(orphans);

      expect(paths).toContain("/app/src/orphan.html");
    });

    it("does not report templates with sources as orphans", () => {
      const { scanner } = createTestScanner(STANDARD_APP);

      const orphans = scanner.getOrphanTemplates();
      const paths = getPaths(orphans);

      expect(paths).not.toContain("/app/src/my-app.html");
      expect(paths).not.toContain("/app/src/resources/nav-bar.html");
    });

    it("finds sources without templates", () => {
      const { scanner } = createTestScanner(STANDARD_APP);

      const sourcesWithout = scanner.getSourcesWithoutTemplates();
      const paths = getPaths(sourcesWithout);

      // These sources have no sibling template
      expect(paths).toContain("/app/src/main.ts");
      expect(paths).toContain("/app/src/inline-only.ts");
      expect(paths).toContain("/app/src/resources/date-format.ts");
    });

    it("does not report sources with templates", () => {
      const { scanner } = createTestScanner(STANDARD_APP);

      const sourcesWithout = scanner.getSourcesWithoutTemplates();
      const paths = getPaths(sourcesWithout);

      expect(paths).not.toContain("/app/src/my-app.ts");
      expect(paths).not.toContain("/app/src/resources/nav-bar.ts");
    });

    it("handles project with no orphans", () => {
      const { scanner } = createTestScanner({
        "/app/src/foo.ts": "export class Foo {}",
        "/app/src/foo.html": "<div></div>",
      });

      const orphans = scanner.getOrphanTemplates();

      expect(orphans).toEqual([]);
    });

    it("handles project where all sources have templates", () => {
      const { scanner } = createTestScanner({
        "/app/src/a.ts": "",
        "/app/src/a.html": "",
        "/app/src/b.ts": "",
        "/app/src/b.html": "",
      });

      const sourcesWithout = scanner.getSourcesWithoutTemplates();

      expect(sourcesWithout).toEqual([]);
    });
  });

  // ==========================================================================
  // Convention Matching
  // ==========================================================================

  describe("Convention Matching", () => {
    it("matches files in resources/ as global", () => {
      const { scanner } = createTestScanner(STANDARD_APP, {
        conventions: DEFAULT_CONVENTIONS,
      });

      const matches = scanner.getConventionMatches();
      const navBarMatch = matches.get("/app/src/resources/nav-bar.ts" as any);

      expect(navBarMatch).toBeDefined();
      expect(navBarMatch!.scope.kind).toBe("global");
    });

    it("matches files in pages/ as router", () => {
      const { scanner } = createTestScanner(STANDARD_APP, {
        conventions: DEFAULT_CONVENTIONS,
      });

      const matches = scanner.getConventionMatches();
      const homeMatch = matches.get("/app/src/pages/home.ts" as any);

      expect(homeMatch).toBeDefined();
      expect(homeMatch!.scope.kind).toBe("router");
    });

    it("returns empty map when no conventions configured", () => {
      const { scanner } = createTestScanner(STANDARD_APP, {
        conventions: [],
      });

      const matches = scanner.getConventionMatches();

      expect(matches.size).toBe(0);
    });

    it("does not match files outside convention patterns", () => {
      const { scanner } = createTestScanner(STANDARD_APP, {
        conventions: DEFAULT_CONVENTIONS,
      });

      const matches = scanner.getConventionMatches();

      // my-app.ts is not in resources/, pages/, shared/, etc.
      expect(matches.has("/app/src/my-app.ts" as any)).toBe(false);
    });

    it("matches deeply nested convention paths", () => {
      const { scanner } = createTestScanner(DEEP_NESTING, {
        conventions: DEFAULT_CONVENTIONS,
      });

      const matches = scanner.getConventionMatches();
      const loginMatch = matches.get("/app/src/features/auth/pages/login.ts" as any);

      expect(loginMatch).toBeDefined();
      expect(loginMatch!.scope.kind).toBe("router");
    });
  });

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  describe("Query Methods", () => {
    describe("getFilesByType", () => {
      it("filters source files", () => {
        const { scanner } = createTestScanner(STANDARD_APP);

        const sources = scanner.getFilesByType("source");

        expect(sources.every((f) => [".ts", ".js", ".tsx", ".jsx"].includes(f.extension))).toBe(
          true,
        );
      });

      it("filters template files", () => {
        const { scanner } = createTestScanner(STANDARD_APP);

        const templates = scanner.getFilesByType("template");

        expect(templates.every((f) => f.extension === ".html")).toBe(true);
      });

      it("filters stylesheet files", () => {
        const { scanner } = createTestScanner(MIXED_STYLES);

        const stylesheets = scanner.getFilesByType("stylesheet");

        expect(
          stylesheets.every((f) => [".css", ".scss", ".sass", ".less"].includes(f.extension)),
        ).toBe(true);
      });

      it("returns empty array for unknown type", () => {
        const { scanner } = createTestScanner(STANDARD_APP);

        // "other" and "config" are valid types but not handled explicitly
        const other = scanner.getFilesByType("other");
        const config = scanner.getFilesByType("config");

        expect(other).toEqual([]);
        expect(config).toEqual([]);
      });
    });

    describe("glob", () => {
      it("matches files by pattern", () => {
        const { scanner } = createTestScanner(STANDARD_APP);

        const htmlFiles = scanner.glob("**/*.html");
        const paths = getPaths(htmlFiles);

        expect(paths.every((p) => p.endsWith(".html"))).toBe(true);
        expect(paths.length).toBeGreaterThan(0);
      });

      it("matches files in specific directory", () => {
        const { scanner } = createTestScanner(STANDARD_APP);

        const resourceFiles = scanner.glob("**/resources/**");
        const paths = getPaths(resourceFiles);

        expect(paths.every((p) => p.includes("/resources/"))).toBe(true);
      });

      it("returns empty array for non-matching pattern", () => {
        const { scanner } = createTestScanner(STANDARD_APP);

        const noMatch = scanner.glob("**/*.xyz");

        expect(noMatch).toEqual([]);
      });
    });

    describe("isProjectFile", () => {
      it("returns true for files within project root", () => {
        const { scanner } = createTestScanner(STANDARD_APP);

        expect(scanner.isProjectFile("/app/src/my-app.ts")).toBe(true);
        expect(scanner.isProjectFile("/app/src/deep/nested/file.ts")).toBe(true);
      });

      it("returns false for files outside project root", () => {
        const { scanner } = createTestScanner(STANDARD_APP);

        expect(scanner.isProjectFile("/other/project/file.ts")).toBe(false);
        expect(scanner.isProjectFile("/file.ts")).toBe(false);
      });

      it("returns false for files in excluded directories", () => {
        const { scanner } = createTestScanner(STANDARD_APP);

        // node_modules is excluded by default
        expect(scanner.isProjectFile("/app/node_modules/pkg/index.ts")).toBe(false);
        expect(scanner.isProjectFile("/app/dist/bundle.js")).toBe(false);
      });

      it("returns false when path exactly matches exclude", () => {
        const { scanner } = createTestScanner(
          { "/app/node_modules": "" },
          { exclude: ["node_modules"] },
        );

        // Exact match of exclude pattern (edge case)
        expect(scanner.isProjectFile("/app/node_modules")).toBe(false);
      });
    });
  });

  // ==========================================================================
  // getProjectStructure
  // ==========================================================================

  describe("getProjectStructure", () => {
    it("aggregates all project data", () => {
      const { scanner } = createTestScanner(STANDARD_APP, {
        conventions: DEFAULT_CONVENTIONS,
      });

      const structure = scanner.getProjectStructure();

      // Verify structure contains expected data
      expect(structure.sourceFiles.length).toBeGreaterThan(0);
      expect(structure.templateFiles.length).toBeGreaterThan(0);
      expect(structure.stylesheetFiles.length).toBeGreaterThan(0);
      expect(structure.filePairs.length).toBeGreaterThan(0);
      expect(structure.orphanTemplates.length).toBeGreaterThan(0);
      expect(structure.orphanSources.length).toBeGreaterThan(0);
      expect(structure.conventionMatches.size).toBeGreaterThan(0);
    });

    it("returns consistent data with individual methods", () => {
      const { scanner } = createTestScanner(STANDARD_APP, {
        conventions: DEFAULT_CONVENTIONS,
      });

      const structure = scanner.getProjectStructure();

      // Structure should match individual method calls
      expect(structure.sourceFiles).toEqual(scanner.getSourceFiles());
      expect(structure.templateFiles).toEqual(scanner.getTemplateFiles());
      expect(structure.stylesheetFiles).toEqual(scanner.getStylesheetFiles());
      expect(structure.filePairs).toEqual(scanner.getFilePairs());
      expect(structure.orphanTemplates).toEqual(scanner.getOrphanTemplates());
      expect(structure.orphanSources).toEqual(scanner.getSourcesWithoutTemplates());
    });

    it("handles empty project", () => {
      const { scanner } = createTestScanner({});

      const structure = scanner.getProjectStructure();

      expect(structure.sourceFiles).toEqual([]);
      expect(structure.templateFiles).toEqual([]);
      expect(structure.stylesheetFiles).toEqual([]);
      expect(structure.filePairs).toEqual([]);
      expect(structure.orphanTemplates).toEqual([]);
      expect(structure.orphanSources).toEqual([]);
      expect(structure.conventionMatches.size).toBe(0);
    });
  });

  // ==========================================================================
  // Caching Behavior
  // ==========================================================================

  describe("Caching Behavior", () => {
    it("caches source files (same reference on repeated calls)", () => {
      const { scanner } = createTestScanner(STANDARD_APP);

      const sources1 = scanner.getSourceFiles();
      const sources2 = scanner.getSourceFiles();

      // Same reference means caching is working
      expect(sources1).toBe(sources2);
    });

    it("caches template files", () => {
      const { scanner } = createTestScanner(STANDARD_APP);

      const templates1 = scanner.getTemplateFiles();
      const templates2 = scanner.getTemplateFiles();

      expect(templates1).toBe(templates2);
    });

    it("caches file pairs", () => {
      const { scanner } = createTestScanner(STANDARD_APP);

      const pairs1 = scanner.getFilePairs();
      const pairs2 = scanner.getFilePairs();

      expect(pairs1).toBe(pairs2);
    });

    it("refresh() invalidates cache", () => {
      const { scanner } = createTestScanner(STANDARD_APP);

      const sources1 = scanner.getSourceFiles();
      scanner.refresh();
      const sources2 = scanner.getSourceFiles();

      // Different reference after refresh
      expect(sources1).not.toBe(sources2);
      // But same content
      expect(getPaths(sources1)).toEqual(getPaths(sources2));
    });

    it("adding file requires refresh to see", () => {
      const { fs, scanner } = createTestScanner(STANDARD_APP);

      const sourcesBefore = scanner.getSourceFiles();
      const countBefore = sourcesBefore.length;

      // Add a new file
      fs.addFile("/app/src/new-file.ts", "export class NewFile {}");

      // Without refresh, count should be the same
      const sourcesWithoutRefresh = scanner.getSourceFiles();
      expect(sourcesWithoutRefresh.length).toBe(countBefore);

      // After refresh, new file should appear
      scanner.refresh();
      const sourcesAfterRefresh = scanner.getSourceFiles();
      expect(sourcesAfterRefresh.length).toBe(countBefore + 1);
      expect(getPaths(sourcesAfterRefresh)).toContain("/app/src/new-file.ts");
    });

    it("removing file requires refresh to see", () => {
      const { fs, scanner } = createTestScanner(STANDARD_APP);

      const sourcesBefore = scanner.getSourceFiles();
      expect(getPaths(sourcesBefore)).toContain("/app/src/my-app.ts");

      // Remove a file
      fs.remove("/app/src/my-app.ts");

      // Without refresh, file still appears
      const sourcesWithoutRefresh = scanner.getSourceFiles();
      expect(getPaths(sourcesWithoutRefresh)).toContain("/app/src/my-app.ts");

      // After refresh, file should be gone
      scanner.refresh();
      const sourcesAfterRefresh = scanner.getSourceFiles();
      expect(getPaths(sourcesAfterRefresh)).not.toContain("/app/src/my-app.ts");
    });
  });

  // ==========================================================================
  // Integration Scenarios
  // ==========================================================================

  describe("Integration Scenarios", () => {
    it("handles realistic app structure end-to-end", () => {
      const { scanner } = createTestScanner(STANDARD_APP, {
        conventions: DEFAULT_CONVENTIONS,
      });

      const structure = scanner.getProjectStructure();

      // Verify counts match expectations for STANDARD_APP
      // Sources: main.ts, my-app.ts, nav-bar.ts, footer.ts, home.ts, about.ts, inline-only.ts, date-format.ts = 8
      expect(structure.sourceFiles.length).toBe(8);

      // Templates: my-app.html, nav-bar.html, footer.html, home.html, about.html, orphan.html = 6
      expect(structure.templateFiles.length).toBe(6);

      // Stylesheets: my-app.css = 1
      expect(structure.stylesheetFiles.length).toBe(1);

      // Orphans: orphan.html = 1
      expect(structure.orphanTemplates.length).toBe(1);

      // Convention matches: resources/* (3) + pages/* (2) = 5
      expect(structure.conventionMatches.size).toBe(5);
    });

    it("handles deeply nested components", () => {
      const { scanner } = createTestScanner(DEEP_NESTING, {
        conventions: DEFAULT_CONVENTIONS,
      });

      const sources = scanner.getSourceFiles();
      const pairs = scanner.getFilePairs();
      const matches = scanner.getConventionMatches();

      // All sources found: login-form.ts, login.ts, stats-card.ts = 3
      expect(sources.length).toBe(3);

      // All pairs have templates
      const pairsWithTemplates = pairs.filter((p) => p.template);
      expect(pairsWithTemplates.length).toBe(3);

      // Pages matched as router scope (login.ts is in pages/)
      const routerMatches = [...matches.values()].filter((m) => m.scope.kind === "router");
      expect(routerMatches.length).toBe(1);
    });

    it("handles mixed source formats", () => {
      const { scanner } = createTestScanner({
        ...JS_SOURCES,
        "/app/src/ts-file.html": "",
        "/app/src/tsx-file.html": "",
      });

      const sources = scanner.getSourceFiles();
      const pairs = scanner.getFilePairs();

      expect(sources.length).toBe(4);

      // TS and TSX files should pair with their HTML
      const tsxPair = pairs.find((p) => p.source.path.endsWith(".tsx"));
      expect(tsxPair?.template?.path).toBe("/app/src/tsx-file.html");
    });

    it("handles project with only stylesheets (no source/template)", () => {
      const { scanner } = createTestScanner({
        "/app/src/styles/theme.css": "",
        "/app/src/styles/variables.scss": "",
      });

      const structure = scanner.getProjectStructure();

      expect(structure.sourceFiles).toEqual([]);
      expect(structure.templateFiles).toEqual([]);
      expect(structure.stylesheetFiles.length).toBe(2);
      expect(structure.filePairs).toEqual([]);
    });
  });
});
