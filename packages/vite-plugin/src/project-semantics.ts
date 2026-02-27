/**
 * Project-semantics integration for the Vite SSR plugin.
 *
 * Creates a TypeScript program from a project and runs project-semantics discovery
 * to discover Aurelia resources for SSR compilation.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import ts from "typescript";
import { DiagnosticsRuntime } from "@aurelia-ls/compiler/diagnostics/runtime.js";
import { normalizePathForId, type NormalizedPath } from "@aurelia-ls/compiler/model/identity.js";
import { BUILTIN_SEMANTICS, buildTemplateSyntaxRegistry } from "@aurelia-ls/compiler/schema/registry.js";
import type { ResourceScopeId } from "@aurelia-ls/compiler/schema/types.js";
import type { CompileTrace } from "@aurelia-ls/compiler/shared/trace.js";
import type { ConventionConfig } from "@aurelia-ls/compiler/project-semantics/conventions/types.js";
import type { DefineMap } from "@aurelia-ls/compiler/project-semantics/defines.js";
import { createNodeFileSystem } from "@aurelia-ls/compiler/project-semantics/project/node-context.js";
import { discoverProjectSemantics, type ProjectSemanticsDiscoveryResult } from "@aurelia-ls/compiler/project-semantics/resolve.js";
import { buildRouteTree } from "@aurelia-ls/compiler/project-semantics/routes/tree-builder.js";
import type { RouteTree } from "@aurelia-ls/compiler/project-semantics/routes/types.js";
import type { TemplateInfo } from "@aurelia-ls/compiler/project-semantics/templates/types.js";
import { buildPackageRootMap, detectMonorepo } from "@aurelia-ls/compiler/project-semantics/npm/monorepo.js";
import { hasThirdPartyResources } from "@aurelia-ls/compiler/project-semantics/third-party/merge.js";
import { applyThirdPartyResources, buildAnalysisFingerprint, resolveThirdPartyResources } from "@aurelia-ls/compiler/project-semantics/third-party/resolution.js";
import type { ProjectSemanticsContext, ThirdPartyOptions } from "./types.js";

/**
 * Logger interface for project-semantics output.
 */
interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface ProjectSemanticsContextOptions {
  trace?: CompileTrace;
  defines?: DefineMap;
  thirdParty?: ThirdPartyOptions;
  conventions?: ConventionConfig;
  packagePath?: string;
  packageRoots?: ReadonlyMap<string, string> | Readonly<Record<string, string>>;
  templateExtensions?: readonly string[];
  styleExtensions?: readonly string[];
  partialEvaluation?: {
    failOnFiles?: ReadonlySet<NormalizedPath> | readonly NormalizedPath[];
  };
}

/**
 * Create a project-semantics context from a tsconfig path.
 *
 * This function:
 * 1. Loads the tsconfig.json
 * 2. Creates a TypeScript program
 * 3. Runs project-semantics discovery
 * 4. Returns a context with ResourceGraph and helper methods
 *
 * @param tsconfigPath - Absolute path to tsconfig.json
 * @param logger - Logger for output
 * @param options - Optional discovery options
 * @returns Project-semantics context or null if discovery fails
 */
