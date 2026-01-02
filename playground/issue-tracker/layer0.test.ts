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

// AOT pipeline imports
// Use compileAot from compiler directly - no SSR dependency needed for CSR-only AOT
import { compileAot, DEFAULT_SEMANTICS } from "@aurelia-ls/compiler";
import {
  transform,
  transformSimpleEntryPoint,
  transpileToJs,
  fixImportExtensions,
  deriveNamesFromPath,
} from "@aurelia-ls/transform";

// =============================================================================
// Configuration
// =============================================================================

const SRC_DIR = resolve(import.meta.dirname, "src");
const GOLDEN_DIR = resolve(import.meta.dirname, "golden");
const GENERATE_EXPECTED = process.env.GENERATE_EXPECTED === "1";

// Files to skip entirely
const SKIP_FILES = new Set(["main.ts"]);

// =============================================================================
// File Discovery
// =============================================================================

interface SourceFile {
  /** Path relative to SRC_DIR */
  relativePath: string;
  /** Absolute path */
  absolutePath: string;
  /** Whether this file has a paired .html template */
  hasTemplate: boolean;
  /** Path to paired template (if exists) */
  templatePath: string | null;
}

/**
 * Recursively finds all TypeScript files in the source directory.
 * Returns both component files (with templates) and pure modules (without).
 */
function findAllSourceFiles(dir: string = SRC_DIR, prefix: string = ""): SourceFile[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: SourceFile[] = [];

  for (const entry of entries) {
    const relativePath = prefix ? join(prefix, entry.name) : entry.name;
    const absolutePath = resolve(dir, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectories
      files.push(...findAllSourceFiles(absolutePath, relativePath));
    } else if (entry.name.endsWith(".ts")) {
      if (SKIP_FILES.has(entry.name)) continue;

      // Check for paired .html file
      const htmlFile = entry.name.replace(/\.ts$/, ".html");
      const htmlPath = resolve(dir, htmlFile);
      const hasTemplate = existsSync(htmlPath);

      files.push({
        relativePath,
        absolutePath,
        hasTemplate,
        templatePath: hasTemplate ? htmlPath : null,
      });
    }
  }

  return files;
}

// =============================================================================
// Compilation
// =============================================================================

/**
 * Compiles a component (TS + HTML) with AOT and returns the transformed source.
 * Uses compileAot from @aurelia-ls/compiler - SSR-agnostic, no instruction translation.
 */
function compileComponent(file: SourceFile): string {
  if (!file.templatePath) {
    throw new Error(`No template found for component: ${file.relativePath}`);
  }

  const source = readFileSync(file.absolutePath, "utf-8");
  const template = readFileSync(file.templatePath, "utf-8");

  const names = deriveNamesFromPath(file.absolutePath);

  // Compile template with AOT (SSR-agnostic - just serialized output)
  const aot = compileAot(template, {
    templatePath: file.templatePath,
    name: names.resourceName,
    semantics: DEFAULT_SEMANTICS,
  });

  // Transform TypeScript source to inject $au
  const result = transform({
    source,
    filePath: file.absolutePath,
    aot: aot.codeResult,
    resource: {
      kind: "custom-element",
      name: names.resourceName,
      className: names.className,
    },
    template: aot.template,
    nestedHtmlTree: aot.nestedHtmlTree,
    removeDecorators: true,
    includeComments: true,
  });

  return result.code;
}

/**
 * Compiles a pure TypeScript module (no template) - just reads the source.
 */
function compileModule(file: SourceFile): string {
  return readFileSync(file.absolutePath, "utf-8");
}

// =============================================================================
// Golden File I/O
// =============================================================================

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
 * Converts a .ts filename to .js
 */
function toJsFileName(tsFileName: string): string {
  return tsFileName.replace(/\.ts$/, ".js");
}

// =============================================================================
// Tests
// =============================================================================

