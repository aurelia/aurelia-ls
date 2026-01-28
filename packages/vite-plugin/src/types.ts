/**
 * Aurelia Vite Plugin - Type Definitions
 *
 * This file defines the public API surface for configuring the Aurelia Vite plugin.
 * Types are organized by concern and designed for progressive disclosure:
 * simple boolean flags expand to detailed object configurations.
 *
 * @module @aurelia-ls/vite-plugin
 */

import type { IncomingMessage } from "node:http";
import type { ResourceGraph, ResourceScopeId, MaterializedSemantics, CompileTrace } from "@aurelia-ls/compiler";
import type { ResolutionResult, TemplateInfo, RouteTree, DefineMap } from "@aurelia-ls/compiler";
import type { SSRRequestContext } from "@aurelia-ls/ssr";

// ============================================================================
// Re-exports from Lower Packages
// ============================================================================

/**
 * Re-export convention types from resolution package.
 * Users can import these directly from vite-plugin for convenience.
 *
 * ConventionConfig is the canonical type for all convention configuration.
 * See resolution package for the authoritative definitions.
 */
export type {
  // Core convention config
  ConventionConfig,
  SuffixConfig,
  FilePatternConfig,
  // Directory conventions (user-friendly)
  DirectoryConventionConfig,
  DirectoryRule,
  DirectoryScopeKind,
  // File pairing
  TemplatePairingConfig,
  StylesheetPairingConfig,
  // Internal types (for advanced use)
  DirectoryConvention,
  DirectoryScope,
  DirectoryMatch,
} from "@aurelia-ls/compiler";


// Local imports for internal use
import type {
  ConventionConfig,
  DirectoryConventionConfig,
  TemplatePairingConfig,
  StylesheetPairingConfig,
} from "@aurelia-ls/compiler";

/**
 * Re-export SSG types from ssg package.
 */
export type {
  SSGOptions,
  ResolvedSSGOptions,
  SSGResult,
  SSGError,
  ExpandedRoute,
} from "@aurelia-ls/ssg";

// Local imports for internal use
import type {
  SSGOptions,
  ResolvedSSGOptions,
} from "@aurelia-ls/ssg";

// ============================================================================
// Core Types
// ============================================================================

/**
 * State provider function for SSR.
 *
 * Note: For production deployments, consider defining state in `ssrEntry.ts`
 * as a `getSSRState()` export. This allows the same code to run in both
 * Vite dev server and production adapters.
 *
 * @param url - The parsed request URL
 * @param req - The raw HTTP request object
 * @returns Component state object (sync or async)
 */
export type StateProvider = (
  url: URL,
  req: IncomingMessage,
) => Record<string, unknown> | Promise<Record<string, unknown>>;

// ============================================================================
// Development Mode Options
// ============================================================================

/**
 * Hot Module Replacement configuration.
 *
 * Parity with @aurelia/vite-plugin: The runtime plugin has complex HMR
 * that preserves component state across hot reloads (~120 lines of injected code).
 *
 * @status NOT YET IMPLEMENTED in @aurelia-ls/vite-plugin.
 * Currently falls back to full page reload on template changes.
 * Implementation requires: component cache invalidation, state serialization,
 * and integration with Aurelia's Controller lifecycle.
 *
 * @see aurelia/packages-tooling/vite-plugin/src/index.ts getHmrCode()
 */
export interface HMROptions {
  /**
   * Enable HMR for Aurelia components.
   *
   * @default true
   */
  enabled?: boolean;

  /**
   * Preserve component state during HMR updates.
   * When true, component properties are preserved across hot reloads.
   *
   * @default true
   */
  preserveState?: boolean;

  /**
   * Log HMR events to console.
   *
   * @default false
   */
  log?: boolean;
}


// ============================================================================
// SSR Options
// ============================================================================

/**
 * SSR manifest configuration.
 * Controls how the hydration manifest is generated and embedded.
 *
 * @future These options are not yet wired. Manifest is always inline JSON.
 *
 * @see {@link https://aurelia.io/docs/ssr/manifest | Manifest Documentation} — TODO: docs not yet published
 */
