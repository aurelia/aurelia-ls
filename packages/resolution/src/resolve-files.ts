/**
 * File Resolution - Unified API for Extraction + Pattern Matching
 *
 * Provides a convenient entry point that:
 * 1. Extracts FileFacts from source files
 * 2. Runs pattern matchers (ClassValue → ResourceAnnotation)
 * 3. Returns resolved resources with provenance
 *
 * This combines the new extraction pipeline (FileFacts + ClassValue)
 * with the new pattern matchers (patterns/).
 */

import type { NormalizedPath, TextSpan } from '@aurelia-ls/compiler';
import type ts from 'typescript';
import type { FileFacts, FileContext } from './file-facts.js';
import type { ResourceAnnotation } from './annotation.js';
import type { AnalysisGap } from './extraction/types.js';
import { extractFileFacts, extractFileContext, type ExtractionOptions } from './extraction/file-facts-extractor.js';
import { matchFileFacts } from './patterns/pipeline.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of resolving a single file.
 */
export interface FileResolutionResult {
  /** Path to the resolved file */
  readonly path: NormalizedPath;

  /** Extracted file facts */
  readonly facts: FileFacts;

  /** File context (siblings, templates) */
  readonly context: FileContext;

  /** Resources discovered via pattern matching */
  readonly resources: readonly ResourceAnnotation[];

  /** Gaps encountered during extraction and matching */
  readonly gaps: readonly AnalysisGap[];
}

/**
 * Result of resolving all files in a program.
 */
export interface ProgramResolutionResult {
  /** Per-file results */
  readonly files: ReadonlyMap<NormalizedPath, FileResolutionResult>;

  /** All resources discovered */
  readonly resources: readonly ResourceAnnotation[];

  /** All gaps encountered */
  readonly gaps: readonly AnalysisGap[];
}

/**
 * Options for file resolution.
 */
export interface FileResolutionOptions extends ExtractionOptions {
  /**
   * Whether to skip files without classes.
   * @default false
   */
  readonly skipEmptyFiles?: boolean;
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Resolve a single source file.
 *
 * Extracts facts and runs pattern matchers to find resources.
 *
 * @param sourceFile - TypeScript source file
 * @param checker - Type checker (for bindable type inference)
 * @param program - TypeScript program (for import resolution)
 * @param options - Resolution options
 */
export function resolveFile(
  sourceFile: ts.SourceFile,
  checker: ts.TypeChecker,
  program?: ts.Program,
  options?: FileResolutionOptions
): FileResolutionResult {
  // Extract file facts
  const facts = extractFileFacts(sourceFile, checker, program, options);

  // Extract file context (siblings, templates)
  const context = extractFileContext(sourceFile.fileName, options, program);

  // Run pattern matchers on classes AND define calls
  const matchResult = matchFileFacts(facts, context);

  // Combine gaps from extraction and matching
  const gaps: AnalysisGap[] = [...facts.gaps, ...matchResult.gaps];

  return {
    path: facts.path,
    facts,
    context,
    resources: matchResult.annotations,
    gaps,
  };
}

/**
 * Resolve all source files in a TypeScript program.
 *
 * @param program - TypeScript program
 * @param options - Resolution options
 */
export function resolveProgram(
  program: ts.Program,
  options?: FileResolutionOptions
): ProgramResolutionResult {
  const files = new Map<NormalizedPath, FileResolutionResult>();
  const allResources: ResourceAnnotation[] = [];
  const allGaps: AnalysisGap[] = [];
  const checker = program.getTypeChecker();

  // Sort files for deterministic output
  const sourceFiles = program
    .getSourceFiles()
    .filter(sf => !sf.isDeclarationFile)
    .sort((a, b) => a.fileName.localeCompare(b.fileName));

  for (const sf of sourceFiles) {
    const result = resolveFile(sf, checker, program, options);

    // Skip empty files if requested
    if (options?.skipEmptyFiles && result.resources.length === 0) {
      continue;
    }

    files.set(result.path, result);
    allResources.push(...result.resources);
    allGaps.push(...result.gaps);
  }

  return {
    files,
    resources: allResources,
    gaps: allGaps,
  };
}

/**
 * Quick utility to get all resources from a program.
 *
 * @param program - TypeScript program
 * @returns All ResourceAnnotation found
 */
export function extractResources(program: ts.Program): readonly ResourceAnnotation[] {
  const result = resolveProgram(program, { skipEmptyFiles: true });
  return result.resources;
}
