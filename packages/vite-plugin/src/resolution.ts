/**
 * Resolution integration for Vite SSR plugin.
 *
 * Creates a TypeScript program from a project and runs the resolution
 * pipeline to discover Aurelia resources for SSR compilation.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import ts from "typescript";
import {
  DEFAULT_SEMANTICS,
  buildTemplateSyntaxRegistry,
  normalizePathForId,
  prepareSemantics,
  type ResourceScopeId,
  type CompileTrace,
} from "@aurelia-ls/compiler";
import {
  resolve,
  buildRouteTree,
  createNodeFileSystem,
  type ResolutionResult,
  type TemplateInfo,
  type RouteTree,
  type DefineMap,
} from "@aurelia-ls/resolution";
import type { ExplicitResourceConfig, ResolutionContext } from "./types.js";
import { buildThirdPartyResources, hasThirdPartyResources, mergeResourceCollections, mergeScopeResources } from "./third-party.js";

/**
 * Logger interface for resolution output.
 */
interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/**
 * Create a resolution context from a tsconfig path.
 *
 * This function:
 * 1. Loads the tsconfig.json
 * 2. Creates a TypeScript program
 * 3. Runs the resolution pipeline
 * 4. Returns a context with ResourceGraph and helper methods
 *
 * @param tsconfigPath - Absolute path to tsconfig.json
 * @param logger - Logger for output
 * @param trace - Optional compile trace
 * @param defines - Optional compile-time defines for conditional registration guards
 * @returns Resolution context or null if resolution fails
 */
export async function createResolutionContext(
  tsconfigPath: string,
  logger: Logger,
  trace?: CompileTrace,
  defines?: DefineMap,
  explicitResources?: ExplicitResourceConfig,
): Promise<ResolutionContext | null> {
  // Dynamically import TypeScript (peer dependency)
  let ts: typeof import("typescript");
  try {
    ts = await import("typescript");
  } catch {
    logger.warn("[aurelia-ssr] TypeScript not found. Resource resolution disabled.");
    logger.warn("[aurelia-ssr] Install typescript as a dev dependency to enable resolution.");
    return null;
  }

  // Validate tsconfig exists
  if (!existsSync(tsconfigPath)) {
    logger.error(`[aurelia-ssr] tsconfig not found: ${tsconfigPath}`);
    return null;
  }

  logger.info(`[aurelia-ssr] Loading tsconfig: ${tsconfigPath}`);

  // Parse tsconfig
  const configFile = ts.readConfigFile(tsconfigPath, (path) => readFileSync(path, "utf-8"));
  if (configFile.error) {
    logger.error(`[aurelia-ssr] Failed to parse tsconfig: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n")}`);
    return null;
  }

  const basePath = dirname(tsconfigPath);
  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, basePath);

  if (parsedConfig.errors.length > 0) {
    for (const error of parsedConfig.errors) {
      logger.warn(`[aurelia-ssr] tsconfig warning: ${ts.flattenDiagnosticMessageText(error.messageText, "\n")}`);
    }
  }

  // Create TypeScript program
  logger.info(`[aurelia-ssr] Creating TypeScript program (${parsedConfig.fileNames.length} files)`);
  const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);

  // Run resolution pipeline
  logger.info("[aurelia-ssr] Running resource resolution...");
  const resolutionLogger = {
    log: () => {},
    info: (msg: string) => logger.info(msg),
    warn: (msg: string) => logger.warn(msg),
    error: (msg: string) => logger.error(msg),
  };

  // Create file system context for sibling-file convention detection
  // This enables discovery of foo.ts + foo.html as a custom element without @customElement decorator
  const fileSystem = createNodeFileSystem({ root: basePath });

  const result = resolve(program, { baseSemantics: DEFAULT_SEMANTICS, trace, fileSystem, defines }, resolutionLogger);

  const thirdPartyResources = buildThirdPartyResources(explicitResources);
  const nextResult = hasThirdPartyResources(thirdPartyResources)
    ? applyThirdPartyResources(result, thirdPartyResources)
    : result;

  // Log resolution results
  const globalCount = nextResult.registration.sites.filter(s => s.scope.kind === "global").length;
  const localCount = nextResult.registration.sites.filter(s => s.scope.kind === "local").length;
  logger.info(
    `[aurelia-ssr] Resolved ${nextResult.resources.length} resources (${globalCount} global, ${localCount} local)`,
  );
  logger.info(
    `[aurelia-ssr] Discovered ${nextResult.templates.length} external + ${nextResult.inlineTemplates.length} inline templates`,
  );

  // Build template lookup map
  const templates = new Map<string, TemplateInfo>();
  for (const template of nextResult.templates) {
    templates.set(normalizePathForId(template.templatePath), template);
  }

  // Build merged semantics with discovered resources
  const semantics = nextResult.semantics;

  // Create context
  const context: ResolutionContext = {
    result: nextResult,
    resourceGraph: nextResult.resourceGraph,
    semantics,
    templates,
    getScopeForTemplate(templatePath: string): ResourceScopeId {
      const normalized = normalizePathForId(templatePath);
      const info = templates.get(normalized);
      return info?.scopeId ?? nextResult.resourceGraph.root;
    },
  };

  return context;
}

