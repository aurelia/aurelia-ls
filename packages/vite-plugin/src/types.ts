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
import type { IContainer } from "@aurelia/kernel";
import type { ResourceGraph, ResourceScopeId, Semantics, CompileTrace } from "@aurelia-ls/compiler";
import type { ResolutionResult, TemplateInfo, RouteTree } from "@aurelia-ls/resolution";
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
} from "@aurelia-ls/resolution";

// Local imports for internal use
import type {
  ConventionConfig,
  DirectoryConventionConfig,
  TemplatePairingConfig,
  StylesheetPairingConfig,
} from "@aurelia-ls/resolution";

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
//
// NOTE: These options are ASPIRATIONAL. Not yet implemented.
//

/**
 * Hot Module Replacement configuration.
 *
 * @future Not yet implemented.
 * Requires component cache invalidation and state preservation strategy.
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

/**
 * Component inspector configuration.
 * Enables click-to-source functionality in development.
 *
 * Inspired by Svelte Inspector and Vue Devtools.
 *
 * @future Not yet implemented. Requires provenance integration
 * (source location tracking through template compilation).
 */
export interface InspectorOptions {
  /**
   * Enable the component inspector.
   *
   * @default true (in dev mode)
   */
  enabled?: boolean;

  /**
   * Keyboard shortcut to toggle inspector.
   * Uses Mousetrap-style key notation.
   *
   * @default 'ctrl+shift+i'
   *
   * @example 'meta+shift+c' // Cmd+Shift+C on macOS
   */
  toggleKeyCombo?: string;

  /**
   * Show component boundaries on hover.
   *
   * @default true
   */
  showBoundaries?: boolean;

  /**
   * Open file in editor when component is clicked.
   * Set to false to only show component info.
   *
   * @default true
   */
  openInEditor?: boolean;

  /**
   * Editor URL pattern for opening files.
   * Supports placeholders: {file}, {line}, {column}
   *
   * @default 'vscode://file/{file}:{line}:{column}'
   *
   * @example
   * ```typescript
   * // WebStorm
   * 'webstorm://open?file={file}&line={line}&column={column}'
   *
   * // Cursor
   * 'cursor://file/{file}:{line}:{column}'
   * ```
   */
  editorUrl?: string;
}

/**
 * Error overlay configuration.
 * Controls how compilation errors are displayed in the browser.
 *
 * @future Not yet implemented. Vite's built-in error overlay works for now.
 *
 * @see {@link https://aurelia.io/docs/vite/errors | Error Handling} — TODO: docs not yet published
 */
export interface ErrorOverlayOptions {
  /**
   * Enable the error overlay.
   *
   * @default true
   */
  enabled?: boolean;

  /**
   * Show Elm-style error messages with context and suggestions.
   *
   * @default true
   */
  elmStyle?: boolean;

  /**
   * Include source code snippets in error display.
   *
   * @default true
   */
  showSource?: boolean;

  /**
   * Include stack traces in error display.
   *
   * @default false
   */
  showStack?: boolean;
}

/**
 * Development mode options.
 * These settings only apply during `vite dev`.
 *
 * @future Not yet implemented. All sub-options are aspirational.
 *
 * @see {@link https://aurelia.io/docs/vite/development | Development Guide} — TODO: docs not yet published
 */
export interface DevOptions {
  /**
   * Hot Module Replacement configuration.
   * Set to false to disable HMR entirely.
   *
   * @default true
   */
  hmr?: boolean | HMROptions;

  /**
   * Component inspector configuration.
   * Set to false to disable the inspector.
   *
   * @default true
   */
  inspector?: boolean | InspectorOptions;

  /**
   * Error overlay configuration.
   * Set to false to disable the overlay (errors go to console only).
   *
   * @default true
   */
  errorOverlay?: boolean | ErrorOverlayOptions;

  /**
   * Clear console on HMR update.
   *
   * @default false
   */
  clearScreen?: boolean;
}

// ============================================================================
// Build Mode Options
// ============================================================================
//
// NOTE: These options are ASPIRATIONAL. The plugin does not currently use them.
// Use Vite's native build options or ecosystem plugins (rollup-plugin-visualizer).
//

/**
 * Bundle analyzer configuration.
 * Generates reports about bundle composition.
 *
 * @future Use `rollup-plugin-visualizer` from Vite ecosystem instead.
 */
export interface BundleAnalyzerOptions {
  /**
   * Enable bundle analysis.
   *
   * @default false
   */
  enabled?: boolean;

  /**
   * Output format for the analysis report.
   *
   * @default 'html'
   */
  format?: "html" | "json" | "stats";

  /**
   * Output file path (relative to build output).
   *
   * @default 'bundle-analysis.html'
   */
  outputFile?: string;

