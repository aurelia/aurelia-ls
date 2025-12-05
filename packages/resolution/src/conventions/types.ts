/**
 * Configuration for Aurelia resource conventions.
 *
 * See docs/aurelia-conventions.md for the full specification.
 */
export interface ConventionConfig {
  /**
   * Class name suffixes that indicate resource types.
   * Default: standard Aurelia suffixes.
   */
  readonly suffixes?: SuffixConfig;

  /**
   * File patterns that indicate resource types.
   * Default: standard Aurelia patterns.
   */
  readonly filePatterns?: FilePatternConfig;

  /**
   * File extensions to consider for view-models.
   * Default: ['.ts', '.js']
   */
  readonly viewModelExtensions?: readonly string[];

  /**
   * File extensions to consider for templates.
   * Default: ['.html']
   */
  readonly templateExtensions?: readonly string[];

  /**
   * Whether to enable convention-based discovery.
   * Default: true
   */
  readonly enabled?: boolean;
}

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
