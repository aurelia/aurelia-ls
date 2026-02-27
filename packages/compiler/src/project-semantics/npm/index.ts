/**
 * NPM Package Analysis
 *
 * Extracts Aurelia resource semantics from npm packages.
 * Used by app mode to understand dependencies, and by library mode
 * to generate manifests.
 *
 * @example
 * ```typescript
 * import { analyzePackage } from '../compiler.js';
 *
 * const result = await analyzePackage('./node_modules/aurelia2-table');
 * if (result.confidence !== 'manual') {
 *   console.log('Found resources:', result.value.resources);
 * } else {
 *   console.log('Could not analyze:', result.gaps);
 * }
 * ```
 */

// Re-export analysis types
export type {
  AnalysisResult,
  Confidence,
  AnalysisGap,
  GapLocation,
  GapReason,
  PackageAnalysis,
  AnalysisOptions,
  ExtractedConfiguration,
  ConfigurationRegistration,
  PackageSourceLocation,
  // Inspection types
  InspectionResult,
  InspectedResource,
  InspectedBindable,
  InspectedConfiguration,
  InspectionGraph,
  InspectionEdge,
  InspectedGap,
} from './types.js';

// Re-export utility functions
export {
  success,
  partial,
  combine,
  gap,
} from './types.js';

// Re-export scanner types and functions
export type { PackageInfo, EntryPoint } from './scanner.js';
export { scanPackage, getSourceEntryPoint } from './scanner.js';
import { checkIsAureliaPackage, scanPackage, getSourceEntryPoint } from './scanner.js';

// Re-export monorepo types and functions
export type { MonorepoContext, WorkspacePackage, WorkspaceResolutionResult } from './monorepo.js';
export { detectMonorepo, resolveWorkspaceImport, resolveWorkspaceImportWithReason, buildPackageRootMap } from './monorepo.js';
import {
  detectMonorepo,
  resolveWorkspaceImport,
  isRelativeImport,
  isPackageImport,
  type MonorepoContext,
} from './monorepo.js';

// Import ES2022 extraction
import { extractFromES2022 } from './decorator-es2022.js';

// Import unified extraction and pattern matching
import { extractAllFileFacts } from '../extract/file-facts-extractor.js';
import { matchDecorator } from '../recognize/decorator.js';
import { matchStaticAu } from '../recognize/static-au.js';
import { matchConvention } from '../recognize/convention.js';
import { matchDefine } from '../recognize/define.js';
import { canonicalPath } from '../util/naming.js';
import type { FileFacts, FileContext, DefineCall } from '../extract/file-facts.js';
import { evaluateFileFacts } from "../evaluate/partial-evaluation.js";
// Import export resolver for cross-file resolution
import { buildExportBindingMap } from '../exports/export-resolver.js';
import { buildValueResolutionContext, fullyResolve } from "../evaluate/value/resolve.js";
import { buildFileScope } from "../evaluate/value/scope.js";
import { transformModuleExports } from "../evaluate/value/transform.js";
import {
  getRegisterMethod,
  isRegistryShape,
  type ClassValue,
  type LexicalScope,
} from "../evaluate/value/types.js";
import { tryResolveAsFactory } from "./patterns/factory.js";
import { extractRegisterBodyResources, type RegisterBodyContext } from "./patterns/register-body.js";
// =============================================================================
// Main API
// =============================================================================

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, basename, dirname, resolve as resolvePath } from 'node:path';
import * as ts from 'typescript';
import type {
  AnalysisResult,
  AnalysisGap,
  PackageAnalysis,
  AnalysisOptions,
  ExtractedConfiguration,
  ConfigurationRegistration,
  InspectionResult,
  InspectedResource,
  InspectedBindable,
  InspectedConfiguration,
  InspectionGraph,
  InspectionEdge,
  InspectedGap,
} from './types.js';
import type { Logger } from '../types.js';
import { success as _success, partial, highConfidence, gap, combine as _combine } from './types.js';
import {
  debug,
  type NormalizedPath,
  type ResourceDef,
} from '../compiler.js';
import type { AnalyzedResource, ResourceEvidence, ResourcePattern } from './types.js';
import { explicitEvidence, inferredEvidence } from './evidence.js';
import { unwrapSourced } from '../assemble/sourced.js';
import { hashObject } from '../fingerprint/fingerprint.js';
import { sortResourceDefinitionCandidates, type ResourceDefinitionCandidate } from "../definition/candidate-order.js";
import { mergeResourceDefinitionCandidates } from "../definition/resource-merge.js";
import type { DefinitionSourceKind } from "../definition/solver.js";
/**
 * Analyze an npm package to extract Aurelia resource semantics.
 *
 * @param packagePath - Path to package root (containing package.json)
 * @param options - Analysis options
 * @returns Analysis result with extracted resources and any gaps
 */
export async function analyzePackage(
  packagePath: string,
  options?: AnalysisOptions
): Promise<AnalysisResult<PackageAnalysis>> {
  const preferSource = options?.preferSource ?? true;
  const gaps: AnalysisGap[] = [];

  // Step 1: Scan the package
  const scanResult = await scanPackage(packagePath);
  if (scanResult.value === null) {
    // Package not found or invalid
    return partial(
      { packageName: 'unknown', version: '0.0.0', resources: [], configurations: [] },
      'manual',
      scanResult.gaps
    );
  }

  const pkgInfo = scanResult.value;
  gaps.push(...scanResult.gaps);

  // Step 2: Multi-strategy extraction with fallback chain
  // Strategy order based on preferSource option:
  // - preferSource: true  → TypeScript source → ES2022 compiled JS
  // - preferSource: false → ES2022 compiled JS → TypeScript source
  //
  // Later strategies fill gaps from earlier ones. Results are merged.

  const allResources: AnalyzedResource[] = [];
  let primaryStrategyUsed: 'typescript' | 'es2022' | 'none' = 'none';

  // Determine which strategies to try and in what order
  const hasTypeScript = pkgInfo.hasTypeScriptSource && pkgInfo.sourceDir;
  const hasJavaScript = pkgInfo.entryPoints.some(e => !e.typesOnly);

  const strategies: Array<'typescript' | 'es2022'> = preferSource
    ? ['typescript', 'es2022']
    : ['es2022', 'typescript'];

  // Collect configurations from extraction strategies
  const allConfigurations: ExtractedConfiguration[] = [];

  for (const strategy of strategies) {
    if (strategy === 'typescript' && hasTypeScript) {
      const tsResult = await extractFromTypeScriptSource(pkgInfo, packagePath);
      if (tsResult.resources.length > 0) {
        mergeResources(allResources, tsResult.resources);
        if (primaryStrategyUsed === 'none') {
          primaryStrategyUsed = 'typescript';
        }
      }
      allConfigurations.push(...tsResult.configurations);
      gaps.push(...tsResult.gaps);
    } else if (strategy === 'es2022' && hasJavaScript) {
      const es2022Result = await extractFromCompiledJS(pkgInfo, packagePath);
      if (es2022Result.resources.length > 0) {
        mergeResources(allResources, es2022Result.resources);
        if (primaryStrategyUsed === 'none') {
          primaryStrategyUsed = 'es2022';
        }
      }
      allConfigurations.push(...es2022Result.configurations);
      gaps.push(...es2022Result.gaps);
    }

    // If we found resources and have no blocking gaps, we can stop
    // (later strategies would just find the same things)
    if (allResources.length > 0 && !hasBlockingGaps(gaps)) {
      break;
    }
  }

  // Step 3: Determine confidence based on results
  const confidence = determineConfidence(allResources, gaps, primaryStrategyUsed);

  // Step 4: Build result
  const analysis: PackageAnalysis = {
    packageName: pkgInfo.name,
    version: pkgInfo.version,
    resources: allResources,
    configurations: allConfigurations,
  };

  // Use semantic helpers when appropriate
  if (gaps.length === 0 && confidence === 'high') {
    return highConfidence(analysis);
  }
  return partial(analysis, confidence, gaps);
}

