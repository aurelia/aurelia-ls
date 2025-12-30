/**
 * @aurelia-ls/ssg - Static site generation for Aurelia applications
 *
 * This package provides static site generation capabilities,
 * pre-rendering routes at build time for optimal performance.
 *
 * Primary exports:
 * - generateStaticSite() - Main SSG entry point
 * - createStaticPathsResolver() - Route discovery utilities
 * - expandPath() - Dynamic path expansion
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
