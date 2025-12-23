/**
 * Entry Point Transformer
 *
 * Transforms Aurelia entry points (main.ts) to use AotConfiguration
 * instead of StandardConfiguration, enabling tree-shaking.
 */

import type {
  EntryTransformOptions,
  EntryTransformResult,
  EntryPointAnalysis,
  RequiredImport,
} from "./types.js";
import type { Span } from "../ts/types.js";
import { analyzeEntryPoint, shouldTransformEntryPoint } from "./analyze.js";
import {
  buildAotConfiguration,
  generateImportStatements,
  generateInitialization,
} from "./build-config.js";

/** Simple edit type for entry point transformation */
interface Edit {
  span: Span;
  newText: string;
}

/**
 * Transform an entry point to use AotConfiguration.
 */
export function transformEntryPoint(
  options: EntryTransformOptions
): EntryTransformResult {
  const { source, filePath, configOptions = {} } = options;

  // Analyze the entry point
  const analysis = options.analysis ?? analyzeEntryPoint(source);

  // Check if we should transform
  const skipReason = shouldTransformEntryPoint(analysis);
  if (skipReason) {
    return {
      code: source,
      transformed: false,
      skipReason,
      warnings: [],
      analysis,
    };
  }

  const warnings: string[] = [];
  const edits: Edit[] = [];

  // Build the AOT configuration
  const preservedRegistrations = analysis.preservedRegistrations.map(
    (r) => r.expression
  );

  const configResult = buildAotConfiguration({
    preservedRegistrations,
    ...configOptions,
  });

  // Generate new imports
  const existingImports = collectExistingImports(analysis);
  const newImports = generateImportStatements(
    configResult.requiredImports,
    existingImports
  );

  // Find where to insert imports (after existing aurelia imports)
  const lastAureliaImport = findLastAureliaImport(analysis);

  // Strategy: Replace the Aurelia initialization chain
  if (analysis.initChain) {
    // 1. Remove/modify Aurelia imports
    const importEdits = generateImportEdits(analysis, configResult.requiredImports);
    edits.push(...importEdits);

    // 2. Insert configuration code before the init chain
    const configCode = `\n${configResult.code}\n`;

    // Find statement containing the init chain
    const initStart = findStatementStart(source, analysis.initChain.span.start);

    edits.push({
      span: { start: initStart, end: initStart },
      newText: configCode,
    });

    // 3. Replace the init chain
    const newInit = generateInitialization({
      component: analysis.initChain.component ?? "App",
      preservedRegistrations,
    });

    edits.push({
      span: analysis.initChain.span,
      newText: newInit,
    });

    warnings.push(
      `Transformed entry point to use AotConfiguration (${preservedRegistrations.length} registrations preserved)`
    );
  }

  // Sort edits by position (descending) to apply from end to start
  edits.sort((a, b) => b.span.start - a.span.start);

  // Apply edits
  let transformed = source;
  for (const edit of edits) {
    transformed =
      transformed.slice(0, edit.span.start) +
      edit.newText +
      transformed.slice(edit.span.end);
  }

  return {
    code: transformed,
    transformed: true,
    warnings,
    analysis,
  };
}

/**
 * Collect existing imports into a map for deduplication.
 */
function collectExistingImports(
  analysis: EntryPointAnalysis
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();

  for (const imp of analysis.imports.aureliaImports) {
    const specifiers = new Set<string>();
    for (const spec of imp.specifiers) {
      specifiers.add(spec.name);
    }
    if (imp.defaultName) {
      specifiers.add(imp.defaultName);
    }
    map.set(imp.source, specifiers);
  }

  return map;
}

/**
 * Find the last Aurelia import for insertion point.
 */
function findLastAureliaImport(analysis: EntryPointAnalysis): number {
  let lastEnd = 0;
  for (const imp of analysis.imports.aureliaImports) {
    if (imp.span.end > lastEnd) {
      lastEnd = imp.span.end;
    }
  }
  return lastEnd;
}

/**
 * Generate edits to update imports.
 */
function generateImportEdits(
  analysis: EntryPointAnalysis,
  requiredImports: RequiredImport[]
): Edit[] {
  const edits: Edit[] = [];

  // Strategy: Replace all Aurelia imports with our required imports
  // This is simpler than trying to merge/modify existing imports

  // Find the range of all Aurelia imports
  let importStart = Infinity;
  let importEnd = 0;

  for (const imp of analysis.imports.aureliaImports) {
    if (imp.span.start < importStart) {
      importStart = imp.span.start;
    }
    if (imp.span.end > importEnd) {
      importEnd = imp.span.end;
    }
  }

  if (importStart !== Infinity) {
    // Generate new import block
    const newImports = generateImportStatements(requiredImports);

    edits.push({
      span: { start: importStart, end: importEnd },
      newText: newImports,
    });
  }

  return edits;
}

/**
 * Find the start of the statement containing a position.
 */
function findStatementStart(source: string, position: number): number {
  // Walk backwards to find the start of the line/statement
  let start = position;
  while (start > 0) {
    const char = source[start - 1];
    if (char === "\n" || char === ";") {
      break;
    }
    start--;
  }

  // Skip leading whitespace
  while (start < source.length && /\s/.test(source[start]!)) {
    start++;
  }

  return start;
}

/**
 * Simple entry point transformation for common patterns.
 *
 * This is a higher-level API that handles the most common cases:
 * - Aurelia.app(MyApp).start()
 * - Aurelia.register(...).app(MyApp).start()
 */
export function transformSimpleEntryPoint(
  source: string,
  filePath: string = "main.ts"
): EntryTransformResult {
  return transformEntryPoint({ source, filePath });
}
