/**
 * Resolution Diagnostics Module
 *
 * Provides error codes and conversion functions for surfacing
 * resolution analysis results as user-facing diagnostics.
 *
 * Also provides plugin-aware hint helpers for generating better
 * error messages when resources are from unregistered plugins.
 */

// Error codes
export {
  // Orphan codes
  RES0001_ORPHAN_ELEMENT,
  RES0002_ORPHAN_ATTRIBUTE,
  RES0003_ORPHAN_VALUE_CONVERTER,
  RES0004_ORPHAN_BINDING_BEHAVIOR,
  // Unanalyzable codes
  RES0010_UNANALYZABLE_FUNCTION_CALL,
  RES0011_UNANALYZABLE_VARIABLE,
  RES0012_UNANALYZABLE_CONDITIONAL,
  RES0013_UNANALYZABLE_SPREAD,
  RES0014_UNANALYZABLE_PROPERTY_ACCESS,
  RES0019_UNANALYZABLE_OTHER,
  // Import/resolution codes
  RES0020_UNRESOLVED_IMPORT,
  RES0021_NOT_A_RESOURCE,
  // Plugin codes
  RES0030_PLUGIN_REQUIRED,
  // Helpers
  getOrphanCode,
  getUnanalyzableCode,
} from "./codes.js";

// Conversion functions
export {
  orphansToDiagnostics,
  unresolvedToDiagnostics,
  unresolvedRefsToDiagnostics,
  type UnresolvedResourceInfo,
} from "./convert.js";

// Plugin-aware hint helpers
export {
  lookupElementPluginHint,
  lookupAttributePluginHint,
  formatPluginHintMessage,
  type PluginHint,
  type PluginHintResult,
} from "./plugin-hints.js";
