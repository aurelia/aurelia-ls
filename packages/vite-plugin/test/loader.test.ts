/**
 * Component Loader Unit Tests
 *
 * Tests for ComponentCache and component loading utilities.
 * These tests focus on cache behavior without requiring a full Vite server.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { componentCache, type LoadedComponent } from "../src/loader.js";

/**
 * Create a mock LoadedComponent for testing.
 */
function createMockComponent(overrides: Partial<LoadedComponent> = {}): LoadedComponent {
  return {
    ComponentClass: class MockComponent {} as any,
    aot: {
      template: "<div>mock</div>",
      instructions: [],
      targetCount: 0,
      nestedDefs: [],
      raw: {} as any,
    },
    templatePath: "/src/my-app.html",
    componentPath: "/src/my-app.ts",
    name: "my-app",
    className: "MyApp",
    ...overrides,
  };
}

// =============================================================================
// ComponentCache Tests
// =============================================================================

describe("ComponentCache", () => {
  beforeEach(() => {
    // Clear the cache before each test
    componentCache.clear();
  });

  describe("basic operations", () => {
    it("starts empty", () => {
      expect(componentCache.size).toBe(0);
    });

    it("caches a component by template path", () => {
      const component = createMockComponent();
      componentCache.set(component);

      expect(componentCache.size).toBe(1);
      expect(componentCache.has(component.templatePath)).toBe(true);
    });

    it("retrieves cached component", () => {
      const component = createMockComponent();
      componentCache.set(component);

      const retrieved = componentCache.get(component.templatePath);
      expect(retrieved).toBe(component);
    });

    it("returns null for uncached path", () => {
      expect(componentCache.get("/nonexistent.html")).toBeNull();
    });

    it("iterates over cached values", () => {
      const comp1 = createMockComponent({ templatePath: "/one.html", name: "one" });
      const comp2 = createMockComponent({ templatePath: "/two.html", name: "two" });

      componentCache.set(comp1);
      componentCache.set(comp2);

      const values = Array.from(componentCache.values());
      expect(values).toHaveLength(2);
      expect(values.map(v => v.name).sort()).toEqual(["one", "two"]);
    });
  });

  describe("path normalization", () => {
    it("normalizes backslashes to forward slashes", () => {
      const component = createMockComponent({
        templatePath: "C:\\projects\\app\\src\\my-app.html",
      });
      componentCache.set(component);

      // Should find with forward slashes
      expect(componentCache.has("C:/projects/app/src/my-app.html")).toBe(true);
    });

    it("handles mixed path separators", () => {
      const component = createMockComponent({
        templatePath: "C:/projects/app\\src/my-app.html",
      });
      componentCache.set(component);

      const retrieved = componentCache.get("C:/projects/app/src/my-app.html");
      expect(retrieved).toBe(component);
    });
  });

  describe("invalidation", () => {
    it("invalidates by template path", () => {
      const component = createMockComponent({
        templatePath: "/src/my-app.html",
      });
      componentCache.set(component);

      const invalidated = componentCache.invalidate("/src/my-app.html");

      expect(invalidated).toBe(true);
      expect(componentCache.size).toBe(0);
      expect(componentCache.has("/src/my-app.html")).toBe(false);
    });

    it("invalidates by component path", () => {
      const component = createMockComponent({
        templatePath: "/src/my-app.html",
        componentPath: "/src/my-app.ts",
      });
      componentCache.set(component);

      // Invalidate by component path (not template path)
      const invalidated = componentCache.invalidate("/src/my-app.ts");

      expect(invalidated).toBe(true);
      expect(componentCache.size).toBe(0);
    });

    it("returns false when path not found", () => {
      const invalidated = componentCache.invalidate("/nonexistent.html");
      expect(invalidated).toBe(false);
    });

    it("only invalidates matching components", () => {
      const comp1 = createMockComponent({
        templatePath: "/src/one.html",
        componentPath: "/src/one.ts",
      });
      const comp2 = createMockComponent({
        templatePath: "/src/two.html",
        componentPath: "/src/two.ts",
      });

      componentCache.set(comp1);
      componentCache.set(comp2);

      componentCache.invalidate("/src/one.html");

      expect(componentCache.size).toBe(1);
      expect(componentCache.has("/src/two.html")).toBe(true);
    });

    it("invalidates with normalized path", () => {
      const component = createMockComponent({
        templatePath: "C:\\src\\my-app.html",
        componentPath: "C:\\src\\my-app.ts",
      });
      componentCache.set(component);

      // Invalidate with forward slashes
      const invalidated = componentCache.invalidate("C:/src/my-app.html");

      expect(invalidated).toBe(true);
      expect(componentCache.size).toBe(0);
    });
  });

  describe("clear", () => {
    it("removes all cached components", () => {
      componentCache.set(createMockComponent({ templatePath: "/one.html" }));
      componentCache.set(createMockComponent({ templatePath: "/two.html" }));
      componentCache.set(createMockComponent({ templatePath: "/three.html" }));

      expect(componentCache.size).toBe(3);

      componentCache.clear();

      expect(componentCache.size).toBe(0);
    });
  });

  describe("HMR scenarios", () => {
    it("allows re-caching after invalidation", () => {
      const original = createMockComponent({
        templatePath: "/src/my-app.html",
      });
      componentCache.set(original);

      // Simulate HMR: invalidate
      componentCache.invalidate("/src/my-app.html");

      // Re-cache with new version
      const updated = createMockComponent({
        templatePath: "/src/my-app.html",
        className: "MyAppUpdated",
      });
      componentCache.set(updated);

      const retrieved = componentCache.get("/src/my-app.html");
      expect(retrieved).toBe(updated);
      expect(retrieved?.className).toBe("MyAppUpdated");
    });

    it("handles template and component file changes separately", () => {
      const component = createMockComponent({
        templatePath: "/src/app.html",
        componentPath: "/src/app.ts",
      });
      componentCache.set(component);

      // Change to .html should invalidate
      expect(componentCache.invalidate("/src/app.html")).toBe(true);

      // Re-add
      componentCache.set(component);

      // Change to .ts should also invalidate
      expect(componentCache.invalidate("/src/app.ts")).toBe(true);
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("ComponentCache Edge Cases", () => {
  beforeEach(() => {
    componentCache.clear();
  });

  it("handles empty template path", () => {
    // Should not crash on empty path
    expect(componentCache.get("")).toBeNull();
    expect(componentCache.has("")).toBe(false);
    expect(componentCache.invalidate("")).toBe(false);
  });

  it("handles components with same name but different paths", () => {
    const comp1 = createMockComponent({
      templatePath: "/app1/my-app.html",
      name: "my-app",
    });
    const comp2 = createMockComponent({
      templatePath: "/app2/my-app.html",
      name: "my-app",
    });

    componentCache.set(comp1);
    componentCache.set(comp2);

    // Both should be cached (keyed by path, not name)
    expect(componentCache.size).toBe(2);
    expect(componentCache.get("/app1/my-app.html")).toBe(comp1);
    expect(componentCache.get("/app2/my-app.html")).toBe(comp2);
  });

  it("overwrites on duplicate template path", () => {
    const original = createMockComponent({
      templatePath: "/src/my-app.html",
      className: "Original",
    });
    const replacement = createMockComponent({
      templatePath: "/src/my-app.html",
      className: "Replacement",
    });

    componentCache.set(original);
    componentCache.set(replacement);

    expect(componentCache.size).toBe(1);
    expect(componentCache.get("/src/my-app.html")?.className).toBe("Replacement");
  });
});
