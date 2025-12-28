/**
 * Route Discovery Integration Tests
 *
 * Tests the full route discovery pipeline using the routed-app test fixture.
 */

import { describe, it } from "vitest";
import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import { buildRouteTree, type RouteTree, type RouteNode } from "../../src/routes/index.js";

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
    assert.ok(
      existsSync(join(ROUTED_APP_DIR, "tsconfig.json")),
      "tsconfig.json should exist"
    );
    assert.ok(
      existsSync(join(ROUTED_APP_DIR, "src", "app.ts")),
      "app.ts should exist"
    );
    assert.ok(
      existsSync(join(ROUTED_APP_DIR, "expected.json")),
      "expected.json should exist"
    );
  });

  it("expected.json is valid", () => {
    const expected = loadExpected();

    assert.ok(Array.isArray(expected.entryPoints), "should have entryPoints");
    assert.ok(Array.isArray(expected.roots), "should have roots");
    assert.ok(
      Array.isArray(expected.parameterizedRoutes),
      "should have parameterizedRoutes"
    );
    assert.ok(
      Array.isArray(expected.allStaticPaths),
      "should have allStaticPaths"
    );
    assert.ok(
      Array.isArray(expected.dynamicComponents),
      "should have dynamicComponents"
    );
  });

  it("expected paths cover all route patterns", () => {
    const expected = loadExpected();

    // Static paths
    assert.ok(expected.allStaticPaths.includes("/"), "should have root path");
    assert.ok(
      expected.allStaticPaths.includes("/about"),
      "should have about path"
    );
    assert.ok(
      expected.allStaticPaths.includes("/products"),
      "should have products path"
    );
    assert.ok(
      expected.allStaticPaths.includes("/blog"),
      "should have blog path"
    );

    // Parameterized routes
    const paramPaths = expected.parameterizedRoutes.map(r => r.fullPath);
    assert.ok(
      paramPaths.includes("/products/:id"),
      "should have product detail param route"
    );
    assert.ok(
      paramPaths.includes("/blog/:slug"),
      "should have blog post param route"
    );
  });

  // ==========================================================================
  // Full integration tests with buildRouteTree
  // ==========================================================================

  it("discovers routes from routed-app", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    assert.ok(routeTree, "should build route tree");
    assert.ok(routeTree.roots.length > 0, "should have root routes");

    // Should find the main routes defined in App
    const expected = loadExpected();
    assert.strictEqual(
      routeTree.roots.length,
      expected.roots.length,
      `should have ${expected.roots.length} root routes, got ${routeTree.roots.length}`
    );
  });

  it("extracts all static paths", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    const expected = loadExpected();

    // Check each expected static path exists
    for (const expectedPath of expected.allStaticPaths) {
      assert.ok(
        routeTree.allStaticPaths.includes(expectedPath),
        `should have static path: ${expectedPath}`
      );
    }
  });

  it("extracts parameterized routes", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    const expected = loadExpected();

    assert.strictEqual(
      routeTree.parameterizedRoutes.length,
      expected.parameterizedRoutes.length,
      "should have correct number of parameterized routes"
    );

    for (const expectedRoute of expected.parameterizedRoutes) {
      const found = routeTree.parameterizedRoutes.find(
        r => r.fullPath === expectedRoute.fullPath
      );
      assert.ok(found, `should find parameterized route: ${expectedRoute.fullPath}`);
      assert.deepStrictEqual(
        [...found.params],
        expectedRoute.params,
        `params should match for ${expectedRoute.fullPath}`
      );
    }
  });

  it("detects getStaticPaths methods", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    const productDetail = routeTree.parameterizedRoutes.find(
      r => r.fullPath === "/products/:id"
    );
    assert.ok(productDetail, "should find /products/:id");
    assert.strictEqual(
      productDetail.hasStaticPaths,
      true,
      "ProductDetailComponent should have getStaticPaths"
    );

    const blogPost = routeTree.parameterizedRoutes.find(
      r => r.fullPath === "/blog/:slug"
    );
    assert.ok(blogPost, "should find /blog/:slug");
    assert.strictEqual(
      blogPost.hasStaticPaths,
      true,
      "BlogPostComponent should have getStaticPaths"
    );
  });

  it("follows class references to discover nested routes", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    // Find products route
    const products = findRoute(routeTree.roots, "products");
    assert.ok(products, "should find products route");
    assert.ok(products.children.length >= 2, "products should have children");

    // Check for product list (empty path child)
    const productList = findRoute(products.children, "");
    assert.ok(productList, "should find product list (empty path)");

    // Check for product detail (parameterized child)
    const productDetail = findRoute(products.children, ":id");
    assert.ok(productDetail, "should find product detail (:id)");
  });

  it("handles static routes property pattern", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    // Blog uses static routes property
    const blog = findRoute(routeTree.roots, "blog");
    assert.ok(blog, "should find blog route");
    assert.ok(blog.children.length >= 2, "blog should have children");

    // Check for blog list
    const blogList = findRoute(blog.children, "");
    assert.ok(blogList, "should find blog list (empty path)");

    // Check for blog post
    const blogPost = findRoute(blog.children, ":slug");
    assert.ok(blogPost, "should find blog post (:slug)");
  });

  it("handles redirects", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    const redirect = findRoute(routeTree.roots, "old-home");
    assert.ok(redirect, "should find redirect route");
    assert.strictEqual(redirect.redirectTo, "", "should redirect to empty path");
  });

  it("handles path aliases", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    // About uses path aliases ['about', 'about-us']
    const about = findRoute(routeTree.roots, "about");
    assert.ok(about, "should find about route");

    // Check static paths include the alias
    assert.ok(
      routeTree.allStaticPaths.includes("/about"),
      "should have /about path"
    );
    assert.ok(
      routeTree.allStaticPaths.includes("/about-us"),
      "should have /about-us alias path"
    );
  });

  it("preserves route metadata (title, id)", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    // Home route should have title
    const home = findRoute(routeTree.roots, "");
    assert.ok(home, "should find home route");
    assert.strictEqual(home.title, "Home", "home should have title");

    // About route should have title
    const about = findRoute(routeTree.roots, "about");
    assert.ok(about, "should find about route");
    assert.strictEqual(about.title, "About Us", "about should have title");
  });

  it("reports no dynamic components for static routes", () => {
    const program = createProgram(join(ROUTED_APP_DIR, "tsconfig.json"));
    const routeTree = buildRouteTree(program, { entryPoints: ["App"] });

    // The routed-app fixture doesn't use getRouteConfig()
    assert.strictEqual(
      routeTree.dynamicComponents.length,
      0,
      "should have no dynamic components"
    );
  });
});