function applyThirdPartyResources(
  result: ResolutionResult,
  extra: Partial<ResolutionResult["semantics"]["resources"]>,
): ResolutionResult {
  const mergedResources = mergeResourceCollections(result.semantics.resources, extra);
  const rootId = result.resourceGraph.root;
  const rootScope = result.resourceGraph.scopes[rootId];
  const mergedRootResources = mergeScopeResources(rootScope?.resources, extra);
  const nextGraph = {
    ...result.resourceGraph,
    scopes: {
      ...result.resourceGraph.scopes,
      [rootId]: {
        id: rootId,
        parent: rootScope?.parent ?? null,
        ...(rootScope?.label ? { label: rootScope.label } : {}),
        resources: mergedRootResources,
      },
    },
  };
  const semantics = prepareSemantics(
    { ...result.semantics, resourceGraph: nextGraph },
    { resources: mergedResources },
  );
  const syntax = buildTemplateSyntaxRegistry(semantics);
  return {
    ...result,
    semantics,
    catalog: semantics.catalog,
    syntax,
    resourceGraph: nextGraph,
  };
}

/**
 * Discover routes from a TypeScript project.
 *
 * Uses the route discovery module to build a route tree from the project.
 *
 * @param tsconfigPath - Absolute path to tsconfig.json
 * @param entryPoints - Entry point class names for route discovery
 * @param logger - Logger for output
 * @returns Route tree or null if discovery fails
 */
export function discoverRoutes(
  tsconfigPath: string,
  entryPoints: string[],
  logger: Logger,
): RouteTree | null {
  try {
    // Validate tsconfig exists
    if (!existsSync(tsconfigPath)) {
      logger.error(`[aurelia-ssr] tsconfig not found: ${tsconfigPath}`);
      return null;
    }

    // Parse tsconfig
    const configFile = ts.readConfigFile(tsconfigPath, (path) => readFileSync(path, "utf-8"));
    if (configFile.error) {
      logger.error(`[aurelia-ssr] Failed to parse tsconfig: ${ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n")}`);
      return null;
    }

    const basePath = dirname(tsconfigPath);
    const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, basePath);

    // Create TypeScript program
    const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);

    // Build route tree
    const routeTree = buildRouteTree(program, {
      entryPoints: entryPoints.length > 0 ? entryPoints : undefined,
    });

    logger.info(
      `[aurelia-ssr] Route discovery complete: ${routeTree.entryPoints.length} entry points, ` +
      `${routeTree.roots.length} root routes`,
    );

    return routeTree;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[aurelia-ssr] Route discovery failed: ${errorMessage}`);
    return null;
  }
}
