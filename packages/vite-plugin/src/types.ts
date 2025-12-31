/**
 * Vite SSR Plugin Types
 *
 * Type definitions for the Aurelia SSR Vite plugin.
 */

import type { IncomingMessage } from "node:http";
import type { IContainer } from "@aurelia/kernel";
import type { ResourceGraph, ResourceScopeId, Semantics, CompileTrace } from "@aurelia-ls/compiler";
import type { ResolutionResult, TemplateInfo, RouteTree } from "@aurelia-ls/resolution";
import type { SSRRequestContext } from "@aurelia-ls/ssr";
import type { SSGOptions, ResolvedSSGOptions } from "@aurelia-ls/ssg";

/**
 * State provider function for SSR.
 * Called for each SSR request to provide component state.
 *
 * @param url - The parsed request URL
 * @param req - The raw HTTP request object
 * @returns Component state object (sync or async)
 *
 * @example
 * ```typescript
 * state: async (url) => {
 *   const user = await fetchUser(url.pathname);
 *   return { user, path: url.pathname };
 * }
 * ```
 */
export type StateProvider = (
  url: URL,
  req: IncomingMessage,
) => Record<string, unknown> | Promise<Record<string, unknown>>;

/**
 * Configuration options for the Aurelia SSR Vite plugin.
 */
export interface AureliaSSRPluginOptions {
  /**
   * Entry template path for the Aurelia application.
   * Should point to the main component's HTML template.
   *
   * @example './src/my-app.html'
   * @default './src/my-app.html'
   */
  entry?: string;

  /**
   * Path to tsconfig.json for TypeScript project.
   * Required for resource resolution (discovering custom elements, etc.).
   *
   * When provided, the plugin will:
   * - Parse the TypeScript project to discover Aurelia resources
   * - Build a ResourceGraph for template compilation
   * - Enable user-defined components in SSR output
   *
   * @example './tsconfig.json'
   */
  tsconfig?: string;

  /**
   * State provider function.
   * Called for each SSR request to provide initial component state.
   *
   * @default () => ({})
   */
  state?: StateProvider;

  /**
   * Strip `<!--au-->` hydration markers from output.
   * When true, produces clean HTML without Aurelia-specific comments.
   *
   * @default false
   */
  stripMarkers?: boolean;

  /**
   * Routes to include for SSR rendering.
   * Glob patterns that match request paths.
   *
   * @example ['/', '/app/**', '/dashboard/**']
   * @default ['**'] (all routes)
   */
  include?: string[];

  /**
   * Routes to exclude from SSR rendering.
   * Glob patterns that match request paths to skip.
   *
   * @example ['/api/**', '/static/**']
   * @default ['/api/**', '/@vite/**', '/@fs/**', '/__vite_ping']
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
   * Static Site Generation options.
   * When enabled, generates static HTML pages for all discovered routes.
   */
  ssg?: SSGOptions;

  /**
   * SSR entry point for production builds.
   * Path to the file that exports an SSR handler (created with createSSRHandler).
   *
   * When specified, the plugin will:
   * 1. Build the SSR entry point for Node.js
   * 2. Use it for SSG generation (if enabled)
   *
   * @example './src/entry-server.ts'
   */
  ssrEntry?: string;

  /**
   * Hook to register DI services before rendering.
   *
   * **Note:** This is a naive first-pass API. In a real app, the client's `main.ts`
   * registers things on `Aurelia.register()`. Ideally, SSR would mirror that
   * automatically, but the boundaries aren't clean. For now, use this to manually
   * register whatever your client app registers that isn't already handled.
   * This API will likely evolve.
   *
   * @param container - The DI container to register services into
   * @param request - Request context (URL, baseHref) for URL-aware services like router
   *
   * @example
   * ```typescript
   * register: (container, req) => {
   *   const locationManager = new ServerLocationManager(req.url, req.baseHref);
   *   container.register(Registration.instance(ILocationManager, locationManager));
   * }
   * ```
   */
  register?: (container: IContainer, request: SSRRequestContext) => void;

  /**
   * Enable compilation tracing for performance analysis and debugging.
   *
   * When enabled, traces template compilation, SSR rendering, and resolution.
   * Useful for:
   * - Performance profiling during development
   * - Build analysis in CI/CD pipelines
   * - Debugging slow compilations
   *
   * Can also be enabled via AURELIA_TRACE environment variable.
   *
   * @example
   * ```typescript
   * // Enable console tracing (default)
   * trace: true
   *
   * // Enable with custom options
   * trace: {
   *   output: 'console',
   *   minDuration: 1, // Only log spans > 1ms
   * }
   *
   * // Write JSON trace to file
   * trace: {
   *   output: 'json',
   *   file: 'aurelia-trace.json',
   * }
   * ```
   */
  trace?: boolean | TraceOptions;
}

/**
 * Trace output destination.
 */
export type TraceOutput = "console" | "json" | "silent";

/**
 * Options for compilation tracing.
 */
export interface TraceOptions {
  /**
   * Where to output trace data.
   * - 'console': Log to terminal with colors (default)
   * - 'json': Write to JSON file
   * - 'silent': Collect but don't output (for programmatic access)
   *
   * @default 'console'
   */
  output?: TraceOutput;

  /**
   * Minimum span duration (in milliseconds) to include in output.
   * Shorter spans are filtered out to reduce noise.
   *
   * @default 0 (include all)
   */
  minDuration?: number;

  /**
   * File path for JSON output (when output='json').
   * Relative to project root.
   *
   * @default 'aurelia-trace.json'
   */
  file?: string;

  /**
   * Whether to include events in output.
   * Events are point-in-time markers within spans.
   *
   * @default true
   */
  includeEvents?: boolean;

  /**
   * Log a summary after each request (dev mode) or build (prod mode).
   *
   * @default true
   */
  summary?: boolean;
}

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
 * Resolved options with defaults applied.
 * Used internally by the plugin.
 */
export interface ResolvedSSROptions {
  entry: string;
  state: StateProvider;
  stripMarkers: boolean;
  include: string[];
  exclude: string[];
  htmlShell: string;
  /** Resolution context (when tsconfig is provided) */
  resolution: ResolutionContext | null;
  /** Base href for routing */
  baseHref: string;
  /** DI registration hook */
  register?: (container: IContainer, request: SSRRequestContext) => void;
  /** SSG options */
  ssg: ResolvedSSGOptions;
  /** Discovered route tree (when ssg.enabled and tsconfig provided) */
  routeTree: RouteTree | null;
  /** SSR entry point path (resolved, or null if not configured) */
  ssrEntry: string | null;
  /** Trace options */
  trace: ResolvedTraceOptions;
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