describe("Layer 0: AOT Output", () => {
  const allFiles = findAllSourceFiles();
  const components = allFiles.filter((f) => f.hasTemplate);
  const modules = allFiles.filter((f) => !f.hasTemplate);

  if (allFiles.length === 0) {
    test.skip("no source files found", () => {});
    return;
  }

  // Log what we found
  if (GENERATE_EXPECTED) {
    console.log(`Found ${components.length} components:`, components.map((f) => f.relativePath));
    console.log(`Found ${modules.length} modules:`, modules.map((f) => f.relativePath));
  }

  // Test components (TS + HTML → transformed TS with $au)
  for (const file of components) {
    const names = deriveNamesFromPath(file.absolutePath);
    const jsFilePath = toJsFileName(file.relativePath);

    test(`${names.resourceName} AOT output matches golden`, () => {
      // Compile the component (produces TypeScript with $au)
      const tsOutput = compileComponent(file);
      // Transpile to JavaScript and fix import extensions
      const jsOutput = fixImportExtensions(transpileToJs(tsOutput, { sourcefile: file.relativePath }));

      if (GENERATE_EXPECTED) {
        writeGolden(jsFilePath, jsOutput);
        console.log(`  Generated: golden/${jsFilePath}`);
        return;
      }

      const expectedOutput = readGolden(jsFilePath);
      if (expectedOutput === null) {
        throw new Error(
          `No golden file exists for ${jsFilePath}.\n` +
          `Run with GENERATE_EXPECTED=1 to create it.`
        );
      }

      expect(jsOutput).toBe(expectedOutput);
    });
  }

  // Test pure modules (TS → JS, no AOT transform)
  for (const file of modules) {
    const names = deriveNamesFromPath(file.absolutePath);
    const jsFilePath = toJsFileName(file.relativePath);

    test(`${names.resourceName} module output matches golden`, () => {
      // Just transpile, no AOT transform needed
      const tsSource = compileModule(file);
      const jsOutput = fixImportExtensions(transpileToJs(tsSource, { sourcefile: file.relativePath }));

      if (GENERATE_EXPECTED) {
        writeGolden(jsFilePath, jsOutput);
        console.log(`  Generated: golden/${jsFilePath}`);
        return;
      }

      const expectedOutput = readGolden(jsFilePath);
      if (expectedOutput === null) {
        throw new Error(
          `No golden file exists for ${jsFilePath}.\n` +
          `Run with GENERATE_EXPECTED=1 to create it.`
        );
      }

      expect(jsOutput).toBe(expectedOutput);
    });
  }

  // Entry point transformation
  test("main.js entry point matches golden", () => {
    const mainPath = resolve(SRC_DIR, "main.ts");
    if (!existsSync(mainPath)) {
      return;
    }

    const source = readFileSync(mainPath, "utf-8");
    const result = transformSimpleEntryPoint(source, mainPath);
    const jsOutput = fixImportExtensions(transpileToJs(result.code, { sourcefile: "main.ts" }));

    if (GENERATE_EXPECTED) {
      writeGolden("main.js", jsOutput);
      console.log(`  Generated: golden/main.js`);
      return;
    }

    const expectedOutput = readGolden("main.js");
    if (expectedOutput === null) {
      throw new Error(`No golden file exists for main.js.`);
    }

    expect(jsOutput).toBe(expectedOutput);
  });

  // Copy index.html for a runnable golden
  test("index.html copied to golden", () => {
    const srcIndex = resolve(import.meta.dirname, "index.html");
    if (!existsSync(srcIndex)) {
      return;
    }

    if (GENERATE_EXPECTED) {
      const html = readFileSync(srcIndex, "utf-8");
      const adjustedHtml = html.replace(/src\/main\.ts/g, "main.js");
      writeGolden("index.html", adjustedHtml);
      console.log(`  Generated: golden/index.html`);
    }
  });

  if (GENERATE_EXPECTED) {
    test("golden files generated", () => {
      console.log(`\nGolden files written to: ${GOLDEN_DIR}`);
      console.log(`Components: ${components.length}, Modules: ${modules.length}`);
      console.log(`\nTo serve the golden output:`);
      console.log(`  cd ${GOLDEN_DIR} && npx vite`);
    });
  }
});
