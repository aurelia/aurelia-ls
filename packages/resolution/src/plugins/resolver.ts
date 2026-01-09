/**
 * Plugin Resolver
 *
 * Resolves plugin registrations by tracing imports to (package, exportName) pairs.
 * Handles aliased imports correctly:
 *
 *   import { RouterConfiguration as RC } from '@aurelia/router';
 *   Aurelia.register(RC);  // Detected as RouterConfiguration from @aurelia/router
 */

import type {
  ImportOrigin,
  PluginManifest,
  PluginManifestRegistry,
  PluginResolution,
  PluginResolver,
} from "./types.js";
import type { ImportDeclaration } from "../extraction/file-facts.js";
import { DEFAULT_PLUGIN_MANIFESTS, getPluginManifest } from "./manifests.js";

/**
 * Create a plugin resolver with the default manifests.
 */
export function createPluginResolver(): PluginResolver {
  return createPluginResolverWithManifests(DEFAULT_PLUGIN_MANIFESTS);
}

/**
 * Create a plugin resolver with custom manifests (for testing).
 */
export function createPluginResolverWithManifests(
  manifests: PluginManifestRegistry
): PluginResolver {
  return {
    resolve(origin: ImportOrigin): PluginResolution {
      // Look up by (package, exportName)
      const packageMap = manifests.get(origin.moduleSpecifier);
      if (packageMap) {
        const manifest = packageMap.get(origin.exportName);
        if (manifest) {
          return { kind: "known", manifest };
        }
      }

      // Not a known plugin
      return { kind: "unknown", origin };
    },

    supportsCustomize(origin: ImportOrigin): boolean {
      const packageMap = manifests.get(origin.moduleSpecifier);
      if (!packageMap) return false;

      const manifest = packageMap.get(origin.exportName);
      return manifest?.supportsCustomize === true;
    },

    getActivatedPackages(activatedPlugins: readonly PluginManifest[]): ReadonlySet<string> {
      const packages = new Set<string>();
      for (const plugin of activatedPlugins) {
        packages.add(plugin.package);
      }
      return packages;
    },
  };
}

/**
 * Check if a `.customize()` call should be treated as the base plugin.
 *
 * Pattern: `RouterConfiguration.customize({ ... })`
 * Should be treated the same as `RouterConfiguration` if manifest.supportsCustomize is true.
 */
export function isCustomizeCall(
  origin: ImportOrigin,
  method: string,
  manifests: PluginManifestRegistry = DEFAULT_PLUGIN_MANIFESTS
): boolean {
  if (method !== "customize") {
    return false;
  }

  const manifest = getPluginManifest(origin.moduleSpecifier, origin.exportName);
  return manifest?.supportsCustomize === true;
}

/**
 * Suffixes that suggest something might be a plugin configuration.
 * Used for heuristic detection when import origin isn't available.
 */
const PLUGIN_SUFFIXES = ["Configuration", "Plugin"];

/**
 * Check if a name looks like it might be a plugin (heuristic).
 * Used when we can't trace imports.
 */
export function mightBePluginByName(name: string): boolean {
  for (const suffix of PLUGIN_SUFFIXES) {
    if (name.endsWith(suffix)) {
      return true;
    }
  }
  return false;
}

/**
 * Trace an identifier back through imports to find its origin.
 *
 * Handles:
 * - Named imports: `import { RouterConfiguration } from '@aurelia/router'`
 * - Aliased imports: `import { RouterConfiguration as RC } from '@aurelia/router'`
 * - Default imports: `import RouterConfig from '@aurelia/router'`
 *
 * Does NOT handle:
 * - Namespace imports (need member access): `import * as Router from '@aurelia/router'`
 * - Re-exports from local files (would need transitive resolution)
 */
export function traceIdentifierImport(
  localName: string,
  imports: readonly ImportDeclaration[]
): ImportOrigin | null {
  for (const imp of imports) {
    if (imp.kind === "named") {
      // Check each named import binding
      for (const binding of imp.bindings) {
        // Match by alias (local name) or original name if no alias
        const effectiveLocalName = binding.alias ?? binding.name;
        if (effectiveLocalName === localName) {
          return {
            moduleSpecifier: imp.moduleSpecifier,
            exportName: binding.name, // Original export name, not alias
          };
        }
      }
    } else if (imp.kind === "default") {
      // Default import uses the alias as local name
      if (imp.alias === localName) {
        return {
          moduleSpecifier: imp.moduleSpecifier,
          exportName: "default",
        };
      }
    }
    // Namespace imports handled separately via traceMemberAccessImport
    // Side-effect imports have no bindings to trace
  }

  return null;
}

/**
 * Trace a member access (namespace.member) back through imports.
 *
 * Handles:
 * - Namespace imports: `import * as Router from '@aurelia/router'`
 *   Then `Router.RouterConfiguration` → RouterConfiguration from @aurelia/router
 */
export function traceMemberAccessImport(
  namespace: string,
  member: string,
  imports: readonly ImportDeclaration[]
): ImportOrigin | null {
  for (const imp of imports) {
    if (imp.kind === "namespace") {
      if (imp.alias === namespace) {
        return {
          moduleSpecifier: imp.moduleSpecifier,
          exportName: member,
        };
      }
    }
  }

  return null;
}

