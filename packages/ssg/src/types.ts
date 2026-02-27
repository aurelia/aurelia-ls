import type { ParameterizedRoute, RouteTree } from "@aurelia-ls/compiler/project-semantics/routes/types.js";
/**
 * SSG configuration options.
 */
export interface SSGOptions {
  /**
   * Enable static site generation.
   * When true, generates static HTML pages for all discovered routes.
   * @default false
   */
  enabled?: boolean;

  /**
   * Entry points for route discovery.
   * Class names of components that define routes (e.g., ['App', 'Shell']).
   * If not provided, auto-discovers components with route configurations.
   */
  entryPoints?: string[];

  /**
   * Output directory for static files.
   * Relative to Vite's build.outDir.
   * @default '.'
   */
  outDir?: string;

  /**
   * Fallback page for client-side routing.
   * Set to false to disable, or a path like '404.html'.
   * @default '404.html'
   */
  fallback?: string | false;

  /**
   * Hook to provide additional routes not discoverable statically.
   * Useful for routes from CMS, database, or external APIs.
   */
  additionalRoutes?: () => string[] | Promise<string[]>;

  /**
   * Hook called before rendering each route.
   * Can return props to pass to the component.
   */
  onBeforeRender?: (route: string) => Record<string, unknown> | Promise<Record<string, unknown>>;

  /**
   * Hook called after rendering each route.
   * Receives the rendered HTML for post-processing.
   */
  onAfterRender?: (route: string, html: string) => string | Promise<string>;
}

/**
 * Resolved SSG options with defaults applied.
 */
export interface ResolvedSSGOptions {
  enabled: boolean;
  entryPoints: string[];
  outDir: string;
  fallback: string | false;
  additionalRoutes?: () => string[] | Promise<string[]>;
  onBeforeRender?: (route: string) => Record<string, unknown> | Promise<Record<string, unknown>>;
  onAfterRender?: (route: string, html: string) => string | Promise<string>;
}

/**
 * Result of static site generation.
 */
export interface SSGResult {
  /** Route tree used for generation */
  routeTree: RouteTree;
  /** Generated pages (route -> file path) */
  pages: Map<string, string>;
  /** Routes that failed to generate */
  errors: SSGError[];
  /** Parameterized routes that were expanded */
  expandedRoutes: ExpandedRoute[];
}

/**
 * An error that occurred during SSG.
 */
export interface SSGError {
  route: string;
  error: Error;
}

/**
 * A parameterized route that was expanded to static paths.
 */
export interface ExpandedRoute {
  /** The parameterized route (e.g., /products/:id) */
  parameterizedRoute: ParameterizedRoute;
  /** The static paths generated (e.g., ['/products/1', '/products/2']) */
  staticPaths: string[];
  /** Source of the paths (getStaticPaths or fallback) */
  source: "getStaticPaths" | "fallback";
}
