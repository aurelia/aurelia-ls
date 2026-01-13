/**
 * @aurelia-ls/vite-plugin - Complete Aurelia build plugin
 *
 * This package replaces @aurelia/vite-plugin and @aurelia/plugin-conventions.
 * It provides:
 * - AOT compilation of templates
 * - SSR dev server middleware
 * - Production build with SSR support
 * - Static site generation (SSG)
 * - Convention-based resource discovery
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import { aurelia } from '@aurelia-ls/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [
 *     aurelia({
 *       entry: './src/my-app.html',
 *       ssr: true,
 *     }),
 *   ],
 * });
 * ```
 *
 * @example
 * ```typescript
 * // aurelia.config.ts
 * import { defineConfig } from '@aurelia-ls/vite-plugin';
 *
 * export default defineConfig({
 *   ssr: {
 *     hydration: { strategy: 'lazy' },
 *   },
 *   conventions: {
 *     suffixes: { element: ['CustomElement', 'Component'] },
 *   },
 * });
 * ```
 *
 * @module @aurelia-ls/vite-plugin
 */

// =============================================================================
// Main Plugin Export
// =============================================================================

export { aurelia } from "./plugin.js";

// =============================================================================
// Config Helpers
// =============================================================================

export { defineConfig } from "./types.js";

// =============================================================================
// Component Loading Utilities
// =============================================================================

export {
  loadProjectComponents,
  loadComponent,
  type LoadedComponent,
  type LoadProjectComponentsResult,
} from "./loader.js";

// =============================================================================
// Defaults and Normalization
// =============================================================================

export {
  // Default option values
  DEFAULT_HMR_OPTIONS,
  DEFAULT_STATE_PROVIDER,
  DEFAULT_HTML_SHELL,
  DEFAULT_SSR_MANIFEST_OPTIONS,
  DEFAULT_SSR_HYDRATION_OPTIONS,
  DEFAULT_SSR_OPTIONS,
  DEFAULT_SSG_OPTIONS,
  DEFAULT_TEMPLATE_PAIRING_OPTIONS,
  DEFAULT_STYLESHEET_PAIRING_OPTIONS,
  DEFAULT_THIRD_PARTY_OPTIONS,
  DEFAULT_CONVENTION_OPTIONS,
  DEFAULT_COMPILER_OPTIONS,
  DEFAULT_TRACE_OPTIONS,
  DEFAULT_DEBUG_OPTIONS,
  DEFAULT_EXPERIMENTAL_OPTIONS,
  DEFAULT_HOOKS,
  ALL_DEBUG_CHANNELS,
  CONFIG_FILE_NAMES,

  // Normalization functions
  normalizeOptions,
  normalizeSSROptions,
  normalizeSSGOptions,
  normalizeConventionOptions,
  normalizeCompilerOptions,
  normalizeDebugOptions,
  normalizeTraceOptions,
  normalizeHMROptions,
  normalizeSSRManifestOptions,
  normalizeSSRHydrationOptions,
  normalizeDebugChannels,

  // Config file support
  loadConfigFile,
  mergeConfigs,

  // Type guards
  isSSROptionsObject,
  isTraceOptionsObject,
  isSSREnabled,
  isSSGEnabled,

  // Context type
  type NormalizeOptionsContext,
} from "./defaults.js";

// =============================================================================
// Type Exports - Main Plugin Options
// =============================================================================

export type {
  // Main entry point
  AureliaPluginOptions,
  AureliaConfig,

  // Core types
  StateProvider,
} from "./types.js";

// =============================================================================
// Type Exports - Development Options
// =============================================================================

export type {
  HMROptions,
  ResolvedHMROptions,
} from "./types.js";

// =============================================================================
// Type Exports - SSR Options
// =============================================================================

export type {
  SSROptions,
  SSRManifestOptions,
  SSRHydrationOptions,
  ResolvedSSRConfig,
  ResolutionContext,
} from "./types.js";

// =============================================================================
// Type Exports - Convention Options
// =============================================================================

// Convention types are now defined in @aurelia-ls/resolution (canonical source)
// and re-exported from types.ts for convenience
export type {
  // From resolution (re-exported)
  ConventionConfig,
  SuffixConfig,
  FilePatternConfig,
  DirectoryConventionConfig,
  DirectoryRule,
  DirectoryScopeKind,
  TemplatePairingConfig,
  StylesheetPairingConfig,
  // vite-plugin specific
  ThirdPartyOptions,
  ThirdPartyPolicy,
  ThirdPartyPackageSpec,
  ExplicitResourceConfig,
  ExplicitElementConfig,
  ExplicitAttributeConfig,
  ResolvedConventionOptions,
} from "./types.js";

// =============================================================================
// Type Exports - Compiler Options
// =============================================================================

export type { CompilerOptions } from "./types.js";

// =============================================================================
// Type Exports - Debug Options
// =============================================================================

export type {
  DebugOptions,
  DebugChannel,
  TraceOptions,
  TraceOutput,
  ResolvedTraceOptions,
  ResolvedDebugOptions,
} from "./types.js";

// =============================================================================
// Type Exports - Advanced Options
// =============================================================================

export type {
  ExperimentalOptions,
  PluginHooks,
  HookContext,
  ResolvedAureliaOptions,
} from "./types.js";

// =============================================================================
// Type Re-exports from Lower Packages
// =============================================================================

// SSG types (additional, not duplicated from types.ts re-exports)
// Note: ConventionConfig, SuffixConfig, etc. are already re-exported from types.ts
