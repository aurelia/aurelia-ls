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
import { existsSync, readFileSync } from "node:fs";
import { normalizePathForId, type NormalizedPath } from "@aurelia-ls/domain";
import { transform, type ResourceDefinition } from "@aurelia-ls/transform";
import { createSSRMiddleware } from "./middleware.js";
import { createResolutionContext } from "./resolution.js";
import { componentCache } from "./loader.js";
import { compileWithAot } from "../aot.js";
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
     * Transform TypeScript files to inject AOT-compiled $au definitions.
     *
     * This hook intercepts component source files and:
     * 1. Reads the associated HTML template (if any)
     * 2. Compiles the template with the AOT compiler
     * 3. Transforms the source to inject the static $au definition
     *
     * This replaces the previous runtime patching approach - components
     * now have their $au definitions compiled directly into the source.
     */
    async transform(code, id) {
      // Only process TypeScript files
      if (!id.endsWith(".ts") && !id.endsWith(".tsx")) {
        return null;
      }

      // Skip files that clearly aren't components
      if (id.includes("/node_modules/") || id.includes("/.vite/")) {
        return null;
      }

      // Wait for resolution context if not yet ready
      if (resolutionPromise && !resolutionContext) {
        resolutionContext = await resolutionPromise;
        resolvedOptions.resolution = resolutionContext;
      }

      // No resolution context - can't determine component templates
      if (!resolutionContext) {
        return null;
      }

      // Normalize path for lookup
      const normalizedPath = normalizePathForId(id);

      // Find matching template info
      const templateInfo = resolutionContext.result.templates.find(
        (t) => t.componentPath === normalizedPath,
      );

      // Not an Aurelia component with external template
      if (!templateInfo) {
        return null;
      }

      try {
        // Read the template HTML
        const templateHtml = readFileSync(templateInfo.templatePath, "utf-8");

        // Compile with AOT
        const aot = compileWithAot(templateHtml, {
          templatePath: templateInfo.templatePath,
          name: templateInfo.resourceName,
          semantics: resolutionContext.semantics,
          resourceGraph: resolutionContext.resourceGraph,
          resourceScope: templateInfo.scopeId,
        });

        // Build resource definition for transform
        // Convention is the most common form for external template components
        const resource: ResourceDefinition = {
          kind: "custom-element",
          name: templateInfo.resourceName,
          className: templateInfo.className,
          bindables: [], // TODO: Get bindables from resolution
          declarationForm: "convention",
        };

        // Transform the source to inject $au
        const result = transform({
          source: code,
          filePath: id,
          aot: aot.raw.codeResult,
          resource,
          template: aot.template,
          nestedHtmlTree: aot.raw.nestedHtmlTree,
          removeDecorators: true,
          includeComments: true,
        });

        resolvedConfig.logger.info(
          `[aurelia-ssr] Transformed: ${templateInfo.className} (${result.meta.expressionCount} expressions, ${result.meta.instructionRowCount} targets)`,
        );

        // Log any warnings
        for (const warning of result.warnings) {
          resolvedConfig.logger.warn(
            `[aurelia-ssr] ${warning.message}`,
          );
        }

        return {
          code: result.code,
          // TODO: Add source map support when transform package implements it
          map: null,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        resolvedConfig.logger.error(
          `[aurelia-ssr] Transform failed for ${templateInfo.className}: ${errorMessage}`,
        );
        // Return original code on error to allow fallback to runtime behavior
        return null;
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
