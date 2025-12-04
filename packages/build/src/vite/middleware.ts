/**
 * SSR Middleware for Vite Dev Server
 *
 * This middleware intercepts HTML requests and renders the Aurelia
 * application server-side using the AOT compilation pipeline.
 */

import type { Connect, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { compileAndRenderAot, type AotCompileResult } from "../aot.js";
import type { HydrationManifest } from "../ssr/ssr-processor.js";
import type { ResolvedSSROptions } from "./types.js";

/**
 * Create SSR middleware for Vite dev server.
 *
 * The middleware:
 * 1. Checks if the request should be SSR'd (matching include/exclude)
 * 2. Loads the entry template
 * 3. Calls the state provider
 * 4. Renders via AOT compilation
 * 5. Injects into HTML shell and responds
 */
export function createSSRMiddleware(
  server: ViteDevServer,
  options: ResolvedSSROptions,
): Connect.NextHandleFunction {
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
      // Load template fresh (supports HMR-like behavior)
      const template = await readFile(options.entry, "utf-8");

      // Build URL object for state provider
      const host = req.headers.host ?? "localhost";
      const protocol = "http"; // Dev server is typically HTTP
      const fullUrl = new URL(url, `${protocol}://${host}`);

      // Get state from provider
      const state = await options.state(fullUrl, req);

      // Render with AOT pipeline
      const result = await compileAndRenderAot(template, {
        state,
        name: "ssr-root",
        ssr: {
          stripMarkers: options.stripMarkers,
        },
      });

      // Build full HTML response with serialized state, AOT definition, and manifest
      const html = injectIntoShell(
        options.htmlShell,
        result.html,
        state,
        result.aot,
        result.manifest,
      );

      // Send response
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      res.end(html);

      // Log for debugging
      server.config.logger.info(`[aurelia-ssr] Rendered ${url}`, {
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
 * Inject SSR content, state, AOT definition, and manifest into HTML shell.
 */
function injectIntoShell(
  shell: string,
  content: string,
  state: Record<string, unknown>,
  aot: AotCompileResult,
  manifest?: HydrationManifest,
): string {
  let html = shell;

  // Inject SSR content at outlet marker
  const contentMarker = "<!--ssr-outlet-->";
  if (html.includes(contentMarker)) {
    html = html.replace(contentMarker, content);
  } else if (html.includes("</body>")) {
    html = html.replace("</body>", `${content}</body>`);
  }

  // Inject serialized state, AOT definition, and manifest for client hydration
  const stateMarker = "<!--ssr-state-->";
  if (html.includes(stateMarker)) {
    const serializedState = serializeState(state);

    // Serialize AOT definition for client hydration
    // Instructions are data-only objects, can be serialized directly
    const aotDef = JSON.stringify({
      template: aot.template, // Template HTML with markers - needed for target collection
      instructions: aot.instructions,
      nestedDefs: aot.nestedDefs,
      targetCount: aot.targetCount,
    });

    // Build script with all hydration data
    let script = `<script>
window.__SSR_STATE__=${serializedState};
window.__AU_DEF__=${aotDef};`;

    if (manifest) {
      script += `
window.__AU_MANIFEST__=${JSON.stringify(manifest)};`;
    }

    script += `
</script>`;

    html = html.replace(stateMarker, script);
  }

  return html;
}

/**
 * Serialize state to JSON, stripping non-serializable values (functions, getters).
 */
function serializeState(state: Record<string, unknown>): string {
  // Get only own enumerable properties that are not functions
  const serializable: Record<string, unknown> = {};

  for (const key of Object.keys(state)) {
    const descriptor = Object.getOwnPropertyDescriptor(state, key);
    // Skip getters and functions
    if (descriptor?.get !== undefined) continue;

    const value = state[key];
    if (typeof value === "function") continue;

    serializable[key] = value;
  }

  return JSON.stringify(serializable);
}
