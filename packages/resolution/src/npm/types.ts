/**
 * NPM Package Analysis Types
 *
 * Types specific to npm package analysis.
 * Shared analysis types (AnalysisResult, Confidence, etc.) are in extraction/types.ts.
 */

import type { BindingMode } from '../extraction/types.js';

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
// NPM-Specific Types
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
 * Simplified from ExtractedResource for readability.
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
  evidence: string;  // Simplified: just the kind
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
 * Simplified for readability.
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
