/**
 * Configuration for Aurelia resource conventions.
 *
 * This is the canonical convention configuration used across all Aurelia tooling:
 * - vite-plugin (re-exports this type)
 * - language-server
 * - custom build tools
 *
 * @example
 * ```typescript
 * const config: ConventionConfig = {
 *   suffixes: {
 *     element: ['CustomElement', 'Component'],
 *   },
 *   directories: {
 *     rules: [
 *       { pattern: 'src/shared/**', scope: 'global' },
 *     ],
 *   },
 *   templatePairing: {
 *     preferSibling: true,
 *   },
 * };
 * ```
 */
export interface ConventionConfig {
  /**
   * Whether to enable convention-based discovery.
   * When false, only explicitly decorated resources are recognized.
   *
   * @default true
   */
  readonly enabled?: boolean;

  // ---------------------------------------------------------------------------
  // Naming Conventions
  // ---------------------------------------------------------------------------

  /**
   * Class name suffixes that indicate resource types.
   *
   * @example
   * ```typescript
   * suffixes: {
   *   element: ['CustomElement', 'Component'],
   *   attribute: ['CustomAttribute', 'Attr'],
   * }
   * ```
   */
  readonly suffixes?: SuffixConfig;

  /**
   * File name patterns that indicate resource types.
   * Matched against the file's base name.
   *
   * @example
   * ```typescript
   * filePatterns: {
   *   element: ['*.element.ts', '*.component.ts'],
   * }
   * ```
   */
  readonly filePatterns?: FilePatternConfig;

  // ---------------------------------------------------------------------------
  // File Extensions
  // ---------------------------------------------------------------------------

  /**
   * File extensions to consider for view-models.
   *
   * @default ['.ts', '.js']
   */
  readonly viewModelExtensions?: readonly string[];

  /**
   * File extensions to consider for templates.
   *
   * @default ['.html']
   */
  readonly templateExtensions?: readonly string[];

  /**
   * File extensions to consider for stylesheets.
   *
   * @default ['.css', '.scss']
   */
  readonly styleExtensions?: readonly string[];

  // ---------------------------------------------------------------------------
  // Directory Conventions
  // ---------------------------------------------------------------------------

  /**
   * Directory-based scoping rules.
   * Controls how directory structure affects resource registration scope.
   *
   * @example
   * ```typescript
   * directories: {
   *   rules: [
   *     { pattern: 'src/resources/**', scope: 'global', priority: 10 },
   *     { pattern: 'src/pages/**', scope: 'router', priority: 5 },
   *   ],
   * }
   * ```
   */
  readonly directories?: DirectoryConventionConfig;

  // ---------------------------------------------------------------------------
  // File Pairing
  // ---------------------------------------------------------------------------

  /**
   * Template file pairing behavior.
   * Controls how templates are associated with view-models.
   */
  readonly templatePairing?: TemplatePairingConfig;

  /**
   * Stylesheet file pairing behavior.
   * Controls how stylesheets are associated with components.
   */
  readonly stylesheetPairing?: StylesheetPairingConfig;
}

// =============================================================================
// Directory Conventions
// =============================================================================

/**
 * Directory convention configuration.
 */
export interface DirectoryConventionConfig {
  /**
   * Custom directory rules.
   * Merged with (or replaces) default conventions.
   */
  readonly rules?: readonly DirectoryRule[];

  /**
   * Replace default conventions instead of merging.
   *
   * @default false
   */
  readonly replaceDefaults?: boolean;
}

/**
 * A single directory convention rule.
 */
export interface DirectoryRule {
  /**
   * Glob pattern for matching directories/files.
   *
   * @example 'src/resources/**', 'src/shared/*'
   */
  readonly pattern: string;

  /**
   * Scope for resources matching this pattern.
   *
   * - `'global'` — Registered in root container, available everywhere
   * - `'local'` — Local to the containing component
   * - `'router'` — Router-managed (route components)
   */
  readonly scope: DirectoryScopeKind;

  /**
   * Priority for rule matching (higher wins when patterns overlap).
   *
   * @default 0
   */
  readonly priority?: number;

  /**
   * Human-readable description for tooling/debugging.
   */
  readonly description?: string;
}

/**
 * User-friendly scope kinds for directory conventions.
 *
 * Internally converted to discriminated union for extensibility.
 */
export type DirectoryScopeKind = "global" | "local" | "router";

// =============================================================================
// File Pairing
// =============================================================================

/**
 * Template pairing configuration.
 */
export interface TemplatePairingConfig {
  /**
   * Prefer sibling file over import when both exist.
   *
   * When a component has both an explicit template import AND a sibling
   * template file, this controls which takes precedence.
   *
   * @default false (explicit import wins)
   */
  readonly preferSibling?: boolean;
}

/**
 * Stylesheet pairing configuration.
 */
export interface StylesheetPairingConfig {
  /**
   * How to inject paired stylesheets into components.
   *
   * - `'shadow'` — Inject into component's shadow DOM
   * - `'document'` — Inject into document head
   * - `'none'` — Don't auto-inject (manual handling)
   *
   * @default 'shadow'
   */
  readonly injection?: "shadow" | "document" | "none";
}

// =============================================================================
// Naming Conventions
// =============================================================================

/**
 * Class name suffix patterns.
 */
export interface SuffixConfig {
  /** Suffixes for custom elements. Default: ['CustomElement', 'Element'] */
  readonly element?: readonly string[];

  /** Suffixes for custom attributes. Default: ['CustomAttribute', 'Attribute'] */
  readonly attribute?: readonly string[];

  /** Suffixes for template controllers. Default: ['TemplateController'] */
  readonly templateController?: readonly string[];

  /** Suffixes for value converters. Default: ['ValueConverter', 'Converter'] */
  readonly valueConverter?: readonly string[];

  /** Suffixes for binding behaviors. Default: ['BindingBehavior', 'Behavior'] */
  readonly bindingBehavior?: readonly string[];
}

/**
 * File pattern configuration.
 */
export interface FilePatternConfig {
  /** File patterns for custom elements. Default: ['*.element.ts', '*-element.ts'] */
  readonly element?: readonly string[];

  /** File patterns for custom attributes. Default: ['*.attribute.ts', '*-attribute.ts'] */
  readonly attribute?: readonly string[];

  /** File patterns for value converters. Default: ['*.converter.ts', '*-converter.ts'] */
  readonly valueConverter?: readonly string[];

  /** File patterns for binding behaviors. Default: ['*.behavior.ts', '*-behavior.ts'] */
  readonly bindingBehavior?: readonly string[];
}
