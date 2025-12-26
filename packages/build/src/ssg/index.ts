/**
 * Static Site Generation Module
 *
 * Provides SSG capabilities for the Aurelia Vite plugin.
 * Uses route discovery to enumerate pages and SSR for rendering.
 */

export type {
  SSGOptions,
  ResolvedSSGOptions,
  SSGResult,
  SSGError,
  ExpandedRoute,
} from "./types.js";

export {
  generateStaticSite,
  createStaticPathsResolver,
  expandPath,
  collectStaticRoutes,
  type RenderFn,
  type StaticPathsResolver,
} from "./generator.js";
