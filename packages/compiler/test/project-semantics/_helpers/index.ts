/**
 * Project-Semantics Test Helpers
 *
 * Shared utilities for compiler project-semantics tests.
 */

// TypeScript program creation
export {
  createProgramFromApp,
  getTestAppPath,
  filterFactsByPathPattern,
} from "./ts-program.js";

export {
  createProgramFromMemory,
} from "./inline-program.js";

// NPM analysis cache helpers (test-only)
export {
  analyzePackageCached,
  inspectCached,
  clearNpmAnalysisCache,
} from "./npm-analysis-cache.js";
