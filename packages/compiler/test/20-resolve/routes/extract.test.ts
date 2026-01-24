/**
 * Route Extraction Tests
 *
 * Unit tests for extracting route configurations from TypeScript source.
 * Uses vector files for comprehensive coverage.
 */

import { describe, it, expect, assert } from "vitest";
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
} from "../../../src/analysis/20-resolve/resolution/routes/index.js";

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

  expect(actual, `${context}: component should exist`).toBeTruthy();
  expect(actual.kind, `${context}: component kind`).toBe(expected.kind);

  if (expected.className && actual.kind === "class") {
    expect(actual.className, `${context}: className`).toBe(expected.className);
  }
  if (expected.name && (actual.kind === "string" || actual.kind === "inline")) {
    expect(actual.name, `${context}: name`).toBe(expected.name);
  }
  if (expected.importPath && actual.kind === "import") {
    expect(actual.importPath, `${context}: importPath`).toBe(expected.importPath);
  }
}

/**
 * Compare child routes.
 */
function assertChildRoutesMatch(
  actual: readonly import("../../../src/analysis/20-resolve/resolution/routes/types.js").ExtractedChildRoute[],
  expected: ExpectedChildRoute[],
  context: string
): void {
  expect(actual.length, `${context}: routes count`).toBe(expected.length);

  for (let i = 0; i < expected.length; i++) {
    const actualRoute = actual[i]!;
    const expectedRoute = expected[i]!;
    const routeContext = `${context}[${i}]`;

    expect(actualRoute.path, `${routeContext}: path`).toBe(expectedRoute.path);

    if (expectedRoute.component) {
      assertComponentRefMatches(actualRoute.component, expectedRoute.component, routeContext);
    }

    if (expectedRoute.id !== undefined) {
      expect(actualRoute.id, `${routeContext}: id`).toBe(expectedRoute.id);
    }
    if (expectedRoute.title !== undefined) {
      expect(actualRoute.title, `${routeContext}: title`).toBe(expectedRoute.title);
    }
    if (expectedRoute.redirectTo !== undefined) {
      expect(actualRoute.redirectTo, `${routeContext}: redirectTo`).toBe(expectedRoute.redirectTo);
    }

    if (expectedRoute.routes) {
      expect(actualRoute.children, `${routeContext}: should have children`).toBeTruthy();
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
      expect(actual.path, "path should match").toEqual(expected.path);
    } else {
      expect(actual.path, "path should match").toBe(expected.path);
    }
  }

  // Check simple string fields
  if (expected.id !== undefined) {
    expect(actual.id, "id should match").toBe(expected.id);
  }
  if (expected.title !== undefined) {
    expect(actual.title, "title should match").toBe(expected.title);
  }
  if (expected.redirectTo !== undefined) {
    expect(actual.redirectTo, "redirectTo should match").toBe(expected.redirectTo);
  }
  if (expected.viewport !== undefined) {
    expect(actual.viewport, "viewport should match").toBe(expected.viewport);
  }
  if (expected.definitionType !== undefined) {
    expect(actual.definitionType, "definitionType should match").toBe(expected.definitionType);
  }

  // Check params
  if (expected.params !== undefined) {
    expect(actual.params, "params should match").toEqual(expected.params);
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
    expect(actual.data, "data should match").toEqual(expected.data);
  }
}

// =============================================================================
// Tests
// =============================================================================