export interface SSRManifestOptions {
  /**
   * Embed manifest inline in HTML.
   * When false, manifest is loaded as separate file.
   *
   * @default true
   */
  inline?: boolean;

  /**
   * Compress manifest data.
   * Uses a compact binary format instead of JSON.
   *
   * @future Not yet implemented.
   * @default false
   */
  compress?: boolean;

  /**
   * Include debug information in manifest.
   * Adds component names and source locations for debugging.
   *
   * @future Not yet implemented.
   * @default false (true in dev)
   */
  debug?: boolean;
}

/**
 * SSR hydration configuration.
 * Controls client-side hydration behavior.
 *
 * @status Currently only 'eager' strategy is implemented.
 * Aurelia's manifest-based hydration re-executes components on the client
 * (unlike React's reconciliation), so alternative strategies require
 * Aurelia-specific design work.
 */
export interface SSRHydrationOptions {
  /**
   * Hydration strategy.
   * - 'eager': Hydrate entire page immediately (IMPLEMENTED)
   * - 'lazy': Hydrate components as they enter viewport (NOT IMPLEMENTED)
   * - 'idle': Hydrate during browser idle time (NOT IMPLEMENTED)
   * - 'interaction': Hydrate on first user interaction (NOT IMPLEMENTED)
   *
   * @default 'eager'
   */
  strategy?: "eager" | "lazy" | "idle" | "interaction";

  /**
   * Timeout for hydration (milliseconds).
   * Forces hydration after timeout even if strategy hasn't triggered.
   * Set to 0 to disable timeout.
   *
   * @status Not yet implemented.
   * @default 10000
   */
  timeout?: number;

  /**
   * Validate DOM during hydration.
   * Logs warnings if server HTML doesn't match expected structure.
   *
   * @status Not yet implemented.
   * @default true (in dev)
   */
  validate?: boolean;
}

/**
 * Server-Side Rendering options.
 *
 * IMPLEMENTED: `enabled`, `state`, `stripMarkers`, `include`, `exclude`,
 * `htmlShell`, `baseHref`, `ssrEntry`, `register`.
 *
 * PARTIAL: `manifest` (inline only), `hydration` (eager only).
 *
 * @see {@link https://aurelia.io/docs/ssr | SSR Documentation} — TODO: docs not yet published
 */
export interface SSROptions {
  /**
   * Enable SSR.
   *
   * @default true (when SSROptions object is provided)
   */
  enabled?: boolean;

  /**
   * State provider function for request-scoped data (session, feature flags).
   *
   * Note: For production deployments, consider defining this in `ssrEntry.ts`
   * as a `getSSRState()` export instead. This allows the same code to run
   * in both Vite dev server and production adapters.
   */
  state?: StateProvider;

  /**
   * Strip `<!--au-->` hydration markers from output.
   * When true, produces clean HTML without Aurelia-specific comments.
   * Note: Disabling markers also disables client hydration.
   *
   * @default false
   */
  stripMarkers?: boolean;

  /**
   * Routes to include for SSR rendering.
   * Glob patterns that match request paths.
   *
   * @default ['**'] (all routes)
   *
   * @example ['/', '/app/**', '/dashboard/**']
   */
  include?: string[];

  /**
   * Routes to exclude from SSR rendering.
   * Glob patterns that match request paths to skip.
   *
   * @default ['/api/**', '/@vite/**', '/@fs/**', '/__vite_ping']
   *
   * @example ['/api/**', '/static/**']
   */
  exclude?: string[];

  /**
   * Custom HTML shell to inject SSR content into.
   * Use `<!--ssr-outlet-->` marker to indicate where content goes.
   *
   * If not provided, a default shell with basic structure is used.
   *
   * @example
   * ```html
   * <!DOCTYPE html>
   * <html>
   * <head><title>My App</title></head>
   * <body><!--ssr-outlet--></body>
   * </html>
   * ```
   */
  htmlShell?: string;

  /**
   * Base href for routing (defaults to '/').
   * Used by the router for link generation.
   */
  baseHref?: string;