/**
 * Check if gaps include blocking patterns that prevent confident analysis.
 */
function hasBlockingGaps(gaps: AnalysisGap[]): boolean {
  return gaps.some(g =>
    g.why.kind === 'dynamic-value' ||
    g.why.kind === 'function-return' ||
    g.why.kind === 'spread-unknown'
  );
}

/**
 * Determine overall confidence based on extraction results.
 */
function determineConfidence(
  resources: AnalyzedResource[],
  gaps: AnalysisGap[],
  primaryStrategy: 'typescript' | 'es2022' | 'none'
): 'exact' | 'high' | 'partial' | 'low' | 'manual' {
  if (gaps.some((gap) => gap.why.kind === "analysis-failed")) {
    return 'manual';
  }
  // No resources found at all
  if (resources.length === 0) {
    // If we have gaps explaining why, it's 'manual' (user needs to provide config)
    if (gaps.length > 0) {
      return 'manual';
    }
    // No resources and no gaps - package might just not have Aurelia resources
    return 'high';
  }

  // Have resources - check for blocking gaps
  if (hasBlockingGaps(gaps)) {
    return 'partial';
  }

  // Check if any resources were found via convention only (low confidence)
  const hasConventionOnly = resources.some(r =>
    r.evidence.source === 'analyzed' && r.evidence.pattern === 'convention'
  );
  if (hasConventionOnly && primaryStrategy === 'none') {
    return 'low';
  }

  // Decorator-based extraction succeeded
  return 'high';
}

/**
 * Merge new resources into existing list, deduplicating by className.
 *
 * When a resource with the same className exists:
 * - Keep the one with more bindables (more complete extraction)
 * - Keep the one with higher-confidence evidence
 * - Merge aliases from both
 */
function mergeResources(
  existing: AnalyzedResource[],
  incoming: AnalyzedResource[]
): void {
  for (const newResource of incoming) {
    const newClassName = getResourceClassName(newResource.resource);
    const existingIndex = newClassName
      ? existing.findIndex(r => getResourceClassName(r.resource) === newClassName)
      : -1;

    if (existingIndex === -1) {
      // New resource - add it
      existing.push(newResource);
    } else {
      // Duplicate - merge intelligently
      const existingResource = existing[existingIndex]!;
      const merged = mergeResource(existingResource, newResource);
      existing[existingIndex] = merged;
    }
  }
}

/**
 * Merge two resources with the same className.
 * Takes the best data from each.
 */
function mergeResource(a: AnalyzedResource, b: AnalyzedResource): AnalyzedResource {
  const candidates: ResourceDefinitionCandidate[] = [
    {
      candidateId: "a",
      resource: a.resource,
      sourceKind: definitionSourceKindFromEvidence(a.evidence),
      evidenceRank: evidenceRankFromNpmEvidence(a.evidence),
    },
    {
      candidateId: "b",
      resource: b.resource,
      sourceKind: definitionSourceKindFromEvidence(b.evidence),
      evidenceRank: evidenceRankFromNpmEvidence(b.evidence),
    },
  ];
  const ordered = sortResourceDefinitionCandidates(candidates);
  const merged = mergeResourceDefinitionCandidates(ordered).value ?? a.resource;
  const primary = ordered[0]?.candidateId === "b" ? b : a;

  return {
    resource: merged,
    evidence: primary.evidence,
  };
}

// =============================================================================
// ResourceDef -> AnalyzedResource conversion
// =============================================================================

type MatchPattern = ResourcePattern;

interface AnalysisMatchResult {
  analyzed: AnalyzedResource | null;
  gaps: AnalysisGap[];
}

function matchClassForResource(cls: ClassValue, context?: FileContext): AnalysisMatchResult {
  const gaps: AnalysisGap[] = [];

  const decoratorResult = matchDecorator(cls);
  gaps.push(...decoratorResult.gaps);
  if (decoratorResult.resource) {
    return { analyzed: wrapAnalyzedResource(decoratorResult.resource, "decorator"), gaps };
  }

  const staticAuResult = matchStaticAu(cls);
  gaps.push(...staticAuResult.gaps);
  if (staticAuResult.resource) {
    return { analyzed: wrapAnalyzedResource(staticAuResult.resource, "static-au"), gaps };
  }

  const conventionResult = matchConvention(cls, context);
  gaps.push(...conventionResult.gaps);
  if (conventionResult.resource) {
    return { analyzed: wrapAnalyzedResource(conventionResult.resource, "convention"), gaps };
  }

  return { analyzed: null, gaps };
}

function matchDefineForResource(
  call: DefineCall,
  filePath: NormalizedPath,
  classes: readonly ClassValue[] = [],
): AnalysisMatchResult {
  const result = matchDefine(call, filePath, classes);
  return {
    analyzed: result.resource ? wrapAnalyzedResource(result.resource, "define") : null,
    gaps: result.gaps,
  };
}

