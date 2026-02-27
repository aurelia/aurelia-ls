/**
 * Directory Conventions
 *
 * Aurelia projects can use directory structure for resource scoping:
 * - `src/resources/` → global resources
 * - `src/components/` → component library
 * - `src/pages/` → route components
 *
 * This module provides matching and configuration for directory conventions.
 */

import type {
  DirectoryConvention,
  DirectoryMatch,
  DirectoryScope,
} from "./types.js";
import { debug } from '../compiler.js';

// ============================================================================
// Default Conventions
// ============================================================================

/**
 * Default directory conventions.
 *
 * These can be overridden or extended via configuration.
 */
export const DEFAULT_CONVENTIONS: readonly DirectoryConvention[] = [
  {
    pattern: "**/resources/**",
    description: "Global resources directory (elements, attributes, converters)",
    scope: { kind: "global" },
    priority: 10,
  },
  {
    pattern: "**/shared/**",
    description: "Shared components directory",
    scope: { kind: "global" },
    priority: 5,
  },
  {
    pattern: "**/pages/**",
    description: "Page components (router-managed)",
    scope: { kind: "router" },
    priority: 8,
  },
  {
    pattern: "**/views/**",
    description: "View components (router-managed)",
    scope: { kind: "router" },
    priority: 7,
  },
  {
    pattern: "**/routes/**",
    description: "Route components (router-managed)",
    scope: { kind: "router" },
    priority: 9,
  },
];

// ============================================================================
// Convention Matching
// ============================================================================

/**
 * Match a file path against directory conventions.
 *
 * Returns the highest-priority matching convention, or undefined if no match.
 *
 * @param filePath - Absolute path to the file
 * @param projectRoot - Project root directory
 * @param conventions - Conventions to match against
 * @returns Directory match, or undefined
 *
 * @example
 * ```typescript
 * const match = matchDirectoryConventions(
 *   '/app/src/resources/my-element.ts',
 *   '/app',
 *   DEFAULT_CONVENTIONS,
 * );
 * // → { convention: {...}, relativePath: 'resources/my-element.ts', scope: { kind: 'global' } }
 * ```
 */
export function matchDirectoryConventions(
  filePath: string,
  projectRoot: string,
  conventions: readonly DirectoryConvention[],
): DirectoryMatch | undefined {
  // Normalize paths
  const normalizedPath = filePath.replace(/\\/g, "/");
  const normalizedRoot = projectRoot.replace(/\\/g, "/").replace(/\/$/, "");

  // Get relative path
  if (!normalizedPath.startsWith(normalizedRoot)) {
    debug.project("convention.match.skip", {
      reason: "outside-project",
      filePath: normalizedPath,
      projectRoot: normalizedRoot,
    });
    return undefined;
  }

  const relativePath = normalizedPath.slice(normalizedRoot.length + 1);

  // Find all matching conventions
  const matches: Array<{ convention: DirectoryConvention; score: number }> = [];

  for (const convention of conventions) {
    if (matchesPattern(relativePath, convention.pattern)) {
      matches.push({ convention, score: convention.priority });
    }
  }

  if (matches.length === 0) {
    debug.project("convention.match.none", { relativePath });
    return undefined;
  }

  // Sort by priority (highest first)
  matches.sort((a, b) => b.score - a.score);

  const best = matches[0]!;

  debug.project("convention.match.found", {
    relativePath,
    pattern: best.convention.pattern,
    scope: best.convention.scope.kind,
    priority: best.convention.priority,
    matchCount: matches.length,
  });

  return {
    convention: best.convention,
    relativePath,
    scope: best.convention.scope,
  };
}

/**
 * Check if all files in a directory match a convention.
 *
 * @param directoryPath - Path to directory
 * @param projectRoot - Project root
 * @param conventions - Conventions to match
 * @returns Convention if entire directory matches, undefined otherwise
 */
export function matchDirectoryConvention(
  directoryPath: string,
  projectRoot: string,
  conventions: readonly DirectoryConvention[],
): DirectoryConvention | undefined {
  // Normalize paths
  const normalizedPath = directoryPath.replace(/\\/g, "/").replace(/\/$/, "");
  const normalizedRoot = projectRoot.replace(/\\/g, "/").replace(/\/$/, "");

  if (!normalizedPath.startsWith(normalizedRoot)) {
    return undefined;
  }

  const relativePath = normalizedPath.slice(normalizedRoot.length + 1);

  // Find convention that matches directory pattern (not file pattern)
  for (const convention of conventions) {
    // Extract directory portion of pattern
    const dirPattern = extractDirectoryPattern(convention.pattern);
    if (dirPattern && matchesPattern(relativePath, dirPattern)) {
      return convention;
    }
  }

  return undefined;
}

/**
 * Extract the directory portion of a glob pattern.
 *
 * `**\/resources/**` → `**\/resources`
 */
function extractDirectoryPattern(pattern: string): string | undefined {
  // Remove trailing /** or /*
  const trimmed = pattern.replace(/\/\*\*?$/, "").replace(/\/\*$/, "");

  // If pattern is just **, can't extract directory
  if (trimmed === "**" || trimmed === "*") {
    return undefined;
  }

  return trimmed;
}