  /**
   * SSR entry point for production builds.
   * Path to the file that exports an SSR handler.
   *
   * @example './src/entry-server.ts'
   *
   * @see {@link https://aurelia.io/docs/ssr/entry-point | Entry Point Guide} — TODO: docs not yet published
   */
  ssrEntry?: string;

  /**
   * Path to a module that exports a `register` function for DI services.
   *
   * The module is loaded via Vite's ssrLoadModule, ensuring all Aurelia
   * imports use the same module instances as the SSR renderer.
   *
   * The module should export:
   * ```typescript
   * export function register(container: IContainer, request: SSRRequestContext): void {
   *   container.register(...);
   * }
   * ```
   *
   * @example './src/ssr-register.ts'
   */
  register?: string;

  /**
   * Compile-time defines for conditional registration guards.
   * Used by resolution partial evaluation (e.g. window.__AU_DEF__).
   *
   * @example
   * defines: ssrDefines()
   */
  defines?: DefineMap;

  /**
   * Manifest configuration.
   *
   * @default { inline: true }
   */
  manifest?: SSRManifestOptions;

  /**
   * Hydration configuration.
   *
   * @default { strategy: 'eager' }
   */
  hydration?: SSRHydrationOptions;
}

// ============================================================================
// Convention Options
// ============================================================================

/**
 * Explicit resource declaration for third-party packages.
 * Use when packages don't expose Aurelia metadata.
 *
 * @see {@link https://aurelia.io/docs/vite/third-party | Third-Party Resources} — TODO: docs not yet published
 */
export interface ExplicitElementConfig {
  /**
   * Bindable properties with optional binding modes.
   *
   * @example
   * ```typescript
   * bindables: {
   *   value: { mode: 'two-way' },
   *   items: {},  // default mode
   * }
   * ```
   */
  bindables?: Record<string, { mode?: "one-time" | "to-view" | "from-view" | "two-way" }>;

  /**
   * Element renders without a wrapper element.
   *
   * @default false
   */
  containerless?: boolean;

  /**
   * Element uses shadow DOM.
   *
   * @default false
   */
  shadowOptions?: { mode: "open" | "closed" } | null;
}

/**
 * Explicit custom attribute declaration.
 */
export interface ExplicitAttributeConfig {
  /**
   * Bindable properties.
   */
  bindables?: Record<string, { mode?: "one-time" | "to-view" | "from-view" | "two-way" }>;

  /**
   * Attribute is a template controller (like if, repeat).
   *
   * @default false
   */
  isTemplateController?: boolean;

  /**
   * Disable multi-binding syntax for this attribute.
   * When true, `attr="foo:bar"` is not parsed as `foo` binding with value `bar`.
   *
   * @default false
   */
  noMultiBindings?: boolean;
}

/**
 * Policy for merging third-party resources into the resolution artifacts.
 *
 * Controls how aggressively artifacts are rebuilt when third-party resources
 * are added. Trade-off is scope correctness vs rebuild cost.
 *
 * | Policy | Semantics | Catalog | Syntax | ResourceGraph | Use Case |
 * |--------|-----------|---------|--------|---------------|----------|
 * | `root-scope` | Rebuild | Rebuild | Rebuild | Merge root scope | Fast; keep scope shape, update root |
 * | `semantics` | Rebuild | Rebuild | Rebuild | Keep | Update semantics without touching scopes |
 * | `rebuild-graph` | Rebuild | Rebuild | Rebuild | Rebuild | Full rebuild; resources affect scope structure |
 *
 * **`root-scope`** (default): Rebuilds semantics/catalog/syntax from merged
 * resources, then merges third-party resources into the root scope of the
 * existing ResourceGraph. Use when resources should be globally visible but
 * do not require new scope structure.
 *
 * **`semantics`**: Rebuilds semantics, catalog, and syntax registry from the
 * merged resources, but keeps the existing ResourceGraph structure. Use when
 * resources affect catalog/syntax but should not change scope topology.
 *
 * **`rebuild-graph`**: Most thorough. Rebuilds everything including the
 * ResourceGraph from scratch based on the new semantics. Use when third-party
 * resources must introduce scope structure changes (rare).
 *
 * @default "root-scope"
 */
