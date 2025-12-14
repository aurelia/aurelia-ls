/**
 * Aurelia SSR Vite Plugin
 *
 * A Vite plugin that provides server-side rendering for Aurelia applications
 * during development. Add this plugin to your vite.config.ts alongside
 * @aurelia/vite-plugin.
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

import type { Plugin, ResolvedConfig } from "vite";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { createSSRMiddleware } from "./middleware.js";
import { createResolutionContext } from "./resolution.js";
import { componentCache } from "./loader.js";
import type { AureliaSSRPluginOptions, ResolvedSSROptions, ResolutionContext } from "./types.js";

/**
 * Default HTML shell for SSR output.
 * Contains the basic structure with a script tag to load the client bundle.
 */
const DEFAULT_HTML_SHELL = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aurelia SSR</title>
</head>
<body>
  <!--ssr-outlet-->
  <script type="module" src="/src/main.ts"></script>
</body>
</html>`;

/**
 * Default routes to exclude from SSR.
 * These are Vite internals and API routes.
 */
const DEFAULT_EXCLUDE = [
  "/api/**",
  "/@vite/**",
  "/@fs/**",
  "/__vite_ping",
  "/node_modules/**",
];

/**
 * Create the Aurelia SSR Vite plugin.
 *
 * @param options - Plugin configuration options
 * @returns Vite plugin
 */
export function aureliaSSR(options: AureliaSSRPluginOptions = {}): Plugin {
  let resolvedConfig: ResolvedConfig;
  let resolvedOptions: ResolvedSSROptions;
  let resolutionContext: ResolutionContext | null = null;
  let resolutionPromise: Promise<ResolutionContext | null> | null = null;

  return {
    name: "aurelia-ssr",

    // Run after other plugins (like @aurelia/vite-plugin)
    enforce: "post",

    /**
     * Store resolved config and validate options.
     */
    configResolved(config) {
      resolvedConfig = config;

      // Resolve entry path
      const entry = resolve(
        config.root,
        options.entry ?? "./src/my-app.html",
      );

      // Validate entry exists
      if (!existsSync(entry)) {
        config.logger.warn(
          `[aurelia-ssr] Entry template not found: ${entry}`,
        );
      }

      // Build resolved options with defaults (resolution context added later)
      resolvedOptions = {
        entry,
        state: options.state ?? (() => ({})),
        stripMarkers: options.stripMarkers ?? false,
        include: options.include ?? ["**"],
        exclude: options.exclude ?? DEFAULT_EXCLUDE,
        htmlShell: options.htmlShell ?? DEFAULT_HTML_SHELL,
        resolution: null, // Will be set after async initialization
        baseHref: options.baseHref ?? "/",
        register: options.register,
      };

      config.logger.info(
        `[aurelia-ssr] Configured with entry: ${entry}`,
      );

      // Start resolution initialization if tsconfig provided
      if (options.tsconfig) {
        const tsconfigPath = resolve(config.root, options.tsconfig);
        const logger = {
          info: (msg: string) => config.logger.info(msg),
          warn: (msg: string) => config.logger.warn(msg),
          error: (msg: string) => config.logger.error(msg),
        };

        // Start async resolution (will complete before first request)
        resolutionPromise = createResolutionContext(tsconfigPath, logger).then((ctx) => {
          resolutionContext = ctx;
          resolvedOptions.resolution = ctx;
          if (ctx) {
            config.logger.info("[aurelia-ssr] Resource resolution ready");
          }
          return ctx;
        });
      }
    },

    /**
     * Add SSR middleware to dev server.
     * Middleware is added directly (not returning a function) so it runs
     * BEFORE Vite's built-in HTML handling.
     */
    configureServer(server) {
      // Add middleware directly (before Vite's internal middleware)
      // The middleware will wait for resolution if needed
      server.middlewares.use(
        createSSRMiddleware(server, resolvedOptions, () => resolutionPromise),
      );

      server.config.logger.info(
        "[aurelia-ssr] SSR middleware registered",
      );

      // =================================================================
      // HMR Cache Invalidation
      // =================================================================
      // When template or component files change, invalidate the component
      // cache so they get re-compiled and re-patched on next request.
      // This is critical because:
      // 1. Vite's ssrLoadModule returns fresh classes when files change
      // 2. Our cache holds the old class references with old patches
      // 3. Without invalidation, we'd serve stale content after edits

      server.watcher.on("change", (filePath) => {
        // Only process component-related files
        if (!filePath.endsWith(".html") && !filePath.endsWith(".ts")) {
          return;
        }

        // Try to invalidate the component cache
        const invalidated = componentCache.invalidate(filePath);
        if (invalidated) {
          server.config.logger.info(
            `[aurelia-ssr] Cache invalidated: ${filePath}`,
          );
        }
      });

      // Also invalidate on module unlink/add
      server.watcher.on("unlink", (filePath) => {
        componentCache.invalidate(filePath);
      });

      // When Vite's SSR module is invalidated, also clear our cache
      // This handles cases where Vite detects changes we might miss
      const originalInvalidateModule = server.moduleGraph.invalidateModule.bind(server.moduleGraph);
      server.moduleGraph.invalidateModule = (mod, seen, timestamp, isHmr) => {
        // If this is an SSR module that we might have cached, invalidate it
        if (mod.file) {
          const invalidated = componentCache.invalidate(mod.file);
          if (invalidated) {
            server.config.logger.info(
              `[aurelia-ssr] Cache invalidated via module graph: ${mod.file}`,
            );
          }
        }
        return originalInvalidateModule(mod, seen, timestamp, isHmr);
      };
    },
  };
}