function wrapAnalyzedResource(resource: ResourceDef, pattern: MatchPattern): AnalyzedResource {
  const evidence = pattern === "convention"
    ? inferredEvidence("convention")
    : explicitEvidence(pattern);
  return { resource, evidence };
}

function getResourceClassName(resource: ResourceDef): string | null {
  return unwrapSourced(resource.className) ?? null;
}

function getResourceName(resource: ResourceDef): string | null {
  return unwrapSourced(resource.name) ?? null;
}

function getResourceAliases(resource: ResourceDef): string[] {
  if (resource.kind === "template-controller") {
    const aliases = unwrapSourced(resource.aliases);
    return aliases ? [...aliases] : [];
  }
  if (resource.kind === "custom-element" || resource.kind === "custom-attribute") {
    return resource.aliases
      .map((alias) => unwrapSourced(alias))
      .filter((alias): alias is string => !!alias);
  }
  return [];
}

function getResourceBindables(resource: ResourceDef): InspectedBindable[] {
  if (resource.kind === "value-converter" || resource.kind === "binding-behavior") {
    return [];
  }
  const result: InspectedBindable[] = [];
  for (const [key, def] of Object.entries(resource.bindables)) {
    const name = unwrapSourced(def.property) ?? key;
    const attribute = unwrapSourced(def.attribute);
    const mode = unwrapSourced(def.mode);
    const primary = unwrapSourced(def.primary);
    const entry: InspectedBindable = { name };
    if (attribute) entry.attribute = attribute;
    if (mode !== undefined) entry.mode = mode;
    if (primary) entry.primary = true;
    result.push(entry);
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

function evidenceRankFromNpmEvidence(evidence: ResourceEvidence): number {
  if (evidence.source === "declared") {
    return 0;
  }
  if (evidence.kind === "explicit") {
    if (evidence.pattern === "decorator") return 1;
    if (evidence.pattern === "define") return 1;
    if (evidence.pattern === "static-au") return 2;
    return 2;
  }
  return 4;
}

function definitionSourceKindFromEvidence(evidence: ResourceEvidence): DefinitionSourceKind {
  if (evidence.source === "declared") {
    return "manifest-resource";
  }
  return evidence.kind === "explicit" ? "analysis-explicit" : "analysis-convention";
}

/**
 * Analyze multiple packages, potentially in parallel.
 *
 * @param packagePaths - Paths to package roots
 * @param options - Analysis options (applied to all)
 * @returns Map of package path to analysis result
 */
export async function analyzePackages(
  packagePaths: string[],
  options?: AnalysisOptions
): Promise<Map<string, AnalysisResult<PackageAnalysis>>> {
  const results = new Map<string, AnalysisResult<PackageAnalysis>>();
  if (packagePaths.length === 0) {
    return results;
  }

  const cache = normalizeCacheOptions(options?.cache);
  const mode = cache.mode;
  const logger = options?.logger ?? nullLogger;
  const preferSource = options?.preferSource ?? true;

  for (const inputPath of dedupe(packagePaths)) {
    const packagePath = resolvePath(inputPath);
    const cacheMeta = await readPackageMeta(packagePath);
    let cacheIssue: CacheReadResult | null = null;

    const cacheKey = cacheMeta
      ? buildCacheKey(cacheMeta, cache.schemaVersion, cache.fingerprint)
      : null;

    if (mode !== "off" && mode !== "write" && cacheKey && cacheMeta) {
      const cached = await readCacheEntry(cache.dir, cacheKey);
      if (cached.error) {
        cacheIssue = cached;
      } else if (cached.entry && cached.entry.schemaVersion === cache.schemaVersion) {
        if (cached.entry.packagePath === packagePath &&
            cached.entry.packageName === cacheMeta.name &&
            cached.entry.version === cacheMeta.version &&
            cached.entry.manifestHash === cacheMeta.manifestHash &&
            cached.entry.fingerprint === cache.fingerprint &&
            cached.entry.preferSource === preferSource) {
          results.set(packagePath, cached.entry.result);
          continue;
        }
      }
    }

    let result = await analyzePackage(packagePath, options);
    if (cacheIssue && cacheMeta) {
      result = appendGap(result, createCacheCorruptGap(cacheMeta.name, cacheIssue));
    }
    results.set(packagePath, result);

    if (mode !== "off" && mode !== "read" && cacheKey && cacheMeta) {
      const entry: PackageAnalysisCacheEntry = {
        schemaVersion: cache.schemaVersion,
        packagePath,
        packageName: cacheMeta.name,
        version: cacheMeta.version,
        manifestHash: cacheMeta.manifestHash,
        fingerprint: cache.fingerprint,
        preferSource,
        timestamp: new Date().toISOString(),
        result,
      };
      try {
        await writeCacheEntry(cache.dir, cacheKey, entry);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`[npm-analysis] Failed to write cache for ${cacheMeta.name}: ${message}`);
      }
    }
  }

  return results;
}

interface PackageAnalysisCacheEntry {
  schemaVersion: number;
  packagePath: string;
  packageName: string;
  version: string;
  manifestHash: string;
  fingerprint: string;
  preferSource: boolean;
  timestamp: string;
  result: AnalysisResult<PackageAnalysis>;
}

interface CacheReadResult {
  entry: PackageAnalysisCacheEntry | null;
  path: string;
  error?: string;
}

interface PackageMeta {
  name: string;
  version: string;
  rootPath: string;
  manifestHash: string;
}

function normalizeCacheOptions(cache?: AnalysisOptions["cache"]): Required<NonNullable<AnalysisOptions["cache"]>> {
  return {
    dir: cache?.dir ?? join(process.cwd(), ".aurelia-cache", "npm-analysis"),
    schemaVersion: cache?.schemaVersion ?? 1,
    fingerprint: cache?.fingerprint ?? "",
    mode: cache?.mode ?? "read-write",
  };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

async function readPackageMeta(packagePath: string): Promise<PackageMeta | null> {
  try {
    const pkgJsonPath = join(packagePath, "package.json");
    const content = await readFile(pkgJsonPath, "utf-8");
    const pkg = JSON.parse(content) as {
      name?: string;
      version?: string;
      exports?: unknown;
      aurelia?: unknown;
    };
    if (!pkg.name || !pkg.version) {
      return null;
    }
    const manifestHash = hashObject({
      exports: pkg.exports ?? null,
      aurelia: pkg.aurelia ?? null,
    });
    return {
      name: pkg.name,
      version: pkg.version,
      rootPath: packagePath,
      manifestHash,
    };
  } catch {
    return null;
  }
}

function buildCacheKey(meta: PackageMeta, schemaVersion: number, fingerprint: string): string {
  const hash = hashObject({
    name: meta.name,
    version: meta.version,
    rootPath: meta.rootPath,
    manifestHash: meta.manifestHash,
    schemaVersion,
    fingerprint,
  }).slice(0, 12);
  return `${sanitizePackageName(meta.name)}.${hash}`;
}

function sanitizePackageName(name: string): string {
  return name.replace(/[\\/]/g, "__");
}

async function readCacheEntry(
  dir: string,
  key: string,
): Promise<CacheReadResult> {
  const path = join(dir, `${key}.json`);
  if (!existsSync(path)) {
    return { entry: null, path };
  }
  try {
    const content = await readFile(path, "utf-8");
    return { entry: JSON.parse(content) as PackageAnalysisCacheEntry, path };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { entry: null, path, error: message };
  }
}

function appendGap<T>(
  result: AnalysisResult<T>,
  extraGap: AnalysisGap,
): AnalysisResult<T> {
  return { ...result, gaps: [...result.gaps, extraGap] };
}

function createCacheCorruptGap(
  packageName: string,
  cache: CacheReadResult,
): AnalysisGap {
  return gap(
    `npm analysis cache for "${packageName}"`,
    { kind: "cache-corrupt", path: cache.path, message: cache.error ?? "unknown error" },
    `Delete ${cache.path} to regenerate the cache entry.`,
    { file: cache.path },
  );
}

async function writeCacheEntry(
  dir: string,
  key: string,
  entry: PackageAnalysisCacheEntry,
): Promise<void> {
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${key}.json`);
  await writeFile(path, JSON.stringify(entry, null, 2), "utf-8");
}

const nullLogger: Logger = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Check if a package likely contains Aurelia resources.
 * Fast heuristic check before full analysis.
 *
 * Looks for 'aurelia' or '@aurelia/*' in dependencies/peerDependencies.
 *
 * @param packagePath - Path to package root
 * @returns true if package appears to be Aurelia-related
 */
export async function isAureliaPackage(packagePath: string): Promise<boolean> {
  return checkIsAureliaPackage(packagePath);
}

// =============================================================================
// Extraction Strategies
// =============================================================================

import type { PackageInfo } from './scanner.js';

interface ExtractionResult {
  resources: AnalyzedResource[];
  configurations: ExtractedConfiguration[];
  gaps: AnalysisGap[];
}

/**
 * Extract resources from TypeScript source files.
 * Uses full TypeScript Program for proper cross-file module resolution.
 *
 * This is the single-program approach:
 * 1. Discover all TypeScript files starting from entry point
 * 2. Create ONE ts.Program containing all files
 * 3. Use extractAllFacts() for proper import resolution
 * 4. Run inference and configuration analysis with fully resolved facts
 */
async function extractFromTypeScriptSource(
  pkgInfo: PackageInfo,
  packagePath: string
): Promise<ExtractionResult> {
  const resources: AnalyzedResource[] = [];
  const configurations: ExtractedConfiguration[] = [];
  const gaps: AnalysisGap[] = [];

  if (!pkgInfo.sourceDir) {
    gaps.push(gap(
      'TypeScript source',
      { kind: 'no-source', hasTypes: false },
      'Package does not have TypeScript source available.'
    ));
    return { resources, configurations, gaps };
  }

  // Find TypeScript entry point
  const sourceEntryPoint = getSourceEntryPoint(pkgInfo);
  if (!sourceEntryPoint) {
    gaps.push(gap(
      'source entry point',
      { kind: 'entry-point-not-found', specifier: 'index.ts', resolvedPath: pkgInfo.sourceDir },
      'Could not find source entry point (index.ts).'
    ));
    return { resources, configurations, gaps };
  }

  // Detect monorepo context for cross-package resolution
  const monorepoCtx = await detectMonorepo(packagePath);

  // Phase 1: Discover all TypeScript files in the package (and workspace siblings)
  const discoveredFiles = await discoverPackageFiles(sourceEntryPoint, gaps, monorepoCtx);
  if (discoveredFiles.length === 0) {
    return { resources, configurations, gaps };
  }

  // Phase 2: Create full TypeScript program with all discovered files
  const { program, host } = createPackageProgram(discoveredFiles);

  // Phase 3: Extract facts using unified extraction infrastructure
  // Pass the custom host for .js → .ts module resolution
  const allFacts = extractAllFileFacts(program, { moduleResolutionHost: host });

  // Phase 4: Partial evaluation (Layers 2-3) to resolve imports/constants
  const exportBindings = buildExportBindingMap(allFacts);
  const evaluation = evaluateFileFacts(allFacts, exportBindings, { packagePath });
  gaps.push(...evaluation.gaps);

  // Phase 5: Run pattern matching on each file's facts
  for (const [, facts] of evaluation.facts) {
    gaps.push(...facts.gaps);

    for (const cls of facts.classes) {
      gaps.push(...cls.gaps);
      const matchResult = matchClassForResource(cls);
      gaps.push(...matchResult.gaps);

      if (matchResult.analyzed) {
        mergeResources(resources, [matchResult.analyzed]);
      }
    }

    for (const call of facts.defineCalls) {
      const matchResult = matchDefineForResource(call, facts.path, facts.classes);
      gaps.push(...matchResult.gaps);

      if (matchResult.analyzed) {
        mergeResources(resources, [matchResult.analyzed]);
      }
    }
  }

  // Phase 6: Analyze configurations using the value model
  // Build source file map from program (use same canonicalization as extractAllFacts)
  const allSourceFiles = new Map<NormalizedPath, ts.SourceFile>();
  for (const sf of program.getSourceFiles()) {
    if (!sf.isDeclarationFile) {
      const normalizedPath = canonicalPath(sf.fileName);
      allSourceFiles.set(normalizedPath, sf);
    }
  }

  const configResult = analyzeConfigurations(
    evaluation.facts,
    allSourceFiles,
    resources,
    packagePath
  );
  configurations.push(...configResult.configurations);
  gaps.push(...configResult.gaps);

  // Merge configuration-discovered resources into the main list
  mergeResources(resources, configResult.resources);

  // If we analyzed files but found no resources, add explanatory gap
  if (resources.length === 0 && discoveredFiles.length > 0) {
    gaps.push(gap(
      `TypeScript source at ${pkgInfo.sourceDir}`,
      { kind: 'no-source', hasTypes: false },
      `Analyzed ${discoveredFiles.length} file(s) but found no decorated resources or configurations. ` +
      'The package may use a pattern not yet supported (dynamic registration, runtime configuration).'
    ));
  }

  return { resources, configurations, gaps };
}

/**
 * Discover all TypeScript files in a package starting from the entry point.
 * Walks import/re-export chains to find all reachable files.
 *
 * When monorepoCtx is provided, also follows imports to workspace sibling packages,
 * enabling full cross-package analysis within monorepos.
 *
 * @param entryPoint - Path to entry point file (e.g., src/index.ts)
 * @param gaps - Gap array to accumulate analysis gaps
 * @param monorepoCtx - Optional monorepo context for cross-package resolution
 */
async function discoverPackageFiles(
  entryPoint: string,
  gaps: AnalysisGap[],
  monorepoCtx: MonorepoContext | null = null
): Promise<string[]> {
  const discoveredFiles: string[] = [];
  const processedFiles = new Set<string>();
  const filesToProcess: string[] = [entryPoint];

  while (filesToProcess.length > 0) {
    const filePath = filesToProcess.pop()!;

    if (processedFiles.has(filePath)) {
      continue;
    }
    processedFiles.add(filePath);

    try {
      const sourceText = await readFile(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
      );

      discoveredFiles.push(filePath);

      // Find imports/re-exports and add to queue
      const referencedPaths = findTypeScriptImportsAndReExports(sourceFile, filePath, monorepoCtx);
      for (const referencedPath of referencedPaths) {
        if (!processedFiles.has(referencedPath)) {
          filesToProcess.push(referencedPath);
        }
      }
    } catch (err) {
      // File might not exist (bad import/re-export) or parse error
      if ((err as { code?: string }).code !== 'ENOENT') {
        gaps.push(gap(
          `file "${basename(filePath)}"`,
          { kind: 'parse-error', message: err instanceof Error ? err.message : String(err) },
          `Failed to parse ${filePath}.`
        ));
      }
    }
  }

  return discoveredFiles;
}

/**
 * Create a TypeScript program containing all the specified files.
 * Uses a custom compiler host that maps .js imports to .ts files.
 *
 * Returns both the program and the host so the host can be reused
 * for module resolution during fact extraction.
 */
function createPackageProgram(files: string[]): { program: ts.Program; host: ts.CompilerHost } {
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.Latest,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowJs: false,
    checkJs: false,
    noEmit: true,
    skipLibCheck: true,
  };

  // Create base compiler host
  const baseHost = ts.createCompilerHost(compilerOptions);

  // Create custom host that maps .js → .ts
  const host: ts.CompilerHost = {
    ...baseHost,
    fileExists: (fileName: string) => {
      // First check the original file
      if (baseHost.fileExists(fileName)) {
        return true;
      }
      // If it's a .js file, check for .ts equivalent
      if (fileName.endsWith('.js')) {
        const tsFileName = fileName.slice(0, -3) + '.ts';
        if (baseHost.fileExists(tsFileName)) {
          return true;
        }
      }
      return false;
    },
    getSourceFile: (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      // First try the original file
      let sf = baseHost.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
      if (sf) return sf;

      // If it's a .js file, try .ts equivalent
      if (fileName.endsWith('.js')) {
        const tsFileName = fileName.slice(0, -3) + '.ts';
        sf = baseHost.getSourceFile(tsFileName, languageVersion, onError, shouldCreateNewSourceFile);
        if (sf) return sf;
      }
      return undefined;
    },
    readFile: (fileName: string) => {
      // First try the original file
      let content = baseHost.readFile(fileName);
      if (content !== undefined) return content;

      // If it's a .js file, try .ts equivalent
      if (fileName.endsWith('.js')) {
        const tsFileName = fileName.slice(0, -3) + '.ts';
        content = baseHost.readFile(tsFileName);
        if (content !== undefined) return content;
      }
      return undefined;
    },
  };

  const program = ts.createProgram(files, compilerOptions, host);
  return { program, host };
}

/**
 * Extract resources from compiled JavaScript using ES2022 decorator patterns.
 */
async function extractFromCompiledJS(
  pkgInfo: PackageInfo,
  packagePath: string
): Promise<ExtractionResult> {
  const resources: AnalyzedResource[] = [];
  const gaps: AnalysisGap[] = [];
  const processedFiles = new Set<string>();

  // Find JavaScript entry points
  const jsEntryPoints = pkgInfo.entryPoints.filter(e => !e.typesOnly);

  if (jsEntryPoints.length === 0) {
    gaps.push(gap(
      'JavaScript entry point',
      { kind: 'no-entry-points' },
      'No JavaScript entry points found in package.'
    ));
    return { resources, configurations: [], gaps };
  }

  // Queue of files to process (start with entry points)
  const filesToProcess: string[] = jsEntryPoints.map(e => e.path);

  // Process files, following re-exports
  while (filesToProcess.length > 0) {
    const filePath = filesToProcess.pop()!;

    // Skip already processed files
    if (processedFiles.has(filePath)) {
      continue;
    }
    processedFiles.add(filePath);

    try {
      const sourceText = await readFile(filePath, 'utf-8');
      const relPath = relative(packagePath, filePath);

      // Use ES2022 extraction
      const result = extractFromES2022(sourceText, relPath);
      resources.push(...result.value);
      gaps.push(...result.gaps);

      // Find re-exports and add those files to the queue
      const reExports = findReExports(sourceText, filePath);
      for (const reExportPath of reExports) {
        if (!processedFiles.has(reExportPath)) {
          filesToProcess.push(reExportPath);
        }
      }
    } catch (err) {
      // File might not exist (bad re-export) or parse error
      if ((err as { code?: string }).code !== 'ENOENT') {
        gaps.push(gap(
          `file "${basename(filePath)}"`,
          { kind: 'parse-error', message: err instanceof Error ? err.message : String(err) },
          `Failed to parse ${filePath}.`
        ));
      }
    }
  }

  // TODO: Phase 2 - ES2022 configuration analysis
  return { resources, configurations: [], gaps };
}

// =============================================================================
// Configuration Analysis (Phase 2)
// =============================================================================

interface ConfigurationAnalysisResult {
  configurations: ExtractedConfiguration[];
  resources: AnalyzedResource[];
  gaps: AnalysisGap[];
}

/**
 * Analyze exported values for IRegistry configuration pattern.
 *
 * Uses the 4-layer value model:
 * - Layer 1: AST → AnalyzableValue (transform)
 * - Layer 2: Scope building and local resolution
 * - Layer 3: Cross-file import resolution
 * - Layer 4: Pattern matching (IRegistry detection, register body analysis)
 *
 * @param allFacts - FileFacts for all processed files
 * @param allSourceFiles - Parsed TypeScript source files
 * @param existingResources - Already-extracted resources (for resolveClass callback)
 * @param packagePath - Package root path
 */
function analyzeConfigurations(
  allFacts: ReadonlyMap<NormalizedPath, FileFacts>,
  allSourceFiles: ReadonlyMap<NormalizedPath, ts.SourceFile>,
  existingResources: AnalyzedResource[],
  packagePath: string
): ConfigurationAnalysisResult {
  const configurations: ExtractedConfiguration[] = [];
  const resources: AnalyzedResource[] = [];
  const gaps: AnalysisGap[] = [];

  // Skip if no files to analyze
  if (allSourceFiles.size === 0) {
    return { configurations, resources, gaps };
  }

  // Step 1: Build file scopes (Layer 2)
  const fileScopes = new Map<NormalizedPath, LexicalScope>();
  for (const [filePath, sourceFile] of allSourceFiles) {
    const scope = buildFileScope(sourceFile, filePath);
    fileScopes.set(filePath, scope);
  }

  // Step 2: Build export binding map for cross-file resolution
  const exportBindings = buildExportBindingMap(allFacts);

  // Step 3: Build resolution context (Layer 3)
  const valueResolutionContext = buildValueResolutionContext({
    fileScopes,
    exportBindings,
    fileFacts: allFacts,
    packagePath,
  });

  // Step 4: Create resolveClass callback for register body analysis
  const resolveClass = createClassResolver(existingResources, allFacts, packagePath);

  // Step 5: Find and analyze IRegistry exports
  for (const [filePath, sourceFile] of allSourceFiles) {
    const scope = fileScopes.get(filePath);
    if (!scope) continue;

    const facts = allFacts.get(filePath);
    if (!facts) continue;

    // Transform exported values using Layer 1
    const exports = transformModuleExports(sourceFile);

    // Check each export for IRegistry pattern
    for (const [exportName, exportValue] of exports) {
      // Resolve through Layers 2-3
      let resolved = fullyResolve(exportValue, scope, valueResolutionContext);
      let isFactory = false;

      // Check if resolved value is IRegistry-shaped
      if (!isRegistryShape(resolved)) {
        // Try factory analysis if it's a call expression
        const factoryResult = tryResolveAsFactory(resolved, scope, valueResolutionContext);
        gaps.push(...factoryResult.gaps);

        if (factoryResult.isFactory && factoryResult.value !== resolved) {
          // Factory analysis succeeded - use the return value
          resolved = factoryResult.value;
          isFactory = true;

          debug.project('factory.resolved', {
            exportName,
            returnValueKind: resolved.kind,
          });
        }

        // Check again after factory resolution
        if (!isRegistryShape(resolved)) {
          continue;
        }
      }

      // Found an IRegistry! Extract resources from register body.
      const registerMethod = getRegisterMethod(resolved);
      if (!registerMethod) {
        gaps.push(gap(
          `configuration "${exportName}"`,
          { kind: 'parse-error', message: 'IRegistry missing register method' },
          `Export "${exportName}" looks like IRegistry but has no register() method`
        ));
        continue;
      }

      // Create context for register body analysis
      const registerBodyContext: RegisterBodyContext = {
        resolveClass,
        packagePath,
      };

      // Extract resources from register body (Layer 4)
      const bodyResult = extractRegisterBodyResources(registerMethod, registerBodyContext);
      gaps.push(...bodyResult.gaps);

      // Build configuration registration list
      const registers: ConfigurationRegistration[] = [];
      for (const resource of bodyResult.value) {
        const className = getResourceClassName(resource.resource);
        registers.push({
          resource,
          identifier: className ?? getResourceName(resource.resource) ?? "unknown",
          resolved: true,
        });

        // Add resource to discovered resources if not already in existing
        mergeResources(resources, [resource]);
      }

      // Create configuration entry
      const config: ExtractedConfiguration = {
        exportName,
        registers,
        isFactory,
        source: {
          file: relative(packagePath, filePath),
          format: 'typescript',
        },
      };
      configurations.push(config);
    }
  }

  // Add gaps from cross-file resolution
  gaps.push(...valueResolutionContext.gaps);

  return { configurations, resources, gaps };
}

/**
 * Create a resolveClass callback for RegisterBodyContext.
 *
 * This callback maps ClassValue to AnalyzedResource by:
 * 1. Looking up in already-extracted resources by className
 * 2. Running pattern matching on ClassValue if not found
 */
function createClassResolver(
  existingResources: AnalyzedResource[],
  _allFacts: ReadonlyMap<NormalizedPath, FileFacts>,
  _packagePath: string
): (classVal: ClassValue) => AnalyzedResource | null {
  // Build lookup map by className
  const resourceMap = new Map<string, AnalyzedResource>();
  for (const resource of existingResources) {
    const className = getResourceClassName(resource.resource);
    if (className) {
      resourceMap.set(className, resource);
    }
  }

  return (classVal: ClassValue): AnalyzedResource | null => {
    // First check existing resources
    const existing = resourceMap.get(classVal.className);
    if (existing) {
      return existing;
    }

    // Try to match the ClassValue directly using pattern matchers
    const matchResult = matchClassForResource(classVal);
    if (matchResult.analyzed) {
      // Cache for future lookups
      resourceMap.set(classVal.className, matchResult.analyzed);
      return matchResult.analyzed;
    }

    return null;
  };
}

/**
 * Find re-export module specifiers in a JavaScript file.
 * Handles: export { X } from './foo.js' and export * from './bar.js'
 */
function findReExports(sourceText: string, currentFile: string): string[] {
  const reExports: string[] = [];
  const currentDir = dirname(currentFile);

  // Parse the file
  const sourceFile = ts.createSourceFile(
    currentFile,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );

  for (const stmt of sourceFile.statements) {
    if (ts.isExportDeclaration(stmt) && stmt.moduleSpecifier) {
      if (ts.isStringLiteral(stmt.moduleSpecifier)) {
        const specifier = stmt.moduleSpecifier.text;
        // Only process relative imports
        if (specifier.startsWith('./') || specifier.startsWith('../')) {
          const fullPath = resolveJavaScriptModulePath(currentDir, specifier);
          if (fullPath) {
            reExports.push(fullPath);
          }
        }
      }
    }
  }

  return reExports;
}

/**
 * Resolve a JavaScript module specifier to a file path.
 *
 * Handles:
 * - Explicit extensions: './foo.js' → './foo.js'
 * - No extension: './foo' → './foo.js' or './foo/index.js'
 * - Directory with index: './components' → './components/index.js'
 */
function resolveJavaScriptModulePath(currentDir: string, specifier: string): string | null {
  const resolvedPath = join(currentDir, specifier);

  // Explicit .js extension - use as-is, but also check for directory index
  if (resolvedPath.endsWith('.js')) {
    if (existsSync(resolvedPath)) {
      return resolvedPath;
    }
    // Maybe it's './foo.js' meaning './foo/index.js'? Unlikely but check.
    const indexPath = join(resolvedPath.slice(0, -3), 'index.js');
    if (existsSync(indexPath)) {
      return indexPath;
    }
    // Default to original path (will produce ENOENT, caught as gap)
    return resolvedPath;
  }

  // No extension - try file first, then directory index
  const filePath = resolvedPath + '.js';
  if (existsSync(filePath)) {
    return filePath;
  }

  const indexPath = join(resolvedPath, 'index.js');
  if (existsSync(indexPath)) {
    return indexPath;
  }

  // Default to file path (will produce ENOENT, caught as gap)
  return filePath;
}

/**
 * Find imported/re-exported modules to follow.
 *
 * Follows both:
 * - `export { X } from './path'` (re-exports)
 * - `import { X } from './path'` (regular imports)
 *
 * This ensures we traverse the full module graph, not just re-export chains.
 * Important for packages that import resources into a configuration file
 * (e.g., @aurelia/router imports ViewportCustomElement into configuration.ts).
 *
 * When monorepoCtx is provided, also resolves workspace package imports
 * (e.g., `@aurelia/kernel`) to their source files.
 *
 * @param sourceFile - Already parsed TypeScript source file
 * @param currentFile - Path to the current file (for resolving relative paths)
 * @param monorepoCtx - Optional monorepo context for cross-package resolution
 * @returns Array of resolved file paths to process
 */
function findTypeScriptImportsAndReExports(
  sourceFile: ts.SourceFile,
  currentFile: string,
  monorepoCtx: MonorepoContext | null = null
): string[] {
  const paths: string[] = [];
  const currentDir = dirname(currentFile);

  for (const stmt of sourceFile.statements) {
    let specifier: string | undefined;

    // Handle: export { X } from './path'
    if (ts.isExportDeclaration(stmt) && stmt.moduleSpecifier) {
      if (ts.isStringLiteral(stmt.moduleSpecifier)) {
        specifier = stmt.moduleSpecifier.text;
      }
    }
    // Handle: import { X } from './path'
    else if (ts.isImportDeclaration(stmt) && stmt.moduleSpecifier) {
      if (ts.isStringLiteral(stmt.moduleSpecifier)) {
        specifier = stmt.moduleSpecifier.text;
      }
    }

    if (!specifier) continue;

    // Handle relative imports (./path or ../path)
    if (isRelativeImport(specifier)) {
      const fullPath = resolveTypeScriptModulePath(currentDir, specifier);
      if (fullPath) {
        paths.push(fullPath);
      }
    }
    // Handle workspace package imports when in a monorepo
    else if (monorepoCtx && isPackageImport(specifier)) {
      const resolvedPath = resolveWorkspaceImport(specifier, monorepoCtx);
      if (resolvedPath) {
        paths.push(resolvedPath);
      }
    }
  }

  return paths;
}

/**
 * Resolve a TypeScript module specifier to a file path.
 *
 * Handles:
 * - Explicit extensions: './foo.ts' → './foo.ts'
 * - JS extensions (source mapping): './foo.js' → './foo.ts'
 * - No extension: './foo' → './foo.ts' or './foo/index.ts'
 * - Directory with index: './components' → './components/index.ts'
 */
function resolveTypeScriptModulePath(currentDir: string, specifier: string): string | null {
  const resolvedPath = join(currentDir, specifier);

  // Explicit .ts extension - use as-is
  if (resolvedPath.endsWith('.ts')) {
    return resolvedPath;
  }

  // .js extension - convert to .ts (TypeScript source mapping)
  if (resolvedPath.endsWith('.js')) {
    const tsPath = resolvedPath.slice(0, -3) + '.ts';
    // Also check for directory index if .ts doesn't exist
    if (existsSync(tsPath)) {
      return tsPath;
    }
    const indexPath = join(resolvedPath.slice(0, -3), 'index.ts');
    if (existsSync(indexPath)) {
      return indexPath;
    }
    // Default to .ts path (will produce ENOENT, caught as gap)
    return tsPath;
  }

  // No extension - try file first, then directory index
  const filePath = resolvedPath + '.ts';
  if (existsSync(filePath)) {
    return filePath;
  }

  const indexPath = join(resolvedPath, 'index.ts');
  if (existsSync(indexPath)) {
    return indexPath;
  }

  // Default to file path (will produce ENOENT, caught as gap)
  return filePath;
}

// =============================================================================
// Inspection API
// =============================================================================

/**
 * Inspect a package and return a human-readable analysis result.
 *
 * This is the main entry point for the inspection CLI tool.
 * Transforms the internal analysis result into a JSON-serializable format
 * designed for human inspection and debugging.
 *
 * @param packagePath - Path to package root (containing package.json)
 * @param options - Analysis options
 * @returns Inspection result with resources, graph, and gaps
 *
 * @example
 * ```typescript
 * const result = await inspect('./node_modules/aurelia2-table');
 * console.log(JSON.stringify(result, null, 2));
 * ```
 */
export async function inspect(
  packagePath: string,
  options?: AnalysisOptions
): Promise<InspectionResult> {
  // Run the full analysis
  const analysisResult = await analyzePackage(packagePath, options);
  const analysis = analysisResult.value;

  // Transform resources to inspection format
  const inspectedResources = analysis.resources.map(transformResource);

  // Build dependency graph
  const graph = buildInspectionGraph(analysis.resources, analysis.configurations);

  // Transform configurations
  const configurations = analysis.configurations.map(transformConfiguration);

  // Transform gaps
  const gaps = analysisResult.gaps.map(transformGap);

  // Determine primary strategy from resources
  const primaryStrategy = determinePrimaryStrategy(analysis.resources);

  // Collect analyzed paths (files we looked at)
  const analyzedPaths = collectAnalyzedPaths(analysis.resources);

  return {
    package: analysis.packageName,
    version: analysis.version,
    confidence: analysisResult.confidence,
    resources: inspectedResources,
    graph,
    configurations,
    gaps,
    meta: {
      primaryStrategy,
      analyzedPaths,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Transform an AnalyzedResource to InspectedResource.
 */
function transformResource(resource: AnalyzedResource): InspectedResource {
  const def = resource.resource;
  const file = def.file ?? "unknown";
  const format = file.endsWith(".ts")
    ? "typescript"
    : file.endsWith(".js")
      ? "javascript"
      : file.endsWith(".d.ts")
        ? "declaration"
        : "typescript";
  const evidencePattern = resource.evidence.source === "analyzed"
    ? resource.evidence.pattern
    : "declared";

  return {
    kind: def.kind,
    name: getResourceName(def) ?? "unknown",
    className: getResourceClassName(def) ?? "unknown",
    aliases: getResourceAliases(def),
    bindables: getResourceBindables(def),
    dependencies: [], // TODO: Extract from static dependencies when available
    source: {
      file,
      line: undefined, // TextSpan has offset, not line number
      format,
    },
    evidence: evidencePattern,
  };
}

/**
 * Transform an ExtractedConfiguration to InspectedConfiguration.
 */
function transformConfiguration(config: ExtractedConfiguration): InspectedConfiguration {
  return {
    exportName: config.exportName,
    isFactory: config.isFactory,
    registers: config.registers.map(r => r.identifier),
    source: {
      file: config.source.file,
      line: config.source.line,
    },
  };
}

/**
 * Transform an AnalysisGap to InspectedGap.
 */
function transformGap(gap: AnalysisGap): InspectedGap {
  return {
    what: gap.what,
    why: formatGapReason(gap.why),
    where: gap.where ? {
      file: gap.where.file,
      line: gap.where.line,
      snippet: gap.where.snippet,
    } : undefined,
    suggestion: gap.suggestion,
  };
}

/**
 * Format a GapReason into a human-readable string.
 */
function formatGapReason(reason: GapReason): string {
  switch (reason.kind) {
    case 'package-not-found':
      return `Package not found: ${reason.packagePath}`;
    case 'invalid-package-json':
      return `Invalid package.json: ${reason.parseError}`;
    case 'missing-package-field':
      return `Missing package.json field: ${reason.field}`;
    case 'entry-point-not-found':
      return `Entry point not found: ${reason.specifier}`;
    case 'no-entry-points':
      return 'No entry points found in package';
    case 'complex-exports':
      return `Complex exports field: ${reason.reason}`;
    case 'unresolved-import':
      return `Unresolved import: ${reason.path} (${reason.reason})`;
    case 'circular-import':
      return `Circular import: ${reason.cycle.join(' → ')}`;
    case 'external-package':
      return `External package: ${reason.packageName}`;
    case 'dynamic-value':
      return `Dynamic value: ${reason.expression}`;
    case 'function-return':
      return `Function return value: ${reason.functionName}()`;
    case 'computed-property':
      return `Computed property: ${reason.expression}`;
    case 'spread-unknown':
      return `Unknown spread: ...${reason.spreadOf}`;
    case 'conditional-registration':
      return `Conditional registration: ${reason.condition}`;
    case 'loop-variable':
      return `Loop variable: ${reason.variable}`;
    case 'legacy-decorators':
      return 'Legacy decorator format (metadata lost)';
    case 'no-source':
      return reason.hasTypes ? 'No source (types available)' : 'No source or types';
    case 'minified-code':
      return 'Minified code';
    case 'unsupported-format':
      return `Unsupported format: ${reason.format}`;
    case 'invalid-resource-name':
      return `Invalid resource name for ${reason.className}: ${reason.reason}`;
    case 'cache-corrupt':
      return `Cache entry corrupt: ${reason.path} (${reason.message})`;
    case 'analysis-failed':
      return `Analysis failed (${reason.stage}): ${reason.message}`;
    case 'parse-error':
      return `Parse error: ${reason.message}`;
    default:
      return 'Unknown reason';
  }
}

/**
 * Build the inspection graph from resources and configurations.
 */
function buildInspectionGraph(
  resources: AnalyzedResource[],
  configurations: ExtractedConfiguration[]
): InspectionGraph {
  const nodes = resources
    .map(r => getResourceClassName(r.resource))
    .filter((value): value is string => !!value);
  const edges: InspectionEdge[] = [];

  // TODO: Add edges from static dependencies arrays when we extract them
  // For now, we can add edges from configuration registrations

  for (const config of configurations) {
    for (const registration of config.registers) {
      if (registration.resolved && registration.resource) {
        // Find if this resource is in our nodes
        const targetClassName = getResourceClassName(registration.resource.resource);
        if (targetClassName && nodes.includes(targetClassName)) {
          edges.push({
            from: config.exportName,
            to: targetClassName,
            kind: 'configuration-registers',
          });
        }
      }
    }
  }

  return { nodes, edges };
}

/**
 * Determine primary extraction strategy from resources.
 */
function determinePrimaryStrategy(
  resources: AnalyzedResource[]
): 'typescript' | 'es2022' | 'none' {
  if (resources.length === 0) {
    return 'none';
  }

  // Infer format from file extension
  const firstSource = resources[0]?.resource.file;
  if (firstSource?.endsWith('.ts') && !firstSource.endsWith('.d.ts')) {
    return 'typescript';
  }
  if (firstSource?.endsWith('.js')) {
    return 'es2022';
  }

  return 'none';
}

/**
 * Collect unique file paths from resources.
 */
function collectAnalyzedPaths(resources: AnalyzedResource[]): string[] {
  const paths = new Set<string>();
  for (const resource of resources) {
    if (resource.resource.file) {
      paths.add(resource.resource.file);
    }
  }
  return [...paths].sort();
}

import type { GapReason } from './types.js';


