/**
 * Route Discovery Integration Tests
 *
 * Tests the full route discovery pipeline using the routed-app test fixture.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Note: These imports will work once the route discovery module is implemented
// import { resolveProject } from "../../src/resolve.js";
// import type { RouteTree, RouteNode } from "../../src/routes/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTED_APP_DIR = join(__dirname, "..", "apps", "routed-app");

/**
 * Load expected output from the test app.
 */
function loadExpected(): {
  entryPoints: string[];
  roots: unknown[];
  parameterizedRoutes: unknown[];
  allStaticPaths: string[];
  dynamicComponents: unknown[];
} {
  const expectedPath = join(ROUTED_APP_DIR, "expected.json");
  const content = readFileSync(expectedPath, "utf-8");
  return JSON.parse(content);
}

describe("routed-app integration", () => {
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
    const paramPaths = expected.parameterizedRoutes.map(
      (r: any) => r.fullPath
    );
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
  // Full integration tests - uncomment when route discovery is implemented
  // ==========================================================================

  // it("discovers routes from routed-app", async () => {
  //   const result = await resolveProject(
  //     join(ROUTED_APP_DIR, "tsconfig.json"),
  //     { discoverRoutes: true }
  //   );

  //   assert.ok(result.routeTree, "should have routeTree");
  //   const expected = loadExpected();

  //   // Check entry points
  //   assert.deepStrictEqual(
  //     result.routeTree.entryPoints,
  //     expected.entryPoints
  //   );

  //   // Check root count
  //   assert.strictEqual(
  //     result.routeTree.roots.length,
  //     expected.roots.length,
  //     "should have correct number of root routes"
  //   );
  // });

  // it("extracts parameterized routes", async () => {
  //   const result = await resolveProject(
  //     join(ROUTED_APP_DIR, "tsconfig.json"),
  //     { discoverRoutes: true }
  //   );

  //   const expected = loadExpected();

  //   assert.strictEqual(
  //     result.routeTree?.parameterizedRoutes.length,
  //     expected.parameterizedRoutes.length,
  //     "should have correct number of parameterized routes"
  //   );

  //   for (const expectedRoute of expected.parameterizedRoutes) {
  //     const found = result.routeTree?.parameterizedRoutes.find(
  //       (r) => r.fullPath === expectedRoute.fullPath
  //     );
  //     assert.ok(found, `should find parameterized route: ${expectedRoute.fullPath}`);
  //     assert.deepStrictEqual(found.params, expectedRoute.params);
  //   }
  // });

  // it("detects getStaticPaths methods", async () => {
  //   const result = await resolveProject(
  //     join(ROUTED_APP_DIR, "tsconfig.json"),
  //     { discoverRoutes: true }
  //   );

  //   const productDetail = result.routeTree?.parameterizedRoutes.find(
  //     (r) => r.fullPath === "/products/:id"
  //   );
  //   assert.ok(productDetail);
  //   assert.strictEqual(productDetail.hasStaticPaths, true);

  //   const blogPost = result.routeTree?.parameterizedRoutes.find(
  //     (r) => r.fullPath === "/blog/:slug"
  //   );
  //   assert.ok(blogPost);
  //   assert.strictEqual(blogPost.hasStaticPaths, true);
  // });

  // it("handles nested routes correctly", async () => {
  //   const result = await resolveProject(
  //     join(ROUTED_APP_DIR, "tsconfig.json"),
  //     { discoverRoutes: true }
  //   );

  //   // Find products route
  //   const products = result.routeTree?.roots.find(
  //     (r) => r.path === "products"
  //   );
  //   assert.ok(products, "should find products route");
  //   assert.strictEqual(products.children.length, 2, "products should have 2 children");

  //   // Check product list (empty path child)
  //   const productList = products.children.find((c) => c.path === "");
  //   assert.ok(productList, "should find product list");

  //   // Check product detail (parameterized child)
  //   const productDetail = products.children.find((c) => c.path === ":id");
  //   assert.ok(productDetail, "should find product detail");
  // });

  // it("handles static routes property pattern", async () => {
  //   const result = await resolveProject(
  //     join(ROUTED_APP_DIR, "tsconfig.json"),
  //     { discoverRoutes: true }
  //   );

  //   // Blog uses static routes property instead of @route decorator
  //   const blog = result.routeTree?.roots.find((r) => r.path === "blog");
  //   assert.ok(blog, "should find blog route");
  //   assert.strictEqual(blog.children.length, 2, "blog should have 2 children");
  // });

  // it("handles redirects", async () => {
  //   const result = await resolveProject(
  //     join(ROUTED_APP_DIR, "tsconfig.json"),
  //     { discoverRoutes: true }
  //   );

  //   const redirect = result.routeTree?.roots.find(
  //     (r) => r.path === "old-home"
  //   );
  //   assert.ok(redirect, "should find redirect route");
  //   assert.strictEqual(redirect.redirectTo, "");
  // });
});
