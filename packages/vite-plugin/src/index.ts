/**
 * @aurelia-ls/vite-plugin - Vite plugin for Aurelia with AOT compilation and SSR
 *
 * This is the primary user-facing package for building Aurelia applications
 * with Vite. It provides:
 * - AOT compilation of templates
 * - SSR dev server middleware
 * - Production build with SSR support
 * - Static site generation (SSG)
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import aurelia from '@aurelia/vite-plugin';
 * import { aureliaSSR } from '@aurelia-ls/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [
 *     aurelia({ useDev: true }),
 *     aureliaSSR({
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
 *     naming: { elementSuffixes: ['CustomElement', 'Component'] },
 *   },
 * });
 * ```
 *
 * @module @aurelia-ls/vite-plugin
 */

// =============================================================================
// Main Plugin Export
// =============================================================================

export { aureliaSSR } from "./plugin.js";

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
  DEFAULT_INSPECTOR_OPTIONS,
  DEFAULT_ERROR_OVERLAY_OPTIONS,
  DEFAULT_DEV_OPTIONS,
  DEFAULT_BUNDLE_ANALYZER_OPTIONS,
  DEFAULT_BUILD_OPTIONS,
  DEFAULT_STATE_PROVIDER,
  DEFAULT_HTML_SHELL,
  DEFAULT_SSR_MANIFEST_OPTIONS,
  DEFAULT_SSR_HYDRATION_OPTIONS,
  DEFAULT_SSR_STREAMING_OPTIONS,
  DEFAULT_SSR_OPTIONS,
  DEFAULT_SSG_OPTIONS,
  DEFAULT_NAMING_OPTIONS,
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
  normalizeDevOptions,
  normalizeBuildOptions,
  normalizeSSROptions,
  normalizeSSGOptions,
  normalizeConventionOptions,
  normalizeCompilerOptions,
  normalizeDebugOptions,
  normalizeTraceOptions,
  normalizeHMROptions,
  normalizeInspectorOptions,
  normalizeErrorOverlayOptions,
  normalizeBundleAnalyzerOptions,
  normalizeSSRManifestOptions,
  normalizeSSRHydrationOptions,
  normalizeSSRStreamingOptions,
  normalizeNamingOptions,
  normalizeDebugChannels,

  // Config file support
  loadConfigFile,
  mergeConfigs,

  // Type guards
  isSSROptionsObject,
  isTraceOptionsObject,
  isSSREnabled,
  isSSGEnabled,

  // Legacy migration
  migrateLegacyOptions,

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

  // Legacy (deprecated)
  AureliaSSRPluginOptions,
} from "./types.js";

// =============================================================================
// Type Exports - Development Options
// =============================================================================

export type {
  DevOptions,
  HMROptions,
  InspectorOptions,
  ErrorOverlayOptions,
  ResolvedDevOptions,
} from "./types.js";

// =============================================================================
// Type Exports - Build Options
// =============================================================================

export type {
  BuildOptions,
  BundleAnalyzerOptions,
  ResolvedBuildOptions,
} from "./types.js";

// =============================================================================
// Type Exports - SSR Options
// =============================================================================

export type {
  SSROptions,
  SSRManifestOptions,
  SSRHydrationOptions,
  SSRStreamingOptions,
  ResolvedSSRConfig,
  ResolvedSSROptions, // Legacy type for existing plugin code
  ResolutionContext,
} from "./types.js";

// =============================================================================
// Type Exports - Convention Options
// =============================================================================

export type {
  ConventionOptions,
  NamingConventionOptions,
  DirectoryConventionOptions,
  TemplatePairingOptions,
  StylesheetPairingOptions,
  ThirdPartyOptions,
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

// SSG types
export type {
  SSGOptions,
  ResolvedSSGOptions,
  SSGResult,
  SSGError,
  ExpandedRoute,
} from "@aurelia-ls/ssg";

// Convention types from resolution package
export type {
  ConventionConfig,
  SuffixConfig,
  FilePatternConfig,
  DirectoryConvention,
  DirectoryScope,
  DirectoryMatch,
} from "./types.js";
