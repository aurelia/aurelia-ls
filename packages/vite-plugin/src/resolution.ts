/**
 * Resolution integration for Vite SSR plugin.
 *
 * Creates a TypeScript program from a project and runs the resolution
 * pipeline to discover Aurelia resources for SSR compilation.
 */

import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve as resolvePath } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import {
  DEFAULT_SEMANTICS,
  buildResourceCatalog,
  buildTemplateSyntaxRegistry,
  normalizePathForId,
  prepareSemantics,
  type CatalogConfidence,
  type CatalogGap,
  type ResourceCollections,
  type ResourceScopeId,
  type CompileTrace,
} from "@aurelia-ls/compiler";
import {
  analyzePackages,
  buildSemanticsArtifacts,
  hashObject,
  resolve,
  buildRouteTree,
  createNodeFileSystem,
  type ResolutionResult,
  type TemplateInfo,
  type RouteTree,
  type DefineMap,
  type AnalysisGap,
  type ConventionConfig,
} from "@aurelia-ls/resolution";
import { buildPackageRootMap, detectMonorepo, isAureliaPackage } from "@aurelia-ls/resolution/npm";
import type { ResolutionContext, ThirdPartyOptions } from "./types.js";
import { buildThirdPartyResources, hasThirdPartyResources, mergeResourceCollections, mergeScopeResources } from "./third-party.js";

/**
 * Logger interface for resolution output.
 */
interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

const ANALYSIS_SCHEMA_VERSION = 1;

export interface ResolutionContextOptions {
  trace?: CompileTrace;
  defines?: DefineMap;
  thirdParty?: ThirdPartyOptions;
  conventions?: ConventionConfig;
  packagePath?: string;
  packageRoots?: ReadonlyMap<string, string> | Readonly<Record<string, string>>;
  templateExtensions?: readonly string[];
  styleExtensions?: readonly string[];
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
 * @param options - Optional resolution options
 * @returns Resolution context or null if resolution fails
 */
export async function createResolutionContext(
  tsconfigPath: string,
  logger: Logger,
  options?: ResolutionContextOptions,
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

  const result = resolve(program, {
    baseSemantics: DEFAULT_SEMANTICS,
    trace,
    fileSystem,
    defines,
    conventions,
    packagePath,
    packageRoots,
    templateExtensions: options?.templateExtensions,
    styleExtensions: options?.styleExtensions,
  }, resolutionLogger);

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
    })
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

interface ThirdPartyResolutionResult {
  resources: Partial<ResourceCollections>;
  gaps: AnalysisGap[];
  confidence?: CatalogConfidence;
}

interface ResolvedPackageSpec {
  name: string | null;
  path: string;
  preferSource: boolean;
}

type ThirdPartyPackageEntry = NonNullable<ThirdPartyOptions["packages"]>[number];

async function derivePackageRoots(
  packagePath: string,
): Promise<ReadonlyMap<string, string> | undefined> {
  const ctx = await detectMonorepo(packagePath);
  if (!ctx) {
    return undefined;
  }
  return buildPackageRootMap(ctx);
}

async function resolveThirdPartyResources(
  options: ThirdPartyOptions | undefined,
  ctx: {
    packagePath: string;
    packageRoots?: ReadonlyMap<string, string> | Readonly<Record<string, string>>;
    logger: Logger;
    cacheFingerprint?: string;
  },
): Promise<ThirdPartyResolutionResult> {
  const explicitResources = buildThirdPartyResources(options?.resources);
  const packages = await collectThirdPartyPackages(options, ctx);

  if (packages.length === 0) {
    return { resources: explicitResources, gaps: [] };
  }

  const analysis = await analyzeThirdPartyPackages(packages, ctx);
  ctx.logger.info(
    `[aurelia-ssr] Third-party scan: ${packages.length} package(s), ` +
    `${analysis.resources ? countResourceCollections(analysis.resources) : 0} resources, ` +
    `${analysis.gaps.length} gap(s)`,
  );
  const mergedResources = analysis.resources
    ? mergeResourceCollections(analysis.resources, explicitResources)
    : explicitResources;

  return {
    resources: mergedResources,
    gaps: analysis.gaps,
    confidence: analysis.confidence,
  };
}

