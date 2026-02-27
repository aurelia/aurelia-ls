/**
 * File Resolution - Unified API for Extraction + Pattern Matching
 *
 * Provides a convenient entry point that:
 * 1. Extracts FileFacts from source files
 * 2. Partially evaluates AnalyzableValue trees
 * 3. Runs pattern matchers (ClassValue → ResourceDef)
 * 4. Returns resolved resources with provenance
 *
 * This combines the new extraction pipeline (FileFacts + ClassValue)
 * with the new pattern matchers (patterns/).
 */

import type { NormalizedPath, ResourceDef } from './compiler.js';
import type ts from 'typescript';
import type { FileFacts, FileContext } from './extract/file-facts.js';
import type { AnalysisGap } from './evaluate/types.js';
import { extractAllFileFacts, extractFileFacts, extractFileContext, type ExtractionOptions } from './extract/file-facts-extractor.js';
import { evaluateFileFacts } from "./evaluate/partial-evaluation.js";
import { buildExportBindingMap } from './exports/export-resolver.js';
import { matchFileFacts } from './recognize/pipeline.js';
import { canonicalPath } from './util/naming.js';
import type { DefineMap } from './defines.js';

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
  readonly resources: readonly ResourceDef[];

  /** Gaps encountered during extraction, evaluation, and matching */
  readonly gaps: readonly AnalysisGap[];
}

/**
 * Result of resolving all files in a program.
 */
export interface ProgramResolutionResult {
  /** Per-file results */
  readonly files: ReadonlyMap<NormalizedPath, FileResolutionResult>;

  /** All resources discovered */
  readonly resources: readonly ResourceDef[];

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
  /** Compile-time constant definitions (e.g. window.__AU_DEF__ = true) */
  readonly defines?: DefineMap;
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
  if (program) {
    const programResult = resolveProgram(program, options);
    const targetPath = canonicalPath(sourceFile.fileName);
    const existing = programResult.files.get(targetPath);
    if (existing) {
      return existing;
    }
  }

  // Extract file facts
  const rawFacts = extractFileFacts(sourceFile, checker, program, options);
  const rawFactsMap = new Map<NormalizedPath, FileFacts>([[rawFacts.path, rawFacts]]);

  // Build export bindings from available facts
  const exportBindings = buildExportBindingMap(rawFactsMap);

  // Partially evaluate values for this file
  const evaluation = evaluateFileFacts(rawFactsMap, exportBindings, {
    defines: options?.defines,
  });
  const facts = evaluation.facts.get(rawFacts.path) ?? rawFacts;
  const evalGaps = evaluation.files.get(rawFacts.path)?.gaps ?? [];

  // Extract file context (siblings, templates)
  const context = extractFileContext(sourceFile.fileName, options, program);

  // Run pattern matchers on classes AND define calls
  const matchResult = matchFileFacts(facts, context);

  // Combine gaps from evaluation and matching
  const gaps: AnalysisGap[] = [...matchResult.gaps, ...evalGaps];

  return {
    path: facts.path,
    facts,
    context,
    resources: matchResult.resources,
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
  const allResources: ResourceDef[] = [];
  const allGaps: AnalysisGap[] = [];

  const rawFacts = extractAllFileFacts(program, options);
  const exportBindings = buildExportBindingMap(rawFacts);
  const evaluation = evaluateFileFacts(rawFacts, exportBindings, {
    defines: options?.defines,
  });

  const sortedFacts = Array.from(evaluation.facts.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  for (const [path, fileFacts] of sortedFacts) {
    const context = extractFileContext(path, options, program);
    const matchResult = matchFileFacts(fileFacts, context);
    const evalGaps = evaluation.files.get(path)?.gaps ?? [];
    const gaps: AnalysisGap[] = [...matchResult.gaps, ...evalGaps];

    if (options?.skipEmptyFiles && matchResult.resources.length === 0) {
      continue;
    }

    const result: FileResolutionResult = {
      path,
      facts: fileFacts,
      context,
      resources: matchResult.resources,
      gaps,
    };

    files.set(path, result);
    allResources.push(...matchResult.resources);
    allGaps.push(...gaps);
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
 * @returns All ResourceDef found
 */
export function extractResources(program: ts.Program): readonly ResourceDef[] {
  const result = resolveProgram(program, { skipEmptyFiles: true });
  return result.resources;
}

