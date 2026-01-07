/**
 * Value Resolution Helpers for Class Extraction
 *
 * Bridges class extraction (AST-level) with the value model (partial evaluation).
 * Uses the same infrastructure as npm-analysis for consistent identifier resolution.
 *
 * Design principle: Don't hard-code identifier mappings. Use the value model
 * to resolve references through scope chains and cross-file imports.
 */

import ts from "typescript";
import type { NormalizedPath } from "@aurelia-ls/compiler";
import type { AnalyzableValue, Scope, ResolutionContext, ImportBinding } from "../npm/value/types.js";
import { transformExpression } from "../npm/value/transform.js";
import { resolveInScope, buildFileScope, lookupBinding, isImportBinding } from "../npm/value/scope.js";
import { fullyResolve } from "../npm/value/resolve.js";
import { canonicalPath } from "../util/naming.js";

/**
 * Context for resolving property values during class extraction.
 *
 * When available, enables resolution of:
 * - File-local constants (via scope)
 * - Imported values (via cross-file resolution or inline import following)
 */
export interface PropertyResolutionContext {
  /** The source file being analyzed */
  readonly sourceFile: ts.SourceFile;

  /** Pre-built scope for this file (Layer 2) */
  readonly scope: Scope;

  /** Cross-file resolution context (Layer 3, optional) */
  readonly resolutionContext?: ResolutionContext;

  /** TypeScript program for inline import resolution (optional) */
  readonly program?: ts.Program;

  /** Cache of scopes for files we've followed imports to */
  readonly scopeCache?: Map<NormalizedPath, Scope>;
}

/**
 * Build a simple resolution context from just a source file.
 *
 * This creates a file scope that can resolve:
 * - Module-level constants: `const TYPE = 'custom-element';`
 * - Identifier references: `type: TYPE` → 'custom-element'
 *
 * Does NOT resolve cross-file imports (Layer 3). For that, pass a full
 * PropertyResolutionContext with resolutionContext.
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
 * Build a resolution context with inline import resolution support.
 *
 * This creates a file scope that can resolve:
 * - Module-level constants: `const TYPE = 'custom-element';`
 * - Identifier references: `type: TYPE` → 'custom-element'
 * - Imported constants: `type: attrTypeName` → follows import to source
 *
 * Uses TypeScript's module resolution to follow imports on-demand.
 */
export function buildContextWithProgram(
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  program: ts.Program
): PropertyResolutionContext {
  return {
    sourceFile: sf,
    scope: buildFileScope(sf, filePath),
    program,
    scopeCache: new Map(),
  };
}

/**
 * Resolve an expression to a string literal value.
 *
 * Uses the value model for consistent resolution:
 * 1. Transform expression to AnalyzableValue
 * 2. Resolve local references via scope (Layer 2)
 * 3. Resolve imports via cross-file context (Layer 3) or inline following
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

  // Resolve through value model
  let resolved: AnalyzableValue;
  if (ctx.resolutionContext) {
    // Full cross-file resolution (npm-analysis path)
    resolved = fullyResolve(value, ctx.scope, ctx.resolutionContext);
  } else {
    // Scope-based resolution
    resolved = resolveInScope(value, ctx.scope);

    // If we have a program and got an unresolved import, try inline resolution
    if (ctx.program && isUnresolvedImport(resolved)) {
      const inlineResolved = resolveImportInline(resolved, ctx);
      if (inlineResolved !== undefined) {
        return inlineResolved;
      }
    }
  }

  return extractLiteralString(resolved);
}

/**
 * Check if a value is an unresolved import.
 *
 * When resolveInScope encounters an import binding, it returns an ImportValue
 * directly (not a ReferenceValue with resolved). The ImportValue is "unresolved"
 * if it doesn't have a `resolved` field populated (Layer 3 hasn't run).
 */
function isUnresolvedImport(value: AnalyzableValue): value is {
  kind: "import";
  specifier: string;
  exportName: string;
  resolved?: undefined;
} {
  return value.kind === "import" && value.resolved === undefined;
}

/**
 * Follow an import inline using the TypeScript program to resolve the value.
 *
 * This handles cases like:
 * - `import { attrTypeName } from '../custom-attribute';`
 * - Where `attrTypeName` is `const attrTypeName = 'custom-attribute'` in that file
 */
function resolveImportInline(
  value: AnalyzableValue,
  ctx: PropertyResolutionContext
): string | undefined {
  if (!ctx.program) return undefined;
  if (value.kind !== "import") return undefined;

  // Get the import binding info directly from the ImportValue
  const importInfo = value;

  // Find the source file for this import
  const importedFile = resolveModuleToSourceFile(
    importInfo.specifier,
    ctx.sourceFile.fileName,
    ctx.program
  );

  if (!importedFile) return undefined;

  // Build or get cached scope for the imported file
  const importedPath = canonicalPath(importedFile.fileName);
  let importedScope = ctx.scopeCache?.get(importedPath);
  if (!importedScope) {
    importedScope = buildFileScope(importedFile, importedPath);
    ctx.scopeCache?.set(importedPath, importedScope);
  }

  // Look up the exported name in the imported file's scope
  const binding = lookupBinding(importInfo.exportName, importedScope);
  if (!binding || isImportBinding(binding)) {
    // Not found or is another import (would need to follow further)
    return undefined;
  }

  // Resolve within that file's scope
  const resolved = resolveInScope(binding, importedScope);
  return extractLiteralString(resolved);
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

  // Handle .js → .ts mapping for ESM imports
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

  // Transform and resolve
  const value = transformExpression(expr, ctx.sourceFile);
  const resolved = ctx.resolutionContext
    ? fullyResolve(value, ctx.scope, ctx.resolutionContext)
    : resolveInScope(value, ctx.scope);

  return extractLiteralBoolean(resolved);
}

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
