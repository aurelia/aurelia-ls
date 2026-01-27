/**
 * Route Discovery Integration Tests
 *
 * Tests the full route discovery pipeline using the routed-app test fixture.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { buildRouteTree, type RouteTree, type RouteNode } from "../../../src/analysis/20-link/resolution/routes/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTED_APP_DIR = join(__dirname, "..", "apps", "routed-app");

interface ExpectedRouteTree {
  entryPoints: string[];
  roots: ExpectedRouteNode[];
  parameterizedRoutes: { fullPath: string; params: string[]; hasStaticPaths: boolean }[];
  allStaticPaths: string[];
  dynamicComponents: { className: string; method: string }[];
}

interface ExpectedRouteNode {
  path: string | string[];
  fullPath: string;
  component?: { kind: string; className?: string };
  title?: string;
  children: ExpectedRouteNode[];
  redirectTo?: string;
  params?: string[];
}

/**
 * Load expected output from the test app.
 */
function loadExpected(): ExpectedRouteTree {
  const expectedPath = join(ROUTED_APP_DIR, "expected.json");
  const content = readFileSync(expectedPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Create a TypeScript program from a tsconfig.json path.
 */
function createProgram(tsconfigPath: string): ts.Program {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(`Failed to read tsconfig: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n")}`);
  }

  const configDir = dirname(tsconfigPath);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, configDir);
  if (parsed.errors.length > 0) {
    const messages = parsed.errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, "\n"));
    throw new Error(`Failed to parse tsconfig: ${messages.join("\n")}`);
  }

  return ts.createProgram(parsed.fileNames, parsed.options);
}

/**
 * Find a route node by path in the tree.
 */
function findRoute(nodes: readonly RouteNode[], path: string): RouteNode | undefined {
  for (const node of nodes) {
    const nodePath = Array.isArray(node.path) ? node.path[0] : node.path;
    if (nodePath === path) return node;
  }
  return undefined;
}

