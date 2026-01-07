/**
 * NPM Package Analysis
 *
 * Extracts Aurelia resource semantics from npm packages.
 * Used by app mode to understand dependencies, and by library mode
 * to generate manifests.
 *
 * @example
 * ```typescript
 * import { analyzePackage } from '@aurelia-ls/resolution/npm';
 *
 * const result = await analyzePackage('./node_modules/aurelia2-table');
 * if (result.confidence !== 'manual') {
 *   console.log('Found resources:', result.value.resources);
 * } else {
 *   console.log('Could not analyze:', result.gaps);
 * }
 * ```
 */

// Re-export types
export type {
  AnalysisResult,
  Confidence,
  AnalysisGap,
  GapLocation,
  GapReason,
  PackageAnalysis,
  ExtractedResource,
  ResourceKind,
  ResourceSource,
  ResourceEvidence,
  ExtractedBindable,
  BindableEvidence,
  ExtractedConfiguration,
  ConfigurationRegistration,
  AnalysisOptions,
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
export type { MonorepoContext, WorkspacePackage } from './monorepo.js';
export { detectMonorepo, resolveWorkspaceImport } from './monorepo.js';
import {
  detectMonorepo,
  resolveWorkspaceImport,
  isRelativeImport,
  isPackageImport,
  type MonorepoContext,
} from './monorepo.js';

// Import ES2022 extraction
import { extractFromES2022 } from './decorator-es2022.js';

// Import TypeScript extraction (existing infrastructure)
import { extractSourceFacts, extractAllFacts } from '../extraction/extractor.js';
import { canonicalPath } from '../util/naming.js';
import { resolveFromDecorators } from '../inference/decorator-resolver.js';
import { resolveFromStaticAu } from '../inference/static-au-resolver.js';
import { resolveFromDefine } from '../inference/define-resolver.js';
import { resolveFromConventions } from '../inference/convention-resolver.js';
import type { ResourceCandidate } from '../inference/types.js';
import type { SourceFacts } from '../extraction/types.js';

// Import export resolver for cross-file resolution
import { buildExportBindingMap } from '../binding/export-resolver.js';

// Import value model (Layers 1-3) and pattern matching (Layer 4)
import {
  buildFileScope,
  transformModuleExports,
  buildResolutionContext,
  fullyResolve,
  isRegistryShape,
  getRegisterMethod,
  getResolvedValue,
  type Scope,
  type ClassValue,
} from './value/index.js';
import { extractRegisterBodyResources, tryResolveAsFactory, type RegisterBodyContext } from './patterns/index.js';

// =============================================================================
// Main API
// =============================================================================

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, basename, dirname } from 'node:path';
import * as ts from 'typescript';
import type {
  AnalysisResult,
  AnalysisGap,
  PackageAnalysis,
  ExtractedResource,
  ResourceEvidence,
  AnalysisOptions,
  ExtractedConfiguration as ExtractedConfigurationType,
  ConfigurationRegistration as ConfigurationRegistrationType,
} from './types.js';
import { success, partial, highConfidence, gap, combine } from './types.js';
import { debug, type NormalizedPath } from '@aurelia-ls/compiler';

