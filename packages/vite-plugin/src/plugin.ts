/**
 * Aurelia Vite Plugin
 *
 * Complete build plugin for Aurelia applications with AOT compilation, SSR, and SSG.
 * This plugin replaces @aurelia/vite-plugin and @aurelia/plugin-conventions.
 *
 * @example
 * ```typescript
 * import { defineConfig } from 'vite';
 * import { aurelia } from '@aurelia-ls/vite-plugin';
 *
 * export default defineConfig({
 *   plugins: [
 *     aurelia({
 *       entry: './src/my-app.html',
 *       ssr: true,
 *     }),
 *   ],
 * });
 * ```
 */

import type { Plugin, ResolvedConfig } from "vite";
import { resolve, join, dirname } from "node:path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { normalizePathForId, debug, extractTemplateMeta, type CompileTrace, type ImportMetaIR } from "@aurelia-ls/compiler";
import {
  transform,
  transformEntryPoint,
  analyzeEntryPoint,
  type ResourceDefinition,
  type TemplateImport,
} from "@aurelia-ls/transform";
import { compileWithAot, isSSRHandler, type SSRHandler } from "@aurelia-ls/ssr";
import { generateStaticSite, type SSGResult } from "@aurelia-ls/ssg";
import { mergeDefines, ssrDefines, type TemplateInfo, type RouteTree } from "@aurelia-ls/resolution";
import { createSSRMiddleware } from "./middleware.js";
import { createResolutionContext, discoverRoutes } from "./resolution.js";
import { componentCache } from "./loader.js";
import { resolveTraceOptions, createBuildTrace, type ManagedTrace } from "./trace.js";
import type { AureliaPluginOptions, PluginState, ResolutionContext, ResolvedTraceOptions } from "./types.js";
import { convertToLocalImports } from "./local-imports.js";

/**
 * Virtual file suffix for Aurelia templates in production builds.
 * We use this instead of .html to avoid conflicts with vite:build-html.
 */
const VIRTUAL_TEMPLATE_SUFFIX = ".$aurelia-template.js";

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
 * Convert compiler's ImportMetaIR to transform's TemplateImport.
 *
 * This bridges the gap between the meta extraction in the compiler package
 * and the dependency generation in the transform package.
 */
function convertToTemplateImports(imports: ImportMetaIR[]): TemplateImport[] {
  return imports.map((imp) => ({
    moduleSpecifier: imp.from.value,
    resolvedPath: null, // Will be resolved by transform if needed
    defaultAlias: imp.defaultAlias?.value ?? null,
    namedAliases: imp.namedAliases.map((na) => ({
      exportName: na.exportName.value,
      alias: na.alias.value,
    })),
    span: { start: imp.from.loc.start, end: imp.from.loc.end },
  }));
}


/**
 * Transform a component file to inject $au definition.
 */