export async function createProjectSemanticsContext(
  tsconfigPath: string,
  logger: Logger,
  options?: ProjectSemanticsContextOptions,
): Promise<ProjectSemanticsContext | null> {
  // Dynamically import TypeScript (peer dependency)
  let ts: typeof import("typescript");
  try {
    ts = await import("typescript");
  } catch {
    logger.warn("[aurelia-ssr] TypeScript not found. Project-semantics discovery disabled.");
    logger.warn("[aurelia-ssr] Install typescript as a dev dependency to enable discovery.");
    return null;
  }

  // Validate tsconfig exists
  if (!existsSync(tsconfigPath)) {
    logger.error(`[aurelia-ssr] tsconfig not found: ${tsconfigPath}`);
    return null;
  }

  logger.info(`[aurelia-ssr] Loading tsconfig: ${tsconfigPath}`);

  const trace = options?.trace;

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

  // Run project-semantics discovery
  logger.info("[aurelia-ssr] Running project-semantics discovery...");
  const discoveryLogger = {
    log: () => {},
    info: (msg: string) => logger.info(msg),
    warn: (msg: string) => logger.warn(msg),
    error: (msg: string) => logger.error(msg),
  };

  // Create file system context for sibling-file convention detection
  // This enables discovery of foo.ts + foo.html as a custom element without @customElement decorator
  const fileSystem = createNodeFileSystem({ root: basePath });

  const packagePath = options?.packagePath ?? basePath;
  const packageRoots = options?.packageRoots ?? await derivePackageRoots(packagePath);
  const defines = options?.defines;
  const conventions = options?.conventions;
  const cacheFingerprint = buildAnalysisFingerprint(packagePath, {
    thirdParty: options?.thirdParty,
    conventions,
    templateExtensions: options?.templateExtensions,
    styleExtensions: options?.styleExtensions,
  });

  const diagnostics = new DiagnosticsRuntime();
  const result = discoverProjectSemantics(program, {
    baseSemantics: BUILTIN_SEMANTICS,
    trace,
    fileSystem,
    defines,
    conventions,
    packagePath,
    packageRoots,
    templateExtensions: options?.templateExtensions,
    styleExtensions: options?.styleExtensions,
    partialEvaluation: options?.partialEvaluation,
    diagnostics: diagnostics.forSource("project"),
  }, discoveryLogger);

  const thirdPartyResources = await resolveThirdPartyResources(
    options?.thirdParty,
    {
      packagePath,
      packageRoots,
      logger,
      cacheFingerprint,
    },
  );

  const needsThirdPartyMerge = hasThirdPartyResources(thirdPartyResources.resources)
    || thirdPartyResources.gaps.length > 0;

  const nextResult = needsThirdPartyMerge
    ? applyThirdPartyResources(result, thirdPartyResources.resources, {
      gaps: thirdPartyResources.gaps,
      confidence: thirdPartyResources.confidence,
      policy: options?.thirdParty?.policy,
    })
    : result;
  const finalResult = nextResult;

  // Log discovery results
  const globalCount = finalResult.registration.sites.filter(s => s.scope.kind === "global").length;
  const localCount = finalResult.registration.sites.filter(s => s.scope.kind === "local").length;
  logger.info(
    `[aurelia-ssr] Resolved ${finalResult.definition.authority.length} authority resources (${globalCount} global, ${localCount} local)`,
  );
  logger.info(
    `[aurelia-ssr] Discovered ${finalResult.templates.length} external + ${finalResult.inlineTemplates.length} inline templates`,
  );

  // Build template lookup map
  const templates = new Map<string, TemplateInfo>();
  for (const template of finalResult.templates) {
    templates.set(normalizePathForId(template.templatePath), template);
  }

  // Build merged semantics with discovered resources
  const semantics = finalResult.semantics;

  // Build snapshot once for all AOT compilations in this project
  const snapshot = {
    semantics,
    catalog: semantics.catalog,
    syntax: buildTemplateSyntaxRegistry(semantics),
    resourceGraph: finalResult.resourceGraph,
  };

  const context: ProjectSemanticsContext = {
    result: finalResult,
    resourceGraph: finalResult.resourceGraph,
    semantics,
    snapshot,
    templates,
    getScopeForTemplate(templatePath: string): ResourceScopeId {
      const normalized = normalizePathForId(templatePath);
      const info = templates.get(normalized);
      return info?.scopeId ?? finalResult.resourceGraph.root;
    },
  };

  return context;
}

async function derivePackageRoots(
  packagePath: string,
): Promise<ReadonlyMap<string, string> | undefined> {
  const ctx = await detectMonorepo(packagePath);
  if (!ctx) {
    return undefined;
  }
  return buildPackageRootMap(ctx);
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
