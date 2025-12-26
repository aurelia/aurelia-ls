/**
 * SSR Middleware for Vite Dev Server
 *
 * This middleware intercepts HTML requests and renders the Aurelia
 * application server-side using the AOT compilation pipeline.
 *
 * When resolution is configured (tsconfig provided), uses real component
 * classes loaded via Vite's ssrLoadModule for full child component support.
 *
 * NOTE: Component classes have their $au definitions injected by the Vite
 * transform hook at compile time - no runtime patching needed.
 */

import type { Connect, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AotCompileResult } from "../aot.js";
import { renderWithComponents } from "../ssr/render.js";
import type { ISSRManifest } from "@aurelia/runtime-html";
import type { ResolvedSSROptions, ResolutionContext } from "./types.js";
import { loadProjectComponents } from "./loader.js";

/**
 * Create SSR middleware for Vite dev server.
 *
 * The middleware:
 * 1. Checks if the request should be SSR'd (matching include/exclude)
 * 2. Waits for resolution (if configured) to get ResourceGraph
 * 3. Loads the entry template
 * 4. Calls the state provider
 * 5. Renders via AOT compilation with project resources
 * 6. Injects into HTML shell and responds
 */
export function createSSRMiddleware(
  server: ViteDevServer,
  options: ResolvedSSROptions,
  getResolutionPromise?: () => Promise<ResolutionContext | null> | null,
): Connect.NextHandleFunction {
  // Track if resolution has been awaited
  let resolutionReady = false;

  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: Connect.NextFunction,
  ) => {
    const url = req.url ?? "/";

    // Skip non-GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Skip requests with file extensions (assets)
    if (hasFileExtension(url)) {
      return next();
    }

    // Check include/exclude patterns
    if (!shouldSSR(url, options.include, options.exclude)) {
      return next();
    }

    try {
      // Wait for resolution to complete on first request
      if (!resolutionReady && getResolutionPromise) {
        const promise = getResolutionPromise();
        if (promise) {
          await promise;
        }
        resolutionReady = true;
      }

      // Get resolution context
      const resolution = options.resolution;

      // Build URL object for state provider (used for legacy flow)
      const host = req.headers.host ?? "localhost";
      const protocol = "http";
      const fullUrl = new URL(url, `${protocol}://${host}`);

      let html: string;
      let renderMode: string;

      if (resolution) {
        // NEW FLOW: Use real component classes with child component support
        // Components are loaded and patched ONCE by the loader (cached)
        const { root, children } = await loadProjectComponents(
          server,
          resolution,
          options.entry,
        );

        if (!root) {
          throw new Error(`[aurelia-ssr] Could not load root component from "${options.entry}"`);
        }

        // Render with real classes (classes have $au from transform hook)
        // Pass request context for URL-aware rendering (routing)
        const renderResult = await renderWithComponents(root.ComponentClass, {
          childComponents: children.map((c) => c.ComponentClass),
          ssr: {
            stripMarkers: options.stripMarkers,
          },
          request: {
            url,
            baseHref: options.baseHref,
          },
          register: options.register,
        });

        html = injectIntoShell(
          options.htmlShell,
          renderResult.html,
          root.aot,
          renderResult.manifest,
        );

        renderMode = ` (real classes, ${children.length} children)`;
      } else {
        throw new Error(
          `[aurelia-ssr] Resolution is required. Configure the 'resolution' option in your Vite plugin.`
        );
      }

      // Send response
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      res.end(html);

      // Log for debugging
      server.config.logger.info(`[aurelia-ssr] Rendered ${url}${renderMode}`, {
        timestamp: true,
      });
    } catch (error) {
      // Fix stack trace for better debugging
      server.ssrFixStacktrace(error as Error);

      // Log error
      server.config.logger.error(`[aurelia-ssr] Error rendering ${url}:`, {
        timestamp: true,
        error: error as Error,
      });

      // Pass to error handler
      next(error);
    }
  };
}

/**
 * Check if a URL path should be SSR'd based on include/exclude patterns.
 */
function shouldSSR(
  url: string,
  include: string[],
  exclude: string[],
): boolean {
  // Parse URL to get pathname (strip query string)
  const pathname = url.split("?")[0] ?? url;

  // Check excludes first (they take priority)
  for (const pattern of exclude) {
    if (matchPattern(pathname, pattern)) {
      return false;
    }
  }

  // Check includes
  for (const pattern of include) {
    if (matchPattern(pathname, pattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Simple glob pattern matching.
 * Supports:
 * - ** (match any path segments)
 * - * (match any characters except /)
 * - Exact matches
 */
function matchPattern(path: string, pattern: string): boolean {
  // Convert glob to regex
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special regex chars
    .replace(/\*\*/g, ".*") // ** matches anything
    .replace(/\*/g, "[^/]*"); // * matches anything except /

  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(path);
}

/**
 * Check if URL has a file extension (likely a static asset).
 */
function hasFileExtension(url: string): boolean {
  const pathname = url.split("?")[0] ?? url;
  const lastSegment = pathname.split("/").pop() ?? "";
  // Check if last segment has an extension (contains . followed by letters)
  return /\.[a-zA-Z0-9]+$/.test(lastSegment);
}

/**
 * Inject SSR content, AOT definition, and manifest into HTML shell.
 */
function injectIntoShell(
  shell: string,
  content: string,
  aot: AotCompileResult,
  manifest: ISSRManifest,
): string {
  let html = shell;

  // Inject SSR content at outlet marker
  const contentMarker = "<!--ssr-outlet-->";
  if (html.includes(contentMarker)) {
    html = html.replace(contentMarker, content);
  } else if (html.includes("</body>")) {
    html = html.replace("</body>", `${content}</body>`);
  }

  // Inject serialized AOT definition and manifest for client hydration
  const stateMarker = "<!--ssr-state-->";
  if (html.includes(stateMarker)) {
    // Serialize AOT definition in expression table format
    // This format uses ExprId references instead of embedding ASTs,
    // reducing wire size by ~40% for typical templates.
    // The client hydrator resolves references and builds Aurelia instructions.
    const aotDef = JSON.stringify({
      template: aot.template,
      expressions: aot.raw.codeResult.expressions,
      definition: aot.raw.codeResult.definition,
      nestedHtmlTree: aot.raw.nestedHtmlTree,
    });

    // Build script with hydration data
    // Note: ssrScope is the tree-based manifest that mirrors the controller tree
    const script = `<script>
window.__AU_DEF__=${aotDef};
window.__AU_SSR_SCOPE__=${JSON.stringify(manifest.manifest)};
</script>`;

    html = html.replace(stateMarker, script);
  }

  return html;
}

