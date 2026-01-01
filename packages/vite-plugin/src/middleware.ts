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
 *
 * IMPORTANT: The SSR renderer is loaded dynamically via ssrLoadModule to ensure
 * it shares the same module cache as user components. This prevents dual-module
 * hazard where Node's loader and Vite's SSR loader create separate instances
 * of @aurelia/kernel (each with its own currentContainer global).
 */

import type { Connect, ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
// NOTE: We import TYPES only from @aurelia-ls/ssr - the actual module is loaded
// dynamically via ssrLoadModule to share module instances with user components
import type { AotCompileResult, RenderOptions, RenderResult, ComponentClass } from "@aurelia-ls/ssr";
import type { ISSRManifest } from "@aurelia/runtime-html";
import type { PluginState, ResolutionContext } from "./types.js";
import { loadProjectComponents } from "./loader.js";
import { createRequestTrace } from "./trace.js";

// Type for the dynamically loaded SSR module
interface SSRModule {
  renderWithComponents: (component: ComponentClass, options?: RenderOptions) => Promise<RenderResult>;
}

// Type for the dynamically loaded register module
interface RegisterModule {
  register: RenderOptions["register"];
}

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
  options: PluginState,
  getResolutionPromise?: () => Promise<ResolutionContext | null> | null,
): Connect.NextHandleFunction {
  // Track if resolution has been awaited
  let resolutionReady = false;

  // Cache for the dynamically loaded SSR module
  // Loaded via ssrLoadModule to share module instances with user components
  let ssrModule: SSRModule | null = null;

  // Cache for the dynamically loaded register module
  // This ensures Aurelia imports in the register module go through Vite's resolver
  let registerModuleCache: RegisterModule | null = null;

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

    // Create request trace if tracing is enabled
    const requestTrace = options.trace.enabled
      ? createRequestTrace(url, options.trace, {
          info: (msg) => server.config.logger.info(msg),
        })
      : null;

    try {
      // Wait for resolution to complete on first request
      if (!resolutionReady && getResolutionPromise) {
        const promise = getResolutionPromise();
        if (promise) {
          await promise;
        }
        resolutionReady = true;
      }

      // Load SSR module dynamically via Vite's ssrLoadModule
      // This ensures it shares module instances with user components,
      // preventing dual-module hazard with @aurelia/kernel's currentContainer
      if (!ssrModule) {
        ssrModule = await server.ssrLoadModule("@aurelia-ls/ssr") as SSRModule;
      }

      // Load register module dynamically if specified
      // This ensures all Aurelia imports in the register module go through
      // Vite's resolver with proper aliases, avoiding dual-module hazard
      if (options.register && !registerModuleCache) {
        registerModuleCache = await server.ssrLoadModule(options.register) as RegisterModule;
        if (!registerModuleCache.register) {
          throw new Error(
            `[aurelia-ssr] register module "${options.register}" must export a 'register' function`
          );
        }
      }

      // Get the register function from the loaded module
      const registerFn = registerModuleCache?.register;

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
        requestTrace?.trace.event("ssr.loadComponents");
        const { root, children } = await loadProjectComponents(
          server,
          resolution,
          options.entry,
          requestTrace?.trace,
        );

        if (!root) {
          throw new Error(`[aurelia-ssr] Could not load root component from "${options.entry}"`);
        }

        // Render with real classes (classes have $au from transform hook)
        // Pass request context for URL-aware rendering (routing)
        requestTrace?.trace.event("ssr.render");
        const renderResult = await ssrModule.renderWithComponents(root.ComponentClass, {
          childComponents: children.map((c) => c.ComponentClass),
          ssr: {
            stripMarkers: options.stripMarkers,
          },
          request: {
            url,
            baseHref: options.baseHref,
          },
          register: registerFn,
          trace: requestTrace?.trace,
        });

        requestTrace?.trace.event("ssr.injectShell");
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

      // Finish request trace
      requestTrace?.finish();
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