export type ThirdPartyPolicy = "root-scope" | "rebuild-graph" | "semantics";

/**
 * Package spec for third-party scanning.
 * Accepts a direct path to a package root.
 */
export interface ThirdPartyPackageSpec {
  /** Absolute path or workspace-relative path to the package root */
  path: string;
  /** Prefer TypeScript source over compiled output */
  preferSource?: boolean;
}

/**
 * Explicit resource declarations.
 * Manually declare resources from packages that don't expose Aurelia metadata.
 */
export interface ExplicitResourceConfig {
  /**
   * Custom elements by tag name.
   *
   * @example
   * ```typescript
   * elements: {
   *   'date-picker': {
   *     bindables: { value: { mode: 'two-way' }, format: {} }
   *   }
   * }
   * ```
   */
  elements?: Record<string, ExplicitElementConfig>;

  /**
   * Custom attributes by name.
   *
   * @example
   * ```typescript
   * attributes: {
   *   'tooltip': {
   *     bindables: { content: {}, position: {} }
   *   }
   * }
   * ```
   */
  attributes?: Record<string, ExplicitAttributeConfig>;

  /**
   * Value converters by name.
   *
   * @example
   * ```typescript
   * valueConverters: ['currency', 'date', 'number']
   * ```
   */
  valueConverters?: string[];

  /**
   * Binding behaviors by name.
   *
   * @example
   * ```typescript
   * bindingBehaviors: ['throttle', 'debounce']
   * ```
   */
  bindingBehaviors?: string[];
}

/**
 * Third-party resource configuration.
 * @see {@link https://aurelia.io/docs/vite/third-party | Third-Party Resources} - TODO: docs not yet published
 */
export interface ThirdPartyOptions {
  /**
   * Auto-scan node_modules for Aurelia resources.
   * Looks for packages with `aurelia` in their package.json.
   *
   * @default true (prerelease)
   */
  scan?: boolean;

  /**
   * Specific packages to scan for resources.
   *
   * Accepts package names or explicit package roots.
   *
   * @example ['@aurelia-ui/components', 'aurelia-table', { path: './packages/ui', preferSource: true }]
   */
  packages?: Array<string | ThirdPartyPackageSpec>;

  /**
   * Explicit resource declarations.
   * Use for packages that don't expose metadata.
   *
   * Note: This is the recommended approach for declaring third-party resources.
   */
  resources?: ExplicitResourceConfig;

  /**
   * Policy for how third-party resources are merged into resolution artifacts.
   *
   * - `"root-scope"` (default): Rebuild semantics and merge into root scope
   * - `"semantics"`: Rebuild semantics/catalog/syntax but keep graph
   * - `"rebuild-graph"`: Full rebuild of all artifacts (incl. graph)
   *
   * See {@link ThirdPartyPolicy} for detailed behavior of each option.
   *
   * @default "root-scope"
   */
  policy?: ThirdPartyPolicy;
}

// NOTE: Convention types (ConventionConfig, DirectoryConventionConfig, etc.)
// are now defined in @aurelia-ls/compiler and re-exported above.
// This ensures a single source of truth for convention configuration.

// ============================================================================
// Compiler Options
// ============================================================================
//
// NOTE: Most compiler options are handled internally. Only `strict` and
// `deprecationWarnings` are intended for user configuration.
// Template extensions are detected automatically from conventions.
//

/**
 * Template compiler configuration.
 *
 * @see {@link https://aurelia.io/docs/vite/compiler | Compiler Configuration} — TODO: docs not yet published
 */
export interface CompilerOptions {
  /**
   * Enable strict mode.
   * Reports additional warnings as errors.
   *
   * @default false
   */
  strict?: boolean;

  /**
   * Template file extensions to process.
   *
   * @default ['.html']
   */
  templateExtensions?: string[];

  /**
   * Warn on deprecated syntax or patterns.
   *
   * @default true
   */
  deprecationWarnings?: boolean;

