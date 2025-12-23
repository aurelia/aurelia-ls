/**
 * Route Extraction Tests
 *
 * Unit tests for extracting route configurations from TypeScript source.
 * Uses vector files for comprehensive coverage.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Note: These imports will work once the route extraction module is implemented
// import {
//   extractRouteConfig,
//   extractFromDecorator,
//   extractFromStaticProperty,
//   extractComponentRef,
//   extractPathParams,
// } from "../../src/routes/extract.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS_DIR = join(__dirname, "vectors");

/**
 * Load all vector files from a directory.
 */
function loadVectors(): Array<{
  name: string;
  cases: Array<{
    name: string;
    source: string;
    expected: unknown;
    note?: string;
  }>;
}> {
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
    if (result) return true; // Already found, stop searching
    if (ts.isClassDeclaration(node)) {
      if (!className || node.name?.text === className) {
        result = node;
        return true; // Stop searching
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

    // @route
    if (ts.isIdentifier(expr) && expr.text === decoratorName) {
      return decorator;
    }

    // @route(...)
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
 * Extract path parameters from a path string.
 */
function extractPathParams(path: string): string[] {
  const params: string[] = [];
  const regex = /:([a-zA-Z_][a-zA-Z0-9_]*)\??/g;
  let match;
  while ((match = regex.exec(path)) !== null) {
    params.push(match[1]!);
  }
  return params;
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

  // ==========================================================================
  // Vector-based tests - uncomment when extraction module is implemented
  // ==========================================================================

  // const vectors = loadVectors();

  // for (const vectorFile of vectors) {
  //   describe(vectorFile.name, () => {
  //     for (const testCase of vectorFile.cases) {
  //       it(testCase.name, () => {
  //         const sourceFile = parseSource(testCase.source);
  //         const classDecl = findClass(sourceFile);
  //         assert.ok(classDecl, "Class not found in source");

  //         const result = extractRouteConfig(sourceFile, classDecl);

  //         if (testCase.expected === null) {
  //           assert.strictEqual(result, null);
  //         } else {
  //           assert.ok(result);
  //           // Deep comparison of relevant fields
  //           assertRouteConfigMatches(result, testCase.expected);
  //         }
  //       });
  //     }
  //   });
  // }
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
          // Check for syntax errors
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
