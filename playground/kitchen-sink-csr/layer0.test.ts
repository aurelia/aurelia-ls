/**
 * Layer 0: AOT Output Test
 *
 * Tests that the AOT compiler produces correct transformed TypeScript output.
 * This catches compiler bugs before bundling obscures them.
 *
 * USAGE:
 *   npm test -- --test-name-pattern "Layer 0"
 *   GENERATE_EXPECTED=1 npm test -- --test-name-pattern "Layer 0"
 *
 * The test compiles src/*.ts files with AOT and compares the output to golden/*.ts.
 * Set GENERATE_EXPECTED=1 to update golden files when changes are intentional.
 */

import { describe, test, expect } from "vitest";
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, basename, dirname } from "node:path";
import { transformSync } from "esbuild";

// AOT pipeline imports
import { compileWithAot, DEFAULT_SEMANTICS } from "@aurelia-ls/ssr";
import { transform, transformSimpleEntryPoint } from "@aurelia-ls/transform";

// =============================================================================
// Configuration
// =============================================================================

const SRC_DIR = resolve(import.meta.dirname, "src");
const GOLDEN_DIR = resolve(import.meta.dirname, "golden");
const GENERATE_EXPECTED = process.env.GENERATE_EXPECTED === "1";

// Files to skip (entry points, non-component files)
const SKIP_FILES = new Set(["main.ts"]);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Finds all TypeScript component files in src/ that have a paired .html template.
 */
function findComponentFiles(): string[] {
  const files = readdirSync(SRC_DIR).filter(f => f.endsWith(".ts"));
  const components: string[] = [];

  for (const file of files) {
    if (SKIP_FILES.has(file)) continue;

    // Check for paired .html file
    const htmlFile = file.replace(/\.ts$/, ".html");
    const htmlPath = resolve(SRC_DIR, htmlFile);
    if (existsSync(htmlPath)) {
      components.push(file);
    }
  }

  return components;
}

/**
 * Derives the class name from a component file name.
 * my-app.ts -> MyApp
 */
