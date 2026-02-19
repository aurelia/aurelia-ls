/**
 * Third-party resource resolution.
 *
 * Discovers, analyzes, and merges third-party npm package resources into
 * a ProjectSemanticsDiscoveryResult. Used by both the Vite plugin and semantic workspace.
 */

import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve as resolvePath } from "node:path";
import { createRequire } from "node:module";
import {
  BUILTIN_SEMANTICS,
  buildResourceGraphFromSemantics,
  asDocumentUri,
  normalizePathForId,
  isConservativeGap,
  createDiagnosticEmitter,
  diagnosticsByCategory,
  diagnosticsByCategoryFuture,
  type CatalogConfidence,
  type CatalogGap,
  type Bindable,
  type BindableDef,
  type BindingBehaviorDef,
  type BindingMode,
  type ControllerConfig,
  type CustomAttributeDef,
  type CustomElementDef,
  type ResourceCollections,
  type ResourceDef,
  type NormalizedPath,
  type SourceLocation,
  type Sourced,
  type TemplateControllerDef,
  type TypeRef,
  type ValueConverterDef,
  type CompilerDiagnostic,
} from "../compiler.js";
import type { ProjectSemanticsDiscoveryResult } from "../resolve.js";
import type { AnalysisGap } from "../npm/types.js";
import { analyzePackages, isAureliaPackage } from "../npm/index.js";
import {
  buildSemanticsArtifacts,
  type DefinitionCandidateOverride,
  type DefinitionConvergenceRecord,
} from "../assemble/build.js";
import {
  createReplayConvergenceOverrides,
  mergeDefinitionCandidateOverrides,
} from "../definition/candidate-overrides.js";
import { hashObject } from "../fingerprint/index.js";
import type { ConventionConfig } from "../conventions/types.js";
import type {
  ThirdPartyOptions,
  ThirdPartyPolicy,
  ThirdPartyDiscoveryResult,
  ResolvedPackageSpec,
  ThirdPartyLogger,
} from "./types.js";
import {
  buildThirdPartyResources,
  hasThirdPartyResources,
  mergeResourceCollections,
  mergeScopeResources,
} from "./merge.js";
import { unwrapSourced } from "../assemble/sourced.js";
import { definitionConvergenceToDiagnostics } from "../diagnostics/convert.js";

// ============================================================================
// Public API
// ============================================================================

const ANALYSIS_SCHEMA_VERSION = 1;
const GAP_EMITTER = createDiagnosticEmitter(diagnosticsByCategory.gaps, { stage: "project" });
const CONVERGENCE_EMITTER = createDiagnosticEmitter(diagnosticsByCategoryFuture.project, { stage: "project" });

