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

// Import ES2022 extraction
import { extractFromES2022 } from './decorator-es2022.js';

// Import TypeScript extraction (existing infrastructure)
import { extractSourceFacts } from '../extraction/extractor.js';
import { resolveFromDecorators } from '../inference/decorator-resolver.js';
import { resolveFromStaticAu } from '../inference/static-au-resolver.js';
import { resolveFromConventions } from '../inference/convention-resolver.js';
import type { ResourceCandidate } from '../inference/types.js';

// =============================================================================
// Main API
// =============================================================================

import { readFile } from 'node:fs/promises';
import { join, relative, basename, dirname } from 'node:path';
import * as ts from 'typescript';
import type {
  AnalysisResult,
  AnalysisGap,
  PackageAnalysis,
  ExtractedResource,
  ResourceEvidence,
  AnalysisOptions,
} from './types.js';
import { success, partial, gap, combine } from './types.js';

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

  for (const strategy of strategies) {
    if (strategy === 'typescript' && hasTypeScript) {
      const tsResult = await extractFromTypeScriptSource(pkgInfo, packagePath);
      if (tsResult.resources.length > 0) {
        mergeResources(allResources, tsResult.resources);
        if (primaryStrategyUsed === 'none') {
          primaryStrategyUsed = 'typescript';
        }
      }
      gaps.push(...tsResult.gaps);
    } else if (strategy === 'es2022' && hasJavaScript) {
      const es2022Result = await extractFromCompiledJS(pkgInfo, packagePath);
      if (es2022Result.resources.length > 0) {
        mergeResources(allResources, es2022Result.resources);
        if (primaryStrategyUsed === 'none') {
          primaryStrategyUsed = 'es2022';
        }
      }
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
    configurations: [], // TODO: Phase 2 - configuration analysis
  };

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
import type { NormalizedPath } from '@aurelia-ls/compiler';

interface ExtractionResult {
  resources: ExtractedResource[];
  gaps: AnalysisGap[];
}

/**
 * Extract resources from TypeScript source files.
 * Uses the existing extraction/inference infrastructure.
 *
 * Follows re-exports to discover all resource classes in the package.
 *
 * TODO: Future enhancement - integrate with `binding/export-resolver.ts` infrastructure
 * which provides more sophisticated cross-file resolution including cycle detection,
 * alias handling, and integration with the full TypeScript program. This would enable
 * richer analysis but requires creating a Program across all package files.
 * See npm-analysis-design.md "Option B" for details.
 */
async function extractFromTypeScriptSource(
  pkgInfo: PackageInfo,
  packagePath: string
): Promise<ExtractionResult> {
  const resources: ExtractedResource[] = [];
  const gaps: AnalysisGap[] = [];
  const processedFiles = new Set<string>();

  if (!pkgInfo.sourceDir) {
    gaps.push(gap(
      'TypeScript source',
      { kind: 'no-source', hasTypes: false },
      'Package does not have TypeScript source available.'
    ));
    return { resources, gaps };
  }

  // Find TypeScript entry point
  const sourceEntryPoint = getSourceEntryPoint(pkgInfo);
  if (!sourceEntryPoint) {
    gaps.push(gap(
      'source entry point',
      { kind: 'entry-point-not-found', specifier: 'index.ts', resolvedPath: pkgInfo.sourceDir },
      'Could not find source entry point (index.ts).'
    ));
    return { resources, gaps };
  }

  // Queue of files to process (start with entry point)
  const filesToProcess: string[] = [sourceEntryPoint];

  // Process files, following re-exports
  while (filesToProcess.length > 0) {
    const filePath = filesToProcess.pop()!;

    // Skip already processed files
    if (processedFiles.has(filePath)) {
      continue;
    }
    processedFiles.add(filePath);

    try {
      // Read and parse the source file
      const sourceText = await readFile(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS
      );

      // Create a minimal program for type checking this file
      const compilerHost = createMinimalCompilerHost(sourceFile, filePath);
      const program = ts.createProgram([filePath], {
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
      }, compilerHost);
      const checker = program.getTypeChecker();

      // Extract facts using existing infrastructure
      const facts = extractSourceFacts(sourceFile, checker, program);

      // Run inference resolvers
      const decoratorResult = resolveFromDecorators(facts);
      const staticAuResult = resolveFromStaticAu(facts);
      const conventionResult = resolveFromConventions(facts);

      // Combine results - flatten arrays of candidates
      const combined = combine(
        [decoratorResult, staticAuResult, conventionResult],
        (arrays) => arrays.flat()
      );
      gaps.push(...combined.gaps);

      // Convert ResourceCandidate to ExtractedResource
      for (const candidate of combined.value) {
        const extracted = candidateToExtractedResource(candidate, packagePath);
        if (extracted) {
          resources.push(extracted);
        }
      }

      // Find re-exports and add those files to the queue
      const reExportPaths = findTypeScriptReExports(sourceFile, filePath);
      for (const reExportPath of reExportPaths) {
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

  return { resources, gaps };
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
    return { resources, gaps };
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

  return { resources, gaps };
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
          // Resolve the path
          const resolvedPath = join(currentDir, specifier);
          // Ensure .js extension
          const fullPath = resolvedPath.endsWith('.js') ? resolvedPath : resolvedPath + '.js';
          reExports.push(fullPath);
        }
      }
    }
  }

  return reExports;
}

/**
 * Find re-export module specifiers in a TypeScript source file.
 * Handles: export { X } from './foo' and export * from './bar'
 *
 * @param sourceFile - Already parsed TypeScript source file
 * @param currentFile - Path to the current file (for resolving relative paths)
 * @returns Array of resolved file paths to process
 */
function findTypeScriptReExports(sourceFile: ts.SourceFile, currentFile: string): string[] {
  const reExports: string[] = [];
  const currentDir = dirname(currentFile);

  for (const stmt of sourceFile.statements) {
    if (ts.isExportDeclaration(stmt) && stmt.moduleSpecifier) {
      if (ts.isStringLiteral(stmt.moduleSpecifier)) {
        const specifier = stmt.moduleSpecifier.text;
        // Only process relative imports
        if (specifier.startsWith('./') || specifier.startsWith('../')) {
          // Resolve the path - TypeScript specifiers may or may not have extension
          const resolvedPath = join(currentDir, specifier);

          // Try to resolve to a TypeScript file
          // Specifier might be './foo', './foo.js', or './foo.ts'
          let fullPath: string;
          if (resolvedPath.endsWith('.ts')) {
            fullPath = resolvedPath;
          } else if (resolvedPath.endsWith('.js')) {
            // Convert .js to .ts for source files
            fullPath = resolvedPath.slice(0, -3) + '.ts';
          } else {
            // No extension - add .ts
            fullPath = resolvedPath + '.ts';
          }

          reExports.push(fullPath);
        }
      }
    }
  }

  return reExports;
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
            'convention',
      decoratorName: candidate.resolver === 'decorator' ? 'customElement' : undefined,
      suffix: candidate.resolver === 'convention' ? 'CustomElement' : undefined,
    } as ExtractedResource['evidence'],
  };
}

/**
 * Create a minimal compiler host for single-file analysis.
 */
function createMinimalCompilerHost(
  sourceFile: ts.SourceFile,
  fileName: string
): ts.CompilerHost {
  return {
    getSourceFile: (name) => name === fileName ? sourceFile : undefined,
    getDefaultLibFileName: () => 'lib.d.ts',
    writeFile: () => {},
    getCurrentDirectory: () => '',
    getCanonicalFileName: (f) => f,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (f) => f === fileName,
    readFile: () => undefined,
  };
}
