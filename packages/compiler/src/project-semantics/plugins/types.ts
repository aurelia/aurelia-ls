/**
 * Plugin Manifest Types
 *
 * Enables registration analysis to detect when official Aurelia plugins are registered.
 * Plugins are identified by (package, exportName) pairs, which handles import aliasing:
 *
 *   import { RouterConfiguration as RC } from '@aurelia/router';
 *   Aurelia.register(RC);  // Still detected as RouterConfiguration
 *
 * The actual semantics (bindables, etc.) live in BUILTIN_SEMANTICS (compiler/registry.ts)
 * with a `package` field. When a plugin is registered, resources with matching package
 * are included in the ResourceGraph.
 *
 * This two-tier design:
 * - Manifests: Identify WHAT gets activated (package detection)
 * - Semantics: Define HOW resources behave (bindables, TC config, etc.)
 */

/**
 * A plugin manifest identifying a configuration object.
 *
 * The manifest doesn't include resource details - those live in BUILTIN_SEMANTICS
 * with a `package` field. The manifest just maps (package, export) → activation.
 */
export interface PluginManifest {
  /**
   * The exported configuration name (e.g., "RouterConfiguration").
   * This is the actual export name, not any local alias.
   */
  readonly exportName: string;

  /**
   * NPM package that provides this plugin (e.g., "@aurelia/router").
   * Used both for import matching and to activate resources in BUILTIN_SEMANTICS.
   */
  readonly package: string;

  /**
   * Whether `.customize()` returns an equivalent registry.
   * When true, `RouterConfiguration.customize({...})` activates the same resources.
   */
  readonly supportsCustomize?: boolean;
}

/**
 * Result of resolving an import to a potential plugin.
 */
export interface ImportOrigin {
  /** The NPM package or resolved file path */
  readonly moduleSpecifier: string;

  /** The original export name (before any aliasing) */
  readonly exportName: string;
}

/**
 * Result of attempting to resolve a plugin.
 */
export type PluginResolution =
  | { readonly kind: "known"; readonly manifest: PluginManifest }
  | { readonly kind: "unknown"; readonly origin: ImportOrigin | null };

/**
 * Registry of known plugin manifests.
 * Two-level map: package → exportName → manifest
 */
export type PluginManifestRegistry = ReadonlyMap<string, ReadonlyMap<string, PluginManifest>>;

/**
 * Context for plugin resolution during registration analysis.
 */
export interface PluginResolver {
  /**
   * Attempt to resolve a plugin by its import origin.
   * Returns the manifest if this is a known plugin, or unknown otherwise.
   */
  resolve(origin: ImportOrigin): PluginResolution;

  /**
   * Check if a (package, exportName) pair might support .customize().
   */
  supportsCustomize(origin: ImportOrigin): boolean;

  /**
   * Get all packages that have registered plugins.
   * Used to activate resources in BUILTIN_SEMANTICS.
   */
  getActivatedPackages(activatedPlugins: readonly PluginManifest[]): ReadonlySet<string>;
}
