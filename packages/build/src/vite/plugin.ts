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
import { resolve, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { normalizePathForId } from "@aurelia-ls/domain";
import {
  transform,
  transformEntryPoint,
  analyzeEntryPoint,
  type ResourceDefinition,
} from "@aurelia-ls/transform";
import { createSSRMiddleware } from "./middleware.js";
import { createResolutionContext, discoverRoutes } from "./resolution.js";
import { componentCache } from "./loader.js";
import { compileWithAot } from "../aot.js";
import { generateStaticSite, type SSGResult } from "../ssg/index.js";
import type { AureliaSSRPluginOptions, ResolvedSSROptions, ResolutionContext } from "./types.js";
import type { TemplateInfo, RouteTree } from "@aurelia-ls/resolution";

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
 * Transform a component file to inject $au definition.
 */
function transformComponent(
  code: string,
  id: string,
  templateInfo: TemplateInfo,
  resolutionContext: ResolutionContext,
  config: ResolvedConfig,
): { code: string; map: null } | null {
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

    config.logger.info(
      `[aurelia-ssr] Transformed: ${templateInfo.className} (${result.meta.expressionCount} expressions, ${result.meta.instructionRowCount} targets)`,
    );

    // Log any warnings
    for (const warning of result.warnings) {
      config.logger.warn(
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
    config.logger.error(
      `[aurelia-ssr] Transform failed for ${templateInfo.className}: ${errorMessage}`,
    );
    // Return original code on error to allow fallback to runtime behavior
    return null;
  }
}

/**
 * Transform an entry point file to use AotConfiguration for tree-shaking.
 */
function transformEntryPointIfNeeded(
  code: string,
  id: string,
  config: ResolvedConfig,
): { code: string; map: null } | null {
  // Quick check: does this file contain Aurelia imports?
  if (!code.includes("aurelia") && !code.includes("@aurelia/")) {
    return null;
  }

  try {
    // Analyze the entry point
    const analysis = analyzeEntryPoint(code);

    // Only transform if StandardConfiguration is detected
    if (!analysis.hasStandardConfiguration) {
      return null;
    }

    // Transform the entry point
    const result = transformEntryPoint({
      source: code,
      filePath: id,
    });

    if (result.transformed) {
      config.logger.info(
        `[aurelia-ssr] Entry point transformed: ${id} (${analysis.preservedRegistrations.length} registrations preserved)`,
      );

      // Log any warnings
      for (const warning of result.warnings) {
        config.logger.warn(
          `[aurelia-ssr] ${warning}`,
        );
      }

      return {
        code: result.code,
        map: null,
      };
    }

    if (result.skipReason) {
      config.logger.info(
        `[aurelia-ssr] Entry point not transformed: ${result.skipReason}`,
      );
    }

    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    config.logger.error(
      `[aurelia-ssr] Entry point transform failed for ${id}: ${errorMessage}`,
    );
    return null;
  }
}

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
  let routeTree: RouteTree | null = null;

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

      // Resolve SSG options
      const ssgOptions = options.ssg ?? {};
      const resolvedSSG = {
        enabled: ssgOptions.enabled ?? false,
        entryPoints: ssgOptions.entryPoints ?? [],
        outDir: ssgOptions.outDir ?? ".",
        fallback: ssgOptions.fallback ?? "404.html",
        additionalRoutes: ssgOptions.additionalRoutes,
        onBeforeRender: ssgOptions.onBeforeRender,
        onAfterRender: ssgOptions.onAfterRender,
      };

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
        ssg: resolvedSSG,
        routeTree: null, // Will be set after route discovery
      };

      config.logger.info(
        `[aurelia-ssr] Configured with entry: ${entry}`,
      );

      if (resolvedSSG.enabled) {
        config.logger.info("[aurelia-ssr] SSG enabled");
      }

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

            // Discover routes if SSG is enabled
            if (resolvedSSG.enabled) {
              routeTree = discoverRoutes(tsconfigPath, resolvedSSG.entryPoints, logger);
              resolvedOptions.routeTree = routeTree;
              if (routeTree) {
                config.logger.info(
                  `[aurelia-ssr] Route discovery: ${routeTree.allStaticPaths.length} static, ` +
                  `${routeTree.parameterizedRoutes.length} parameterized`,
                );
              }
            }
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
     * It also handles entry point files (main.ts) to replace StandardConfiguration
     * with AotConfiguration for tree-shaking.
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

      // If this is an Aurelia component with external template, transform it
      if (templateInfo) {
        return transformComponent(code, id, templateInfo, resolutionContext, resolvedConfig);
      }

      // Check if this is an entry point file (contains Aurelia initialization)
      // Only transform entry points in production builds for tree-shaking
      if (resolvedConfig.command === "build") {
        return transformEntryPointIfNeeded(code, id, resolvedConfig);
      }

      return null;
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

    /**
     * Generate static pages after build completes.
     * Only runs when SSG is enabled and in production build.
     */
    async closeBundle() {
      // Only run SSG in production builds
      if (resolvedConfig.command !== "build") {
        return;
      }

      // Check if SSG is enabled
      if (!resolvedOptions.ssg.enabled) {
        return;
      }

      // Ensure resolution completed
      if (resolutionPromise) {
        await resolutionPromise;
      }

      // Check we have route tree
      if (!routeTree) {
        resolvedConfig.logger.warn(
          "[aurelia-ssr] SSG enabled but no routes discovered. " +
          "Ensure tsconfig is configured and route components are found.",
        );
        return;
      }

      resolvedConfig.logger.info("[aurelia-ssr] Starting SSG...");

      // Calculate output directory
      const outDir = join(
        resolvedConfig.build.outDir,
        resolvedOptions.ssg.outDir,
      );

      // Create render function that uses SSR pipeline
      const render = async (route: string, _props?: Record<string, unknown>): Promise<string> => {
        // TODO: Implement SSG rendering
        // This requires creating a new Vite server or reusing the build
        // For now, return a placeholder
        resolvedConfig.logger.warn(
          `[aurelia-ssr] SSG render not yet implemented for: ${route}`,
        );
        return `<!-- SSG placeholder for ${route} -->`;
      };

      // Create static paths resolver
      const resolveStaticPaths = async (): Promise<string[]> => {
        // TODO: Implement getStaticPaths resolution
        return [];
      };

      // Generate static site
      const result: SSGResult = await generateStaticSite(
        routeTree,
        resolvedOptions.ssg,
        outDir,
        render,
        resolveStaticPaths,
      );

      // Log results
      resolvedConfig.logger.info(
        `[aurelia-ssr] SSG complete: ${result.pages.size} pages generated`,
      );

      if (result.errors.length > 0) {
        for (const error of result.errors) {
          resolvedConfig.logger.error(
            `[aurelia-ssr] SSG error for ${error.route}: ${error.error.message}`,
          );
        }
      }

      if (result.expandedRoutes.length > 0) {
        for (const expanded of result.expandedRoutes) {
          resolvedConfig.logger.info(
            `[aurelia-ssr] Expanded ${expanded.parameterizedRoute.fullPath} → ${expanded.staticPaths.length} pages`,
          );
        }
      }
    },
  };
}