// Local type aliases to avoid duplicate identifier issues with re-exports
type ExtractedConfigurationLocal = ExtractedConfigurationType;
type ConfigurationRegistrationLocal = ConfigurationRegistrationType;

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

  const allResources: ExtractedResource[] = [];
  let primaryStrategyUsed: 'typescript' | 'es2022' | 'none' = 'none';

  // Determine which strategies to try and in what order
  const hasTypeScript = pkgInfo.hasTypeScriptSource && pkgInfo.sourceDir;
  const hasJavaScript = pkgInfo.entryPoints.some(e => !e.typesOnly);

  const strategies: Array<'typescript' | 'es2022'> = preferSource
    ? ['typescript', 'es2022']
    : ['es2022', 'typescript'];

  // Collect configurations from extraction strategies
  const allConfigurations: ExtractedConfigurationLocal[] = [];

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
  resources: ExtractedResource[],
  gaps: AnalysisGap[],
  primaryStrategy: 'typescript' | 'es2022' | 'none'
): 'exact' | 'high' | 'partial' | 'low' | 'manual' {
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
    r.evidence.kind === 'convention'
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
  existing: ExtractedResource[],
  incoming: ExtractedResource[]
): void {
  for (const newResource of incoming) {
    const existingIndex = existing.findIndex(r => r.className === newResource.className);

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
function mergeResource(a: ExtractedResource, b: ExtractedResource): ExtractedResource {
  // Prefer the one with more bindables
  const aBindables = a.bindables.length;
  const bBindables = b.bindables.length;

  // Prefer higher-confidence evidence sources
  const evidenceRank: Record<ResourceEvidence['kind'], number> = {
    'manifest': 5,           // Highest - explicit package metadata
    'explicit-config': 4,    // User-provided configuration
    'decorator': 3,          // Source-level decorators
    'define': 3,             // .define() API calls (same as decorator)
    'static-au': 2,          // Static $au property
    'convention': 1,         // Naming convention inference
  };
  const aRank = evidenceRank[a.evidence.kind];
  const bRank = evidenceRank[b.evidence.kind];

  // Choose primary based on evidence, then bindable count
  const primary = (aRank > bRank) ? a : (bRank > aRank) ? b :
                  (aBindables >= bBindables) ? a : b;
  const secondary = primary === a ? b : a;

  // Merge aliases from both
  const mergedAliases = [...new Set([...primary.aliases, ...secondary.aliases])];

  // Merge bindables - take primary's bindables, add any unique ones from secondary
  const primaryBindableNames = new Set(primary.bindables.map(b => b.name));
  const additionalBindables = secondary.bindables.filter(b => !primaryBindableNames.has(b.name));

  return {
    ...primary,
    aliases: mergedAliases,
    bindables: [...primary.bindables, ...additionalBindables],
  };
}

/**
 * Analyze multiple packages, potentially in parallel.
 *
 * @param packagePaths - Paths to package roots
 * @param options - Analysis options (applied to all)
 * @returns Map of package path to analysis result
 */
export async function analyzePackages(
  _packagePaths: string[],
  _options?: AnalysisOptions
): Promise<Map<string, AnalysisResult<PackageAnalysis>>> {
  // TODO: Implement with parallelization
  throw new Error('analyzePackages not yet implemented');
}

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
  resources: ExtractedResource[];
  configurations: ExtractedConfigurationLocal[];
  gaps: AnalysisGap[];
}

/**
 * Extract resources from TypeScript source files.
 * Uses full TypeScript Program for proper cross-file module resolution.
 *
 * This is the "Option B" approach from npm-analysis-design.md:
 * 1. Discover all TypeScript files starting from entry point
 * 2. Create ONE ts.Program containing all files
 * 3. Use extractAllFacts() for proper import resolution
 * 4. Run inference and configuration analysis with fully resolved facts
 */
async function extractFromTypeScriptSource(
  pkgInfo: PackageInfo,
  packagePath: string
): Promise<ExtractionResult> {
  const resources: ExtractedResource[] = [];
  const configurations: ExtractedConfigurationLocal[] = [];
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

  // Phase 3: Extract facts using existing infrastructure (with proper resolution!)
  // Pass the custom host for .js → .ts module resolution
  const allFacts = extractAllFacts(program, { moduleResolutionHost: host });

  // Phase 4: Run inference on each file's facts
  for (const [, facts] of allFacts) {
    const decoratorResult = resolveFromDecorators(facts);
    const staticAuResult = resolveFromStaticAu(facts);
    const defineResult = resolveFromDefine(facts);
    const conventionResult = resolveFromConventions(facts);

    // Combine results - flatten arrays of candidates
    const combined = combine(
      [decoratorResult, staticAuResult, defineResult, conventionResult],
      (arrays) => arrays.flat()
    );
    gaps.push(...combined.gaps);

    // Convert ResourceCandidate to ExtractedResource
    for (const candidate of combined.value) {
      const extracted = candidateToExtractedResource(candidate, packagePath);
      if (extracted) {
        // Avoid duplicates
        if (!resources.some(r => r.className === extracted.className)) {
          resources.push(extracted);
        }
      }
    }
  }

  // Phase 5: Analyze configurations using the value model
  // Build source file map from program (use same canonicalization as extractAllFacts)
  const allSourceFiles = new Map<NormalizedPath, ts.SourceFile>();
  for (const sf of program.getSourceFiles()) {
    if (!sf.isDeclarationFile) {
      const normalizedPath = canonicalPath(sf.fileName);
      allSourceFiles.set(normalizedPath, sf);
    }
  }

  const configResult = analyzeConfigurations(
    allFacts,
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
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
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
  const resources: ExtractedResource[] = [];
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
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
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
  configurations: ExtractedConfigurationLocal[];
  resources: ExtractedResource[];
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
 * @param allFacts - SourceFacts for all processed files
 * @param allSourceFiles - Parsed TypeScript source files
 * @param existingResources - Already-extracted resources (for resolveClass callback)
 * @param packagePath - Package root path
 */
function analyzeConfigurations(
  allFacts: ReadonlyMap<NormalizedPath, SourceFacts>,
  allSourceFiles: ReadonlyMap<NormalizedPath, ts.SourceFile>,
  existingResources: ExtractedResource[],
  packagePath: string
): ConfigurationAnalysisResult {
  const configurations: ExtractedConfigurationLocal[] = [];
  const resources: ExtractedResource[] = [];
  const gaps: AnalysisGap[] = [];

  // Skip if no files to analyze
  if (allSourceFiles.size === 0) {
    return { configurations, resources, gaps };
  }

  // Step 1: Build file scopes (Layer 2)
  const fileScopes = new Map<NormalizedPath, Scope>();
  for (const [filePath, sourceFile] of allSourceFiles) {
    const scope = buildFileScope(sourceFile, filePath);
    fileScopes.set(filePath, scope);
  }

  // Step 2: Build export binding map for cross-file resolution
  const exportBindings = buildExportBindingMap(allFacts);

  // Step 3: Build resolution context (Layer 3)
  const resolutionContext = buildResolutionContext({
    fileScopes,
    exportBindings,
    sourceFacts: allFacts,
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
      let resolved = fullyResolve(exportValue, scope, resolutionContext);
      let isFactory = false;

      // Check if resolved value is IRegistry-shaped
      if (!isRegistryShape(resolved)) {
        // Try factory analysis if it's a call expression
        const factoryResult = tryResolveAsFactory(resolved, scope, resolutionContext);
        gaps.push(...factoryResult.gaps);

        if (factoryResult.isFactory && factoryResult.value !== resolved) {
          // Factory analysis succeeded - use the return value
          resolved = factoryResult.value;
          isFactory = true;

          debug.resolution('factory.resolved', {
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
      const registers: ConfigurationRegistrationLocal[] = [];
      for (const resource of bodyResult.value) {
        registers.push({
          resource,
          identifier: resource.className,
          resolved: true,
        });

        // Add resource to discovered resources if not already in existing
        if (!existingResources.some(r => r.className === resource.className)) {
          resources.push(resource);
        }
      }

      // Create configuration entry
      const config: ExtractedConfigurationLocal = {
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
  gaps.push(...resolutionContext.gaps);

  return { configurations, resources, gaps };
}

/**
 * Create a resolveClass callback for RegisterBodyContext.
 *
 * This callback maps ClassValue to ExtractedResource by:
 * 1. Looking up in already-extracted resources by className
 * 2. Running inference on class facts if not found
 */
function createClassResolver(
  existingResources: ExtractedResource[],
  allFacts: ReadonlyMap<NormalizedPath, SourceFacts>,
  packagePath: string
): (classVal: ClassValue) => ExtractedResource | null {
  // Build lookup map by className
  const resourceMap = new Map<string, ExtractedResource>();
  for (const resource of existingResources) {
    resourceMap.set(resource.className, resource);
  }

  return (classVal: ClassValue): ExtractedResource | null => {
    // First check existing resources
    const existing = resourceMap.get(classVal.className);
    if (existing) {
      return existing;
    }

    // Try to infer from class facts
    if (classVal.filePath) {
      const facts = allFacts.get(classVal.filePath);
      if (facts) {
        const classFacts = facts.classes.find(c => c.name === classVal.className);
        if (classFacts) {
          // Run inference to determine if this is a resource
          const candidate = inferResourceFromClass(classFacts, classVal.filePath, packagePath);
          if (candidate) {
            // Cache for future lookups
            resourceMap.set(classVal.className, candidate);
            return candidate;
          }
        }
      }
    }

    return null;
  };
}

/**
 * Infer resource from class facts using decorator/static-au/convention resolvers.
 */
function inferResourceFromClass(
  classFacts: SourceFacts['classes'][0],
  filePath: NormalizedPath,
  packagePath: string
): ExtractedResource | null {
  // Build minimal SourceFacts for this single class
  const minimalFacts: SourceFacts = {
    path: filePath,
    classes: [classFacts],
    registrationCalls: [],
    imports: [],
    exports: [],
    defineCalls: [],
    variables: [],
    functions: [],
    siblingFiles: [],
    templateImports: [],
    gaps: [],
  };

  // Run inference resolvers
  const decoratorResult = resolveFromDecorators(minimalFacts);
  const staticAuResult = resolveFromStaticAu(minimalFacts);
  const conventionResult = resolveFromConventions(minimalFacts);

  // Combine and get first candidate
  const combined = combine(
    [decoratorResult, staticAuResult, conventionResult],
    (arrays) => arrays.flat()
  );

  if (combined.value.length > 0) {
    return candidateToExtractedResource(combined.value[0]!, packagePath);
  }

  return null;
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

/**
 * Convert a ResourceCandidate to ExtractedResource.
 */
function candidateToExtractedResource(
  candidate: ResourceCandidate,
  packagePath: string
): ExtractedResource | null {
  // Map kind
  let kind: ExtractedResource['kind'];
  switch (candidate.kind) {
    case 'element':
      kind = 'custom-element';
      break;
    case 'attribute':
      kind = 'custom-attribute';
      break;
    case 'valueConverter':
      kind = 'value-converter';
      break;
    case 'bindingBehavior':
      kind = 'binding-behavior';
      break;
    default:
      return null;
  }

  // Build extracted resource
  return {
    kind,
    name: candidate.name,
    className: candidate.className,
    bindables: candidate.bindables.map(b => ({
      name: b.name,
      attribute: b.attribute,
      mode: b.mode,
      primary: b.primary,
      evidence: { kind: 'decorator' as const, hasOptions: true },
    })),
    aliases: [...candidate.aliases],
    source: {
      file: relative(packagePath, candidate.source),
      format: 'typescript',
    },
    evidence: {
      kind: candidate.resolver === 'decorator' ? 'decorator' :
            candidate.resolver === 'static-au' ? 'static-au' :
            candidate.resolver === 'define' ? 'define' :
            'convention',
      decoratorName: candidate.resolver === 'decorator' ? 'customElement' : undefined,
      suffix: candidate.resolver === 'convention' ? 'CustomElement' : undefined,
    } as ExtractedResource['evidence'],
  };
}

// =============================================================================
// Inspection API
// =============================================================================

import type {
  InspectionResult,
  InspectedResource,
  InspectedBindable,
  InspectedConfiguration,
  InspectionGraph,
  InspectionEdge,
  InspectedGap,
} from './types.js';

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
 * Transform an ExtractedResource to InspectedResource.
 */
function transformResource(resource: ExtractedResource): InspectedResource {
  return {
    kind: resource.kind,
    name: resource.name,
    className: resource.className,
    aliases: resource.aliases,
    bindables: resource.bindables.map(transformBindable),
    dependencies: [], // TODO: Extract from static dependencies when available
    source: {
      file: resource.source.file,
      line: resource.source.line,
      format: resource.source.format,
    },
    evidence: resource.evidence.kind,
  };
}

/**
 * Transform an ExtractedBindable to InspectedBindable.
 */
function transformBindable(bindable: ExtractedBindable): InspectedBindable {
  const result: InspectedBindable = {
    name: bindable.name,
  };

  if (bindable.attribute) {
    result.attribute = bindable.attribute;
  }

  if (bindable.mode !== undefined) {
    // BindingMode is already a string literal type ('default' | 'oneTime' | 'toView' | 'fromView' | 'twoWay')
    result.mode = bindable.mode;
  }

  if (bindable.primary) {
    result.primary = true;
  }

  return result;
}

/**
 * Transform an ExtractedConfiguration to InspectedConfiguration.
 */
function transformConfiguration(config: ExtractedConfigurationLocal): InspectedConfiguration {
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
  resources: ExtractedResource[],
  configurations: ExtractedConfigurationLocal[]
): InspectionGraph {
  const nodes = resources.map(r => r.className);
  const edges: InspectionEdge[] = [];

  // TODO: Add edges from static dependencies arrays when we extract them
  // For now, we can add edges from configuration registrations

  for (const config of configurations) {
    for (const registration of config.registers) {
      if (registration.resolved && registration.resource) {
        // Find if this resource is in our nodes
        const targetClassName = registration.resource.className;
        if (nodes.includes(targetClassName)) {
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
  resources: ExtractedResource[]
): 'typescript' | 'es2022' | 'none' {
  if (resources.length === 0) {
    return 'none';
  }

  // Check the first resource's source format
  const firstFormat = resources[0]?.source.format;
  if (firstFormat === 'typescript') {
    return 'typescript';
  }
  if (firstFormat === 'javascript') {
    return 'es2022';
  }

  return 'none';
}

/**
 * Collect unique file paths from resources.
 */
function collectAnalyzedPaths(resources: ExtractedResource[]): string[] {
  const paths = new Set<string>();
  for (const resource of resources) {
    paths.add(resource.source.file);
  }
  return [...paths].sort();
}

import type { GapReason, ExtractedBindable } from './types.js';