  /**
   * Custom attribute aliases.
   * Map alternative names to canonical attribute names.
   *
   * @future Attribute aliases are not yet implemented.
   * Would require changes to the lowering stage.
   *
   * @example
   * ```typescript
   * attributeAliases: {
   *   'ng-if': 'if',  // Support Angular-style syntax
   *   'v-show': 'show',
   * }
   * ```
   */
  attributeAliases?: Record<string, string>;
}

// ============================================================================
// Debug Options
// ============================================================================

/**
 * Debug channel names.
 * Enable specific channels to see detailed logging.
 */
export type DebugChannel =
  | "lower"      // 10-lower: element/attr classification
  | "link"       // 20-link: binding resolution
  | "bind"       // 30-bind: scope frame creation
  | "typecheck"  // 40-typecheck: type inference
  | "aot"        // AOT synthesis
  | "overlay"    // LSP overlay synthesis
  | "ssr"        // SSR rendering
  | "transform"  // Transform edits
  | "project"    // Project semantics (resource discovery)
  | "workspace"  // Semantic workspace (editor/LSP)
  | "vite";      // Vite plugin lifecycle

/**
 * Trace output destination.
 */
export type TraceOutput = "console" | "json" | "silent";

/**
 * Performance tracing configuration.
 *
 * @see {@link https://aurelia.io/docs/vite/debugging | Debugging Guide} — TODO: docs not yet published
 */
export interface TraceOptions {
  /**
   * Enable tracing.
   *
   * @default false
   */
  enabled?: boolean;

  /**
   * Where to output trace data.
   * - 'console': Log to terminal with colors
   * - 'json': Write to JSON file
   * - 'silent': Collect but don't output
   *
   * @default 'console'
   */
  output?: TraceOutput;

  /**
   * Minimum span duration (ms) to include in output.
   *
   * @default 0 (include all)
   */
  minDuration?: number;

  /**
   * File path for JSON output.
   *
   * @default 'aurelia-trace.json'
   */
  file?: string;

  /**
   * Include events in output.
   *
   * @default true
   */
  includeEvents?: boolean;

  /**
   * Log summary after each request/build.
   *
   * @default true
   */
  summary?: boolean;
}

/**
 * Debug and diagnostics configuration.
 *
 * @see {@link https://aurelia.io/docs/vite/debugging | Debugging Guide} — TODO: docs not yet published
 */
export interface DebugOptions {
  /**
   * Enable debug channels.
   * Pass true to enable all, or an array of specific channels.
   *
   * @default false
   *
   * @example
   * ```typescript
   * // Enable specific channels
   * channels: ['lower', 'resolve', 'bind']
   *
   * // Enable all channels
   * channels: true
   * ```
   */
  channels?: boolean | DebugChannel[];

  /**
   * Performance tracing configuration.
   *
   * @default false
   */
  trace?: boolean | TraceOptions;

  /**
   * Write intermediate compilation artifacts to disk.
   * Useful for debugging compilation issues.
   *
   * @default false
   */
  dumpArtifacts?: boolean | string; // true = '.aurelia-debug/', string = custom path
}

// ============================================================================
// Experimental Options
// ============================================================================

/**
 * Experimental features.
 * These APIs are unstable and may change without notice.
 */
export interface ExperimentalOptions {
  /**
   * Enable incremental compilation.
   * Caches compilation results for faster rebuilds.
   *
   * @status Not yet implemented. Requires compilation cache design.
   * @default false
   */
  incrementalCompilation?: boolean;
}

// ============================================================================
// Plugin Hooks
// ============================================================================

/**
 * Context passed to plugin hooks.
 */
export interface HookContext {
  /** Resolved plugin options */
  readonly options: ResolvedAureliaOptions;

  /** Vite mode ('development' | 'production') */
  readonly mode: string;

  /** Vite command ('serve' | 'build') */
  readonly command: "serve" | "build";

  /** Resolution context (when tsconfig provided) */
  readonly resolution: ResolutionContext | null;
}

/**
 * Plugin lifecycle hooks.
 * For advanced customization of the compilation pipeline.
 *
 * @see {@link https://aurelia.io/docs/vite/hooks | Plugin Hooks} — TODO: docs not yet published
 */