async function analyzeThirdPartyPackages(
  packages: ResolvedPackageSpec[],
  ctx: { packagePath: string; logger: Logger; cacheFingerprint?: string },
): Promise<{ resources: ResourceCollections | null; gaps: AnalysisGap[]; confidence?: CatalogConfidence }> {
  const byPreferSource = new Map<boolean, string[]>();
  for (const spec of packages) {
    const list = byPreferSource.get(spec.preferSource) ?? [];
    list.push(spec.path);
    byPreferSource.set(spec.preferSource, list);
  }

  const gaps: AnalysisGap[] = [];
  const resourceDefs: Array<ResolutionResult["resources"][number]> = [];
  const cacheDir = join(ctx.packagePath, ".aurelia-cache", "npm-analysis");
  const analysisLogger = {
    log: (msg: string) => ctx.logger.info(msg),
    info: (msg: string) => ctx.logger.info(msg),
    warn: (msg: string) => ctx.logger.warn(msg),
    error: (msg: string) => ctx.logger.error(msg),
  };

  for (const [preferSource, paths] of byPreferSource) {
    const results = await analyzePackages(paths, {
      preferSource,
      cache: {
        dir: cacheDir,
        schemaVersion: ANALYSIS_SCHEMA_VERSION,
        fingerprint: ctx.cacheFingerprint ?? "",
        mode: "read-write",
      },
      logger: analysisLogger,
    });

    for (const result of results.values()) {
      gaps.push(...result.gaps);
      for (const res of result.value.resources) {
        resourceDefs.push(res.resource);
      }
    }
  }

  if (resourceDefs.length === 0) {
    return { resources: null, gaps, confidence: catalogConfidenceFromAnalysisGaps(gaps) };
  }

  const artifacts = buildSemanticsArtifacts(resourceDefs, DEFAULT_SEMANTICS);
  return {
    resources: artifacts.semantics.resources,
    gaps,
    confidence: catalogConfidenceFromAnalysisGaps(gaps),
  };
}

async function collectThirdPartyPackages(
  options: ThirdPartyOptions | undefined,
  ctx: { packagePath: string; packageRoots?: ReadonlyMap<string, string> | Readonly<Record<string, string>>; logger: Logger },
): Promise<ResolvedPackageSpec[]> {
  const results: ResolvedPackageSpec[] = [];
  const packagePath = ctx.packagePath;
  const packageRoots = ctx.packageRoots;

  const explicitPackages = options?.packages ?? [];
  for (const entry of explicitPackages) {
    const spec = resolvePackageSpec(entry, packagePath, packageRoots, ctx.logger, { warnOnMissing: true });
    if (spec) {
      results.push(spec);
    }
  }

  if (options?.scan) {
    const deps = readProjectDependencies(packagePath);
    for (const dep of deps) {
      const spec = resolvePackageSpec(dep, packagePath, packageRoots, ctx.logger, { warnOnMissing: false });
      if (!spec) continue;
      const isRelevant = await shouldScanPackage(dep, spec.path);
      if (isRelevant) {
        results.push(spec);
      }
    }
  }

  const deduped = new Map<string, ResolvedPackageSpec>();
  for (const spec of results) {
    if (!deduped.has(spec.path)) {
      deduped.set(spec.path, spec);
    }
  }

  return [...deduped.values()];
}

