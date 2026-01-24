/**
 * Analysis Result Types
 *
 * Shared types for analysis operations across the resolution package.
 * These are the stable, non-deprecated types from the original file.
 *
 * For file extraction types, use:
 * - FileFacts, ImportDeclaration, ExportDeclaration from extraction/file-facts.ts
 * - ClassValue, AnalyzableValue from analysis/value/types.ts
 * - SiblingFile from project/types.ts
 */

import type { NormalizedPath } from '../compiler.js';

// Re-export BindingMode for consumers of this module
export type { BindingMode } from '../compiler.js';

// =============================================================================
// Analysis Result Types
// =============================================================================

/**
 * Universal wrapper for analysis operations.
 * Carries both value and accumulated context (gaps).
 *
 * Inspired by the Writer monad — never throws on "can't analyze",
 * instead reports gaps with actionable suggestions.
 */
export interface AnalysisResult<T> {
  /** The extracted value, possibly partial if gaps exist */
  value: T;
  /** Confidence level of the extraction */
  confidence: Confidence;
  /** What we couldn't analyze and why */
  gaps: AnalysisGap[];
}

/**
 * Confidence in extracted semantics.
 * Higher confidence = safer to trust for compilation decisions.
 */
export type Confidence =
  | 'exact'    // Manifest or explicit config — authoritative
  | 'high'     // Source analysis with decorators — very reliable
  | 'partial'  // Got some info, missing other parts
  | 'low'      // Convention inference only — best guess
  | 'manual';  // Couldn't analyze — user must provide

/**
 * Describes something we couldn't fully analyze.
 * Designed for Elm-style error messages with actionable suggestions.
 */
export interface AnalysisGap {
  /** What we couldn't determine (e.g., "bindables for tooltip") */
  what: string;
  /** Structured reason for the gap */
  why: GapReason;
  /** Where in source the problem originates */
  where?: GapLocation;
  /** Actionable suggestion for the user */
  suggestion: string;
}

/**
 * Location of a gap — could be in source, compiled output, or package.json.
 */
export interface GapLocation {
  file: string;
  line?: number;
  column?: number;
  /** Code snippet showing the problematic pattern */
  snippet?: string;
}

/**
 * Structured reasons why analysis failed.
 * Each kind enables targeted diagnostic messages.
 *
 * Categories:
 * - Package structure: Issues with a package being analyzed
 * - Import/resolution: Issues resolving imports within code
 * - Dynamic patterns: Code that can't be statically analyzed
 * - Control flow: Complex control flow in registration code
 * - Package format: Limitations of the compiled output format
 */
export type GapReason =
  // Package structure issues (package scanning domain)
  | { kind: 'package-not-found'; packagePath: string }
  | { kind: 'invalid-package-json'; path: string; parseError: string }
  | { kind: 'missing-package-field'; field: 'name' | 'version' | 'main' | 'exports' | string }
  | { kind: 'entry-point-not-found'; specifier: string; resolvedPath: string }
  | { kind: 'no-entry-points' }
  | { kind: 'complex-exports'; reason: string }

  // Monorepo resolution issues
  | { kind: 'workspace-no-source-dir'; packageName: string; packagePath: string }
  | { kind: 'workspace-entry-not-found'; packageName: string; srcDir: string; subpath: string | null }

  // Import/resolution issues (within code)
  | { kind: 'unresolved-import'; path: string; reason: string }
  | { kind: 'circular-import'; cycle: string[] }
  | { kind: 'external-package'; packageName: string }

  // Dynamic patterns that can't be statically analyzed
  | { kind: 'dynamic-value'; expression: string }
  | { kind: 'function-return'; functionName: string }
  | { kind: 'computed-property'; expression: string }
  | { kind: 'spread-unknown'; spreadOf: string }

  // Unsupported code patterns
  | { kind: 'unsupported-pattern'; path: NormalizedPath; reason: string }

  // Control flow in register() bodies
  | { kind: 'conditional-registration'; condition: string }
  | { kind: 'loop-variable'; variable: string }

  // Package format limitations
  | { kind: 'legacy-decorators' }
  | { kind: 'no-source'; hasTypes: boolean }
  | { kind: 'minified-code' }
  | { kind: 'unsupported-format'; format: string }

  // Resource inference issues
  | { kind: 'invalid-resource-name'; className: string; reason: string }

  // Cache failures (non-semantic, recovery required)
  | { kind: 'cache-corrupt'; path: string; message: string }

  // Analysis failures (fatal for the current stage)
  | { kind: 'analysis-failed'; stage: 'partial-evaluation' | 'npm-analysis'; message: string }

  // General parsing/processing errors
  | { kind: 'parse-error'; message: string };

// =============================================================================
// Analysis Result Utilities
// =============================================================================

/**
 * Create a successful result with full confidence.
 */
export function success<T>(value: T): AnalysisResult<T> {
  return { value, confidence: 'exact', gaps: [] };
}

/**
 * Create a high-confidence result (e.g., from decorators).
 */
export function highConfidence<T>(value: T): AnalysisResult<T> {
  return { value, confidence: 'high', gaps: [] };
}

/**
 * Create a partial result with gaps.
 */
export function partial<T>(
  value: T,
  confidence: Confidence,
  gaps: AnalysisGap[]
): AnalysisResult<T> {
  return { value, confidence, gaps };
}

/**
 * Combine multiple results, merging gaps and taking lowest confidence.
 */
export function combine<T>(
  results: AnalysisResult<T>[],
  combiner: (values: T[]) => T
): AnalysisResult<T> {
  const values = results.map(r => r.value);
  const allGaps = results.flatMap(r => r.gaps);
  const lowestConfidence = results.reduce(
    (lowest, r) => compareConfidence(r.confidence, lowest) < 0 ? r.confidence : lowest,
    'exact' as Confidence
  );

  return {
    value: combiner(values),
    confidence: lowestConfidence,
    gaps: allGaps,
  };
}

/**
 * Compare confidence levels. Returns negative if a < b.
 */
export function compareConfidence(a: Confidence, b: Confidence): number {
  const order: Confidence[] = ['manual', 'low', 'partial', 'high', 'exact'];
  return order.indexOf(a) - order.indexOf(b);
}

/**
 * Create a gap with a suggestion.
 */
export function gap(
  what: string,
  why: GapReason,
  suggestion: string,
  where?: GapLocation
): AnalysisGap {
  return { what, why, suggestion, where };
}
