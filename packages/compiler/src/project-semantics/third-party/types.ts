/**
 * Third-party resource configuration types.
 *
 * These types define how third-party npm packages expose Aurelia resources
 * for both the Vite plugin and the semantic workspace (LSP).
 */

import type { ResourceCollections, CatalogConfidence } from "../compiler.js";
import type { AnalysisGap } from "../npm/types.js";

// ============================================================================
// Configuration types
// ============================================================================

/**
 * Policy for merging third-party resources into the resolution artifacts.
 *
 * | Policy | ResourceGraph behavior |
 * |--------|------------------------|
 * | `root-scope` | Merge into root scope (default, fast) |
 * | `semantics` | Rebuild semantics only, keep graph |
 * | `rebuild-graph` | Full graph rebuild |
 */
export type ThirdPartyPolicy = "root-scope" | "rebuild-graph" | "semantics";

/** Package spec with optional source preference. */
export interface ThirdPartyPackageSpec {
  path: string;
  preferSource?: boolean;
}

/** Explicit resource declarations for packages without metadata. */
export interface ExplicitResourceConfig {
  elements?: Record<string, ExplicitElementConfig>;
  attributes?: Record<string, ExplicitAttributeConfig>;
  valueConverters?: string[];
  bindingBehaviors?: string[];
}

export type ExplicitBindingModeConfig = "one-time" | "to-view" | "from-view" | "two-way";

export interface ExplicitBindableConfig {
  property?: string;
  attribute?: string;
  mode?: ExplicitBindingModeConfig;
  primary?: boolean;
  type?: string;
  doc?: string;
}

export interface ExplicitElementConfig {
  bindables?: Record<string, ExplicitBindableConfig>;
  containerless?: boolean;
  shadowOptions?: { mode: "open" | "closed" } | null;
}

export interface ExplicitAttributeConfig {
  bindables?: Record<string, ExplicitBindableConfig>;
  isTemplateController?: boolean;
  noMultiBindings?: boolean;
}

/**
 * Third-party resource options.
 *
 * Used by both the Vite plugin and the semantic workspace.
 */
export interface ThirdPartyOptions {
  /** Auto-scan node_modules for Aurelia packages. */
  scan?: boolean;
  /** Explicit packages to analyze. */
  packages?: Array<string | ThirdPartyPackageSpec>;
  /** Manual resource declarations. */
  resources?: ExplicitResourceConfig;
  /** Merge policy. @default "root-scope" */
  policy?: ThirdPartyPolicy;
}

// ============================================================================
// Resolution result types
// ============================================================================

/** Result of resolving third-party resources. */
export interface ThirdPartyDiscoveryResult {
  resources: Partial<ResourceCollections>;
  gaps: AnalysisGap[];
  confidence?: CatalogConfidence;
}

/** Resolved package specification with path and preference. */
export interface ResolvedPackageSpec {
  name: string | null;
  path: string;
  preferSource: boolean;
}

/** Logger interface for resolution output. */
export interface ThirdPartyLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}