function resolvePackageSpec(
  entry: ThirdPartyPackageEntry,
  projectRoot: string,
  packageRoots: ReadonlyMap<string, string> | Readonly<Record<string, string>> | undefined,
  logger: Logger,
  opts?: { warnOnMissing?: boolean },
): ResolvedPackageSpec | null {
  if (!entry) return null;
  if (typeof entry === "string") {
    const path = resolvePackageRoot(entry, projectRoot, packageRoots, logger, opts);
    if (!path) return null;
    return { name: entry, path, preferSource: true };
  }

  const path = resolvePath(projectRoot, entry.path);
  if (!existsSync(path)) {
    if (opts?.warnOnMissing !== false) {
      logger.warn(`[aurelia-ssr] Third-party package path not found: ${path}`);
    }
    return null;
  }
  return {
    name: null,
    path,
    preferSource: entry.preferSource ?? true,
  };
}

function resolvePackageRoot(
  nameOrPath: string,
  projectRoot: string,
  packageRoots: ReadonlyMap<string, string> | Readonly<Record<string, string>> | undefined,
  logger: Logger,
  opts?: { warnOnMissing?: boolean },
): string | null {
  if (isPathLike(nameOrPath)) {
    const resolved = resolvePath(projectRoot, nameOrPath);
    if (!existsSync(resolved)) {
      if (opts?.warnOnMissing !== false) {
        logger.warn(`[aurelia-ssr] Third-party package path not found: ${resolved}`);
      }
      return null;
    }
    return resolved;
  }

  const mapped = lookupPackageRoot(packageRoots, nameOrPath);
  if (mapped) {
    return mapped;
  }

  try {
    const require = createRequire(join(projectRoot, "noop.js"));
    const pkgJson = require.resolve(`${nameOrPath}/package.json`);
    return dirname(pkgJson);
  } catch (error) {
    if (opts?.warnOnMissing !== false) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`[aurelia-ssr] Failed to resolve package "${nameOrPath}": ${message}`);
    }
    return null;
  }
}

function lookupPackageRoot(
  packageRoots: ReadonlyMap<string, string> | Readonly<Record<string, string>> | undefined,
  packageName: string,
): string | null {
  if (!packageRoots) return null;
  if (packageRoots instanceof Map) {
    return packageRoots.get(packageName) ?? null;
  }
  const record = packageRoots as Readonly<Record<string, string>>;
  return record[packageName] ?? null;
}

function isPathLike(value: string): boolean {
  return value.startsWith(".") || value.startsWith("/") || value.startsWith("\\");
}

function readProjectDependencies(packagePath: string): string[] {
  try {
    const pkgJsonPath = join(packagePath, "package.json");
    const content = readFileSync(pkgJsonPath, "utf-8");
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const deps = {
      ...pkg.dependencies,
      ...pkg.peerDependencies,
    };
    return Object.keys(deps);
  } catch {
    return [];
  }
}

async function shouldScanPackage(packageName: string, packagePath: string): Promise<boolean> {
  if (packageName === "aurelia" || packageName.startsWith("@aurelia/") || packageName.includes("aurelia")) {
    return true;
  }
  return isAureliaPackage(packagePath);
}

function countResourceCollections(resources: ResourceCollections): number {
  return Object.keys(resources.elements).length
    + Object.keys(resources.attributes).length
    + Object.keys(resources.controllers).length
    + Object.keys(resources.valueConverters).length
    + Object.keys(resources.bindingBehaviors).length;
}

function applyThirdPartyResources(
  result: ResolutionResult,
  extra: Partial<ResolutionResult["semantics"]["resources"]>,
  opts?: { gaps?: AnalysisGap[]; confidence?: CatalogConfidence },
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
  const gapList = opts?.gaps ?? [];
  const extraCatalogGaps = gapList.map(analysisGapToCatalogGap);
  const mergedCatalogGaps = [
    ...(result.catalog.gaps ?? []),
    ...extraCatalogGaps,
  ];
  const mergedConfidence = mergeCatalogConfidence(result.catalog.confidence, gapList, opts?.confidence);

  const sem = prepareSemantics(
    { ...result.semantics, resourceGraph: nextGraph },
    { resources: mergedResources },
  );
  const catalog = buildResourceCatalog(
    sem.resources,
    sem.bindingCommands,
    sem.attributePatterns,
    mergedCatalogGaps.length || mergedConfidence
      ? {
          gaps: mergedCatalogGaps.length ? mergedCatalogGaps : undefined,
          confidence: mergedConfidence,
        }
      : undefined,
  );
  const semantics = { ...sem, catalog };
  const syntax = buildTemplateSyntaxRegistry(semantics);

  const diagnostics = gapList.length > 0
    ? [...result.diagnostics, ...gapList.map(analysisGapToDiagnostic)]
    : result.diagnostics;

  return {
    ...result,
    semantics,
    catalog,
    syntax,
    resourceGraph: nextGraph,
    diagnostics,
  };
}

