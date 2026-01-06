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

  // Step 2: Determine extraction strategy
  const useSource = preferSource && pkgInfo.hasTypeScriptSource;

  // Step 3: Extract resources
  let resources: ExtractedResource[] = [];
  // Both TypeScript source and ES2022 extraction are 'high' confidence
  // (decorator analysis isn't 100% certain - only manifest is 'exact')
  const baseConfidence: 'high' = 'high';

  if (useSource && pkgInfo.sourceDir) {
    // Use TypeScript source extraction (existing infrastructure)
    const sourceResult = await extractFromTypeScriptSource(pkgInfo, packagePath);
    resources = sourceResult.resources;
    gaps.push(...sourceResult.gaps);
  } else {
    // Use ES2022 extraction from compiled JavaScript
    const es2022Result = await extractFromCompiledJS(pkgInfo, packagePath);
    resources = es2022Result.resources;
    gaps.push(...es2022Result.gaps);
  }

  // Step 4: Build result
  const analysis: PackageAnalysis = {
    packageName: pkgInfo.name,
    version: pkgInfo.version,
    resources,
    configurations: [], // TODO: Phase 2 - configuration analysis
  };

  if (gaps.length > 0) {
    // Determine confidence based on gaps
    const hasBlockingGaps = gaps.some(g =>
      g.why.kind === 'dynamic-value' ||
      g.why.kind === 'function-return' ||
      g.why.kind === 'spread-unknown'
    );
    return partial(analysis, hasBlockingGaps ? 'partial' : 'high', gaps);
  }

  // Use base confidence - 'high' for decorator-based analysis
  return partial(analysis, baseConfidence, []);
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
 */
async function extractFromTypeScriptSource(
  pkgInfo: PackageInfo,
  packagePath: string
): Promise<ExtractionResult> {
  const resources: ExtractedResource[] = [];
  const gaps: AnalysisGap[] = [];

  if (!pkgInfo.sourceDir) {
    gaps.push(gap(
      'TypeScript source',
      { kind: 'no-source', hasTypes: false },
      'Package does not have TypeScript source available.'
    ));
    return { resources, gaps };
  }

  // Find all TypeScript files in source directory
  const sourceEntryPoint = getSourceEntryPoint(pkgInfo);
  if (!sourceEntryPoint) {
    gaps.push(gap(
      'source entry point',
      { kind: 'entry-point-not-found', specifier: 'index.ts', resolvedPath: pkgInfo.sourceDir },
      'Could not find source entry point (index.ts).'
    ));
    return { resources, gaps };
  }

  try {
    // Read the source file
    const sourceText = await readFile(sourceEntryPoint, 'utf-8');
    const sourceFile = ts.createSourceFile(
      sourceEntryPoint,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    // Create a minimal program for type checking
    const compilerHost = createMinimalCompilerHost(sourceFile, sourceEntryPoint);
    const program = ts.createProgram([sourceEntryPoint], {
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
  } catch (err) {
    gaps.push(gap(
      'TypeScript parsing',
      { kind: 'parse-error', message: err instanceof Error ? err.message : String(err) },
      'Failed to parse TypeScript source.'
    ));
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
