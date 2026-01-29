/**
 * Known Plugin Manifests
 *
 * Maps (package, exportName) → manifest for official Aurelia plugins.
 * The actual resource semantics live in DEFAULT_SEMANTICS (compiler/registry.ts).
 *
 * When a plugin is detected in registration analysis, its package is "activated",
 * causing resources with matching `package` field in DEFAULT_SEMANTICS to be
 * included in the ResourceGraph.
 */

import type { PluginManifest, PluginManifestRegistry } from "./types.js";

/**
 * RouterConfiguration from @aurelia/router.
 *
 * Activates: au-viewport, load, href (defined in DEFAULT_SEMANTICS with package: "@aurelia/router")
 */
export const ROUTER_MANIFEST: PluginManifest = {
  exportName: "RouterConfiguration",
  package: "@aurelia/router",
  supportsCustomize: true,
};

/**
 * StandardConfiguration from @aurelia/runtime-html.
 *
 * Activates core Aurelia resources:
 * - Template controllers: if, else, repeat, with, switch, case, default-case, promise, etc.
 * - Custom elements: au-compose, au-slot
 * - Custom attributes: focus, show
 * - Value converters: sanitize
 * - Binding behaviors: debounce, throttle, signal, oneTime, toView, fromView, twoWay, attr, self, updateTrigger
 *
 * Note: StandardConfiguration is assumed "always on" for pragmatic reasons.
 * Almost all Aurelia apps register it, so we treat it as the base.
 */
export const STANDARD_CONFIGURATION_MANIFEST: PluginManifest = {
  exportName: "StandardConfiguration",
  package: "@aurelia/runtime-html",
  supportsCustomize: true,
};

/**
 * All known plugin manifests.
 */
const MANIFESTS: PluginManifest[] = [
  ROUTER_MANIFEST,
  STANDARD_CONFIGURATION_MANIFEST,
];

/**
 * Build the two-level plugin manifest registry.
 * Structure: package → exportName → manifest
 */
function buildRegistry(): PluginManifestRegistry {
  const registry = new Map<string, Map<string, PluginManifest>>();

  for (const manifest of MANIFESTS) {
    let packageMap = registry.get(manifest.package);
    if (!packageMap) {
      packageMap = new Map();
      registry.set(manifest.package, packageMap);
    }
    packageMap.set(manifest.exportName, manifest);
  }

  return registry;
}

/**
 * The default plugin manifest registry containing all known Aurelia plugins.
 */
export const DEFAULT_PLUGIN_MANIFESTS: PluginManifestRegistry = buildRegistry();

/**
 * Look up a plugin manifest by package and export name.
 */
export function getPluginManifest(
  packageName: string,
  exportName: string,
): PluginManifest | null {
  const packageMap = DEFAULT_PLUGIN_MANIFESTS.get(packageName);
  if (!packageMap) return null;
  return packageMap.get(exportName) ?? null;
}

/**
 * Check if a package has any known plugins.
 */
export function hasPlugins(packageName: string): boolean {
  return DEFAULT_PLUGIN_MANIFESTS.has(packageName);
}

/**
 * Get the first manifest for a package (for simple package lookups).
 *
 * Most packages have a single primary plugin (e.g., RouterConfiguration for @aurelia/router).
 * This returns that manifest without needing to know the export name.
 */
export function getManifestByPackage(packageName: string): PluginManifest | null {
  const packageMap = DEFAULT_PLUGIN_MANIFESTS.get(packageName);
  if (!packageMap) return null;
  // Return the first manifest for this package
  const first = packageMap.values().next();
  return first.done ? null : first.value;
}
