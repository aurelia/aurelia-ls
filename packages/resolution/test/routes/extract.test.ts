/**
 * Route Extraction Tests
 *
 * Unit tests for extracting route configurations from TypeScript source.
 * Uses vector files for comprehensive coverage.
 */

import { describe, it } from "vitest";
import assert from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

import {
  extractRouteConfig,
  extractPathParams,
  hasGetRouteConfigMethod,
  type ExtractedRouteConfig,
  type ComponentRef,
} from "../../src/routes/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS_DIR = join(__dirname, "vectors");

interface VectorTestCase {
  name: string;
  source: string;
  expected: ExpectedRouteConfig | null;
  note?: string;
}

interface ExpectedRouteConfig {
  path?: string | string[];
  id?: string;
  title?: string;
  redirectTo?: string;
  viewport?: string;
  routes?: ExpectedChildRoute[];
  fallback?: ExpectedComponentRef;
  data?: Record<string, unknown>;
  definitionType?: "decorator" | "static-property";
  params?: string[];
  isDynamic?: boolean;
  method?: string;
}

interface ExpectedChildRoute {
  path: string;
  component?: ExpectedComponentRef;
  id?: string;
  title?: string;
  redirectTo?: string;
  viewport?: string;
  routes?: ExpectedChildRoute[];
  data?: Record<string, unknown>;
}

interface ExpectedComponentRef {
  kind: string;
  className?: string;
  name?: string;
  importPath?: string;
  template?: string;
}

interface VectorFile {
  name: string;
  cases: VectorTestCase[];
}

/**
 * Load all vector files from a directory.
 */
function loadVectors(): VectorFile[] {
  const files = readdirSync(VECTORS_DIR).filter((f) => f.endsWith(".json"));
  return files.map((f) => {
    const content = readFileSync(join(VECTORS_DIR, f), "utf-8");
    return JSON.parse(content);
  });
}

/**
 * Parse source code into a TypeScript AST.
 */
