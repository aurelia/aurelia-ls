/**
 * Entry Point Transform Types
 *
 * Types for analyzing and transforming Aurelia entry points (main.ts)
 * to enable tree-shaking of unused framework features.
 */

import type { Span } from "../ts/types.js";

/**
 * Result of analyzing an entry point file.
 */
export interface EntryPointAnalysis {
  /**
   * How Aurelia is initialized.
   * - 'static-api': Aurelia.app(...) or Aurelia.register(...).app(...)
   * - 'instance-api': new Aurelia().app(...) or new Aurelia().register(...).app(...)
   * - 'unknown': Could not determine initialization pattern
   */
  initPattern: "static-api" | "instance-api" | "unknown";

  /**
   * Whether StandardConfiguration is used (explicitly or implicitly).
   * If false, we should NOT transform this entry point.
   */
  hasStandardConfiguration: boolean;

  /**
   * Where StandardConfiguration is referenced (for replacement).
   * - For static API: the entire Aurelia.app(...) chain
   * - For explicit: the .register(StandardConfiguration) call
   */
  configLocation?: ConfigLocation;

  /**
   * Other registrations that must be preserved.
   * e.g., RouterConfiguration, DialogConfiguration, custom registrations
   */
  preservedRegistrations: PreservedRegistration[];

  /**
   * Import information for rewriting.
   */
  imports: ImportAnalysis;

  /**
   * The Aurelia initialization chain (for transformation).
   */
  initChain?: InitChain;
}

/**
 * Location of StandardConfiguration usage.
 */
export interface ConfigLocation {
  type: "implicit" | "explicit";
  span: Span;
}

/**
 * A registration that should be preserved in the transformed output.
 */
export interface PreservedRegistration {
  /** The registration expression code (e.g., "RouterConfiguration") */
  expression: string;
  /** Source span for the registration */
  span: Span;
  /** Whether this is a known Aurelia configuration */
  isKnownConfig: boolean;
}

/**
 * Import analysis for an entry point.
 */
export interface ImportAnalysis {
  /** Primary Aurelia import source ('aurelia' or '@aurelia/runtime-html' etc.) */
  primarySource: string | null;
  /** All Aurelia-related imports */
  aureliaImports: AureliaImport[];
  /** Non-Aurelia imports (preserved as-is) */
  otherImports: Span[];
}

/**
 * An import from an Aurelia package.
 */
export interface AureliaImport {
  /** The import source (e.g., 'aurelia', '@aurelia/router') */
  source: string;
  /** Imported specifiers */
  specifiers: ImportSpecifier[];
  /** Whether this is a default import */
  hasDefault: boolean;
  /** The default import name (e.g., 'Aurelia') */
  defaultName?: string;
  /** Full span of the import declaration */
  span: Span;
}

/**
 * A named import specifier.
 */
export interface ImportSpecifier {
  name: string;
  alias?: string;
  span: Span;
}

/**
 * The Aurelia initialization chain.
 */
export interface InitChain {
  /** Full span of the initialization expression/statement */
  span: Span;
  /** The component being rendered */
  component?: string;
  /** The host element selector (if specified) */
  host?: string;
  /** Method calls in the chain */
  methods: ChainMethod[];
}

/**
 * A method call in the initialization chain.
 */
export interface ChainMethod {
  name: string;
  args: string[];
  span: Span;
}

/**
 * Options for building AotConfiguration.
 */
export interface ConfigBuildOptions {
  /** Registrations to preserve from the original entry point */
  preservedRegistrations: string[];

  /** Indent string (default: "  ") */
  indent?: string;

  /** Whether to include comments (default: true) */
  includeComments?: boolean;

  /**
   * Future: Fine-grained control from usage analysis.
   * When @aurelia-ls/usage package exists, this will enable
   * including only the specific renderers/resources used.
   */
  // usageManifest?: UsageManifest;
}

/**
 * Result of building AotConfiguration code.
 */
export interface ConfigBuildResult {
  /** The generated configuration code */
  code: string;

  /** Imports required for the configuration */
  requiredImports: RequiredImport[];

  /** Name of the configuration variable */
  configVarName: string;

  /** Name of the factory function (if generated) */
  factoryFnName?: string;
}

/**
 * An import required by the generated configuration.
 */
export interface RequiredImport {
  source: string;
  specifiers: string[];
  isType?: boolean;
}

/**
 * Options for transforming an entry point.
 */
export interface EntryTransformOptions {
  /** The source code to transform */
  source: string;

  /** File path (for error messages) */
  filePath: string;

  /** Pre-computed analysis (optional, will analyze if not provided) */
  analysis?: EntryPointAnalysis;

  /** Config build options */
  configOptions?: Partial<ConfigBuildOptions>;
}

/**
 * Result of transforming an entry point.
 */
export interface EntryTransformResult {
  /** The transformed source code */
  code: string;

  /** Whether transformation was applied */
  transformed: boolean;

  /** Reason if not transformed */
  skipReason?: string;

  /** Warnings during transformation */
  warnings: string[];

  /** The analysis that was used */
  analysis: EntryPointAnalysis;
}

/**
 * Known Aurelia configuration packages.
 */
export const KNOWN_CONFIGURATIONS = [
  "StandardConfiguration",
  "RouterConfiguration",
  "DialogConfiguration",
  "ValidationConfiguration",
  "I18nConfiguration",
  "StateConfiguration",
  "StoreConfiguration",
] as const;

export type KnownConfiguration = (typeof KNOWN_CONFIGURATIONS)[number];

/**
 * Check if a name is a known Aurelia configuration.
 */
export function isKnownConfiguration(name: string): name is KnownConfiguration {
  return KNOWN_CONFIGURATIONS.includes(name as KnownConfiguration);
}
