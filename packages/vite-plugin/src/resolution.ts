/**
 * Resolution integration for Vite SSR plugin.
 *
 * Creates a TypeScript program from a project and runs the resolution
 * pipeline to discover Aurelia resources for SSR compilation.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import ts from "typescript";
import { DEFAULT_SEMANTICS, normalizePathForId, type BindingMode, type ResourceScopeId, type Semantics, type Bindable, type CompileTrace } from "@aurelia-ls/compiler";
import { resolve, buildRouteTree, createNodeFileSystem, type ResolutionResult, type ResourceCandidate, type TemplateInfo, type RegistrationIntent, type RouteTree } from "@aurelia-ls/resolution";
import type { ResolutionContext } from "./types.js";

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
 * @returns Resolution context or null if resolution fails
 */
export async function createResolutionContext(
  tsconfigPath: string,
  logger: Logger,
  trace?: CompileTrace,
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

  const result = resolve(program, { baseSemantics: DEFAULT_SEMANTICS, trace, fileSystem }, resolutionLogger);

  // Log resolution results
  const globalCount = result.intents.filter((i: RegistrationIntent) => i.kind === "global").length;
  const localCount = result.intents.filter((i: RegistrationIntent) => i.kind === "local").length;
  logger.info(`[aurelia-ssr] Resolved ${result.candidates.length} resources (${globalCount} global, ${localCount} local)`);
  logger.info(`[aurelia-ssr] Discovered ${result.templates.length} external + ${result.inlineTemplates.length} inline templates`);

  // Build template lookup map
  const templates = new Map<string, TemplateInfo>();
  for (const template of result.templates) {
    templates.set(normalizePathForId(template.templatePath), template);
  }

  // Build merged semantics with discovered resources
  const semantics = mergeSemantics(DEFAULT_SEMANTICS, result.candidates);

  // Create context
  const context: ResolutionContext = {
    result,
    resourceGraph: result.resourceGraph,
    semantics,
    templates,
    getScopeForTemplate(templatePath: string): ResourceScopeId {
      const normalized = normalizePathForId(templatePath);
      const info = templates.get(normalized);
      return info?.scopeId ?? result.resourceGraph.root;
    },
  };

  return context;
}

/**
 * Merge discovered resources into base semantics.
 */
function mergeSemantics(base: Semantics, candidates: readonly ResourceCandidate[]): Semantics {
  const elements = { ...base.resources.elements };
  const attributes = { ...base.resources.attributes };
  const valueConverters = { ...base.resources.valueConverters };
  const bindingBehaviors = { ...base.resources.bindingBehaviors };

  for (const candidate of candidates) {
    switch (candidate.kind) {
      case "element": {
        const bindables: Record<string, Bindable> = {};
        for (const b of candidate.bindables) {
          const bindable: Bindable = { name: b.name };
          if (b.mode) {
            bindable.mode = b.mode as BindingMode;
          }
          bindables[b.name] = bindable;
        }
        const elementRes: (typeof elements)[string] = {
          kind: "element",
          name: candidate.name,
          bindables,
          aliases: [...candidate.aliases],
        };
        if (candidate.containerless !== undefined) {
          elementRes.containerless = candidate.containerless;
        }
        elements[candidate.name] = elementRes;
        break;
      }
      case "attribute": {
        const bindables: Record<string, Bindable> = {};
        for (const b of candidate.bindables) {
          const bindable: Bindable = { name: b.name };
          if (b.mode) {
            bindable.mode = b.mode as BindingMode;
          }
          bindables[b.name] = bindable;
        }
        attributes[candidate.name] = {
          kind: "attribute",
          name: candidate.name,
          bindables,
          aliases: [...candidate.aliases],
          isTemplateController: candidate.isTemplateController ?? false,
          noMultiBindings: candidate.noMultiBindings ?? false,
        };
        break;
      }
      case "valueConverter":
        valueConverters[candidate.name] = { name: candidate.name };
        break;
      case "bindingBehavior":
        bindingBehaviors[candidate.name] = { name: candidate.name };
        break;
    }
  }

  return {
    ...base,
    resources: {
      elements,
      attributes,
      controllers: base.resources.controllers,
      valueConverters,
      bindingBehaviors,
    },
    resourceGraph: null, // Resource graph is passed separately
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