function parseSource(source: string): ts.SourceFile {
  return ts.createSourceFile(
    "test.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
}

/**
 * Find a class declaration by name in a source file.
 */
function findClass(
  sourceFile: ts.SourceFile,
  className?: string
): ts.ClassDeclaration | undefined {
  let result: ts.ClassDeclaration | undefined;

  const visit = (node: ts.Node): boolean => {
    if (result) return true;
    if (ts.isClassDeclaration(node)) {
      if (!className || node.name?.text === className) {
        result = node;
        return true;
      }
    }
    ts.forEachChild(node, visit);
    return false;
  };

  ts.forEachChild(sourceFile, visit);
  return result;
}

/**
 * Find a decorator by name on a class.
 */
function findDecorator(
  classDecl: ts.ClassDeclaration,
  decoratorName: string
): ts.Decorator | undefined {
  const modifiers = ts.getDecorators(classDecl);
  if (!modifiers) return undefined;

  for (const decorator of modifiers) {
    const expr = decorator.expression;

    if (ts.isIdentifier(expr) && expr.text === decoratorName) {
      return decorator;
    }

    if (ts.isCallExpression(expr)) {
      const callee = expr.expression;
      if (ts.isIdentifier(callee) && callee.text === decoratorName) {
        return decorator;
      }
    }
  }

  return undefined;
}

/**
 * Compare component references.
 */
function assertComponentRefMatches(
  actual: ComponentRef | undefined,
  expected: ExpectedComponentRef | undefined,
  context: string
): void {
  if (expected === undefined) {
    return; // Don't check if not specified in expected
  }

  assert.ok(actual, `${context}: component should exist`);
  assert.strictEqual(actual.kind, expected.kind, `${context}: component kind`);

  if (expected.className && actual.kind === "class") {
    assert.strictEqual(actual.className, expected.className, `${context}: className`);
  }
  if (expected.name && (actual.kind === "string" || actual.kind === "inline")) {
    assert.strictEqual(actual.name, expected.name, `${context}: name`);
  }
  if (expected.importPath && actual.kind === "import") {
    assert.strictEqual(actual.importPath, expected.importPath, `${context}: importPath`);
  }
}

/**
 * Compare child routes.
 */
function assertChildRoutesMatch(
  actual: readonly import("../../src/routes/types.js").ExtractedChildRoute[],
  expected: ExpectedChildRoute[],
  context: string
): void {
  assert.strictEqual(actual.length, expected.length, `${context}: routes count`);

  for (let i = 0; i < expected.length; i++) {
    const actualRoute = actual[i]!;
    const expectedRoute = expected[i]!;
    const routeContext = `${context}[${i}]`;

    assert.strictEqual(actualRoute.path, expectedRoute.path, `${routeContext}: path`);

    if (expectedRoute.component) {
      assertComponentRefMatches(actualRoute.component, expectedRoute.component, routeContext);
    }

    if (expectedRoute.id !== undefined) {
      assert.strictEqual(actualRoute.id, expectedRoute.id, `${routeContext}: id`);
    }
    if (expectedRoute.title !== undefined) {
      assert.strictEqual(actualRoute.title, expectedRoute.title, `${routeContext}: title`);
    }
    if (expectedRoute.redirectTo !== undefined) {
      assert.strictEqual(actualRoute.redirectTo, expectedRoute.redirectTo, `${routeContext}: redirectTo`);
    }

    if (expectedRoute.routes) {
      assert.ok(actualRoute.children, `${routeContext}: should have children`);
      assertChildRoutesMatch(actualRoute.children!, expectedRoute.routes, `${routeContext}.children`);
    }
  }
}

/**
 * Compare extracted config with expected.
 */
function assertRouteConfigMatches(
  actual: ExtractedRouteConfig,
  expected: ExpectedRouteConfig
): void {
  // Check path
  if (expected.path !== undefined) {
    if (Array.isArray(expected.path)) {
      assert.deepStrictEqual(actual.path, expected.path, "path should match");
    } else {
      assert.strictEqual(actual.path, expected.path, "path should match");
    }
  }

  // Check simple string fields
  if (expected.id !== undefined) {
    assert.strictEqual(actual.id, expected.id, "id should match");
  }
  if (expected.title !== undefined) {
    assert.strictEqual(actual.title, expected.title, "title should match");
  }
  if (expected.redirectTo !== undefined) {
    assert.strictEqual(actual.redirectTo, expected.redirectTo, "redirectTo should match");
  }
  if (expected.viewport !== undefined) {
    assert.strictEqual(actual.viewport, expected.viewport, "viewport should match");
  }
  if (expected.definitionType !== undefined) {
    assert.strictEqual(actual.definitionType, expected.definitionType, "definitionType should match");
  }

  // Check params
  if (expected.params !== undefined) {
    assert.deepStrictEqual(actual.params, expected.params, "params should match");
  }

  // Check routes
  if (expected.routes !== undefined) {
    assertChildRoutesMatch(actual.routes, expected.routes, "routes");
  }

  // Check fallback
  if (expected.fallback !== undefined) {
    assertComponentRefMatches(actual.fallback, expected.fallback, "fallback");
  }

  // Check data
  if (expected.data !== undefined) {
    assert.deepStrictEqual(actual.data, expected.data, "data should match");
  }
}

// =============================================================================
// Tests
// =============================================================================

describe("route extraction", () => {
  describe("extractPathParams", () => {
    it("extracts single parameter", () => {
      const params = extractPathParams(":id");
      assert.deepStrictEqual(params, ["id"]);
    });

    it("extracts multiple parameters", () => {
      const params = extractPathParams(":category/:id");
      assert.deepStrictEqual(params, ["category", "id"]);
    });

    it("extracts parameters from complex path", () => {
      const params = extractPathParams("products/:category/items/:id");
      assert.deepStrictEqual(params, ["category", "id"]);
    });

    it("handles optional parameters", () => {
      const params = extractPathParams(":id?");
      assert.deepStrictEqual(params, ["id"]);
    });

    it("returns empty array for static path", () => {
      const params = extractPathParams("products/list");
      assert.deepStrictEqual(params, []);
    });

    it("returns empty array for empty path", () => {
      const params = extractPathParams("");
      assert.deepStrictEqual(params, []);
    });
  });

  describe("findDecorator", () => {
    it("finds @route decorator without arguments", () => {
      const source = `@route\nexport class Test {}`;
      const sourceFile = parseSource(source);
      const classDecl = findClass(sourceFile);
      assert.ok(classDecl);

      const decorator = findDecorator(classDecl, "route");
      assert.ok(decorator);
    });

    it("finds @route decorator with arguments", () => {
      const source = `@route('path')\nexport class Test {}`;
      const sourceFile = parseSource(source);
      const classDecl = findClass(sourceFile);
      assert.ok(classDecl);

      const decorator = findDecorator(classDecl, "route");
      assert.ok(decorator);
    });

    it("finds @route decorator with config object", () => {
      const source = `@route({ path: 'test' })\nexport class Test {}`;
      const sourceFile = parseSource(source);
      const classDecl = findClass(sourceFile);
      assert.ok(classDecl);

      const decorator = findDecorator(classDecl, "route");
      assert.ok(decorator);
    });

    it("returns undefined when decorator not present", () => {
      const source = `@customElement('test')\nexport class Test {}`;
      const sourceFile = parseSource(source);
      const classDecl = findClass(sourceFile);
      assert.ok(classDecl);

      const decorator = findDecorator(classDecl, "route");
      assert.strictEqual(decorator, undefined);
    });
  });

  describe("findClass", () => {
    it("finds class by name", () => {
      const source = `export class MyComponent {}\nexport class Other {}`;
      const sourceFile = parseSource(source);

      const classDecl = findClass(sourceFile, "MyComponent");
      assert.ok(classDecl);
      assert.strictEqual(classDecl.name?.text, "MyComponent");
    });

    it("finds first class when no name specified", () => {
      const source = `export class First {}\nexport class Second {}`;
      const sourceFile = parseSource(source);

      const classDecl = findClass(sourceFile);
      assert.ok(classDecl);
      assert.strictEqual(classDecl.name?.text, "First");
    });

    it("returns undefined for non-existent class", () => {
      const source = `export class Other {}`;
      const sourceFile = parseSource(source);

      const classDecl = findClass(sourceFile, "NotFound");
      assert.strictEqual(classDecl, undefined);
    });
  });

  describe("hasGetRouteConfigMethod", () => {
    it("detects getRouteConfig method", () => {
      const source = `export class App { getRouteConfig() { return {}; } }`;
      const sourceFile = parseSource(source);
      const classDecl = findClass(sourceFile);
      assert.ok(classDecl);
      assert.strictEqual(hasGetRouteConfigMethod(classDecl), true);
    });

    it("returns false when no getRouteConfig", () => {
      const source = `export class App { static routes = []; }`;
      const sourceFile = parseSource(source);
      const classDecl = findClass(sourceFile);
      assert.ok(classDecl);
      assert.strictEqual(hasGetRouteConfigMethod(classDecl), false);
    });
  });

  // ==========================================================================
  // Vector-based tests
  // ==========================================================================

  const vectors = loadVectors();

  for (const vectorFile of vectors) {
    describe(vectorFile.name, () => {
      for (const testCase of vectorFile.cases) {
        it(testCase.name, () => {
          const sourceFile = parseSource(testCase.source);
          const classDecl = findClass(sourceFile);
          assert.ok(classDecl, "Class not found in source");

          // Handle dynamic route case (getRouteConfig)
          if (testCase.expected && "isDynamic" in testCase.expected && testCase.expected.isDynamic) {
            assert.strictEqual(
              hasGetRouteConfigMethod(classDecl),
              true,
              "Should detect getRouteConfig method"
            );
            return;
          }

          const result = extractRouteConfig(classDecl);

          if (testCase.expected === null) {
            assert.strictEqual(result, null, "Should return null for no routes");
          } else {
            assert.ok(result, "Should extract route config");
            assertRouteConfigMatches(result, testCase.expected);
          }
        });
      }
    });
  }
});

describe("vector files are valid JSON", () => {
  const vectorFiles = readdirSync(VECTORS_DIR).filter((f) =>
    f.endsWith(".json")
  );

  for (const file of vectorFiles) {
    it(`${file} is valid JSON`, () => {
      const content = readFileSync(join(VECTORS_DIR, file), "utf-8");
      const parsed = JSON.parse(content);
      assert.ok(parsed.name, "Vector file should have a name");
      assert.ok(Array.isArray(parsed.cases), "Vector file should have cases array");

      for (const testCase of parsed.cases) {
        assert.ok(testCase.name, "Each case should have a name");
        assert.ok(typeof testCase.source === "string", "Each case should have source");
        assert.ok("expected" in testCase, "Each case should have expected");
      }
    });
  }
});

describe("vector sources are parseable TypeScript", () => {
  const vectorFiles = readdirSync(VECTORS_DIR).filter((f) =>
    f.endsWith(".json")
  );

  for (const file of vectorFiles) {
    const content = readFileSync(join(VECTORS_DIR, file), "utf-8");
    const parsed = JSON.parse(content);

    describe(parsed.name, () => {
      for (const testCase of parsed.cases) {
        it(`${testCase.name} - source parses without error`, () => {
          const sourceFile = parseSource(testCase.source);
          const diagnostics = (sourceFile as any).parseDiagnostics;
          if (diagnostics && diagnostics.length > 0) {
            const messages = diagnostics.map((d: any) =>
              ts.flattenDiagnosticMessageText(d.messageText, "\n")
            );
            assert.fail(`Parse errors: ${messages.join(", ")}`);
          }
        });
      }
    });
  }
});
