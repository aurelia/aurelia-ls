/**
 * Value Resolution Helpers for Class Extraction
 *
 * Bridges class extraction (AST-level) with the value model (partial evaluation).
 * Uses the unified value model for consistent identifier resolution.
 *
 * Design principle: Don't hard-code identifier mappings. Use the value model
 * to resolve references through scope chains and cross-file imports.
 *
 * This module provides:
 * - PropertyResolutionContext: context for resolving expressions during extraction
 * - buildSimpleContext: for single-file resolution (Layer 2 only)
 * - buildContextWithProgram: for cross-file resolution using ts.Program (Layer 2+3)
 * - createProgramResolver: creates an OnDemandResolver backed by ts.Program
 * - resolveToString/resolveToBoolean: extract primitive values from expressions
 */

import ts from "typescript";
import type { NormalizedPath } from '../compiler.js';
import type {
  AnalyzableValue,
  LexicalScope,
  ValueResolutionContext,
  OnDemandResolver,
} from "./value/types.js";
import { transformExpression } from "./value/transform.js";
import {
  resolveInScope,
  buildFileScope,
  lookupBinding,
  isImportBinding,
} from "./value/scope.js";
import { fullyResolve } from "./value/resolve.js";
import { canonicalPath } from "../util/naming.js";

// =============================================================================
// Property Resolution Context
// =============================================================================

/**
 * Context for resolving property values during class extraction.
 *
 * When available, enables resolution of:
 * - File-local constants (via scope)
 * - Imported values (via cross-file resolution)
 */
export interface PropertyResolutionContext {
  /** The source file being analyzed */
  readonly sourceFile: ts.SourceFile;

  /** Pre-built scope for this file (Layer 2) */
  readonly scope: LexicalScope;

  /**
   * Cross-file resolution context (Layer 3).
   *
   * If provided with an onDemandResolve callback, enables resolution of
   * imported identifiers by following imports using ts.Program.
   */
  readonly valueResolutionContext?: ValueResolutionContext;
}

/**
 * Build a simple resolution context from just a source file.
 *
 * This creates a file scope that can resolve:
 * - Module-level constants: `const TYPE = 'custom-element';`
 * - Identifier references: `type: TYPE` -> 'custom-element'
 *
 * Does NOT resolve cross-file imports (Layer 3). For that, use
 * buildContextWithProgram() instead.
 */
export function buildSimpleContext(
  sf: ts.SourceFile,
  filePath: NormalizedPath
): PropertyResolutionContext {
  return {
    sourceFile: sf,
    scope: buildFileScope(sf, filePath),
  };
}

/**
 * Build a resolution context with cross-file import resolution support.
 *
 * This creates a file scope that can resolve:
 * - Module-level constants: `const TYPE = 'custom-element';`
 * - Identifier references: `type: TYPE` -> 'custom-element'
 * - Imported constants: `type: attrTypeName` -> follows import to source
 *
 * Uses TypeScript's module resolution to follow imports on-demand via the
 * unified Layer 3 infrastructure.
 */
export function buildContextWithProgram(
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  program: ts.Program
): PropertyResolutionContext {
  const scope = buildFileScope(sf, filePath);
  const scopeWithResolvedImports = resolveImportPaths(scope, sf, program);

  // Create a minimal ValueResolutionContext with on-demand resolution
  // The pre-built maps are empty since we resolve everything on-demand
  const valueResolutionContext: ValueResolutionContext = {
    fileScopes: new Map([[filePath, scopeWithResolvedImports]]),
    exportBindings: new Map(),
    fileFacts: new Map(),
    resolving: new Set(),
    gaps: [],
    packagePath: "",
    onDemandResolve: createProgramResolver(program),
  };

  return {
    sourceFile: sf,
    scope: scopeWithResolvedImports,
    valueResolutionContext,
  };
}

// =============================================================================
// On-Demand Resolution (Unified Layer 3)
// =============================================================================