function transformComponent(
  code: string,
  id: string,
  templateInfo: TemplateInfo,
  resolutionContext: ResolutionContext,
  config: ResolvedConfig,
  trace?: CompileTrace,
  dumpPath?: string | false,
): { code: string; map: null } | null {
  try {
    // Read the template HTML
    const templateHtml = readFileSync(templateInfo.templatePath, "utf-8");

    // Extract template meta (imports, bindables, etc.)
    const templateMeta = extractTemplateMeta(templateHtml, templateInfo.templatePath);
    const templateImports = convertToTemplateImports(templateMeta.imports);
    const localImports = convertToLocalImports(
      templateMeta.imports,
      resolutionContext.semantics.resources.elements,
    );

    // Compile with AOT
    const aot = compileWithAot(templateHtml, {
      templatePath: templateInfo.templatePath,
      name: templateInfo.resourceName,
      semantics: resolutionContext.semantics,
      resourceGraph: resolutionContext.resourceGraph,
      resourceScope: templateInfo.scopeId,
      localImports,
      trace,
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
      templateImports,
      removeDecorators: true,
      includeComments: true,
      trace,
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

    // Dump artifacts if enabled
    if (dumpPath) {
      dumpCompilationArtifacts(
        dumpPath,
        templateInfo,
        templateHtml,
        aot,
        result,
        config,
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
 * Dump compilation artifacts to disk for debugging.
 *
 * Creates a directory structure with:
 * - {component}/input.html - Original template
 * - {component}/plan.json - AOT plan (intermediate representation)
 * - {component}/instructions.json - Compiled instructions
 * - {component}/output.html - Template with hydration markers
 * - {component}/output.ts - Transformed TypeScript with $au
 */
function dumpCompilationArtifacts(
  basePath: string,
  templateInfo: TemplateInfo,
  inputHtml: string,
  aot: ReturnType<typeof compileWithAot>,
  result: ReturnType<typeof transform>,
  config: ResolvedConfig,
): void {
  try {
    // Create component-specific directory using class name
    const componentDir = join(basePath, templateInfo.className);
    mkdirSync(componentDir, { recursive: true });

    // 1. Original template HTML
    writeFileSync(join(componentDir, "input.html"), inputHtml, "utf-8");

    // 2. AOT Plan (intermediate representation)
    writeFileSync(
      join(componentDir, "plan.json"),
      JSON.stringify(aot.raw.plan, null, 2),
      "utf-8",
    );

    // 3. Compiled instructions (serialized format)
    writeFileSync(
      join(componentDir, "instructions.json"),
      JSON.stringify(aot.raw.codeResult, null, 2),
      "utf-8",
    );

    // 4. Template with hydration markers
    writeFileSync(join(componentDir, "output.html"), aot.template, "utf-8");

    // 5. Transformed TypeScript
    writeFileSync(join(componentDir, "output.ts"), result.code, "utf-8");

    // 6. Metadata summary
    const meta = {
      className: templateInfo.className,
      resourceName: templateInfo.resourceName,
      componentPath: templateInfo.componentPath,
      templatePath: templateInfo.templatePath,
      scopeId: templateInfo.scopeId,
      expressionCount: result.meta.expressionCount,
      instructionRowCount: result.meta.instructionRowCount,
      targetCount: aot.targetCount,
      warnings: result.warnings,
    };
    writeFileSync(
      join(componentDir, "meta.json"),
      JSON.stringify(meta, null, 2),
      "utf-8",
    );

    config.logger.info(`[aurelia-ssr] Dumped artifacts: ${componentDir}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    config.logger.warn(`[aurelia-ssr] Failed to dump artifacts: ${errorMessage}`);
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
 * Regex to match .html imports in TypeScript/JavaScript code.
 * Captures the quote style, import path, and ensures it ends with .html
 */
const HTML_IMPORT_REGEX = /(from\s+|import\s+)(['"])([^'"]+\.html)\2/g;

/**
 * Create the Aurelia SSR Vite plugin.
 *
 * @param options - Plugin configuration options
 * @returns Array of Vite plugins (pre for import rewriting, post for SSR)
 */
export function aurelia(options: AureliaPluginOptions = {}): Plugin[] {
  let resolvedConfig: ResolvedConfig;
  let pluginState: PluginState;
  let resolutionContext: ResolutionContext | null = null;
  let resolutionPromise: Promise<ResolutionContext | null> | null = null;
  let routeTree: RouteTree | null = null;
  let traceOptions: ResolvedTraceOptions;
  let buildTrace: ManagedTrace | null = null;
  let ssrEnabled = false; // Whether SSR middleware should be registered
  let dumpArtifactsPath: string | false = false; // Path to dump compilation artifacts

  /**
   * Pre-plugin: Rewrites .html imports to virtual files in production builds.
   * This must run BEFORE vite:build-html to avoid HTML parsing conflicts.
   */
  const prePlugin: Plugin = {
    name: "aurelia-ssr-pre",
    enforce: "pre",

    configResolved(config) {
      // Share config with main plugin
      resolvedConfig = config;
    },

    /**
     * Rewrite .html imports to virtual template files in production.
     * This prevents vite:build-html from trying to parse template files.
     */
    transform(code, id) {
      // Only active in production builds
      if (resolvedConfig.command !== "build") {
        return null;
      }

      // Only process TypeScript/JavaScript files
      if (!id.endsWith(".ts") && !id.endsWith(".tsx") && !id.endsWith(".js") && !id.endsWith(".jsx")) {
        return null;
      }

      // Skip node_modules
      if (id.includes("/node_modules/") || id.includes("\\node_modules\\")) {
        return null;
      }

      // Quick check: does this file have .html imports?
      if (!code.includes(".html")) {
        return null;
      }

      // Rewrite .html imports to virtual template files
      const rewritten = code.replace(HTML_IMPORT_REGEX, (match, prefix, quote, importPath) => {
        // Don't rewrite if it's not an Aurelia template (e.g., could be some other HTML)
        // Skip node_modules imports
        if (importPath.includes("node_modules")) {
          return match;
        }

        // Rewrite to virtual file suffix
        const virtualPath = importPath.slice(0, -5) + VIRTUAL_TEMPLATE_SUFFIX;
        return `${prefix}${quote}${virtualPath}${quote}`;
      });

      if (rewritten !== code) {
        resolvedConfig.logger.info(`[aurelia-ssr] Rewrote HTML imports in: ${id}`);
        return {
          code: rewritten,
          map: null,
        };
      }

      return null;
    },
  };

  /**
   * Main SSR plugin: Handles template loading, AOT transform, middleware, and SSG.
   */
  const mainPlugin: Plugin = {
    name: "aurelia-ssr",

    // Run after other plugins
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

      // Normalize SSR options (boolean | object | undefined ΓåÆ object)
      const ssrOptions = typeof options.ssr === "object" ? options.ssr : {};
      // Set closure variable - SSR is enabled if explicitly true or object without enabled:false
      ssrEnabled = options.ssr === true || (typeof options.ssr === "object" && options.ssr.enabled !== false);
      const resolutionDefines = ssrEnabled
        ? mergeDefines(ssrDefines(), ssrOptions.defines)
        : ssrOptions.defines;

      // Normalize SSG options (boolean | object | undefined ΓåÆ object)
      const ssgInput = typeof options.ssg === "object" ? options.ssg : {};
      const ssgEnabled = options.ssg === true || (typeof options.ssg === "object" && ssgInput.enabled !== false);
      const resolvedSSG = {
        enabled: ssgEnabled,
        entryPoints: ssgInput.entryPoints ?? [],
        outDir: ssgInput.outDir ?? ".",
        fallback: ssgInput.fallback ?? "404.html",
        additionalRoutes: ssgInput.additionalRoutes,
        onBeforeRender: ssgInput.onBeforeRender,
        onAfterRender: ssgInput.onAfterRender,
      };

      // Resolve SSR entry point path
      const ssrEntry = ssrOptions.ssrEntry
        ? resolve(config.root, ssrOptions.ssrEntry)
        : null;

      // Resolve trace options (from debug.trace)
      traceOptions = resolveTraceOptions(options.debug?.trace, config.root);
      if (traceOptions.enabled) {
        config.logger.info(`[aurelia-ssr] Tracing enabled (output: ${traceOptions.output})`);
      }

      // Resolve dumpArtifacts option (from debug.dumpArtifacts)
      const dumpArtifactsOpt = options.debug?.dumpArtifacts;
      if (dumpArtifactsOpt === true) {
        dumpArtifactsPath = resolve(config.root, ".aurelia-artifacts");
      } else if (typeof dumpArtifactsOpt === "string") {
        dumpArtifactsPath = resolve(config.root, dumpArtifactsOpt);
      } else {
        dumpArtifactsPath = false;
      }
      if (dumpArtifactsPath) {
        config.logger.info(`[aurelia-ssr] Artifact dumping enabled: ${dumpArtifactsPath}`);
      }

      // Resolve register module path (relative to project root)
      const register = ssrOptions.register
        ? resolve(config.root, ssrOptions.register)
        : null;

      // Build plugin state with defaults
      pluginState = {
        entry,
        state: ssrOptions.state ?? (() => ({})),
        stripMarkers: ssrOptions.stripMarkers ?? false,
        include: ssrOptions.include ?? ["**"],
        exclude: ssrOptions.exclude ?? DEFAULT_EXCLUDE,
        htmlShell: ssrOptions.htmlShell ?? DEFAULT_HTML_SHELL,
        resolution: null, // Will be set after async initialization
        baseHref: ssrOptions.baseHref ?? "/",
        register,
        ssg: resolvedSSG,
        routeTree: null, // Will be set after route discovery
        ssrEntry,
        trace: traceOptions,
      };

      // Debug: log plugin configuration
      debug.vite("config.resolved", {
        entry,
        root: config.root,
        ssrEnabled,
        ssgEnabled: resolvedSSG.enabled,
        command: config.command,
      });

      config.logger.info(
        `[aurelia-ssr] Configured with entry: ${entry}`,
      );

      if (ssrEntry) {
        config.logger.info(`[aurelia-ssr] SSR entry point: ${ssrEntry}`);
      }

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
        resolutionPromise = createResolutionContext(
          tsconfigPath,
          logger,
          undefined,
          resolutionDefines,
          options.thirdParty?.resources,
        ).then((ctx) => {
          resolutionContext = ctx;
          pluginState.resolution = ctx;
          if (ctx) {
            config.logger.info("[aurelia-ssr] Resource resolution ready");

            // Discover routes if SSG is enabled
            if (resolvedSSG.enabled) {
              routeTree = discoverRoutes(tsconfigPath, resolvedSSG.entryPoints, logger);
              pluginState.routeTree = routeTree;
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
     * Resolve virtual template files in production builds.
     *
     * We use virtual files (.$aurelia-template.js) instead of .html to avoid
     * conflicts with vite:build-html. This follows the same pattern as
     * @aurelia/vite-plugin which uses .$au.ts virtual files.
     */
    resolveId(id, importer) {
      // Only handle our virtual template files
      if (!id.endsWith(VIRTUAL_TEMPLATE_SUFFIX)) {
        return null;
      }

      // Only active in production builds
      if (resolvedConfig.command !== "build") {
        return null;
      }

      // Resolve to absolute path
      // Handle both relative and absolute paths
      if (id.startsWith("/") || id.startsWith("\\")) {
        // Absolute from root - resolve from config root
        return resolve(resolvedConfig.root, id.slice(1));
      }

      if (importer) {
        // Relative import - resolve from importer's directory
        return resolve(dirname(importer), id);
      }

      return id;
    },

    /**
     * Load virtual template files in production builds.
     *
     * Converts the HTML template to a JavaScript module that exports
     * the template string as default. This avoids conflicts with
     * vite:build-html which only processes .html files.
     */
    load(id) {
      // Only handle our virtual template files
      if (!id.endsWith(VIRTUAL_TEMPLATE_SUFFIX)) {
        return null;
      }

      // Only active in production builds
      if (resolvedConfig.command !== "build") {
        return null;
      }

      // Get the actual HTML file path
      const htmlPath = id.slice(0, -VIRTUAL_TEMPLATE_SUFFIX.length) + ".html";

      try {
        // Read the HTML template
        const html = readFileSync(htmlPath, "utf-8");

        // Transform to a JavaScript module that exports the template
        const code = `export default ${JSON.stringify(html)};`;

        resolvedConfig.logger.info(`[aurelia-ssr] Loaded template: ${htmlPath}`);

        return {
          code,
          map: null,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        resolvedConfig.logger.error(`[aurelia-ssr] Failed to load template ${htmlPath}: ${errorMessage}`);
        return null;
      }
    },

    /**
     * Called at the start of the build.
     */
    buildStart() {
      // Create build trace for production builds
      if (resolvedConfig.command === "build" && traceOptions.enabled) {
        buildTrace = createBuildTrace(traceOptions, {
          info: (msg) => resolvedConfig.logger.info(msg),
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
        pluginState.resolution = resolutionContext;
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

      // Get trace for this transform (build trace or undefined for dev)
      const trace = buildTrace?.trace;

      // If this is an Aurelia component with external template, transform it
      if (templateInfo) {
        return transformComponent(code, id, templateInfo, resolutionContext, resolvedConfig, trace, dumpArtifactsPath);
      }

      // Check if this is an entry point file (contains Aurelia initialization)
      // Only transform entry points in production builds for tree-shaking
      // TODO: Entry point transform disabled - third-party deps need runtime compilation
      // Re-enable when third-party AOT compilation is implemented
      // if (resolvedConfig.command === "build") {
      //   return transformEntryPointIfNeeded(code, id, resolvedConfig);
      // }

      return null;
    },

    /**
     * Add SSR middleware to dev server.
     * Middleware is added directly (not returning a function) so it runs
     * BEFORE Vite's built-in HTML handling.
     * Only registers middleware when SSR is enabled.
     */
    configureServer(server) {
      // Debug: log server configuration for troubleshooting
      const addr = server.httpServer?.address();
      const port = addr && typeof addr === "object" ? addr.port : undefined;
      debug.vite("server.configure", {
        root: server.config.root,
        ssrEnabled,
        port,
        configFile: server.config.configFile,
      });

      // Skip SSR middleware if SSR is not enabled
      if (!ssrEnabled) {
        server.config.logger.info("[aurelia-ssr] SSR disabled, serving CSR");
        return;
      }

      // Add middleware directly (before Vite's internal middleware)
      // The middleware will wait for resolution if needed
      server.middlewares.use(
        createSSRMiddleware(server, pluginState, () => resolutionPromise),
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
     * Only runs when SSG is enabled and in production client build.
     */
    async closeBundle() {
      // Only run SSG in production builds
      if (resolvedConfig.command !== "build") {
        return;
      }

      // Skip SSG during SSR builds (only run during client builds)
      // SSR builds have build.ssr set to truthy value
      if (resolvedConfig.build.ssr) {
        return;
      }

      // Check if SSG is enabled
      if (!pluginState.ssg.enabled) {
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
        pluginState.ssg.outDir,
      );

      // Try to load SSR handler from built output
      let ssrHandler: SSRHandler | null = null;

      if (pluginState.ssrEntry) {
        try {
          // The SSR entry should be built to dist/server/entry-server.js
          // We use the same output dir structure as the client build
          const serverOutDir = join(resolvedConfig.build.outDir, "..", "server");
          const entryBasename = pluginState.ssrEntry.split(/[\\/]/).pop()!.replace(/\.ts$/, ".js");
          const handlerPath = join(serverOutDir, entryBasename);

          resolvedConfig.logger.info(`[aurelia-ssr] Loading SSR handler from: ${handlerPath}`);

          // Dynamic import the handler
          const handlerModule = await import(/* @vite-ignore */ `file://${handlerPath.replace(/\\/g, "/")}`);
          const exportedHandler = handlerModule.default ?? handlerModule;

          if (isSSRHandler(exportedHandler)) {
            ssrHandler = exportedHandler;
            resolvedConfig.logger.info("[aurelia-ssr] SSR handler loaded successfully");
          } else {
            resolvedConfig.logger.warn(
              "[aurelia-ssr] SSR entry point does not export a valid SSR handler. " +
              "Ensure you export the result of createSSRHandler().",
            );
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          resolvedConfig.logger.warn(
            `[aurelia-ssr] Could not load SSR handler: ${errorMessage}. ` +
            "SSG will use placeholder rendering. " +
            "Ensure the SSR entry point is built before SSG runs.",
          );
        }
      }

      // Create render function
      const render = async (route: string, _props?: Record<string, unknown>): Promise<string> => {
        if (ssrHandler) {
          const result = await ssrHandler.render(route);
          return result.html;
        }

        // Fallback: placeholder when no handler available
        resolvedConfig.logger.warn(
          `[aurelia-ssr] No SSR handler available, using placeholder for: ${route}`,
        );
        return `<!-- SSG placeholder for ${route} - configure ssrEntry for actual rendering -->`;
      };

      // Create static paths resolver
      // TODO: Implement getStaticPaths resolution by loading component classes
      const resolveStaticPaths = async (): Promise<string[]> => {
        return [];
      };

      // Generate static site
      const result: SSGResult = await generateStaticSite(
        routeTree,
        pluginState.ssg,
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
            `[aurelia-ssr] Expanded ${expanded.parameterizedRoute.fullPath} ΓåÆ ${expanded.staticPaths.length} pages`,
          );
        }
      }

      // Finish build trace after SSG
      if (buildTrace) {
        buildTrace.finish();
        buildTrace = null;
      }
    },

    /**
     * Called when the build ends (before closeBundle).
     * Used to finish traces when SSG is not enabled.
     */
    buildEnd() {
      // Finish build trace if SSG is not enabled
      // (SSG-enabled builds finish trace in closeBundle after SSG completes)
      if (buildTrace && !pluginState.ssg.enabled) {
        buildTrace.finish();
        buildTrace = null;
      }
    },
  };

  // Return both plugins
  return [prePlugin, mainPlugin];
}
