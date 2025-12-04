/**
 * Vite SSR Plugin Types
 *
 * Type definitions for the Aurelia SSR Vite plugin.
 */

import type { IncomingMessage } from "node:http";

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
}