/**
 * Create an OnDemandResolver backed by a TypeScript program.
 *
 * This is the unified mechanism for resolving imports during class extraction.
 * It uses TypeScript's module resolution and builds scopes on-demand.
 *
 * The resolver caches scopes for files it visits to avoid rebuilding them.
 *
 * @param program - TypeScript program for module resolution
 * @returns OnDemandResolver callback for use in ValueResolutionContext
 */
export function createProgramResolver(program: ts.Program): OnDemandResolver {
  // Cache scopes for files we've visited
  const scopeCache = new Map<NormalizedPath, LexicalScope>();

  return (
    specifier: string,
    exportName: string,
    fromFile: NormalizedPath
  ): AnalyzableValue | null => {
    // Find the containing source file
    const containingFile = program.getSourceFile(fromFile);
    if (!containingFile) {
      // Try normalizing the path
      for (const sf of program.getSourceFiles()) {
        if (canonicalPath(sf.fileName) === fromFile) {
          return resolveFromFile(sf);
        }
      }
      return null;
    }

    return resolveFromFile(containingFile);

    function resolveFromFile(containingFile: ts.SourceFile): AnalyzableValue | null {
      // Resolve the module specifier
      const importedFile = resolveModuleToSourceFile(
        specifier,
        containingFile.fileName,
        program
      );

      if (!importedFile) {
        return null;
      }

      // Build or get cached scope for the imported file
      const importedPath = canonicalPath(importedFile.fileName);
      let importedScope = scopeCache.get(importedPath);
      if (!importedScope) {
        importedScope = buildFileScope(importedFile, importedPath);
        scopeCache.set(importedPath, importedScope);
      }

      // Look up the exported name in the imported file's scope
      const binding = lookupBinding(exportName, importedScope);
      if (!binding || isImportBinding(binding)) {
        // Not found or is another import (would need to follow further)
        // For chained imports, we could recursively resolve, but for now
        // we return null and let the gap be recorded
        return null;
      }

      // Resolve within that file's scope
      return resolveInScope(binding, importedScope);
    }
  };
}

/**
 * Resolve a module specifier to a source file using TypeScript's resolution.
 */
function resolveModuleToSourceFile(
  specifier: string,
  containingFile: string,
  program: ts.Program
): ts.SourceFile | undefined {
  const result = ts.resolveModuleName(
    specifier,
    containingFile,
    program.getCompilerOptions(),
    ts.sys
  );

  if (!result.resolvedModule?.resolvedFileName) {
    return undefined;
  }

  let resolvedPath = result.resolvedModule.resolvedFileName;

  // Handle .js -> .ts mapping for ESM imports
  if (resolvedPath.endsWith(".js")) {
    const tsPath = resolvedPath.slice(0, -3) + ".ts";
    const tsFile = program.getSourceFile(tsPath);
    if (tsFile) {
      return tsFile;
    }
  }

  return program.getSourceFile(resolvedPath);
}

/**
 * Resolve module specifiers for imports in a scope.
 *
 * This enriches import bindings with resolvedPath so downstream resolution
 * can handle namespace access (e.g., `import * as ns` then `ns.Value`).
 */
function resolveImportPaths(
  scope: LexicalScope,
  sf: ts.SourceFile,
  program: ts.Program
): LexicalScope {
  let updated = false;
  const imports = new Map(scope.imports);

  for (const [name, binding] of imports) {
    if (binding.resolvedPath) continue;
    const resolvedFile = resolveModuleToSourceFile(binding.specifier, sf.fileName, program);
    if (!resolvedFile) continue;
    imports.set(name, {
      ...binding,
      resolvedPath: canonicalPath(resolvedFile.fileName),
    });
    updated = true;
  }

  if (!updated) {
    return scope;
  }

  return {
    ...scope,
    imports,
  };
}

// =============================================================================
// Value Resolution Functions
// =============================================================================