export interface PluginHooks {
  /**
   * Called after options are resolved.
   * Can modify resolved options.
   */
  onConfigResolved?: (context: HookContext) => void | Promise<void>;

  /**
   * Called before compiling a template.
   * Return false to skip compilation.
   */
  onBeforeCompile?: (
    templatePath: string,
    context: HookContext,
  ) => boolean | void | Promise<boolean | void>;

  /**
   * Called after compiling a template.
   * Can modify the compilation result.
   */
  onAfterCompile?: (
    templatePath: string,
    result: { html: string; instructions: unknown },
    context: HookContext,
  ) => void | Promise<void>;

  /**
   * Called before transforming a TypeScript file.
   */
  onBeforeTransform?: (
    filePath: string,
    context: HookContext,
  ) => boolean | void | Promise<boolean | void>;

  /**
   * Called after transforming a TypeScript file.
   */
  onAfterTransform?: (
    filePath: string,
    result: { code: string; map?: unknown },
    context: HookContext,
  ) => void | Promise<void>;

  /**
   * Called before SSR rendering.
   */
  onBeforeSSR?: (
    url: string,
    context: HookContext,
  ) => void | Promise<void>;

  /**
   * Called after SSR rendering.
   * Can modify the rendered HTML.
   */
  onAfterSSR?: (
    url: string,
    result: { html: string },
    context: HookContext,
  ) => void | Promise<void>;
}

// ============================================================================
// Main Plugin Options
// ============================================================================

/**
 * Aurelia Vite plugin options.
 *
 * This plugin supersedes @aurelia/vite-plugin and @aurelia/plugin-conventions.
 * It provides AOT compilation, SSR, SSG, and convention-based resource discovery.
 *
 * @example
 * ```typescript
 * // Minimal configuration (auto-detects entry)
 * aurelia()
 *
 * // Basic SSR
 * aurelia({
 *   entry: './src/my-app.html',
 *   ssr: true,
 * })
 *
 * // Full configuration
 * aurelia({
 *   entry: './src/my-app.html',
 *   tsconfig: './tsconfig.json',
 *   useDev: true,  // Use Aurelia dev bundles
 *
 *   ssr: {
 *     htmlShell: customShell,
 *     register: (container, req) => { ... },
 *   },
 *
 *   thirdParty: {
 *     resources: {
 *       elements: {
 *         'date-picker': { bindables: { value: { mode: 'two-way' } } }
 *       }
 *     }
 *   },
 *
 *   debug: {
 *     channels: ['lower', 'resolve'],
 *     trace: true,
 *   },
 * })
 * ```
 *
 * @see {@link https://aurelia.io/docs/vite | Vite Plugin Documentation} — TODO: docs not yet published
 */
export interface AureliaPluginOptions {
  // ---------------------------------------------------------------------------
  // Core
  // ---------------------------------------------------------------------------

  /**
   * Entry template path for the Aurelia application.
   * Auto-detected if not provided (looks for src/my-app.html, src/app.html).
   *
   * @example './src/my-app.html'
   */
  entry?: string;

  /**
   * Path to tsconfig.json for TypeScript project.
   * Required for resource resolution (discovering custom elements).
   * Auto-detected if not provided.
   *
   * @example './tsconfig.json'
   */
  tsconfig?: string;

  /**
   * Package root path for resolution snapshots and npm analysis context.
   * Defaults to the Vite project root when not provided.
   */
  packagePath?: string;

  /**
   * Map of package name to package root path for stable snapshot IDs.
   * Useful in monorepos to keep symbol IDs stable across packages.
   */
  packageRoots?: Record<string, string>;

  // ---------------------------------------------------------------------------
  // Development
  // ---------------------------------------------------------------------------

  /**
   * Use Aurelia development bundles.
   * Adds 'development' to Vite's resolve.conditions.
   *
   * Parity with @aurelia/vite-plugin `useDev` option.
   *
   * @default true in dev mode, false in production
   */
  useDev?: boolean;

  /**
   * Hot Module Replacement configuration.
   * Set to false to disable HMR entirely.
   *
   * @status NOT YET IMPLEMENTED. See HMROptions for details.
   * @default true
   */
  hmr?: boolean | HMROptions;

