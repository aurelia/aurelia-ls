/**
 * High-level compilation utilities for Aurelia components and modules.
 *
 * Provides utilities for:
 * - Deriving resource/class names from file paths
 * - Transpiling TypeScript to JavaScript
 * - Fixing ESM import extensions
 *
 * Note: Component compilation (AOT + transform) is intentionally NOT included
 * here to avoid circular dependencies with @aurelia-ls/ssr. The layer0 tests
 * and vite plugin handle this orchestration.
 */

import { readFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";

// =============================================================================
// Types
// =============================================================================

/** Names derived from a file path using Aurelia conventions */
export interface DerivedNames {
  /** Resource name (kebab-case): "my-app", "status-badge" */
  resourceName: string;
  /** Class name (PascalCase): "MyApp", "StatusBadge" */
  className: string;
  /** Template path if it exists */
  templatePath: string | null;
  /** Whether this file has a paired template */
  hasTemplate: boolean;
}

/** Options for compiling a pure TypeScript module (no template) */
export interface CompileModuleOptions {
  /** Path to the TypeScript source file */
  tsPath: string;
  /** Source code (if already loaded) */
  source?: string;
}

/** Result of compiling a module */
export interface CompileModuleResult {
  /** Original TypeScript code (unchanged) */
  code: string;
}

/** Options for transpiling TypeScript to JavaScript */
export interface TranspileOptions {
  /** Target ES version */
  target?: string;
  /** Output format */
  format?: "esm" | "cjs";
  /** Source file name for error messages */
  sourcefile?: string;
}

// =============================================================================
// Name Derivation
// =============================================================================

/**
 * Derives resource name and class name from a file path.
 *
 * @example
 * deriveNamesFromPath("src/my-app.ts")
 * // { resourceName: "my-app", className: "MyApp", ... }
 *
 * deriveNamesFromPath("src/components/status-badge.ts")
 * // { resourceName: "status-badge", className: "StatusBadge", ... }
 */
export function deriveNamesFromPath(tsPath: string): DerivedNames {
  const baseName = basename(tsPath).replace(/\.ts$/, "");

  // Resource name is kebab-case (the file name without extension)
  const resourceName = baseName;

  // Class name is PascalCase
  const className = baseName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  // Check for paired template
  const dir = dirname(tsPath);
  const templatePath = join(dir, `${baseName}.html`);
  const hasTemplate = existsSync(templatePath);

  return {
    resourceName,
    className,
    templatePath: hasTemplate ? templatePath : null,
    hasTemplate,
  };
}

// =============================================================================
// Module Compilation (Pure TS)
// =============================================================================

/**
 * "Compiles" a pure TypeScript module (no template).
 *
 * For modules without templates, we just return the source as-is.
 * The actual transpilation (TS → JS) is done separately.
 *
 * @example
 * const result = compileModule({ tsPath: "src/domain/types.ts" });
 * console.log(result.code); // Original TS source
 */
export function compileModule(options: CompileModuleOptions): CompileModuleResult {
  const source = options.source ?? readFileSync(options.tsPath, "utf-8");
  return { code: source };
}

// =============================================================================
// Transpilation Utilities
// =============================================================================

/**
 * Transpiles TypeScript to JavaScript using esbuild.
 *
 * @example
 * const js = transpileToJs(tsCode, { target: "es2022" });
 */
export function transpileToJs(
  tsCode: string,
  options: TranspileOptions = {}
): string {
  // Dynamic import to avoid hard dependency on esbuild
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { transformSync } = require("esbuild") as typeof import("esbuild");

  const result = transformSync(tsCode, {
    loader: "ts",
    format: options.format ?? "esm",
    target: options.target ?? "es2022",
    sourcefile: options.sourcefile,
  });

  return result.code;
}

/**
 * Fixes import paths to use .js extension for ESM compatibility.
 *
 * Converts: import { X } from "./foo" → import { X } from "./foo.js"
 *
 * @example
 * const fixed = fixImportExtensions('import { X } from "./foo"');
 * // 'import { X } from "./foo.js"'
 */
export function fixImportExtensions(code: string): string {
  return code.replace(
    /(from\s+["'])(\.[^"']+)(["'])/g,
    (match, prefix: string, path: string, suffix: string) => {
      // Skip if already has extension
      if (path.endsWith(".js") || path.endsWith(".ts") || path.endsWith(".json")) {
        return match;
      }
      return `${prefix}${path}.js${suffix}`;
    }
  );
}