describe("route extraction", () => {
  describe("extractPathParams", () => {
    it("extracts single parameter", () => {
      const params = extractPathParams(":id");
      expect(params).toEqual(["id"]);
    });

    it("extracts multiple parameters", () => {
      const params = extractPathParams(":category/:id");
      expect(params).toEqual(["category", "id"]);
    });

    it("extracts parameters from complex path", () => {
      const params = extractPathParams("products/:category/items/:id");
      expect(params).toEqual(["category", "id"]);
    });

    it("handles optional parameters", () => {
      const params = extractPathParams(":id?");
      expect(params).toEqual(["id"]);
    });

    it("returns empty array for static path", () => {
      const params = extractPathParams("products/list");
      expect(params).toEqual([]);
    });

    it("returns empty array for empty path", () => {
      const params = extractPathParams("");
      expect(params).toEqual([]);
    });
  });

  describe("findDecorator", () => {
    it("finds @route decorator without arguments", () => {
      const source = `@route\nexport class Test {}`;
      const sourceFile = parseSource(source);
      const classDecl = findClass(sourceFile);
      expect(classDecl).toBeTruthy();

      const decorator = findDecorator(classDecl, "route");
      expect(decorator).toBeTruthy();
    });

    it("finds @route decorator with arguments", () => {
      const source = `@route('path')\nexport class Test {}`;
      const sourceFile = parseSource(source);
      const classDecl = findClass(sourceFile);
      expect(classDecl).toBeTruthy();

      const decorator = findDecorator(classDecl, "route");
      expect(decorator).toBeTruthy();
    });

    it("finds @route decorator with config object", () => {
      const source = `@route({ path: 'test' })\nexport class Test {}`;
      const sourceFile = parseSource(source);
      const classDecl = findClass(sourceFile);
      expect(classDecl).toBeTruthy();

      const decorator = findDecorator(classDecl, "route");
      expect(decorator).toBeTruthy();
    });

    it("returns undefined when decorator not present", () => {
      const source = `@customElement('test')\nexport class Test {}`;
      const sourceFile = parseSource(source);
      const classDecl = findClass(sourceFile);
      expect(classDecl).toBeTruthy();

      const decorator = findDecorator(classDecl, "route");
      expect(decorator).toBeUndefined();
    });
  });

  describe("findClass", () => {
    it("finds class by name", () => {
      const source = `export class MyComponent {}\nexport class Other {}`;
      const sourceFile = parseSource(source);

      const classDecl = findClass(sourceFile, "MyComponent");
      expect(classDecl).toBeTruthy();
      expect(classDecl.name?.text).toBe("MyComponent");
    });

    it("finds first class when no name specified", () => {
      const source = `export class First {}\nexport class Second {}`;
      const sourceFile = parseSource(source);

      const classDecl = findClass(sourceFile);
      expect(classDecl).toBeTruthy();
      expect(classDecl.name?.text).toBe("First");
    });

    it("returns undefined for non-existent class", () => {
      const source = `export class Other {}`;
      const sourceFile = parseSource(source);

      const classDecl = findClass(sourceFile, "NotFound");
      expect(classDecl).toBeUndefined();
    });
  });

  describe("hasGetRouteConfigMethod", () => {
    it("detects getRouteConfig method", () => {
      const source = `export class App { getRouteConfig() { return {}; } }`;
      const sourceFile = parseSource(source);
      const classDecl = findClass(sourceFile);
      expect(classDecl).toBeTruthy();
      expect(hasGetRouteConfigMethod(classDecl)).toBe(true);
    });

    it("returns false when no getRouteConfig", () => {
      const source = `export class App { static routes = []; }`;
      const sourceFile = parseSource(source);
      const classDecl = findClass(sourceFile);
      expect(classDecl).toBeTruthy();
      expect(hasGetRouteConfigMethod(classDecl)).toBe(false);
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
          expect(classDecl, "Class not found in source").toBeTruthy();

          // Handle dynamic route case (getRouteConfig)
          if (testCase.expected && "isDynamic" in testCase.expected && testCase.expected.isDynamic) {
            expect(
              hasGetRouteConfigMethod(classDecl),
              "Should detect getRouteConfig method"
            ).toBe(true);
            return;
          }

          const result = extractRouteConfig(classDecl);

          if (testCase.expected === null) {
            expect(result, "Should return null for no routes").toBeNull();
          } else {
            expect(result, "Should extract route config").toBeTruthy();
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
      expect(parsed.name, "Vector file should have a name").toBeTruthy();
      expect(Array.isArray(parsed.cases), "Vector file should have cases array").toBe(true);

      for (const testCase of parsed.cases) {
        expect(testCase.name, "Each case should have a name").toBeTruthy();
        expect(typeof testCase.source === "string", "Each case should have source").toBe(true);
        expect("expected" in testCase, "Each case should have expected").toBe(true);
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