  // ---------------------------------------------------------------------------
  // Features
  // ---------------------------------------------------------------------------

  /**
   * Server-Side Rendering options.
   * Set to true to enable with defaults.
   *
   * @default false
   */
  ssr?: boolean | SSROptions;

  /**
   * Static Site Generation options.
   * Set to true to enable with defaults.
   *
   * @default false
   */
  ssg?: boolean | SSGOptions;

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  /**
   * Convention configuration.
   * Controls resource discovery and classification.
   *
   * Uses ConventionConfig from resolution package (canonical type).
   */
  conventions?: ConventionConfig;

  /**
   * Third-party resource configuration.
   * Declare external Aurelia resources from npm packages.
   */
  thirdParty?: ThirdPartyOptions;

  /**
   * Compiler configuration.
   * Controls template compilation behavior.
   */
  compiler?: CompilerOptions;

  // ---------------------------------------------------------------------------
  // Diagnostics
  // ---------------------------------------------------------------------------

  /**
   * Debug and diagnostics configuration.
   */
  debug?: DebugOptions;

 

  // ---------------------------------------------------------------------------
  // Advanced
  // ---------------------------------------------------------------------------

  /**
   * Experimental features.
   * APIs may change without notice.
   */
  experimental?: ExperimentalOptions;

  /**
   * Plugin lifecycle hooks.
   * For advanced customization.
   */
  hooks?: PluginHooks;
}

// ============================================================================
// Config File Types
// ============================================================================

/**
 * Aurelia configuration object.
 * Can be exported from `aurelia.config.js` or `aurelia.config.ts`.
 *
 * @example
 * ```typescript
 * // aurelia.config.ts
 * import { defineConfig } from '@aurelia-ls/vite-plugin';
 *
 * export default defineConfig({
 *   conventions: {
 *     naming: {
 *       elementSuffixes: ['CustomElement', 'Component'],
 *     },
 *   },
 * });
 * ```
 *
 * @see {@link https://aurelia.io/docs/vite/config-file | Config File} — TODO: docs not yet published
 */
export interface AureliaConfig extends AureliaPluginOptions {
  /**
   * Extend another configuration.
   * Path to another aurelia.config.js or package name.
   *
   * @example
   * ```typescript
   * extends: '@company/aurelia-config'
   * ```
   */
  extends?: string;
}

/**
 * Helper to define Aurelia configuration with type checking.
 * Use in `aurelia.config.ts`.
 *
 * @example
 * ```typescript
 * import { defineConfig } from '@aurelia-ls/vite-plugin';
 *
 * export default defineConfig({
 *   ssr: true,
 *   conventions: {
 *     naming: { elementSuffixes: ['CustomElement', 'Component'] }
 *   }
 * });
 * ```
 */
export function defineConfig(config: AureliaConfig): AureliaConfig {
  return config;
}

// ============================================================================
// Resolved Types (Internal)
// ============================================================================

/**
 * Resolved trace options with defaults applied.
 */
export interface ResolvedTraceOptions {
  /** Whether tracing is enabled */
  enabled: boolean;
  /** Output destination */
  output: TraceOutput;
  /** Minimum duration threshold in nanoseconds */
  minDurationNs: bigint;
  /** JSON output file path (absolute) */
  file: string | null;
  /** Include events in output */
  includeEvents: boolean;
  /** Log summary after requests/builds */
  summary: boolean;
}

/**
 * Resolution context containing discovered resources.
 * Created when tsconfig is provided to the plugin.
 */
export interface ResolutionContext {
  /** The full resolution result */
  result: ResolutionResult;
  /** Resource graph for compilation */
  resourceGraph: ResourceGraph;
  /** Merged semantics with discovered resources */
  semantics: MaterializedSemantics;
  /** Template info for looking up component scope */
  templates: Map<string, TemplateInfo>;
  /** Lookup scope for a template path */
  getScopeForTemplate(templatePath: string): ResourceScopeId;
}

/**
 * Resolved HMR options with defaults applied.
 */
