/**
 * Third-party resource resolution.
 *
 * Discovers, analyzes, and merges third-party npm package resources into
 * a ResolutionResult. Used by both the Vite plugin and semantic workspace.
 */

import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve as resolvePath } from "node:path";
import { createRequire } from "node:module";
import {
  BUILTIN_SEMANTICS,
  buildResourceCatalog,
  buildResourceGraphFromSemantics,
  buildTemplateSyntaxRegistry,
  prepareProjectSemantics,
  asDocumentUri,
  normalizePathForId,
  createDiagnosticEmitter,
  diagnosticsByCategory,
  type CatalogConfidence,
  type CatalogGap,
  type ResourceCollections,
  type CompilerDiagnostic,
} from "../compiler.js";
import type { ResolutionResult } from "../resolve.js";
import type { AnalysisGap } from "../npm/types.js";
import { analyzePackages, isAureliaPackage } from "../npm/index.js";
import { buildSemanticsArtifacts } from "../assemble/build.js";
import { hashObject } from "../fingerprint/index.js";
import type { ConventionConfig } from "../conventions/types.js";
import type {
  ThirdPartyOptions,
  ThirdPartyPolicy,
  ThirdPartyResolutionResult,
  ResolvedPackageSpec,
  ThirdPartyLogger,
} from "./types.js";
import {
  buildThirdPartyResources,
  hasThirdPartyResources,
  mergeResourceCollections,
  mergeScopeResources,
} from "./merge.js";

// ============================================================================
// Public API
// ============================================================================

const ANALYSIS_SCHEMA_VERSION = 1;
const GAP_EMITTER = createDiagnosticEmitter(diagnosticsByCategory.gaps, { source: "project" });

export interface ThirdPartyResolutionContext {
  packagePath: string;
  packageRoots?: ReadonlyMap<string, string> | Readonly<Record<string, string>>;
  logger: ThirdPartyLogger;
  cacheFingerprint?: string;
}

/**
 * Resolve third-party resources: collect packages, analyze, merge explicit config.
 */