describe("routed-app integration", () => {
  // ==========================================================================
  // Fixture validation tests
  // ==========================================================================

  it("test fixture exists", () => {
    expect(
      existsSync(join(ROUTED_APP_DIR, "tsconfig.json")),
      "tsconfig.json should exist"
    ).toBe(true);
    expect(
      existsSync(join(ROUTED_APP_DIR, "src", "app.ts")),
      "app.ts should exist"
    ).toBe(true);
    expect(
      existsSync(join(ROUTED_APP_DIR, "expected.json")),
      "expected.json should exist"
    ).toBe(true);
  });

  it("expected.json is valid", () => {
    const expected = loadExpected();

    expect(Array.isArray(expected.entryPoints), "should have entryPoints").toBe(true);
    expect(Array.isArray(expected.roots), "should have roots").toBe(true);
    expect(
      Array.isArray(expected.parameterizedRoutes),
      "should have parameterizedRoutes"
    ).toBe(true);
    expect(
      Array.isArray(expected.allStaticPaths),
      "should have allStaticPaths"
    ).toBe(true);
    expect(
      Array.isArray(expected.dynamicComponents),
      "should have dynamicComponents"
    ).toBe(true);
  });

  it("expected paths cover all route patterns", () => {
    const expected = loadExpected();

    // Static paths
    expect(expected.allStaticPaths.includes("/"), "should have root path").toBe(true);
    expect(
      expected.allStaticPaths.includes("/about"),
      "should have about path"
    ).toBe(true);
    expect(
      expected.allStaticPaths.includes("/products"),
      "should have products path"
    ).toBe(true);
    expect(
      expected.allStaticPaths.includes("/blog"),
      "should have blog path"
    ).toBe(true);

    // Parameterized routes
    const paramPaths = expected.parameterizedRoutes.map(r => r.fullPath);
    expect(
      paramPaths.includes("/products/:id"),
      "should have product detail param route"
    ).toBe(true);
    expect(
      paramPaths.includes("/blog/:slug"),
      "should have blog post param route"
    ).toBe(true);
  });

  // ==========================================================================
  // Full integration tests with buildRouteTree
  // ==========================================================================

  it("discovers routes from routed-app", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    expect(routeTree, "should build route tree").toBeTruthy();
    expect(routeTree.roots.length > 0, "should have root routes").toBe(true);

    // Should find the main routes defined in App
    const expected = loadExpected();
    expect(
      routeTree.roots.length,
      `should have ${expected.roots.length} root routes, got ${routeTree.roots.length}`
    ).toBe(expected.roots.length);
  });

  it("extracts all static paths", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    const expected = loadExpected();

    // Check each expected static path exists
    for (const expectedPath of expected.allStaticPaths) {
      expect(
        routeTree.allStaticPaths.includes(expectedPath),
        `should have static path: ${expectedPath}`
      ).toBe(true);
    }
  });

  it("extracts parameterized routes", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    const expected = loadExpected();

    expect(
      routeTree.parameterizedRoutes.length,
      "should have correct number of parameterized routes"
    ).toBe(expected.parameterizedRoutes.length);

    for (const expectedRoute of expected.parameterizedRoutes) {
      const found = routeTree.parameterizedRoutes.find(
        r => r.fullPath === expectedRoute.fullPath
      );
      expect(found, `should find parameterized route: ${expectedRoute.fullPath}`).toBeTruthy();
      expect(
        [...found.params],
        `params should match for ${expectedRoute.fullPath}`
      ).toEqual(expectedRoute.params);
    }
  });

  it("detects getStaticPaths methods", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    const productDetail = routeTree.parameterizedRoutes.find(
      r => r.fullPath === "/products/:id"
    );
    expect(productDetail, "should find /products/:id").toBeTruthy();
    expect(
      productDetail.hasStaticPaths,
      "ProductDetailComponent should have getStaticPaths"
    ).toBe(true);

    const blogPost = routeTree.parameterizedRoutes.find(
      r => r.fullPath === "/blog/:slug"
    );
    expect(blogPost, "should find /blog/:slug").toBeTruthy();
    expect(
      blogPost.hasStaticPaths,
      "BlogPostComponent should have getStaticPaths"
    ).toBe(true);
  });

  it("follows class references to discover nested routes", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    // Find products route
    const products = findRoute(routeTree.roots, "products");
    expect(products, "should find products route").toBeTruthy();
    expect(products.children.length >= 2, "products should have children").toBe(true);

    // Check for product list (empty path child)
    const productList = findRoute(products.children, "");
    expect(productList, "should find product list (empty path)").toBeTruthy();

    // Check for product detail (parameterized child)
    const productDetail = findRoute(products.children, ":id");
    expect(productDetail, "should find product detail (:id)").toBeTruthy();
  });

  it("handles static routes property pattern", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    // Blog uses static routes property
    const blog = findRoute(routeTree.roots, "blog");
    expect(blog, "should find blog route").toBeTruthy();
    expect(blog.children.length >= 2, "blog should have children").toBe(true);

    // Check for blog list
    const blogList = findRoute(blog.children, "");
    expect(blogList, "should find blog list (empty path)").toBeTruthy();

    // Check for blog post
    const blogPost = findRoute(blog.children, ":slug");
    expect(blogPost, "should find blog post (:slug)").toBeTruthy();
  });

  it("handles redirects", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    const redirect = findRoute(routeTree.roots, "old-home");
    expect(redirect, "should find redirect route").toBeTruthy();
    expect(redirect.redirectTo, "should redirect to empty path").toBe("");
  });

  it("handles path aliases", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    // About uses path aliases ['about', 'about-us']
    const about = findRoute(routeTree.roots, "about");
    expect(about, "should find about route").toBeTruthy();

    // Check static paths include the alias
    expect(
      routeTree.allStaticPaths.includes("/about"),
      "should have /about path"
    ).toBe(true);
    expect(
      routeTree.allStaticPaths.includes("/about-us"),
      "should have /about-us alias path"
    ).toBe(true);
  });

  it("preserves route metadata (title, id)", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    // Home route should have title
    const home = findRoute(routeTree.roots, "");
    expect(home, "should find home route").toBeTruthy();
    expect(home.title, "home should have title").toBe("Home");

    // About route should have title
    const about = findRoute(routeTree.roots, "about");
    expect(about, "should find about route").toBeTruthy();
    expect(about.title, "about should have title").toBe("About Us");
  });

  it("reports no dynamic components for static routes", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    // The routed-app fixture doesn't use getRouteConfig()
    expect(
      routeTree.dynamicComponents.length,
      "should have no dynamic components"
    ).toBe(0);
  });
});
