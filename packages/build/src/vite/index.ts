/**
 * @aurelia-ls/build/vite - Vite SSR Plugin for Aurelia
 *
 * This module provides a Vite plugin for server-side rendering
 * Aurelia applications during development.
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'vite';
 * import aurelia from '@aurelia/vite-plugin';
 * import { aureliaSSR } from '@aurelia-ls/build/vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     aurelia({ useDev: true }),
 *     aureliaSSR({
 *       entry: './src/my-app.html',
 *       state: async (url) => ({ path: url.pathname }),
 *     }),
 *   ],
 * });
 * ```
 */

// Main plugin export
export { aureliaSSR } from "./plugin.js";

// Component loading utilities
export {
  loadProjectComponents,
  loadComponent,
  type LoadedComponent,
  type LoadProjectComponentsResult,
} from "./loader.js";

// Type exports
export type {
  AureliaSSRPluginOptions,
  StateProvider,
  ResolvedSSROptions,
  ResolutionContext,
} from "./types.js";
