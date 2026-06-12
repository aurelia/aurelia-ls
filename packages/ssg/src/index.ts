/**
 * Public package root for static site generation helpers.
 *
 * The package manifest exports `out/index.*`, so clean checkouts must emit a
 * source-backed root barrel instead of relying on stale local build output.
 */

export type {
  ExpandedRoute,
  ResolvedSSGOptions,
  SSGError,
  SSGOptions,
  SSGResult,
} from "./types.js";

export {
  collectStaticRoutes,
  createStaticPathsResolver,
  expandPath,
  generateStaticSite,
  type RenderFn,
  type StaticPathsResolver,
} from "./generator.js";
