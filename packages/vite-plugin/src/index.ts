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
 * import { defineConfig } from 'vite';
 * import aurelia from '@aurelia/vite-plugin';
 * import { aureliaSSR } from '@aurelia-ls/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [
 *     aurelia({ useDev: true }),
 *     aureliaSSR({
 *       entry: './src/my-app.html',
 *       tsconfig: './tsconfig.json',
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
  TraceOptions,
  TraceOutput,
  ResolvedTraceOptions,
} from "./types.js";

// Re-export SSG types for convenience
export type {
  SSGOptions,
  ResolvedSSGOptions,
  SSGResult,
  SSGError,
  ExpandedRoute,
} from "@aurelia-ls/ssg";
