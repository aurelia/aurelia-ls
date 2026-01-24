/**
 * Static Site Generator
 *
 * Generates static HTML pages for all discovered routes.
 * Uses route discovery from the resolution package and the SSR
 * rendering pipeline to produce pre-rendered pages.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { RouteTree, RouteNode, ParameterizedRoute } from "@aurelia-ls/compiler";
import type { ResolvedSSGOptions, SSGResult, SSGError, ExpandedRoute } from "./types.js";

/**
 * Render function signature.
 * Provided by the Vite plugin to render a route.
 */
export type RenderFn = (route: string, props?: Record<string, unknown>) => Promise<string>;

/**
 * Static paths resolver signature.
 * Called to get static paths for a parameterized route.
 */
export type StaticPathsResolver = (
  route: ParameterizedRoute,
) => Promise<string[]>;

/**
 * Generate static pages for all routes in the route tree.
 */
export async function generateStaticSite(
  routeTree: RouteTree,
  options: ResolvedSSGOptions,
  outDir: string,
  render: RenderFn,
  resolveStaticPaths: StaticPathsResolver,
): Promise<SSGResult> {
  const pages = new Map<string, string>();
  const errors: SSGError[] = [];
  const expandedRoutes: ExpandedRoute[] = [];

  // Collect all routes to render
  const routesToRender: string[] = [];

  // 1. Add static paths from route tree
  for (const path of routeTree.allStaticPaths) {
    routesToRender.push(path);
  }

  // 2. Expand parameterized routes
  for (const paramRoute of routeTree.parameterizedRoutes) {
    const staticPaths = await resolveStaticPaths(paramRoute);

    if (staticPaths.length > 0) {
      expandedRoutes.push({
        parameterizedRoute: paramRoute,
        staticPaths,
        source: paramRoute.hasStaticPaths ? "getStaticPaths" : "fallback",
      });

      for (const path of staticPaths) {
        routesToRender.push(path);
      }
    }
  }

  // 3. Add additional routes from hook
  if (options.additionalRoutes) {
    const additional = await options.additionalRoutes();
    for (const path of additional) {
      if (!routesToRender.includes(path)) {
        routesToRender.push(path);
      }
    }
  }

  // 4. Render each route
  for (const route of routesToRender) {
    try {
      // Get props from hook
      const props = options.onBeforeRender
        ? await options.onBeforeRender(route)
        : undefined;

      // Render the route
      let html = await render(route, props);

      // Post-process with hook
      if (options.onAfterRender) {
        html = await options.onAfterRender(route, html);
      }

      // Determine output path
      const filePath = routeToFilePath(route, outDir);

      // Ensure directory exists
      await mkdir(dirname(filePath), { recursive: true });

      // Write file
      await writeFile(filePath, html, "utf-8");

      pages.set(route, filePath);
    } catch (error) {
      errors.push({
        route,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  // 5. Generate fallback page if configured
  if (options.fallback) {
    try {
      // Render 404 page at the fallback route
      const html = await render("/404");
      const filePath = join(outDir, options.fallback);
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, html, "utf-8");
      pages.set("/404", filePath);
    } catch {
      // Fallback page is optional, don't add to errors
    }
  }

  return {
    routeTree,
    pages,
    errors,
    expandedRoutes,
  };
}

/**
 * Convert a route path to a file path.
 *
 * Examples:
 * - "/" -> "index.html"
 * - "/about" -> "about/index.html"
 * - "/products/123" -> "products/123/index.html"
 */
function routeToFilePath(route: string, outDir: string): string {
  // Normalize route
  let normalized = route.startsWith("/") ? route.slice(1) : route;

  // Root path
  if (normalized === "") {
    return join(outDir, "index.html");
  }

  // Remove trailing slash
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  // Check if route ends with a file extension
  if (/\.[a-zA-Z0-9]+$/.test(normalized)) {
    return join(outDir, normalized);
  }

  // Create directory structure with index.html
  return join(outDir, normalized, "index.html");
}

/**
 * Expand parameterized routes by calling component's getStaticPaths.
 */
export function createStaticPathsResolver(
  loadComponent: (className: string) => Promise<{ getStaticPaths?: () => Promise<StaticPathsResult> } | null>,
): StaticPathsResolver {
  return async (route: ParameterizedRoute): Promise<string[]> => {
    // If component doesn't have getStaticPaths, skip
    if (!route.hasStaticPaths) {
      return [];
    }

    // We need to find the component class for this route
    // This requires walking the route tree to find the component
    // For now, return empty - the caller should provide a custom resolver
    return [];
  };
}

/**
 * Result from a component's getStaticPaths method.
 */
interface StaticPathsResult {
  paths: Array<{ params: Record<string, string> }>;
}

/**
 * Expand a parameterized path with concrete param values.
 *
 * Example:
 * - fullPath: "/products/:id"
 * - params: { id: "123" }
 * - returns: "/products/123"
 */
export function expandPath(
  fullPath: string,
  params: Record<string, string>,
): string {
  let result = fullPath;

  for (const [key, value] of Object.entries(params)) {
    // Replace :key and :key? patterns
    result = result.replace(new RegExp(`:${key}\\??`, "g"), value);
  }

  return result;
}

/**
 * Collect all static routes from a route tree.
 * Returns routes that don't have parameters.
 */
export function collectStaticRoutes(nodes: readonly RouteNode[]): string[] {
  const routes: string[] = [];

  for (const node of nodes) {
    // Skip redirects
    if (node.redirectTo !== undefined) {
      continue;
    }

    // Check if path has parameters
    const pathStr = typeof node.path === "string" ? node.path : node.path[0] ?? "";
    const hasParams = pathStr.includes(":");

    if (!hasParams) {
      routes.push(node.fullPath);

      // Handle path aliases
      if (Array.isArray(node.path)) {
        for (let i = 1; i < node.path.length; i++) {
          const alias = node.path[i]!;
          const aliasPath = node.fullPath.replace(
            new RegExp(`${node.path[0]}$`),
            alias,
          );
          routes.push(aliasPath);
        }
      }
    }

    // Recurse into children
    if (node.children.length > 0) {
      routes.push(...collectStaticRoutes(node.children));
    }
  }

  return routes;
}
