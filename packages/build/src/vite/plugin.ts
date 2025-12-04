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
import type { AureliaSSRPluginOptions, ResolvedSSROptions } from "./types.js";

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

      // Build resolved options with defaults
      resolvedOptions = {
        entry,
        state: options.state ?? (() => ({})),
        stripMarkers: options.stripMarkers ?? false,
        include: options.include ?? ["**"],
        exclude: options.exclude ?? DEFAULT_EXCLUDE,
        htmlShell: options.htmlShell ?? DEFAULT_HTML_SHELL,
      };

      config.logger.info(
        `[aurelia-ssr] Configured with entry: ${entry}`,
      );
    },

    /**
     * Add SSR middleware to dev server.
     * Middleware is added directly (not returning a function) so it runs
     * BEFORE Vite's built-in HTML handling.
     */
    configureServer(server) {
      // Add middleware directly (before Vite's internal middleware)
      server.middlewares.use(
        createSSRMiddleware(server, resolvedOptions),
      );

      server.config.logger.info(
        "[aurelia-ssr] SSR middleware registered",
      );
    },
  };
}
