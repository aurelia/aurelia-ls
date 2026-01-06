/**
 * NPM Package Analysis Types
 *
 * Core types for extracting Aurelia resource semantics from npm packages.
 * Every analysis operation returns `AnalysisResult<T>` — never throws on
 * "can't analyze", instead reports gaps with actionable suggestions.
 */

import type { BindingMode } from '../extraction/types.js';

// =============================================================================
// Core Result Type
// =============================================================================

/**
 * Every analysis operation returns this wrapper.
 * Inspired by the Writer monad — carries both value and accumulated context (gaps).
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
 * Confidence in the extracted semantics.
 * Higher confidence = safer to trust for compilation decisions.
 */
export type Confidence =
  | 'exact'    // Manifest or explicit config — authoritative
  | 'high'     // Source/ES2022 analysis with decorators — very reliable
  | 'partial'  // Got some info, missing other parts
  | 'low'      // Convention inference only — best guess
  | 'manual';  // Couldn't analyze — user must provide

// =============================================================================
// Gap Reporting
// =============================================================================

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
 */
export type GapReason =
  // Import/resolution issues
  | { kind: 'unresolved-import'; path: string; reason: string }
  | { kind: 'circular-import'; cycle: string[] }
  | { kind: 'external-package'; packageName: string }

  // Dynamic patterns that can't be statically analyzed
  | { kind: 'dynamic-value'; expression: string }
  | { kind: 'function-return'; functionName: string }
  | { kind: 'computed-property'; expression: string }
  | { kind: 'spread-unknown'; spreadOf: string }

  // Control flow in register() bodies
  | { kind: 'conditional-registration'; condition: string }
  | { kind: 'loop-variable'; variable: string }

  // Package format limitations
  | { kind: 'legacy-decorators' }
  | { kind: 'no-source'; hasTypes: boolean }
  | { kind: 'minified-code' }
  | { kind: 'unsupported-format'; format: string };

// =============================================================================
// Extracted Semantics
// =============================================================================

/**
 * Result of analyzing a package.
 */
export interface PackageAnalysis {
  /** Package name from package.json */
  packageName: string;
  /** Package version */
  version: string;
  /** Extracted resources */
  resources: ExtractedResource[];
  /** Configuration exports (IRegistry objects) */
  configurations: ExtractedConfiguration[];
}

/**
 * A resource extracted from a package.
 */
export interface ExtractedResource {
  /** What kind of Aurelia resource */
  kind: ResourceKind;
  /** The name used in templates (e.g., 'tooltip', 'my-element') */
  name: string;
  /** Original class name in source */
  className: string;
  /** Extracted bindables */
  bindables: ExtractedBindable[];
  /** Aliases if any */
  aliases: string[];
  /** Where this was defined */
  source: ResourceSource;
  /** How we determined this is a resource */
  evidence: ResourceEvidence;
}

export type ResourceKind =
  | 'custom-element'
  | 'custom-attribute'
  | 'value-converter'
  | 'binding-behavior'
  | 'template-controller';

/**
 * Where the resource definition came from.
 */
export interface ResourceSource {
  /** File path relative to package root */
  file: string;
  /** Line number if available */
  line?: number;
  /** Whether this is source (.ts) or compiled (.js) */
  format: 'typescript' | 'javascript' | 'declaration';
}

/**
 * How we determined something is a resource.
 * Useful for diagnostics and confidence assessment.
 */
export type ResourceEvidence =
  | { kind: 'decorator'; decoratorName: string }
  | { kind: 'static-au'; }
  | { kind: 'convention'; suffix: string }
  | { kind: 'manifest'; }
  | { kind: 'explicit-config'; };

/**
 * An extracted bindable property.
 */
export interface ExtractedBindable {
  /** Property name */
  name: string;
  /** Attribute name if different (kebab-case) */
  attribute?: string;
  /** Binding mode if determinable */
  mode?: BindingMode;
  /** Whether this is the primary bindable */
  primary?: boolean;
  /** TypeScript type if available */
  type?: string;
  /** How we found this bindable */
  evidence: BindableEvidence;
}

export type BindableEvidence =
  | { kind: 'decorator'; hasOptions: boolean }
  | { kind: 'static-au'; }
  | { kind: 'convention'; }
  | { kind: 'manifest'; };

/**
 * A configuration export (IRegistry pattern).
 */
export interface ExtractedConfiguration {
  /** Export name (e.g., 'AureliaTableConfiguration') */
  exportName: string;
  /** Resources this configuration registers */
  registers: ConfigurationRegistration[];
  /** Whether this is a factory function result */
  isFactory: boolean;
  /** Source location */
  source: ResourceSource;
}

/**
 * A registration within a configuration.
 */
export interface ConfigurationRegistration {
  /** Reference to the resource (if resolved) */
  resource?: ExtractedResource;
  /** Original identifier in source */
  identifier: string;
  /** Whether we could fully resolve this */
  resolved: boolean;
}

// =============================================================================
// Analysis Options
// =============================================================================

/**
 * Options for package analysis.
 */
export interface AnalysisOptions {
  /** Prefer TypeScript source over compiled output */
  preferSource?: boolean;
  /** Include transitive dependencies */
  includeTransitive?: boolean;
  /** Maximum depth for transitive analysis */
  maxDepth?: number;
  /** Patterns to skip (e.g., internal packages) */
  exclude?: string[];
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Create a successful result with full confidence.
 */
export function success<T>(value: T): AnalysisResult<T> {
  return { value, confidence: 'exact', gaps: [] };
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
function compareConfidence(a: Confidence, b: Confidence): number {
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
