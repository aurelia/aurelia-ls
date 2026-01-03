import { describe, it, expect } from "vitest";
import {
  DEFAULT_CONVENTIONS,
  matchDirectoryConventions,
  matchDirectoryConvention,
  buildConventionList,
  describeScope,
  isGlobalScope,
  isRouterScope,
  conventionBuilder,
} from "@aurelia-ls/resolution";
import type { DirectoryConvention, DirectoryScope } from "@aurelia-ls/resolution";

/**
 * Unit tests for directory convention matching.
 *
 * Directory conventions determine resource scope based on file location:
 * - src/resources/** → global
 * - src/pages/** → router
 * - etc.
 */
describe("Directory Conventions", () => {
  // ==========================================================================
  // Default Conventions
  // ==========================================================================

  describe("DEFAULT_CONVENTIONS", () => {
    it("includes resources convention", () => {
      const resourcesConvention = DEFAULT_CONVENTIONS.find(
        (c) => c.pattern === "**/resources/**"
      );

      expect(resourcesConvention).toBeDefined();
      expect(resourcesConvention!.scope.kind).toBe("global");
      expect(resourcesConvention!.priority).toBe(10);
    });

    it("includes shared convention", () => {
      const sharedConvention = DEFAULT_CONVENTIONS.find(
        (c) => c.pattern === "**/shared/**"
      );

      expect(sharedConvention).toBeDefined();
      expect(sharedConvention!.scope.kind).toBe("global");
    });

    it("includes pages convention", () => {
      const pagesConvention = DEFAULT_CONVENTIONS.find(
        (c) => c.pattern === "**/pages/**"
      );

      expect(pagesConvention).toBeDefined();
      expect(pagesConvention!.scope.kind).toBe("router");
    });

    it("includes views convention", () => {
      const viewsConvention = DEFAULT_CONVENTIONS.find(
        (c) => c.pattern === "**/views/**"
      );

      expect(viewsConvention).toBeDefined();
      expect(viewsConvention!.scope.kind).toBe("router");
    });

    it("includes routes convention", () => {
      const routesConvention = DEFAULT_CONVENTIONS.find(
        (c) => c.pattern === "**/routes/**"
      );

      expect(routesConvention).toBeDefined();
      expect(routesConvention!.scope.kind).toBe("router");
    });
  });

  // ==========================================================================
  // matchDirectoryConventions
  // ==========================================================================

  describe("matchDirectoryConventions", () => {
    it("matches file in resources directory", () => {
      const match = matchDirectoryConventions(
        "/app/src/resources/my-element.ts",
        "/app",
        DEFAULT_CONVENTIONS
      );

      expect(match).toBeDefined();
      expect(match!.convention.pattern).toBe("**/resources/**");
      expect(match!.scope.kind).toBe("global");
      expect(match!.relativePath).toBe("src/resources/my-element.ts");
    });

    it("matches file in pages directory", () => {
      const match = matchDirectoryConventions(
        "/app/src/pages/home.ts",
        "/app",
        DEFAULT_CONVENTIONS
      );

      expect(match).toBeDefined();
      expect(match!.scope.kind).toBe("router");
    });

    it("matches nested resources", () => {
      const match = matchDirectoryConventions(
        "/app/src/features/admin/resources/user-table.ts",
        "/app",
        DEFAULT_CONVENTIONS
      );

      expect(match).toBeDefined();
      expect(match!.scope.kind).toBe("global");
    });

    it("returns undefined for file outside project", () => {
      const match = matchDirectoryConventions(
        "/other/project/file.ts",
        "/app",
        DEFAULT_CONVENTIONS
      );

      expect(match).toBeUndefined();
    });

    it("returns undefined for file with no matching convention", () => {
      const match = matchDirectoryConventions(
        "/app/src/services/api.ts",
        "/app",
        DEFAULT_CONVENTIONS
      );

      expect(match).toBeUndefined();
    });

    it("handles Windows-style paths", () => {
      const match = matchDirectoryConventions(
        "C:\\app\\src\\resources\\my-element.ts",
        "C:\\app",
        DEFAULT_CONVENTIONS
      );

      expect(match).toBeDefined();
      expect(match!.scope.kind).toBe("global");
    });

    it("selects highest priority when multiple conventions match", () => {
      const conventions: DirectoryConvention[] = [
        { pattern: "**/components/**", scope: { kind: "local" }, priority: 5 },
        { pattern: "**/resources/**", scope: { kind: "global" }, priority: 10 },
      ];

      // This path matches both patterns
      const match = matchDirectoryConventions(
        "/app/src/resources/components/my-element.ts",
        "/app",
        conventions
      );

      // Should select resources (priority 10) over components (priority 5)
      expect(match!.scope.kind).toBe("global");
    });
  });

  // ==========================================================================
  // matchDirectoryConvention (single directory)
  // ==========================================================================

  describe("matchDirectoryConvention", () => {
    it("matches a directory against conventions", () => {
      const match = matchDirectoryConvention(
        "/app/src/resources",
        "/app",
        DEFAULT_CONVENTIONS
      );

      expect(match).toBeDefined();
      expect(match!.pattern).toBe("**/resources/**");
    });

    it("returns undefined for non-matching directory", () => {
      const match = matchDirectoryConvention(
        "/app/src/services",
        "/app",
        DEFAULT_CONVENTIONS
      );

      expect(match).toBeUndefined();
    });
  });

  // ==========================================================================
  // buildConventionList
  // ==========================================================================

  describe("buildConventionList", () => {
    it("uses defaults when no config provided", () => {
      const conventions = buildConventionList();

      expect(conventions.length).toBe(DEFAULT_CONVENTIONS.length);
    });

    it("excludes defaults when useDefaults is false", () => {
      const conventions = buildConventionList({
        useDefaults: false,
        additional: [
          { pattern: "**/custom/**", scope: { kind: "global" }, priority: 1 },
        ],
      });

      expect(conventions.length).toBe(1);
      expect(conventions[0]!.pattern).toBe("**/custom/**");
    });

    it("adds additional conventions to defaults", () => {
      const conventions = buildConventionList({
        additional: [
          { pattern: "**/custom/**", scope: { kind: "global" }, priority: 100 },
        ],
      });

      expect(conventions.length).toBe(DEFAULT_CONVENTIONS.length + 1);
      expect(conventions[0]!.pattern).toBe("**/custom/**"); // Highest priority first
    });

    it("applies overrides to default patterns", () => {
      const conventions = buildConventionList({
        overrides: [
          {
            pattern: "**/resources/**",
            scope: { kind: "local" }, // Override to local instead of global
            priority: 50,
          },
        ],
      });

      const resourcesConvention = conventions.find(
        (c) => c.pattern === "**/resources/**"
      );

      expect(resourcesConvention!.scope.kind).toBe("local");
      expect(resourcesConvention!.priority).toBe(50);
    });

    it("sorts by priority descending", () => {
      const conventions = buildConventionList({
        additional: [
          { pattern: "**/low/**", scope: { kind: "global" }, priority: 1 },
          { pattern: "**/high/**", scope: { kind: "global" }, priority: 100 },
        ],
      });

      expect(conventions[0]!.pattern).toBe("**/high/**");
      expect(conventions[conventions.length - 1]!.pattern).toBe("**/low/**");
    });
  });

  // ==========================================================================
  // Scope Utilities
  // ==========================================================================

  describe("describeScope", () => {
    it("describes global scope", () => {
      const desc = describeScope({ kind: "global" });
      expect(desc).toBe("Global (root container)");
    });

    it("describes local scope without parent", () => {
      const desc = describeScope({ kind: "local" });
      expect(desc).toBe("Local (component-scoped)");
    });

    it("describes local scope with parent", () => {
      const desc = describeScope({ kind: "local", parent: "my-app" });
      expect(desc).toBe("Local to my-app");
    });

    it("describes router scope", () => {
      const desc = describeScope({ kind: "router" });
      expect(desc).toBe("Router-managed (route component)");
    });

    it("describes plugin scope", () => {
      const desc = describeScope({ kind: "plugin", plugin: "@aurelia/i18n" });
      expect(desc).toBe("Plugin: @aurelia/i18n");
    });
  });

  describe("isGlobalScope", () => {
    it("returns true for global scope", () => {
      expect(isGlobalScope({ kind: "global" })).toBe(true);
    });

    it("returns false for other scopes", () => {
      expect(isGlobalScope({ kind: "local" })).toBe(false);
      expect(isGlobalScope({ kind: "router" })).toBe(false);
      expect(isGlobalScope({ kind: "plugin", plugin: "x" })).toBe(false);
    });
  });

  describe("isRouterScope", () => {
    it("returns true for router scope", () => {
      expect(isRouterScope({ kind: "router" })).toBe(true);
    });

    it("returns false for other scopes", () => {
      expect(isRouterScope({ kind: "global" })).toBe(false);
      expect(isRouterScope({ kind: "local" })).toBe(false);
    });
  });

  // ==========================================================================
  // Convention Builder
  // ==========================================================================

  describe("conventionBuilder", () => {
    it("builds a convention with fluent API", () => {
      const convention = conventionBuilder()
        .pattern("**/widgets/**")
        .description("Widget components")
        .global()
        .priority(15)
        .build();

      expect(convention).toEqual({
        pattern: "**/widgets/**",
        description: "Widget components",
        scope: { kind: "global" },
        priority: 15,
      });
    });

    it("builds local scope convention", () => {
      const convention = conventionBuilder()
        .pattern("**/internal/**")
        .local("my-app")
        .build();

      expect(convention.scope).toEqual({ kind: "local", parent: "my-app" });
    });

    it("builds router scope convention", () => {
      const convention = conventionBuilder()
        .pattern("**/screens/**")
        .router()
        .build();

      expect(convention.scope.kind).toBe("router");
    });

    it("builds plugin scope convention", () => {
      const convention = conventionBuilder()
        .pattern("**/i18n/**")
        .plugin("@aurelia/i18n")
        .build();

      expect(convention.scope).toEqual({ kind: "plugin", plugin: "@aurelia/i18n" });
    });

    it("throws when pattern not set", () => {
      expect(() => conventionBuilder().global().build()).toThrow(
        "Convention pattern is required"
      );
    });
  });
});