  /**
   * Open the report in browser after build.
   *
   * @default false
   */
  openReport?: boolean;
}

/**
 * Production build options.
 * These settings only apply during `vite build`.
 *
 * @future Not yet implemented. Use Vite's native build options.
 *
 * @see {@link https://aurelia.io/docs/vite/production | Production Guide} — TODO: docs not yet published
 */
export interface BuildOptions {
  /**
   * Build target environment.
   *
   * @default 'browser'
   */
  target?: "browser" | "node" | "edge";

  /**
   * Generate source maps.
   * - true: Generate external source maps
   * - 'inline': Inline source maps in bundles
   * - 'hidden': Generate but don't link (for error reporting services)
   * - false: No source maps
   *
   * @default true
   */
  sourcemaps?: boolean | "inline" | "hidden";

  /**
   * Minify compiled templates.
   * Removes whitespace and comments from template output.
   *
   * @default true
   */
  minifyTemplates?: boolean;

  /**
   * Bundle analyzer configuration.
   * Set to true to enable with defaults.
   *
   * @default false
   */
  analyze?: boolean | BundleAnalyzerOptions;

  /**
   * Strip development-only code from bundles.
   * Removes debug logging, dev checks, etc.
   *
   * @default true
   */
  stripDevCode?: boolean;
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
 * @future These options are not yet wired. Hydration is always eager.
 *
 * @see {@link https://aurelia.io/docs/ssr/hydration | Hydration Documentation} — TODO: docs not yet published
 */
export interface SSRHydrationOptions {
  /**
   * Hydration strategy.
   * - 'eager': Hydrate entire page immediately (currently implemented)
   * - 'lazy': Hydrate components as they enter viewport
   * - 'idle': Hydrate during browser idle time
   * - 'interaction': Hydrate on first user interaction
   *
   * @future Strategies other than 'eager' require Aurelia-specific design.
   * Aurelia's manifest-based hydration differs from React's Suspense model.
   *
   * @default 'eager'
   */
  strategy?: "eager" | "lazy" | "idle" | "interaction";

  /**
   * Timeout for hydration (milliseconds).
   * Forces hydration after timeout even if strategy hasn't triggered.
   * Set to 0 to disable timeout.
   *
   * @future Not yet implemented.
   * @default 10000
   */
  timeout?: number;

  /**
   * Validate DOM during hydration.
   * Logs warnings if server HTML doesn't match expected structure.
   *
   * @future Not yet implemented.
   * @default true (in dev)
   */
  validate?: boolean;
}

/**
 * SSR streaming configuration.
 * Controls HTTP streaming behavior for SSR responses.
 *
 * @future Streaming SSR is not yet implemented.
 * Aurelia's synchronous component rendering would need architectural changes.
 *
 * @see {@link https://aurelia.io/docs/ssr/streaming | Streaming Documentation} — TODO: docs not yet published
 */
export interface SSRStreamingOptions {
  /**
   * Enable streaming SSR.
   * Sends HTML chunks as they're rendered instead of buffering.
   *
   * @default false
   */
  enabled?: boolean;

  /**
   * Minimum chunk size before flushing (bytes).
   *
   * @default 16384 (16KB)
   */
  chunkSize?: number;

  /**
   * Timeout for first byte (milliseconds).
   * Falls back to non-streaming if exceeded.
   *
   * @default 5000
   */
  firstByteTimeout?: number;
}

/**
 * Server-Side Rendering options.
 *
 * Implemented: `enabled`, `state`, `stripMarkers`, `include`, `exclude`,
 * `htmlShell`, `baseHref`, `ssrEntry`, `register`.
 *
 * Future: `manifest`, `hydration`, `streaming` sub-options.
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
   * Hook to register DI services before rendering.
   *
   * @param container - The DI container to register services into
   * @param request - Request context (URL, baseHref)
   *
   * @example
   * ```typescript
   * register: (container, req) => {
   *   container.register(
   *     Registration.instance(ILocationManager, new ServerLocationManager(req.url))
   *   );
   * }
   * ```
   *
   * @see {@link https://aurelia.io/docs/ssr/di | DI in SSR} — TODO: docs not yet published
   */
  register?: (container: IContainer, request: SSRRequestContext) => void;

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

  /**
   * Streaming configuration.
   *
   * @default { enabled: false }
   */
  streaming?: SSRStreamingOptions;
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
 *
 * @future Auto-scanning is not yet implemented. Use `resources` for explicit declarations.
 *
 * @see {@link https://aurelia.io/docs/vite/third-party | Third-Party Resources} — TODO: docs not yet published
 */
export interface ThirdPartyOptions {
  /**
   * Auto-scan node_modules for Aurelia resources.
   * Looks for packages with `aurelia` in their package.json.
   *
   * @future Not yet implemented.
   * @default false
   */
  scan?: boolean;

  /**
   * Specific packages to scan for resources.
   *
   * @future Not yet implemented.
   * @example ['@aurelia-ui/components', 'aurelia-table']
   */
  packages?: string[];

  /**
   * Explicit resource declarations.
   * Use for packages that don't expose metadata.
   *
   * Note: This is the recommended approach for declaring third-party resources.
   */
  resources?: ExplicitResourceConfig;
}

// NOTE: Convention types (ConventionConfig, DirectoryConventionConfig, etc.)
// are now defined in @aurelia-ls/resolution and re-exported above.
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
  | "resolve"    // 20-resolve: binding resolution
  | "bind"       // 30-bind: scope frame creation
  | "typecheck"  // 40-typecheck: type inference
  | "aot"        // AOT synthesis
  | "overlay"    // LSP overlay synthesis
  | "ssr"        // SSR rendering
  | "transform"  // Transform edits
  | "resolution"; // Resource discovery

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
 *
 * @see {@link https://aurelia.io/docs/vite/experimental | Experimental Features} — TODO: docs not yet published
 */
export interface ExperimentalOptions {
  /**
   * Enable bundle optimization analysis.
   * Analyzes template usage to enable tree-shaking.
   *
   * @experimental
   * @default false
   */
  bundleOptimization?: boolean;

  /**
   * Enable incremental compilation.
   * Caches compilation results for faster rebuilds.
   *
   * @experimental
   * @default false
   */
  incrementalCompilation?: boolean;

  /**
   * Enable partial hydration.
   * Only hydrates interactive components, leaving static content as-is.
   *
   * @experimental
   * @default false
   */
  partialHydration?: boolean;

  /**
   * Enable React Server Components-style architecture.
   * Marks components as server-only or client-only.
   *
   * @experimental
   * @default false
   */
  serverComponents?: boolean;
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
 *
 *   dev: {
 *     inspector: true,
 *     hmr: { preserveState: true },
 *   },
 *
 *   build: {
 *     sourcemaps: true,
 *     analyze: true,
 *   },
 *
 *   ssr: {
 *     streaming: { enabled: true },
 *     hydration: { strategy: 'lazy' },
 *   },
 *
 *   conventions: {
 *     thirdParty: {
 *       resources: {
 *         elements: {
 *           'date-picker': { bindables: { value: { mode: 'two-way' } } }
 *         }
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

  // ---------------------------------------------------------------------------
  // Mode-Specific
  // ---------------------------------------------------------------------------

  /**
   * Development mode options.
   * Only applies during `vite dev`.
   */
  dev?: DevOptions;

  /**
   * Production build options.
   * Only applies during `vite build`.
   */
  build?: BuildOptions;

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
  semantics: Semantics;
  /** Template info for looking up component scope */
  templates: Map<string, TemplateInfo>;
  /** Lookup scope for a template path */
  getScopeForTemplate(templatePath: string): ResourceScopeId;
}

/**
 * Resolved dev options with defaults applied.
 */
export interface ResolvedDevOptions {
  hmr: Required<HMROptions>;
  inspector: Required<InspectorOptions>;
  errorOverlay: Required<ErrorOverlayOptions>;
  clearScreen: boolean;
}

/**
 * Resolved build options with defaults applied.
 */
export interface ResolvedBuildOptions {
  target: "browser" | "node" | "edge";
  sourcemaps: boolean | "inline" | "hidden";
  minifyTemplates: boolean;
  analyze: Required<BundleAnalyzerOptions>;
  stripDevCode: boolean;
}

/**
 * Resolved SSR-specific options with defaults applied.
 * This is the NEW type for just SSR configuration within ResolvedAureliaOptions.
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
  register?: (container: IContainer, request: SSRRequestContext) => void;
  manifest: Required<SSRManifestOptions>;
  hydration: Required<SSRHydrationOptions>;
  streaming: Required<SSRStreamingOptions>;
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
  thirdParty: Required<Omit<ThirdPartyOptions, "resources">> & {
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

  /** Resolved dev options */
  dev: ResolvedDevOptions;

  /** Resolved build options */
  build: ResolvedBuildOptions;

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
  /** DI registration hook */
  register?: (container: IContainer, request: SSRRequestContext) => void;
  /** Resolved SSG options */
  ssg: ResolvedSSGOptions;
  /** Discovered route tree */
  routeTree: RouteTree | null;
  /** SSR entry point path */
  ssrEntry: string | null;
  /** Trace options */
  trace: ResolvedTraceOptions;
}
