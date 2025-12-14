/**
 * Vite SSR Plugin Types
 *
 * Type definitions for the Aurelia SSR Vite plugin.
 */

import type { IncomingMessage } from "node:http";
import type { IContainer } from "@aurelia/kernel";
import type { ResourceGraph, ResourceScopeId, Semantics } from "@aurelia-ls/domain";
import type { ResolutionResult, TemplateInfo } from "@aurelia-ls/resolution";

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
   * Strip `au-hid` hydration markers from output.
   * When true, produces clean HTML without Aurelia-specific attributes.
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
   * Hook to register DI services before rendering.
   *
   * **Note:** This is a naive first-pass API. In a real app, the client's `main.ts`
   * registers things on `Aurelia.register()`. Ideally, SSR would mirror that
   * automatically, but the boundaries aren't clean. For now, use this to manually
   * register whatever your client app registers that isn't already handled.
   * This API will likely evolve.
   *
   * @example
   * ```typescript
   * register: (container) => {
   *   container.register(RouterConfiguration);
   * }
   * ```
   */
  register?: (container: IContainer) => void;
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
  register?: (container: IContainer) => void;
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
