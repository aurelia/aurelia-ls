/**
 * Resolution Diagnostics Module
 *
 * Provides error codes and conversion functions for surfacing
 * resolution analysis results as user-facing diagnostics.
 *
 * Also provides plugin-aware hint helpers for generating better
 * error messages when resources are from unregistered plugins.
 */

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