// ============================================================================
// Pattern Matching
// ============================================================================

/**
 * Match a path against a glob pattern.
 *
 * Supports:
 * - `*` - any characters except /
 * - `**` - any characters including /
 * - `?` - single character
 */
function matchesPattern(path: string, pattern: string): boolean {
  const normalizedPath = path.replace(/\\/g, "/");
  const normalizedPattern = pattern.replace(/\\/g, "/");

  // Convert glob to regex
  let regex = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, ".")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*");

  regex = "^" + regex + "$";

  return new RegExp(regex).test(normalizedPath);
}

// ============================================================================
// Convention Configuration (Internal)
// ============================================================================

/**
 * Internal options for configuring directory conventions.
 *
 * This is the lower-level internal config that works with DirectoryConvention[]
 * (which use discriminated union scopes). For user-facing configuration,
 * see DirectoryConventionConfig in conventions/types.ts.
 */
export interface DirectoryConventionListConfig {
  /**
   * Whether to use default conventions.
   * @default true
   */
  readonly useDefaults?: boolean;

  /**
   * Additional conventions to add.
   */
  readonly additional?: readonly DirectoryConvention[];

  /**
   * Conventions to override (by pattern).
   * Overrides replace matching defaults.
   */
  readonly overrides?: readonly DirectoryConvention[];

  /**
   * Patterns to exclude from convention matching.
   */
  readonly exclude?: readonly string[];
}

/**
 * Build the effective convention list from config.
 *
 * @param config - Convention configuration
 * @returns Effective conventions list
 */
export function buildConventionList(config?: DirectoryConventionListConfig): DirectoryConvention[] {
  const useDefaults = config?.useDefaults ?? true;
  const additional = config?.additional ?? [];
  const overrides = config?.overrides ?? [];

  // Start with defaults if enabled
  let conventions: DirectoryConvention[] = useDefaults ? [...DEFAULT_CONVENTIONS] : [];

  // Apply overrides
  const overridePatterns = new Set(overrides.map((o) => o.pattern));
  conventions = conventions.filter((c) => !overridePatterns.has(c.pattern));
  conventions.push(...overrides);

  // Add additional conventions
  conventions.push(...additional);

  // Sort by priority (highest first)
  conventions.sort((a, b) => b.priority - a.priority);

  return conventions;
}

// ============================================================================
// Scope Utilities
// ============================================================================

/**
 * Get a human-readable description of a scope.
 */
export function describeScope(scope: DirectoryScope): string {
  switch (scope.kind) {
    case "global":
      return "Global (root container)";
    case "local":
      return scope.parent
        ? `Local to ${scope.parent}`
        : "Local (component-scoped)";
    case "router":
      return "Router-managed (route component)";
    case "plugin":
      return `Plugin: ${scope.plugin}`;
  }
}

/**
 * Check if a scope implies global registration.
 */
export function isGlobalScope(scope: DirectoryScope): boolean {
  return scope.kind === "global";
}

/**
 * Check if a scope is router-managed.
 */
export function isRouterScope(scope: DirectoryScope): boolean {
  return scope.kind === "router";
}

// ============================================================================
// Convention Builder (Fluent API)
// ============================================================================

/**
 * Builder for creating directory conventions.
 *
 * @example
 * ```typescript
 * const convention = conventionBuilder()
 *   .pattern('src/plugins/i18n/**')
 *   .description('I18N plugin resources')
 *   .plugin('@aurelia/i18n')
 *   .priority(15)
 *   .build();
 * ```
 */
export function conventionBuilder(): ConventionBuilder {
  return new ConventionBuilderImpl();
}

export interface ConventionBuilder {
  pattern(pattern: string): ConventionBuilder;
  description(description: string): ConventionBuilder;
  global(): ConventionBuilder;
  local(parent?: string): ConventionBuilder;
  router(): ConventionBuilder;
  plugin(name: string): ConventionBuilder;
  priority(priority: number): ConventionBuilder;
  build(): DirectoryConvention;
}

class ConventionBuilderImpl implements ConventionBuilder {
  private _pattern: string = "";
  private _description?: string;
  private _scope: DirectoryScope = { kind: "global" };
  private _priority: number = 0;

  pattern(pattern: string): this {
    this._pattern = pattern;
    return this;
  }

  description(description: string): this {
    this._description = description;
    return this;
  }

  global(): this {
    this._scope = { kind: "global" };
    return this;
  }

  local(parent?: string): this {
    this._scope = { kind: "local", parent };
    return this;
  }

  router(): this {
    this._scope = { kind: "router" };
    return this;
  }

  plugin(name: string): this {
    this._scope = { kind: "plugin", plugin: name };
    return this;
  }

  priority(priority: number): this {
    this._priority = priority;
    return this;
  }

  build(): DirectoryConvention {
    if (!this._pattern) {
      throw new Error("Convention pattern is required");
    }

    return {
      pattern: this._pattern,
      description: this._description,
      scope: this._scope,
      priority: this._priority,
    };
  }
}