function deriveClassName(fileName: string): string {
  const baseName = fileName.replace(/\.ts$/, "");
  return baseName
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Derives the resource name from a component file name.
 * my-app.ts -> my-app
 */
function deriveResourceName(fileName: string): string {
  return fileName.replace(/\.ts$/, "");
}

/**
 * Compiles a component with AOT and returns the transformed TypeScript source.
 */
function compileComponent(fileName: string): string {
  const tsPath = resolve(SRC_DIR, fileName);
  const htmlPath = tsPath.replace(/\.ts$/, ".html");

  const source = readFileSync(tsPath, "utf-8");
  const template = readFileSync(htmlPath, "utf-8");

  const className = deriveClassName(fileName);
  const resourceName = deriveResourceName(fileName);

  // Compile template with AOT
  const aot = compileWithAot(template, {
    templatePath: htmlPath,
    name: resourceName,
    semantics: DEFAULT_SEMANTICS,
  });

  // Transform TypeScript source to inject $au
  const result = transform({
    source,
    filePath: tsPath,
    aot: aot.raw.codeResult,
    resource: {
      kind: "custom-element",
      name: resourceName,
      className,
    },
    template: aot.template,
    nestedHtmlTree: aot.raw.nestedHtmlTree,
    removeDecorators: true,
    includeComments: true,
  });

  return result.code;
}

/**
 * Ensures the golden directory exists.
 */
function ensureGoldenDir(): void {
  if (!existsSync(GOLDEN_DIR)) {
    mkdirSync(GOLDEN_DIR, { recursive: true });
  }
}

/**
 * Reads a golden file, or returns null if it doesn't exist.
 */
function readGolden(fileName: string): string | null {
  const goldenPath = resolve(GOLDEN_DIR, fileName);
  if (!existsSync(goldenPath)) {
    return null;
  }
  return readFileSync(goldenPath, "utf-8");
}

/**
 * Writes a golden file.
 */
function writeGolden(fileName: string, content: string): void {
  ensureGoldenDir();
  const goldenPath = resolve(GOLDEN_DIR, fileName);
  writeFileSync(goldenPath, content, "utf-8");
}

/**
 * Transpiles TypeScript to JavaScript using esbuild.
 */
function transpileToJs(tsCode: string, fileName: string): string {
  const result = transformSync(tsCode, {
    loader: "ts",
    format: "esm",
    target: "es2022",
    sourcefile: fileName,
  });
  return result.code;
}

/**
 * Converts a .ts filename to .js
 */
function toJsFileName(tsFileName: string): string {
  return tsFileName.replace(/\.ts$/, ".js");
}

// =============================================================================
// Tests
// =============================================================================

describe("Layer 0: AOT Output", () => {
  const components = findComponentFiles();

  if (components.length === 0) {
    test.skip("no component files found", () => {});
    return;
  }

  for (const fileName of components) {
    const resourceName = deriveResourceName(fileName);
    const jsFileName = toJsFileName(fileName);

    test(`${resourceName} AOT output matches golden`, () => {
      // Compile the component (produces TypeScript with $au)
      const tsOutput = compileComponent(fileName);
      // Transpile to JavaScript
      const jsOutput = transpileToJs(tsOutput, fileName);

      if (GENERATE_EXPECTED) {
        // Generate mode: write the output as the new golden
        writeGolden(jsFileName, jsOutput);
        console.log(`  Generated: golden/${jsFileName}`);
        return;
      }

      // Comparison mode: read golden and compare
      const expectedOutput = readGolden(jsFileName);

      if (expectedOutput === null) {
        // No golden exists yet - fail with helpful message
        throw new Error(
          `No golden file exists for ${jsFileName}.\n` +
          `Run with GENERATE_EXPECTED=1 to create it:\n` +
          `  GENERATE_EXPECTED=1 npm test -- --test-name-pattern "Layer 0"`
        );
      }

      // Compare output to golden
      expect(jsOutput).toBe(expectedOutput);
    });
  }

  // Entry point transformation
  test("main.js entry point matches golden", () => {
    const mainPath = resolve(SRC_DIR, "main.ts");
    if (!existsSync(mainPath)) {
      return; // No main.ts, skip
    }

    const source = readFileSync(mainPath, "utf-8");
    const result = transformSimpleEntryPoint(source, mainPath);
    // Transpile to JavaScript and fix imports to use .js
    let jsOutput = transpileToJs(result.code, "main.ts");
    // Fix import to reference .js file
    jsOutput = jsOutput.replace(/from "\.\/my-app"/g, 'from "./my-app.js"');

    if (GENERATE_EXPECTED) {
      writeGolden("main.js", jsOutput);
      console.log(`  Generated: golden/main.js`);
      return;
    }

    const expectedOutput = readGolden("main.js");
    if (expectedOutput === null) {
      throw new Error(
        `No golden file exists for main.js.\n` +
        `Run with GENERATE_EXPECTED=1 to create it.`
      );
    }

    expect(jsOutput).toBe(expectedOutput);
  });

  // Copy index.html for a runnable golden
  test("index.html copied to golden", () => {
    const srcIndex = resolve(import.meta.dirname, "index.html");
    if (!existsSync(srcIndex)) {
      return; // No index.html, skip
    }

    if (GENERATE_EXPECTED) {
      const html = readFileSync(srcIndex, "utf-8");
      // Adjust paths to work from golden/ directory (use .js)
      const adjustedHtml = html.replace(/src\/main\.ts/g, "main.js");
      writeGolden("index.html", adjustedHtml);
      console.log(`  Generated: golden/index.html`);
    }
  });

  if (GENERATE_EXPECTED) {
    test("golden files generated", () => {
      console.log(`\nGolden files written to: ${GOLDEN_DIR}`);
      console.log(`Components processed: ${components.length}`);
      console.log(`\nTo serve the golden output:`);
      console.log(`  cd ${GOLDEN_DIR} && npx vite`);
    });
  }
});