export interface ResolvedHMROptions {
  enabled: boolean;
  preserveState: boolean;
  log: boolean;
}

/**
 * Resolved SSR-specific options with defaults applied.
 */
export interface ResolvedSSRConfig {
  enabled: boolean;
  state: StateProvider;
  stripMarkers: boolean;
  include: string[];
  exclude: string[];
  htmlShell: string;
  baseHref: string;
  ssrEntry: string | null;
  /** Path to module with register export */
  register: string | null;
  /** Compile-time defines for conditional registration guards */
  defines: DefineMap;
  manifest: Required<SSRManifestOptions>;
  hydration: Required<SSRHydrationOptions>;
}


/**
 * Resolved convention options with defaults applied.
 *
 * This is the internal resolved form. Input uses ConventionConfig from resolution.
 */
export interface ResolvedConventionOptions {
  /** Whether conventions are enabled */
  enabled: boolean;
  /** Resolved ConventionConfig from resolution (with defaults applied) */
  config: Required<Omit<ConventionConfig, "directories" | "templatePairing" | "stylesheetPairing">> & {
    directories: DirectoryConventionConfig;
    templatePairing: TemplatePairingConfig;
    stylesheetPairing: StylesheetPairingConfig;
  };
  /** Third-party resources (not part of ConventionConfig) */
  thirdParty: {
    scan: boolean;
    packages: Array<string | ThirdPartyPackageSpec>;
    policy?: ThirdPartyPolicy;
    resources: ExplicitResourceConfig;
  };
}

/**
 * Resolved debug options with defaults applied.
 */
export interface ResolvedDebugOptions {
  channels: DebugChannel[];
  trace: ResolvedTraceOptions;
  dumpArtifacts: string | false;
}

/**
 * Fully resolved plugin options.
 * All optional fields have defaults applied, booleans expanded to objects.
 * Used internally by the plugin.
 */
export interface ResolvedAureliaOptions {
  /** Entry template path */
  entry: string;

  /** tsconfig path (null if not provided) */
  tsconfig: string | null;

  /** Package root path for snapshots/analysis */
  packagePath: string;

  /** Optional map of package roots for stable snapshot ids */
  packageRoots?: Record<string, string>;

  /** Use development bundles */
  useDev: boolean;

  /** Resolved HMR options */
  hmr: ResolvedHMROptions;

  /** Resolved SSR options */
  ssr: ResolvedSSRConfig;

  /** Resolved SSG options */
  ssg: ResolvedSSGOptions;

  /** Resolved convention options */
  conventions: ResolvedConventionOptions;

  /** Resolved compiler options */
  compiler: Required<CompilerOptions>;

  /** Resolved debug options */
  debug: ResolvedDebugOptions;


  /** Experimental options (as-is, no expansion) */
  experimental: ExperimentalOptions;

  /** Plugin hooks (as-is) */
  hooks: PluginHooks;

  /** Resolution context (when tsconfig provided) */
  resolution: ResolutionContext | null;

  /** Discovered route tree (when ssg enabled) */
  routeTree: RouteTree | null;
}

// ============================================================================
// Internal Plugin State
// ============================================================================

/**
 * Internal plugin state used by plugin.ts and middleware.ts.
 * Flat structure for convenience - derived from AureliaPluginOptions.
 *
 * NOT exported from package - use AureliaPluginOptions for public API.
 */
export interface PluginState {
  /** Entry template path */
  entry: string;
  /** State provider */
  state: StateProvider;
  /** Strip hydration markers */
  stripMarkers: boolean;
  /** Routes to include */
  include: string[];
  /** Routes to exclude */
  exclude: string[];
  /** HTML shell template */
  htmlShell: string;
  /** Resolution context (when tsconfig provided) */
  resolution: ResolutionContext | null;
  /** Base href for routing */
  baseHref: string;
  /** Path to registration module */
  register: string | null;
  /** Resolved SSG options */
  ssg: ResolvedSSGOptions;
  /** Discovered route tree */
  routeTree: RouteTree | null;
  /** SSR entry point path */
  ssrEntry: string | null;
  /** Trace options */
  trace: ResolvedTraceOptions;
}
