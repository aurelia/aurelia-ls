/**
 * Plugin Resolution
 *
 * Identifies when official Aurelia plugins are registered by tracing imports
 * to (package, exportName) pairs. Activates resources from DEFAULT_SEMANTICS
 * that have matching `package` fields.
 */

// Types
export type {
  ImportOrigin,
  PluginManifest,
  PluginManifestRegistry,
  PluginResolution,
  PluginResolver,
} from "./types.js";

// Manifests
export {
  ROUTER_MANIFEST,
  STANDARD_CONFIGURATION_MANIFEST,
  DEFAULT_PLUGIN_MANIFESTS,
  getPluginManifest,
  getManifestByPackage,
  hasPlugins,
} from "./manifests.js";

// Resolver
export {
  createPluginResolver,
  createPluginResolverWithManifests,
  isCustomizeCall,
  mightBePluginByName,
  traceIdentifierImport,
  traceMemberAccessImport,
} from "./resolver.js";