export interface ThirdPartyDiscoveryContext {
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
  ctx: ThirdPartyDiscoveryContext,
): Promise<ThirdPartyDiscoveryResult> {
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
 * Apply third-party resources to a ProjectSemanticsDiscoveryResult, producing a new result
 * with merged semantics, catalog, syntax, and optionally resource graph.
 */
export function applyThirdPartyResources(
  result: ProjectSemanticsDiscoveryResult,
  extra: Partial<ResourceCollections>,
  opts?: { gaps?: AnalysisGap[]; confidence?: CatalogConfidence; policy?: ThirdPartyPolicy },
): ProjectSemanticsDiscoveryResult {
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
  const policy = opts?.policy ?? "root-scope";
  const configFile = result.packagePath ?? normalizePathForId("/");
  const overlayCandidates = resourceCollectionsToResourceDefs(extra, configFile);
  const evidence = overlayCandidates.length > 0
    ? [...result.definition.evidence, ...overlayCandidates]
    : result.definition.evidence;
  const overlayOverrides = createOverlayCandidateOverrides(overlayCandidates);
  const candidateOverrides = mergeDefinitionCandidateOverrides(
    createReplayConvergenceOverrides(
      evidence,
      result.definition.convergence,
      result.packagePath,
    ),
    overlayOverrides,
  );
  const artifacts = buildSemanticsArtifacts(
    evidence,
    result.semantics,
    {
      ...(mergedCatalogGaps.length || mergedConfidence
        ? {
            gaps: mergedCatalogGaps.length ? mergedCatalogGaps : undefined,
            confidence: mergedConfidence,
          }
        : {}),
      ...(candidateOverrides.size > 0 ? { candidateOverrides } : {}),
    },
  );
  const definition = {
    authority: artifacts.definitionAuthority,
    evidence,
    convergence: artifacts.definitionConvergence,
  } as const;
  const newConvergence = diffConvergenceRecords(result.definition.convergence, definition.convergence);
  const convergenceDiagnostics = definitionConvergenceToDiagnostics(newConvergence, CONVERGENCE_EMITTER);
  const mergedDiagnostics = convergenceDiagnostics.length > 0
    ? [...diagnostics, ...convergenceDiagnostics]
    : diagnostics;

  if (policy === "rebuild-graph") {
    const nextGraph = buildResourceGraphFromSemantics(artifacts.semantics);
    return {
      ...result,
      semantics: artifacts.semantics,
      catalog: artifacts.catalog,
      syntax: artifacts.syntax,
      definition,
      resourceGraph: nextGraph,
      diagnostics: mergedDiagnostics,
    };
  }

  if (policy === "semantics") {
    return {
      ...result,
      semantics: artifacts.semantics,
      catalog: artifacts.catalog,
      syntax: artifacts.syntax,
      definition,
      diagnostics: mergedDiagnostics,
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

  return {
    ...result,
    semantics: artifacts.semantics,
    catalog: artifacts.catalog,
    syntax: artifacts.syntax,
    definition,
    resourceGraph: nextGraph,
    diagnostics: mergedDiagnostics,
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
  ctx: ThirdPartyDiscoveryContext,
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
  ctx: ThirdPartyDiscoveryContext,
): Promise<{ resources: ResourceCollections | null; gaps: AnalysisGap[]; confidence?: CatalogConfidence }> {
  const byPreferSource = new Map<boolean, string[]>();
  for (const spec of packages) {
    const list = byPreferSource.get(spec.preferSource) ?? [];
    list.push(spec.path);
    byPreferSource.set(spec.preferSource, list);
  }

  const gaps: AnalysisGap[] = [];
  const resourceDefs: ResourceDef[] = [];
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
// Overlay candidate recomputation
// ============================================================================

function resourceCollectionsToResourceDefs(
  resources: Partial<ResourceCollections>,
  configFile: NormalizedPath,
): ResourceDef[] {
  const defs: ResourceDef[] = [];
  const templateControllerNames = new Set<string>();

  const elementEntries = Object.entries(resources.elements ?? {})
    .sort(([left], [right]) => left.localeCompare(right));
  for (const [name, element] of elementEntries) {
    defs.push(toCustomElementDef(name, element, element.file ?? configFile));
  }

  const attributeEntries = Object.entries(resources.attributes ?? {})
    .sort(([left], [right]) => left.localeCompare(right));
  for (const [name, attribute] of attributeEntries) {
    const file = attribute.file ?? configFile;
    if (attribute.isTemplateController) {
      const controller = resources.controllers?.[name];
      defs.push(toTemplateControllerDef(name, attribute, file, controller));
      templateControllerNames.add(normalizeName(attribute.name || name));
      continue;
    }
    defs.push(toCustomAttributeDef(name, attribute, file));
  }

  const controllerEntries = Object.entries(resources.controllers ?? {})
    .sort(([left], [right]) => left.localeCompare(right));
  for (const [name, controller] of controllerEntries) {
    const normalized = normalizeName(controller.name || name);
    if (templateControllerNames.has(normalized)) continue;
    defs.push(toControllerOnlyDefinition(normalized, controller, configFile));
  }

  const converterEntries = Object.entries(resources.valueConverters ?? {})
    .sort(([left], [right]) => left.localeCompare(right));
  for (const [name, converter] of converterEntries) {
    defs.push(toValueConverterDef(name, converter, converter.file ?? configFile));
  }

  const behaviorEntries = Object.entries(resources.bindingBehaviors ?? {})
    .sort(([left], [right]) => left.localeCompare(right));
  for (const [name, behavior] of behaviorEntries) {
    defs.push(toBindingBehaviorDef(name, behavior, behavior.file ?? configFile));
  }

  return defs;
}

function createOverlayCandidateOverrides(
  resources: readonly ResourceDef[],
): ReadonlyMap<ResourceDef, DefinitionCandidateOverride> {
  const overrides = new Map<ResourceDef, DefinitionCandidateOverride>();
  for (let i = 0; i < resources.length; i += 1) {
    const resource = resources[i]!;
    overrides.set(resource, {
      sourceKind: "explicit-config",
      evidenceRank: 0,
      candidateId: createOverlayCandidateId(resource, i + 1),
    });
  }
  return overrides;
}

function createOverlayCandidateId(resource: ResourceDef, ordinal: number): string {
  const name = unwrapSourced(resource.name) ?? "";
  const className = unwrapSourced(resource.className) ?? "";
  const file = resource.file ?? "";
  return `overlay|${resource.kind}|${name}|${className}|${file}|${ordinal}`;
}

function toCustomElementDef(name: string, element: ResourceCollections["elements"][string], file: NormalizedPath): CustomElementDef {
  const resolvedName = normalizeName(element.name || name);
  return {
    kind: "custom-element",
    name: configSourced(resolvedName, file),
    className: configSourced(element.className || toPascalCase(resolvedName), file),
    aliases: (element.aliases ?? []).map((alias) => configSourced(normalizeName(alias), file)),
    containerless: configSourced(Boolean(element.containerless), file),
    shadowOptions: configSourced(element.shadowOptions, file),
    capture: configSourced(Boolean(element.capture), file),
    processContent: configSourced(Boolean(element.processContent), file),
    boundary: configSourced(Boolean(element.boundary), file),
    bindables: toBindableDefs(element.bindables, file),
    dependencies: (element.dependencies ?? []).map((dep) => configSourced(dep, file)),
    ...(element.file ? { file: element.file } : {}),
    ...(element.package ? { package: element.package } : {}),
  };
}

function toCustomAttributeDef(name: string, attribute: ResourceCollections["attributes"][string], file: NormalizedPath): CustomAttributeDef {
  const resolvedName = normalizeName(attribute.name || name);
  return {
    kind: "custom-attribute",
    name: configSourced(resolvedName, file),
    className: configSourced(attribute.className || toPascalCase(resolvedName), file),
    aliases: (attribute.aliases ?? []).map((alias) => configSourced(normalizeName(alias), file)),
    noMultiBindings: configSourced(Boolean(attribute.noMultiBindings), file),
    ...(attribute.primary ? { primary: configSourced(attribute.primary, file) } : {}),
    bindables: toBindableDefs(attribute.bindables, file),
    dependencies: [],
    ...(attribute.file ? { file: attribute.file } : {}),
    ...(attribute.package ? { package: attribute.package } : {}),
  };
}

function toTemplateControllerDef(
  name: string,
  attribute: ResourceCollections["attributes"][string],
  file: NormalizedPath,
  controller?: ControllerConfig,
): TemplateControllerDef {
  const resolvedName = normalizeName(attribute.name || name);
  const aliases = (attribute.aliases ?? []).map((alias) => normalizeName(alias));
  const bindables = mergeBindableDefs(
    toBindableDefs(attribute.bindables, file),
    controller ? toBindableDefs(controller.props ?? {}, file) : {},
  );
  return {
    kind: "template-controller",
    name: configSourced(resolvedName, file),
    className: configSourced(attribute.className || toPascalCase(resolvedName), file),
    aliases: configSourced(aliases, file),
    noMultiBindings: configSourced(Boolean(attribute.noMultiBindings), file),
    bindables,
    ...(controller ? { semantics: toControllerSemantics(controller) } : {}),
    ...(attribute.file ? { file: attribute.file } : {}),
    ...(attribute.package ? { package: attribute.package } : {}),
  };
}

function toControllerOnlyDefinition(
  name: string,
  controller: ControllerConfig,
  file: NormalizedPath,
): TemplateControllerDef {
  return {
    kind: "template-controller",
    name: configSourced(name, file),
    className: configSourced(toPascalCase(name), file),
    aliases: configSourced([], file),
    noMultiBindings: configSourced(false, file),
    bindables: toBindableDefs(controller.props ?? {}, file),
    semantics: toControllerSemantics(controller),
  };
}

function toControllerSemantics(controller: ControllerConfig): TemplateControllerDef["semantics"] {
  return {
    origin: "third-party-overlay",
    trigger: controller.trigger,
    scope: controller.scope,
    ...(controller.cardinality ? { cardinality: controller.cardinality } : {}),
    ...(controller.placement ? { placement: controller.placement } : {}),
    ...(controller.branches ? { branches: controller.branches } : {}),
    ...(controller.linksTo ? { linksTo: controller.linksTo } : {}),
    ...(controller.injects ? { injects: controller.injects } : {}),
    ...(controller.tailProps ? { tailProps: controller.tailProps } : {}),
  };
}

function toValueConverterDef(
  name: string,
  converter: ResourceCollections["valueConverters"][string],
  file: NormalizedPath,
): ValueConverterDef {
  const resolvedName = normalizeName(converter.name || name);
  const fromType = toTypeSourced(converter.in, file);
  const toType = toTypeSourced(converter.out, file);
  return {
    kind: "value-converter",
    name: configSourced(resolvedName, file),
    className: configSourced(converter.className || toPascalCase(resolvedName), file),
    ...(fromType ? { fromType } : {}),
    ...(toType ? { toType } : {}),
    ...(converter.file ? { file: converter.file } : {}),
    ...(converter.package ? { package: converter.package } : {}),
  };
}

function toBindingBehaviorDef(
  name: string,
  behavior: ResourceCollections["bindingBehaviors"][string],
  file: NormalizedPath,
): BindingBehaviorDef {
  const resolvedName = normalizeName(behavior.name || name);
  return {
    kind: "binding-behavior",
    name: configSourced(resolvedName, file),
    className: configSourced(behavior.className || toPascalCase(resolvedName), file),
    ...(behavior.file ? { file: behavior.file } : {}),
    ...(behavior.package ? { package: behavior.package } : {}),
  };
}

function toBindableDefs(bindables: Readonly<Record<string, Bindable>>, file: NormalizedPath): Readonly<Record<string, BindableDef>> {
  const defs: Record<string, BindableDef> = {};
  const entries = Object.entries(bindables).sort(([left], [right]) => left.localeCompare(right));
  for (const [key, bindable] of entries) {
    const name = bindable.name || key;
    const type = toTypeSourced(bindable.type, file);
    defs[name] = {
      property: configSourced(name, file),
      attribute: configSourced(bindable.attribute || name, file),
      mode: configSourced(bindable.mode ?? "default", file),
      primary: configSourced(bindable.primary ?? false, file),
      ...(type ? { type } : {}),
      ...(bindable.doc ? { doc: configSourced(bindable.doc, file) } : {}),
    };
  }
  return defs;
}

function mergeBindableDefs(
  primary: Readonly<Record<string, BindableDef>>,
  secondary: Readonly<Record<string, BindableDef>>,
): Readonly<Record<string, BindableDef>> {
  return { ...secondary, ...primary };
}

function toTypeSourced(type: TypeRef | undefined, file: NormalizedPath): Sourced<string> | undefined {
  if (!type) return undefined;
  switch (type.kind) {
    case "ts":
      return configSourced(type.name, file);
    case "any":
      return configSourced("any", file);
    case "unknown":
      return undefined;
  }
}

function configSourced<T>(value: T, file: NormalizedPath): Sourced<T> {
  const location: SourceLocation = { file, pos: 0, end: 0 };
  return { origin: "config", value, location };
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join("");
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function diffConvergenceRecords(
  previous: readonly DefinitionConvergenceRecord[],
  next: readonly DefinitionConvergenceRecord[],
): DefinitionConvergenceRecord[] {
  const previousKeys = new Set(previous.map((record) => convergenceRecordKey(record)));
  return next.filter((record) => !previousKeys.has(convergenceRecordKey(record)));
}

function convergenceRecordKey(record: DefinitionConvergenceRecord): string {
  const reasons = record.reasons
    .map((reason) => `${reason.code}:${reason.field}:${reason.detail ?? ""}`)
    .sort()
    .join("|");
  const candidates = record.candidates
    .map((candidate) => `${candidate.candidateId}:${candidate.sourceKind}:${candidate.file ?? ""}`)
    .sort()
    .join("|");
  return `${record.resourceKind}:${record.resourceName}:${reasons}:${candidates}`;
}

// ============================================================================
// Gap/diagnostic conversion
// ============================================================================

function analysisGapToCatalogGap(gap: AnalysisGap): CatalogGap {
  const message = `${gap.what}: ${gap.suggestion}`;
  const resource = gap.where?.file;
  return {
    kind: gap.why.kind,
    message,
    ...(resource != null && { resource }),
    ...(gap.resource != null && { resourceKind: gap.resource.kind, resourceName: gap.resource.name }),
  };
}

function analysisGapToDiagnostic(gap: AnalysisGap): ProjectSemanticsDiscoveryResult["diagnostics"][number] {
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

function toRawDiagnostic(diag: CompilerDiagnostic): ProjectSemanticsDiscoveryResult["diagnostics"][number] {
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