// ==========================================================================
// Pattern Matching Edge Cases
// ==========================================================================

describe("Pattern Matching", () => {
  const conventions: DirectoryConvention[] = [
    { pattern: "src/resources/**", scope: { kind: "global" }, priority: 10 },
    { pattern: "**/shared/*", scope: { kind: "global" }, priority: 5 },
    { pattern: "src/pages/*/components/**", scope: { kind: "local" }, priority: 8 },
  ];

  it("matches exact prefix pattern", () => {
    const match = matchDirectoryConventions(
      "/app/src/resources/my-element.ts",
      "/app",
      conventions
    );

    expect(match).toBeDefined();
    expect(match!.scope.kind).toBe("global");
  });

  it("matches glob with single wildcard", () => {
    const match = matchDirectoryConventions(
      "/app/src/shared/utils.ts",
      "/app",
      conventions
    );

    expect(match).toBeDefined();
  });

  it("matches complex nested pattern", () => {
    const match = matchDirectoryConventions(
      "/app/src/pages/admin/components/user-table.ts",
      "/app",
      conventions
    );

    expect(match).toBeDefined();
    expect(match!.scope.kind).toBe("local");
  });

  it("handles trailing slash in project root", () => {
    const match = matchDirectoryConventions(
      "/app/src/resources/my-element.ts",
      "/app/",
      conventions
    );

    expect(match).toBeDefined();
  });
});
