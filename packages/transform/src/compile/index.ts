/**
 * High-level compilation utilities for Aurelia components and modules.
 *
 * Provides utilities for:
 * - Deriving resource/class names from file paths
 * - Transpiling TypeScript to JavaScript
 * - Fixing ESM import extensions
 *
 * Used by build tools (vite plugin) and test infrastructure.
 */

export {
  compileModule,
  transpileToJs,
  fixImportExtensions,
  deriveNamesFromPath,
} from "./compile.js";

export type {
  CompileModuleOptions,
  CompileModuleResult,
  TranspileOptions,
  DerivedNames,
} from "./compile.js";