/**
 * Resolve an expression to a string literal value.
 *
 * Uses the value model for consistent resolution:
 * 1. Transform expression to AnalyzableValue
 * 2. Resolve local references via scope (Layer 2)
 * 3. Resolve imports via cross-file context (Layer 3) if available
 * 4. Extract literal string if fully resolved
 *
 * @param expr - The AST expression to resolve
 * @param ctx - Resolution context (null for direct literals only)
 * @returns The string value, or undefined if not statically determinable
 */
export function resolveToString(
  expr: ts.Expression,
  ctx: PropertyResolutionContext | null
): string | undefined {
  // Fast path: direct string literal
  if (ts.isStringLiteralLike(expr)) {
    return expr.text;
  }

  // Fast path: type assertion wrapping a string literal
  const unwrapped = unwrapAssertions(expr);
  if (ts.isStringLiteralLike(unwrapped)) {
    return unwrapped.text;
  }

  // Without context, can't resolve identifiers
  if (!ctx) {
    return undefined;
  }

  // Transform to value model
  const value = transformExpression(expr, ctx.sourceFile);

  // Resolve through value model (unified Layer 2 + 3)
  const resolved = ctx.valueResolutionContext
    ? fullyResolve(value, ctx.scope, ctx.valueResolutionContext)
    : resolveInScope(value, ctx.scope);

  return extractLiteralString(resolved);
}

/**
 * Resolve an expression to a boolean literal value.
 */
export function resolveToBoolean(
  expr: ts.Expression,
  ctx: PropertyResolutionContext | null
): boolean | undefined {
  // Fast path: boolean keywords
  if (expr.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expr.kind === ts.SyntaxKind.FalseKeyword) return false;

  // Without context, can't resolve identifiers
  if (!ctx) {
    return undefined;
  }

  // Transform and resolve (unified Layer 2 + 3)
  const value = transformExpression(expr, ctx.sourceFile);
  const resolved = ctx.valueResolutionContext
    ? fullyResolve(value, ctx.scope, ctx.valueResolutionContext)
    : resolveInScope(value, ctx.scope);

  return extractLiteralBoolean(resolved);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Unwrap type assertions and parentheses.
 * Handles: `expr as const`, `<Type>expr`, `(expr)`, `expr!`, `expr satisfies T`
 */
function unwrapAssertions(expr: ts.Expression): ts.Expression {
  if (ts.isAsExpression(expr)) {
    return unwrapAssertions(expr.expression);
  }
  if (ts.isTypeAssertionExpression(expr)) {
    return unwrapAssertions(expr.expression);
  }
  if (ts.isParenthesizedExpression(expr)) {
    return unwrapAssertions(expr.expression);
  }
  if (ts.isNonNullExpression(expr)) {
    return unwrapAssertions(expr.expression);
  }
  if (ts.isSatisfiesExpression(expr)) {
    return unwrapAssertions(expr.expression);
  }
  return expr;
}

/**
 * Extract a string from a resolved AnalyzableValue.
 */
function extractLiteralString(value: AnalyzableValue): string | undefined {
  // Direct literal
  if (value.kind === "literal" && typeof value.value === "string") {
    return value.value;
  }

  // Resolved reference
  if (value.kind === "reference" && value.resolved) {
    return extractLiteralString(value.resolved);
  }

  // Resolved import
  if (value.kind === "import" && value.resolved) {
    return extractLiteralString(value.resolved);
  }

  return undefined;
}

/**
 * Extract a boolean from a resolved AnalyzableValue.
 */
function extractLiteralBoolean(value: AnalyzableValue): boolean | undefined {
  if (value.kind === "literal" && typeof value.value === "boolean") {
    return value.value;
  }

  if (value.kind === "reference" && value.resolved) {
    return extractLiteralBoolean(value.resolved);
  }

  if (value.kind === "import" && value.resolved) {
    return extractLiteralBoolean(value.resolved);
  }

  return undefined;
}