const LOCKFILES = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"] as const;

function buildAnalysisFingerprint(
  projectRoot: string,
  config: {
    thirdParty?: ThirdPartyOptions;
    conventions?: ConventionConfig;
    templateExtensions?: readonly string[];
    styleExtensions?: readonly string[];
  },
): string {
  const lockfileHash = computeLockfileHash(projectRoot);
  return hashObject({
    lockfileHash: lockfileHash ?? null,
    config: {
      thirdParty: config.thirdParty ?? null,
      conventions: config.conventions ?? null,
      templateExtensions: config.templateExtensions ?? null,
      styleExtensions: config.styleExtensions ?? null,
    },
  });
}

function computeLockfileHash(startDir: string): string | null {
  const lockfilePath = findLockfile(startDir);
  if (!lockfilePath) return null;
  try {
    const content = readFileSync(lockfilePath);
    return createHash("sha256").update(content).digest("hex");
  } catch {
    return null;
  }
}

function findLockfile(startDir: string): string | null {
  let current = startDir;
  while (true) {
    for (const name of LOCKFILES) {
      const candidate = join(current, name);
      if (existsSync(candidate)) {
        return candidate;
      }
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function analysisGapToCatalogGap(gap: AnalysisGap): CatalogGap {
  const message = `${gap.what}: ${gap.suggestion}`;
  const resource = gap.where?.file;
  return resource
    ? { kind: gap.why.kind, message, resource }
    : { kind: gap.why.kind, message };
}

function analysisGapToDiagnostic(gap: AnalysisGap): ResolutionResult["diagnostics"][number] {
  const diagnostic: ResolutionResult["diagnostics"][number] = {
    code: `gap:${gap.why.kind}`,
    message: `${gap.what}: ${gap.suggestion}`,
    severity: "warning",
  };
  if (gap.where?.file) {
    diagnostic.source = normalizePathForId(gap.where.file);
  }
  return diagnostic;
}

function mergeCatalogConfidence(
  base: CatalogConfidence | undefined,
  gaps: AnalysisGap[],
  override?: CatalogConfidence,
): CatalogConfidence | undefined {
  if (override) return override;
  if (gaps.length === 0) return base;
  if (base === "conservative") return base;
  if (gaps.some((gap) => isConservativeGap(gap.why.kind))) {
    return "conservative";
  }
  return base === "partial" ? base : "partial";
}

function catalogConfidenceFromAnalysisGaps(gaps: AnalysisGap[]): CatalogConfidence | undefined {
  if (gaps.length === 0) return undefined;
  if (gaps.some((gap) => isConservativeGap(gap.why.kind))) {
    return "conservative";
  }
  return "partial";
}

function isConservativeGap(kind: AnalysisGap["why"]["kind"]): boolean {
  switch (kind) {
    case "package-not-found":
    case "invalid-package-json":
    case "missing-package-field":
    case "entry-point-not-found":
    case "no-entry-points":
    case "complex-exports":
    case "workspace-no-source-dir":
    case "workspace-entry-not-found":
    case "unresolved-import":
    case "circular-import":
    case "external-package":
    case "unsupported-format":
    case "no-source":
    case "minified-code":
    case "parse-error":
      return true;
    default:
      return false;
  }
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
