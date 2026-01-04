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
import { resolve, basename, dirname, join } from "node:path";
import { transformSync } from "esbuild";

// AOT pipeline imports
// Use compileAot from compiler directly - no SSR dependency needed for CSR-only AOT
import { compileAot, DEFAULT_SEMANTICS } from "@aurelia-ls/compiler";
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
 * Recursively finds all TypeScript component files that have a paired .html template.
 * Returns paths relative to SRC_DIR (e.g., "my-app.ts", "pages/home.ts").
 */
function findComponentFiles(dir: string = SRC_DIR, prefix: string = ""): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const components: string[] = [];

  for (const entry of entries) {
    const relativePath = prefix ? join(prefix, entry.name) : entry.name;

    if (entry.isDirectory()) {
      // Recurse into subdirectories
      components.push(...findComponentFiles(resolve(dir, entry.name), relativePath));
    } else if (entry.name.endsWith(".ts")) {
      if (SKIP_FILES.has(entry.name)) continue;

      // Check for paired .html file
      const htmlFile = entry.name.replace(/\.ts$/, ".html");
      const htmlPath = resolve(dir, htmlFile);
      if (existsSync(htmlPath)) {
        components.push(relativePath);
      }
    }
  }

  return components;
}

/**
 * Derives the class name from a component file name.
 * my-app.ts -> MyApp
 * pages/home.ts -> Home
 */
function deriveClassName(filePath: string): string {
  // Get just the filename without path or extension
  const baseName = basename(filePath).replace(/\.ts$/, "");
  return baseName
    .split("-")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Derives the resource name from a component file name.
 * my-app.ts -> my-app
 * pages/home.ts -> home
 */
function deriveResourceName(filePath: string): string {
  return basename(filePath).replace(/\.ts$/, "");
}

/**
 * Fixes TypeScript/JavaScript import paths to use .js extension.
 * Converts: import { X } from "./foo" -> import { X } from "./foo.js"
 */
function fixImportExtensions(code: string): string {
  // Match import statements with relative paths that don't have extensions
  return code.replace(
    /(from\s+["'])(\.[^"']+)(["'])/g,
    (match, prefix, path, suffix) => {
      // Skip if already has extension
      if (path.endsWith(".js") || path.endsWith(".ts") || path.endsWith(".json")) {
        return match;
      }
      return `${prefix}${path}.js${suffix}`;
    }
  );
}

/**
 * Compiles a component with AOT and returns the transformed TypeScript source.
 * Uses compileAot from @aurelia-ls/compiler - SSR-agnostic, no instruction translation.
 */
function compileComponent(fileName: string): string {
  const tsPath = resolve(SRC_DIR, fileName);
  const htmlPath = tsPath.replace(/\.ts$/, ".html");

  const source = readFileSync(tsPath, "utf-8");
  const template = readFileSync(htmlPath, "utf-8");

  const className = deriveClassName(fileName);
  const resourceName = deriveResourceName(fileName);

  // Compile template with AOT (SSR-agnostic - just serialized output)
  const aot = compileAot(template, {
    templatePath: htmlPath,
    name: resourceName,
    semantics: DEFAULT_SEMANTICS,
  });

  // Transform TypeScript source to inject $au
  const result = transform({
    source,
    filePath: tsPath,
    aot: aot.codeResult,
    resource: {
      kind: "custom-element",
      name: resourceName,
      className,
    },
    template: aot.template,
    nestedHtmlTree: aot.nestedHtmlTree,
    removeDecorators: true,
    includeComments: true,
  });

  return result.code;
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
 * Writes a golden file, creating subdirectories as needed.
 */
function writeGolden(filePath: string, content: string): void {
  const goldenPath = resolve(GOLDEN_DIR, filePath);
  const goldenDir = dirname(goldenPath);
  if (!existsSync(goldenDir)) {
    mkdirSync(goldenDir, { recursive: true });
  }
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

  for (const filePath of components) {
    const resourceName = deriveResourceName(filePath);
    const jsFilePath = toJsFileName(filePath);

    test(`${resourceName} AOT output matches golden`, () => {
      // Compile the component (produces TypeScript with $au)
      const tsOutput = compileComponent(filePath);
      // Transpile to JavaScript and fix import extensions
      const jsOutput = fixImportExtensions(transpileToJs(tsOutput, filePath));

      if (GENERATE_EXPECTED) {
        // Generate mode: write the output as the new golden
        writeGolden(jsFilePath, jsOutput);
        console.log(`  Generated: golden/${jsFilePath}`);
        return;
      }

      // Comparison mode: read golden and compare
      const expectedOutput = readGolden(jsFilePath);

      if (expectedOutput === null) {
        // No golden exists yet - fail with helpful message
        throw new Error(
          `No golden file exists for ${jsFilePath}.\n` +
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
    // Transpile to JavaScript and fix import extensions
    const jsOutput = fixImportExtensions(transpileToJs(result.code, "main.ts"));

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
