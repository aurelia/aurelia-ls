/**
 * NPM Package Analysis Types
 *
 * Types for extracting Aurelia resources from npm packages.
 */

import type { NormalizedPath } from '@aurelia-ls/compiler';
import type { ResourceAnnotation } from '../annotation.js';

// Re-export shared analysis types from extraction
export type {
  AnalysisResult,
  Confidence,
  AnalysisGap,
  GapLocation,
  GapReason,
} from '../extraction/types.js';

export {
  success,
  partial,
  combine,
  compareConfidence,
  gap,
  highConfidence,
} from '../extraction/types.js';

// =============================================================================
// NPM Package Types
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
  resources: ResourceAnnotation[];
  /** Configuration exports (IRegistry objects) */
  configurations: ExtractedConfiguration[];
}

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
  source: SourceLocation;
}

/**
 * A registration within a configuration.
 */
export interface ConfigurationRegistration {
  /** Reference to the resource (if resolved) */
  resource?: ResourceAnnotation;
  /** Original identifier in source */
  identifier: string;
  /** Whether we could fully resolve this */
  resolved: boolean;
}

/**
 * Source location for npm package analysis.
 */
export interface SourceLocation {
  /** File path relative to package root */
  file: string;
  /** Line number if available */
  line?: number;
  /** Source format */
  format: 'typescript' | 'javascript' | 'declaration';
}

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
// Inspection Types (Human-Readable Output)
// =============================================================================

/**
 * Human-inspectable result of package analysis.
 *
 * JSON-serializable format designed for:
 * - CLI output inspection
 * - Debugging extraction issues
 * - Validating compiler behavior
 * - Graph visualization
 */
export interface InspectionResult {
  /** Package name from package.json */
  package: string;
  /** Package version */
  version: string;
  /** Overall confidence level */
  confidence: string;

  /** Extracted resources with full details */
  resources: InspectedResource[];

  /** Dependency graph structure */
  graph: InspectionGraph;

  /** Configuration exports found */
  configurations: InspectedConfiguration[];

  /** Analysis gaps with suggestions */
  gaps: InspectedGap[];

  /** Analysis metadata */
  meta: {
    /** Which extraction strategy was used */
    primaryStrategy: 'typescript' | 'es2022' | 'none';
    /** Package paths analyzed */
    analyzedPaths: string[];
    /** Analysis timestamp */
    timestamp: string;
  };
}

/**
 * Resource in inspection output.
 */
export interface InspectedResource {
  kind: string;
  name: string;
  className: string;
  aliases: string[];
  bindables: InspectedBindable[];
  dependencies: string[];  // classNames from static dependencies
  source: {
    file: string;
    line?: number;
    format: string;
  };
  evidence: string;  // Simplified: just the pattern
}

/**
 * Bindable in inspection output.
 */
export interface InspectedBindable {
  name: string;
  attribute?: string;
  mode?: string;
  primary?: boolean;
}

/**
 * Configuration in inspection output.
 */
export interface InspectedConfiguration {
  exportName: string;
  isFactory: boolean;
  registers: string[];  // identifiers
  source: {
    file: string;
    line?: number;
  };
}

/**
 * Dependency graph for visualization.
 */
export interface InspectionGraph {
  /** All resource class names */
  nodes: string[];
  /** Dependency relationships */
  edges: InspectionEdge[];
}

/**
 * Edge in the dependency graph.
 */
export interface InspectionEdge {
  from: string;  // className
  to: string;    // className
  kind: 'dependency' | 'configuration-registers';
}

/**
 * Gap in inspection output.
 */
export interface InspectedGap {
  what: string;
  why: string;  // Simplified reason
  where?: {
    file: string;
    line?: number;
    snippet?: string;
  };
  suggestion: string;
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type { ResourceAnnotation, BindableAnnotation, ResourceKind } from '../annotation.js';
