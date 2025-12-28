/**
 * SSG Generator Tests
 *
 * Tests the static site generation utilities.
 */

import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { mkdir, rm, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

import {
  generateStaticSite,
  expandPath,
  collectStaticRoutes,
} from "../out/ssg/index.js";

// Create a temporary directory for test output
const createTempDir = async () => {
  const dir = join(tmpdir(), `ssg-test-${randomBytes(4).toString("hex")}`);
  await mkdir(dir, { recursive: true });
  return dir;
};

describe("SSG Generator", () => {
  describe("expandPath", () => {
    it("expands single parameter", () => {
      const result = expandPath("/products/:id", { id: "123" });
      expect(result).toBe("/products/123");
    });

    it("expands multiple parameters", () => {
      const result = expandPath("/users/:userId/posts/:postId", {
        userId: "42",
        postId: "99",
      });
      expect(result).toBe("/users/42/posts/99");
    });

    it("handles optional parameters", () => {
      const result = expandPath("/blog/:slug?", { slug: "hello-world" });
      expect(result).toBe("/blog/hello-world");
    });

    it("returns path unchanged when no params match", () => {
      const result = expandPath("/about", { id: "123" });
      expect(result).toBe("/about");
    });
  });

  describe("collectStaticRoutes", () => {
    it("collects routes without parameters", () => {
      const nodes = [
        { path: "", fullPath: "/", children: [] },
        { path: "about", fullPath: "/about", children: [] },
        { path: ":id", fullPath: "/:id", children: [] },
      ];

      const routes = collectStaticRoutes(nodes);

      expect(routes).toContain("/");
      expect(routes).toContain("/about");
      expect(routes).not.toContain("/:id");
    });

    it("skips redirects", () => {
      const nodes = [
        { path: "old", fullPath: "/old", redirectTo: "/new", children: [] },
        { path: "new", fullPath: "/new", children: [] },
      ];

      const routes = collectStaticRoutes(nodes);

      expect(routes).not.toContain("/old");
      expect(routes).toContain("/new");
    });

    it("collects nested routes", () => {
      const nodes = [
        {
          path: "products",
          fullPath: "/products",
          children: [
            { path: "", fullPath: "/products", children: [] },
            { path: ":id", fullPath: "/products/:id", children: [] },
          ],
        },
      ];

      const routes = collectStaticRoutes(nodes);

      expect(routes).toContain("/products");
      expect(routes).not.toContain("/products/:id");
    });

    it("handles path aliases", () => {
      const nodes = [
        {
          path: ["about", "about-us"],
          fullPath: "/about",
          children: [],
        },
      ];

      const routes = collectStaticRoutes(nodes);

      expect(routes).toContain("/about");
      expect(routes).toContain("/about-us");
    });
  });

  describe("generateStaticSite", () => {
    let outDir;

    beforeEach(async () => {
      outDir = await createTempDir();
    });

    afterEach(async () => {
      try {
        await rm(outDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it("generates pages for static routes", async () => {
      const routeTree = {
        entryPoints: ["App"],
        roots: [],
        dynamicComponents: [],
        parameterizedRoutes: [],
        allStaticPaths: ["/", "/about"],
      };

      const options = {
        enabled: true,
        entryPoints: [],
        outDir: ".",
        fallback: false,
      };

      const render = async (route) => `<html><body>${route}</body></html>`;
      const resolveStaticPaths = async () => [];

      const result = await generateStaticSite(
        routeTree,
        options,
        outDir,
        render,
        resolveStaticPaths,
      );

      expect(result.pages.size).toBe(2);
      expect(result.errors.length).toBe(0);

      // Check files were created
      const indexContent = await readFile(join(outDir, "index.html"), "utf-8");
      expect(indexContent).toContain("/");

      const aboutContent = await readFile(join(outDir, "about", "index.html"), "utf-8");
      expect(aboutContent).toContain("/about");
    });

    it("reports errors for failed routes", async () => {
      const routeTree = {
        entryPoints: ["App"],
        roots: [],
        dynamicComponents: [],
        parameterizedRoutes: [],
        allStaticPaths: ["/", "/error"],
      };

      const options = {
        enabled: true,
        entryPoints: [],
        outDir: ".",
        fallback: false,
      };

      const render = async (route) => {
        if (route === "/error") {
          throw new Error("Render failed");
        }
        return `<html><body>${route}</body></html>`;
      };
      const resolveStaticPaths = async () => [];

      const result = await generateStaticSite(
        routeTree,
        options,
        outDir,
        render,
        resolveStaticPaths,
      );

      expect(result.pages.size).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].route).toBe("/error");
    });

    it("includes additional routes from hook", async () => {
      const routeTree = {
        entryPoints: ["App"],
        roots: [],
        dynamicComponents: [],
        parameterizedRoutes: [],
        allStaticPaths: ["/"],
      };

      const options = {
        enabled: true,
        entryPoints: [],
        outDir: ".",
        fallback: false,
        additionalRoutes: () => ["/extra"],
      };

      const render = async (route) => `<html><body>${route}</body></html>`;
      const resolveStaticPaths = async () => [];

      const result = await generateStaticSite(
        routeTree,
        options,
        outDir,
        render,
        resolveStaticPaths,
      );

      expect(result.pages.size).toBe(2);
      expect(result.pages.has("/")).toBe(true);
      expect(result.pages.has("/extra")).toBe(true);
    });

    it("calls onBeforeRender and onAfterRender hooks", async () => {
      const routeTree = {
        entryPoints: ["App"],
        roots: [],
        dynamicComponents: [],
        parameterizedRoutes: [],
        allStaticPaths: ["/"],
      };

      let beforeRenderCalled = false;
      let afterRenderCalled = false;

      const options = {
        enabled: true,
        entryPoints: [],
        outDir: ".",
        fallback: false,
        onBeforeRender: (route) => {
          beforeRenderCalled = true;
          return { title: "Test" };
        },
        onAfterRender: (route, html) => {
          afterRenderCalled = true;
          return html.replace("</body>", "<!-- processed --></body>");
        },
      };

      const render = async (route) => `<html><body>${route}</body></html>`;
      const resolveStaticPaths = async () => [];

      const result = await generateStaticSite(
        routeTree,
        options,
        outDir,
        render,
        resolveStaticPaths,
      );

      expect(beforeRenderCalled).toBe(true);
      expect(afterRenderCalled).toBe(true);

      const content = await readFile(join(outDir, "index.html"), "utf-8");
      expect(content).toContain("<!-- processed -->");
    });

    it("generates fallback page when configured", async () => {
      const routeTree = {
        entryPoints: ["App"],
        roots: [],
        dynamicComponents: [],
        parameterizedRoutes: [],
        allStaticPaths: ["/"],
      };

      const options = {
        enabled: true,
        entryPoints: [],
        outDir: ".",
        fallback: "404.html",
      };

      const render = async (route) => `<html><body>${route}</body></html>`;
      const resolveStaticPaths = async () => [];

      const result = await generateStaticSite(
        routeTree,
        options,
        outDir,
        render,
        resolveStaticPaths,
      );

      // Check 404.html was created
      const stats = await stat(join(outDir, "404.html"));
      expect(stats.isFile()).toBe(true);
    });

    it("expands parameterized routes with getStaticPaths", async () => {
      const routeTree = {
        entryPoints: ["App"],
        roots: [],
        dynamicComponents: [],
        parameterizedRoutes: [
          {
            fullPath: "/products/:id",
            params: ["id"],
            hasStaticPaths: true,
          },
        ],
        allStaticPaths: ["/"],
      };

      const options = {
        enabled: true,
        entryPoints: [],
        outDir: ".",
        fallback: false,
      };

      const render = async (route) => `<html><body>${route}</body></html>`;
      const resolveStaticPaths = async (route) => {
        if (route.fullPath === "/products/:id") {
          return ["/products/1", "/products/2", "/products/3"];
        }
        return [];
      };

      const result = await generateStaticSite(
        routeTree,
        options,
        outDir,
        render,
        resolveStaticPaths,
      );

      // Should have: /, /products/1, /products/2, /products/3
      expect(result.pages.size).toBe(4);
      expect(result.expandedRoutes.length).toBe(1);
      expect(result.expandedRoutes[0].staticPaths.length).toBe(3);

      // Check files exist
      const p1Content = await readFile(join(outDir, "products", "1", "index.html"), "utf-8");
      expect(p1Content).toContain("/products/1");
    });
  });
});