export async function resolveThirdPartyResources(
  options: ThirdPartyOptions | undefined,
  ctx: ThirdPartyResolutionContext,
): Promise<ThirdPartyResolutionResult> {
  const explicitResources = buildThirdPartyResources(options?.resources);
  const packages = await collectThirdPartyPackages(options, ctx);

  if (packages.length === 0) {
    return { resources: explicitResources, gaps: [] };
  }

  const analysis = await analyzeThirdPartyPackages(packages, ctx);
  ctx.logger.info(
    `[third-party] Scan: ${packages.length} package(s), ` +
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

/**
 * Apply third-party resources to a ResolutionResult, producing a new result
 * with merged semantics, catalog, syntax, and optionally resource graph.
 */
export function applyThirdPartyResources(
  result: ResolutionResult,
  extra: Partial<ResourceCollections>,
  opts?: { gaps?: AnalysisGap[]; confidence?: CatalogConfidence; policy?: ThirdPartyPolicy },
): ResolutionResult {
  const gapList = opts?.gaps ?? [];
  const catalogGaps = gapList.filter((gap) => gap.why.kind !== "cache-corrupt");
  const extraCatalogGaps = catalogGaps.map(analysisGapToCatalogGap);
  const mergedCatalogGaps = [
    ...(result.catalog.gaps ?? []),
    ...extraCatalogGaps,
  ];
  const mergedConfidence = mergeCatalogConfidence(result.catalog.confidence, catalogGaps, opts?.confidence);

  const diagnostics = gapList.length > 0
    ? [...result.diagnostics, ...gapList.map(analysisGapToDiagnostic)]
    : result.diagnostics;

  const mergedResources = mergeResourceCollections(result.semantics.resources, extra);
  const policy = opts?.policy ?? "root-scope";

  const buildSemanticsWithResources = () => {
    const sem = prepareProjectSemantics(
      { ...result.semantics },
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
    return { semantics, catalog, syntax };
  };

  if (policy === "rebuild-graph") {
    const { semantics, catalog, syntax } = buildSemanticsWithResources();
    const nextGraph = buildResourceGraphFromSemantics(semantics);
    return {
      ...result,
      semantics,
      catalog,
      syntax,
      resourceGraph: nextGraph,
      diagnostics,
    };
  }

  if (policy === "semantics") {
    const { semantics, catalog, syntax } = buildSemanticsWithResources();
    return {
      ...result,
      semantics,
      catalog,
      syntax,
      diagnostics,
    };
  }

  // Default: root-scope
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
  const { semantics, catalog, syntax } = buildSemanticsWithResources();

  return {
    ...result,
    semantics,
    catalog,
    syntax,
    resourceGraph: nextGraph,
    diagnostics,
  };
}

/**
 * Build a fingerprint for cache invalidation of third-party analysis.
 */
export function buildAnalysisFingerprint(
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

// ============================================================================
// Package collection
// ============================================================================

type ThirdPartyPackageEntry = NonNullable<ThirdPartyOptions["packages"]>[number];

export async function collectThirdPartyPackages(
  options: ThirdPartyOptions | undefined,
  ctx: ThirdPartyResolutionContext,
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

export async function shouldScanPackage(packageName: string, packagePath: string): Promise<boolean> {
  if (packageName === "aurelia" || packageName.startsWith("@aurelia/") || packageName.includes("aurelia")) {
    return true;
  }
  return isAureliaPackage(packagePath);
}

// ============================================================================
// Internal helpers
// ============================================================================

async function analyzeThirdPartyPackages(
  packages: ResolvedPackageSpec[],
  ctx: ThirdPartyResolutionContext,
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
      const packageName = result.value.packageName;
      for (const res of result.value.resources) {
        resourceDefs.push(packageName ? { ...res.resource, package: packageName } : res.resource);
      }
    }
  }

  if (resourceDefs.length === 0) {
    return { resources: null, gaps, confidence: catalogConfidenceFromAnalysisGaps(gaps) };
  }

  const artifacts = buildSemanticsArtifacts(resourceDefs, BUILTIN_SEMANTICS);
  return {
    resources: artifacts.semantics.resources,
    gaps,
    confidence: catalogConfidenceFromAnalysisGaps(gaps),
  };
}

function resolvePackageSpec(
  entry: ThirdPartyPackageEntry,
  projectRoot: string,
  packageRoots: ReadonlyMap<string, string> | Readonly<Record<string, string>> | undefined,
  logger: ThirdPartyLogger,
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
      logger.warn(`[third-party] Package path not found: ${path}`);
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
  logger: ThirdPartyLogger,
  opts?: { warnOnMissing?: boolean },
): string | null {
  if (isPathLike(nameOrPath)) {
    const resolved = resolvePath(projectRoot, nameOrPath);
    if (!existsSync(resolved)) {
      if (opts?.warnOnMissing !== false) {
        logger.warn(`[third-party] Package path not found: ${resolved}`);
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
      logger.warn(`[third-party] Failed to resolve package "${nameOrPath}": ${message}`);
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

function countResourceCollections(resources: ResourceCollections): number {
  return Object.keys(resources.elements).length
    + Object.keys(resources.attributes).length
    + Object.keys(resources.controllers).length
    + Object.keys(resources.valueConverters).length
    + Object.keys(resources.bindingBehaviors).length;
}

// ============================================================================
// Lockfile fingerprint
// ============================================================================

const LOCKFILES = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"] as const;

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

// ============================================================================
// Gap/diagnostic conversion
// ============================================================================

function analysisGapToCatalogGap(gap: AnalysisGap): CatalogGap {
  const message = `${gap.what}: ${gap.suggestion}`;
  const resource = gap.where?.file;
  return resource
    ? { kind: gap.why.kind, message, resource }
    : { kind: gap.why.kind, message };
}

function analysisGapToDiagnostic(gap: AnalysisGap): ResolutionResult["diagnostics"][number] {
  const code = mapGapKindToCode(gap.why.kind);
  const uri = gap.where?.file
    ? asDocumentUri(normalizePathForId(gap.where.file))
    : undefined;
  const diagnostic = toRawDiagnostic(GAP_EMITTER.emit(code, {
    message: `${gap.what}: ${gap.suggestion}`,
    severity: code === "aurelia/gap/cache-corrupt" ? "warning" : "info",
    data: { gapKind: gap.why.kind },
  }));
  return uri ? { ...diagnostic, uri } : diagnostic;
}

function toRawDiagnostic(diag: CompilerDiagnostic): ResolutionResult["diagnostics"][number] {
  const { span, ...rest } = diag;
  return span ? { ...rest, span } : { ...rest };
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

function mapGapKindToCode(kind: string): "aurelia/gap/partial-eval" | "aurelia/gap/unknown-registration" | "aurelia/gap/cache-corrupt" {
  if (kind === "cache-corrupt") return "aurelia/gap/cache-corrupt";
  if (UNKNOWN_REGISTRATION_GAP_KINDS.has(kind)) return "aurelia/gap/unknown-registration";
  if (PARTIAL_EVAL_GAP_KINDS.has(kind)) return "aurelia/gap/partial-eval";
  return "aurelia/gap/partial-eval";
}

const UNKNOWN_REGISTRATION_GAP_KINDS = new Set([
  "dynamic-value",
  "function-return",
  "computed-property",
  "spread-unknown",
  "unsupported-pattern",
  "conditional-registration",
  "loop-variable",
  "invalid-resource-name",
]);

const PARTIAL_EVAL_GAP_KINDS = new Set([
  "package-not-found",
  "invalid-package-json",
  "missing-package-field",
  "entry-point-not-found",
  "no-entry-points",
  "complex-exports",
  "workspace-no-source-dir",
  "workspace-entry-not-found",
  "unresolved-import",
  "circular-import",
  "external-package",
  "legacy-decorators",
  "no-source",
  "minified-code",
  "unsupported-format",
  "analysis-failed",
  "parse-error",
]);

function catalogConfidenceFromAnalysisGaps(gaps: AnalysisGap[]): CatalogConfidence | undefined {
  const catalogGaps = gaps.filter((gap) => gap.why.kind !== "cache-corrupt");
  if (catalogGaps.length === 0) return undefined;
  if (catalogGaps.some((gap) => isConservativeGap(gap.why.kind))) {
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
    case "analysis-failed":
      return true;
    default:
      return false;
  }
}
