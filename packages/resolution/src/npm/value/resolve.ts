/**
 * Cross-File Resolution (Layer 3)
 *
 * Resolves ImportValue nodes across file boundaries by:
 * 1. Looking up module specifiers in SourceFacts to get resolved paths
 * 2. Following export chains using export-resolver infrastructure
 * 3. Looking up definitions in the target file's scope
 *
 * This layer bridges scope resolution (Layer 2) and pattern matching (Layer 4).
 *
 * Design principles:
 * - Cycle detection via resolving set
 * - Graceful degradation: unresolved imports become gaps, not errors
 * - Immutability: returns new values with `resolved` fields populated
 */

import type { NormalizedPath } from '@aurelia-ls/compiler';
import { debug } from '@aurelia-ls/compiler';
import { gap, type SourceFacts } from '../../extraction/types.js';
import { lookupExportBinding } from '../../binding/export-resolver.js';
import type { ExportBindingMap } from '../../binding/types.js';
import type {
  AnalyzableValue,
  ImportValue,
  ResolutionContext,
  LexicalScope,
  StatementValue,
  MethodValue,
} from './types.js';
import {
  unknown,
  importVal,
} from './types.js';
import { resolveInScope } from './scope.js';

// =============================================================================
// Context Building
// =============================================================================

/**
 * Options for building a resolution context.
 */
export interface BuildContextOptions {
  /** Pre-built file scopes (required) */
  readonly fileScopes: ReadonlyMap<NormalizedPath, LexicalScope>;

  /** Export binding map from binding/export-resolver.ts */
  readonly exportBindings: ExportBindingMap;

  /** Source facts for import specifier resolution */
  readonly sourceFacts: ReadonlyMap<NormalizedPath, SourceFacts>;

  /** Package root path */
  readonly packagePath: string;
}

/**
 * Build a resolution context for cross-file value resolution.
 *
 * @param options - Context building options
 * @returns A new ResolutionContext ready for cross-file resolution
 */
export function buildResolutionContext(options: BuildContextOptions): ResolutionContext {
  return {
    fileScopes: options.fileScopes,
    exportBindings: options.exportBindings,
    sourceFacts: options.sourceFacts,
    resolving: new Set(),
    gaps: [],
    packagePath: options.packagePath,
  };
}

// =============================================================================
// Cross-File Resolution
// =============================================================================

/**
 * Resolve all ImportValue nodes in a value tree across file boundaries.
 *
 * This is the main entry point for Layer 3 resolution. It:
 * - Walks the value tree looking for ImportValue nodes
 * - Resolves each import using the export binding map
 * - Populates the `resolved` field on ImportValue nodes
 * - Accumulates gaps for unresolvable imports
 *
 * @param value - The value to resolve (typically from Layer 2)
 * @param ctx - Resolution context
 * @param fromFile - The file where this value originated (for import lookup)
 * @returns A new value with imports resolved where possible
 */
export function resolveImportsCrossFile(
  value: AnalyzableValue,
  ctx: ResolutionContext,
  fromFile: NormalizedPath
): AnalyzableValue {
  return resolveValueCrossFile(value, ctx, fromFile);
}

/**
 * Internal cross-file resolution with recursive structure handling.
 */
function resolveValueCrossFile(
  value: AnalyzableValue,
  ctx: ResolutionContext,
  fromFile: NormalizedPath
): AnalyzableValue {
  switch (value.kind) {
    // ─────────────────────────────────────────────────────────────────────────
    // Leaf values - nothing to resolve
    // ─────────────────────────────────────────────────────────────────────────
    case 'literal':
    case 'class':
    case 'unknown':
      return value;

    // ─────────────────────────────────────────────────────────────────────────
    // Import - the main target of Layer 3
    // ─────────────────────────────────────────────────────────────────────────
    case 'import':
      // Namespace imports (import * as ns) are not resolved here
      // They're handled by property access resolution (ns.Foo)
      if (value.exportName === '*') {
        return value;
      }
      return resolveImport(value, ctx, fromFile);

    // ─────────────────────────────────────────────────────────────────────────
    // Reference - may contain already-resolved import
    // ─────────────────────────────────────────────────────────────────────────
    case 'reference': {
      if (!value.resolved) return value;
      const resolved = resolveValueCrossFile(value.resolved, ctx, fromFile);
      if (resolved === value.resolved) return value;
      return { ...value, resolved };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Compound values - resolve recursively
    // ─────────────────────────────────────────────────────────────────────────
    case 'array': {
      const elements = value.elements.map(el => resolveValueCrossFile(el, ctx, fromFile));
      if (elements.every((el, i) => el === value.elements[i])) return value;
      return { ...value, elements };
    }

    case 'object': {
      let changed = false;
      const properties = new Map<string, AnalyzableValue>();
      for (const [key, propValue] of value.properties) {
        const resolved = resolveValueCrossFile(propValue, ctx, fromFile);
        properties.set(key, resolved);
        if (resolved !== propValue) changed = true;
      }
      const methods = new Map<string, MethodValue>();
      for (const [key, methodValue] of value.methods) {
        const resolved = resolveMethodCrossFile(methodValue, ctx, fromFile);
        methods.set(key, resolved);
        if (resolved !== methodValue) changed = true;
      }
      if (!changed) return value;
      return { ...value, properties, methods };
    }

    case 'function': {
      const body = value.body.map(stmt => resolveStatementCrossFile(stmt, ctx, fromFile));
      if (body.every((stmt, i) => stmt === value.body[i])) return value;
      return { ...value, body };
    }

    case 'propertyAccess': {
      const base = resolveValueCrossFile(value.base, ctx, fromFile);

      // Handle namespace import property access: ns.Foo
      if (base.kind === 'import' && base.exportName === '*' && base.resolvedPath) {
        // This is a namespace import - resolve the property as a named export
        return resolveNamespacePropertyAccess(base, value.property, ctx);
      }

      if (base === value.base) return value;
      return { ...value, base };
    }

    case 'call': {
      const callee = resolveValueCrossFile(value.callee, ctx, fromFile);
      const args = value.args.map(arg => resolveValueCrossFile(arg, ctx, fromFile));
      const calleeChanged = callee !== value.callee;
      const argsChanged = args.some((arg, i) => arg !== value.args[i]);
      if (!calleeChanged && !argsChanged) return value;
      return { ...value, callee, args };
    }

    case 'spread': {
      const target = resolveValueCrossFile(value.target, ctx, fromFile);

      // Try to expand if target resolved to array
      let expanded = value.expanded;
      const resolvedTarget = getResolvedTarget(target);
      if (resolvedTarget?.kind === 'array' && !expanded) {
        // Resolve each element of the expanded array (they may contain unresolved imports)
        expanded = resolvedTarget.elements.map(el => resolveValueCrossFile(el, ctx, fromFile));
      } else if (expanded) {
        // If already expanded, ensure elements are resolved
        expanded = expanded.map(el => resolveValueCrossFile(el, ctx, fromFile));
      }

      if (target === value.target && expanded === value.expanded) return value;
      return {
        ...value,
        target,
        ...(expanded !== undefined && { expanded }),
      };
    }

    case 'new': {
      const callee = resolveValueCrossFile(value.callee, ctx, fromFile);
      const args = value.args.map(arg => resolveValueCrossFile(arg, ctx, fromFile));
      const calleeChanged = callee !== value.callee;
      const argsChanged = args.some((arg, i) => arg !== value.args[i]);
      if (!calleeChanged && !argsChanged) return value;
      return { ...value, callee, args };
    }
  }
}

/**
 * Get the innermost resolved value, following reference/import chains.
 */
function getResolvedTarget(value: AnalyzableValue): AnalyzableValue | undefined {
  if (value.kind === 'reference' && value.resolved) {
    return getResolvedTarget(value.resolved);
  }
  if (value.kind === 'import' && value.resolved) {
    return getResolvedTarget(value.resolved);
  }
  return value;
}

/**
 * Resolve a method's body across file boundaries.
 */
function resolveMethodCrossFile(
  method: MethodValue,
  ctx: ResolutionContext,
  fromFile: NormalizedPath
): MethodValue {
  const body = method.body.map(stmt => resolveStatementCrossFile(stmt, ctx, fromFile));
  if (body.every((stmt, i) => stmt === method.body[i])) return method;
  return { ...method, body };
}

/**
 * Resolve a statement across file boundaries.
 */
function resolveStatementCrossFile(
  stmt: StatementValue,
  ctx: ResolutionContext,
  fromFile: NormalizedPath
): StatementValue {
  switch (stmt.kind) {
    case 'return':
      if (stmt.value === null) return stmt;
      const returnValue = resolveValueCrossFile(stmt.value, ctx, fromFile);
      if (returnValue === stmt.value) return stmt;
      return { ...stmt, value: returnValue };

    case 'expression':
      const exprValue = resolveValueCrossFile(stmt.value, ctx, fromFile);
      if (exprValue === stmt.value) return stmt;
      return { ...stmt, value: exprValue };

    case 'variable': {
      let changed = false;
      const declarations = stmt.declarations.map(decl => {
        if (decl.init === null) return decl;
        const init = resolveValueCrossFile(decl.init, ctx, fromFile);
        if (init === decl.init) return decl;
        changed = true;
        return { ...decl, init };
      });
      if (!changed) return stmt;
      return { ...stmt, declarations };
    }

    case 'if': {
      const condition = resolveValueCrossFile(stmt.condition, ctx, fromFile);
      const thenBranch = stmt.thenBranch.map(s => resolveStatementCrossFile(s, ctx, fromFile));
      const elseBranch = stmt.elseBranch?.map(s => resolveStatementCrossFile(s, ctx, fromFile));
      const conditionChanged = condition !== stmt.condition;
      const thenChanged = thenBranch.some((s, i) => s !== stmt.thenBranch[i]);
      const elseChanged = elseBranch?.some((s, i) => s !== stmt.elseBranch?.[i]) ?? false;
      if (!conditionChanged && !thenChanged && !elseChanged) return stmt;
      return { ...stmt, condition, thenBranch, elseBranch };
    }

    case 'forOf': {
      const iterable = resolveValueCrossFile(stmt.iterable, ctx, fromFile);
      const body = stmt.body.map(s => resolveStatementCrossFile(s, ctx, fromFile));
      const iterableChanged = iterable !== stmt.iterable;
      const bodyChanged = body.some((s, i) => s !== stmt.body[i]);
      if (!iterableChanged && !bodyChanged) return stmt;
      return { ...stmt, iterable, body };
    }

    case 'unknownStatement':
      return stmt;
  }
}

// =============================================================================
// Import Resolution
// =============================================================================

/**
 * Resolve a single ImportValue to its definition.
 *
 * Resolution steps:
 * 1. Get the resolved path from SourceFacts import lookup
 * 2. Use export bindings to find the actual definition location
 * 3. Look up the definition in the target file's scope
 * 4. Recursively resolve the definition (for re-exports)
 *
 * If any step fails and ctx.onDemandResolve is provided, falls back to
 * on-demand resolution. This enables incremental resolution during class
 * extraction without requiring all files to be pre-analyzed.
 *
 * @param imp - The import value to resolve
 * @param ctx - Resolution context
 * @param fromFile - The file containing the import
 * @returns ImportValue with resolved field populated, or with gap if unresolvable
 */
export function resolveImport(
  imp: ImportValue,
  ctx: ResolutionContext,
  fromFile: NormalizedPath
): AnalyzableValue {
  // Step 1: Get the resolved path for the import specifier
  const resolvedPath = imp.resolvedPath ?? lookupImportPath(imp.specifier, imp.exportName, fromFile, ctx);

  if (!resolvedPath) {
    // Cannot resolve the import path via pre-built infrastructure
    // Try on-demand resolution if available
    if (ctx.onDemandResolve) {
      const onDemandResult = tryOnDemandResolve(imp, ctx, fromFile);
      if (onDemandResult) {
        return onDemandResult;
      }
    }

    // Record gap and return unknown
    const reason = gap(
      `import "${imp.exportName}" from "${imp.specifier}"`,
      { kind: 'unresolved-import', path: imp.specifier, reason: 'module not found' },
      `Cannot resolve module "${imp.specifier}" from ${fromFile}`
    );
    ctx.gaps.push(reason);
    return unknown(reason, imp.span);
  }

  // Step 2: Cycle detection
  const cycleKey = `${resolvedPath}#${imp.exportName}`;
  if (ctx.resolving.has(cycleKey)) {
    // Circular import - return import as-is to break the cycle
    return importVal(imp.specifier, imp.exportName, resolvedPath, undefined, imp.span);
  }
  ctx.resolving.add(cycleKey);

  try {
    // Step 3: Look up in export bindings to find actual definition
    debug.resolution('resolveImport.step3', {
      resolvedPath,
      exportName: imp.exportName,
      exportBindingsKeys: [...ctx.exportBindings.keys()].slice(0, 5),
      hasPathInBindings: ctx.exportBindings.has(resolvedPath),
    });

    const exportBinding = lookupExportBinding(ctx.exportBindings, resolvedPath, imp.exportName);

    debug.resolution('resolveImport.step3.result', {
      found: !!exportBinding,
      definitionPath: exportBinding?.definitionPath,
      definitionName: exportBinding?.definitionName,
    });

    if (!exportBinding) {
      // Export not found in target module via pre-built infrastructure
      // Try on-demand resolution if available
      if (ctx.onDemandResolve) {
        const onDemandResult = tryOnDemandResolve(imp, ctx, fromFile);
        if (onDemandResult) {
          return onDemandResult;
        }
      }

      const reason = gap(
        `import "${imp.exportName}" from "${imp.specifier}"`,
        { kind: 'unresolved-import', path: resolvedPath, reason: `"${imp.exportName}" not exported` },
        `Module "${resolvedPath}" does not export "${imp.exportName}"`
      );
      ctx.gaps.push(reason);
      return unknown(reason, imp.span);
    }

    // Step 4: Get the scope for the definition file
    debug.resolution('resolveImport.step4', {
      definitionPath: exportBinding.definitionPath,
      availableScopes: [...ctx.fileScopes.keys()].slice(0, 5),
      hasScope: ctx.fileScopes.has(exportBinding.definitionPath),
    });

    const definitionScope = ctx.fileScopes.get(exportBinding.definitionPath);
    if (!definitionScope) {
      // Definition file not analyzed via pre-built infrastructure
      // Try on-demand resolution if available
      debug.resolution('resolveImport.step4.failed', { definitionPath: exportBinding.definitionPath });
      if (ctx.onDemandResolve) {
        const onDemandResult = tryOnDemandResolve(imp, ctx, fromFile);
        if (onDemandResult) {
          return onDemandResult;
        }
      }

      const reason = gap(
        `import "${imp.exportName}" from "${imp.specifier}"`,
        { kind: 'unresolved-import', path: exportBinding.definitionPath, reason: 'file not analyzed' },
        `Definition file "${exportBinding.definitionPath}" not in analysis scope`
      );
      ctx.gaps.push(reason);
      return unknown(reason, imp.span);
    }

    // Step 5: Look up the definition in the scope
    debug.resolution('resolveImport.step5', {
      definitionName: exportBinding.definitionName,
      availableBindings: [...definitionScope.bindings.keys()],
      hasBinding: definitionScope.bindings.has(exportBinding.definitionName),
    });

    const definition = definitionScope.bindings.get(exportBinding.definitionName);
    if (!definition) {
      // Definition not found in scope bindings
      debug.resolution('resolveImport.step5.failed', { definitionName: exportBinding.definitionName });
      const reason = gap(
        `import "${imp.exportName}" from "${imp.specifier}"`,
        { kind: 'unresolved-import', path: exportBinding.definitionPath, reason: `"${exportBinding.definitionName}" not found in scope` },
        `Cannot find "${exportBinding.definitionName}" in "${exportBinding.definitionPath}"`
      );
      ctx.gaps.push(reason);
      return unknown(reason, imp.span);
    }

    // Step 6: Resolve the definition within its scope first (Layer 2)
    const scopeResolved = resolveInScope(definition, definitionScope);

    // Step 7: Then resolve cross-file (Layer 3) recursively
    const fullyResolved = resolveValueCrossFile(scopeResolved, ctx, exportBinding.definitionPath);

    // Return import with resolved field populated
    return importVal(imp.specifier, imp.exportName, resolvedPath, fullyResolved, imp.span);

  } finally {
    ctx.resolving.delete(cycleKey);
  }
}

/**
 * Try on-demand resolution for an import that couldn't be resolved via
 * pre-built infrastructure.
 *
 * This is the unified fallback path that enables incremental resolution
 * during class extraction. The callback handles module resolution and
 * scope building using whatever mechanism is appropriate (typically ts.Program).
 *
 * @param imp - The import to resolve
 * @param ctx - Resolution context (must have onDemandResolve)
 * @param fromFile - File containing the import
 * @returns ImportValue with resolved field, or null if callback returns null
 */
function tryOnDemandResolve(
  imp: ImportValue,
  ctx: ResolutionContext,
  fromFile: NormalizedPath
): AnalyzableValue | null {
  if (!ctx.onDemandResolve) {
    return null;
  }

  // Cycle detection - reuse the existing resolving set
  const cycleKey = `onDemand:${imp.specifier}#${imp.exportName}`;
  if (ctx.resolving.has(cycleKey)) {
    debug.resolution('tryOnDemandResolve.cycle', { specifier: imp.specifier, exportName: imp.exportName });
    return null;
  }
  ctx.resolving.add(cycleKey);

  try {
    debug.resolution('tryOnDemandResolve.calling', {
      specifier: imp.specifier,
      exportName: imp.exportName,
      fromFile,
    });

    const result = ctx.onDemandResolve(imp.specifier, imp.exportName, fromFile);

    debug.resolution('tryOnDemandResolve.result', {
      specifier: imp.specifier,
      exportName: imp.exportName,
      resolved: result !== null,
      resultKind: result?.kind,
    });

    if (result === null) {
      return null;
    }

    // Return ImportValue with the resolved field populated
    return importVal(imp.specifier, imp.exportName, imp.resolvedPath, result, imp.span);
  } finally {
    ctx.resolving.delete(cycleKey);
  }
}

/**
 * Resolve a namespace import property access.
 *
 * For `import * as ns from './foo'; ns.Bar`:
 * - `base` is the namespace import (exportName: '*')
 * - `property` is 'Bar'
 * - We resolve it as if it were `import { Bar } from './foo'`
 */
function resolveNamespacePropertyAccess(
  nsImport: ImportValue,
  property: string,
  ctx: ResolutionContext
): AnalyzableValue {
  // Create a synthetic named import for the property
  const syntheticImport: ImportValue = {
    kind: 'import',
    specifier: nsImport.specifier,
    exportName: property,
    resolvedPath: nsImport.resolvedPath,
    span: nsImport.span,
  };

  // Resolve it using the normal import resolution
  // Note: We pass the resolved path's directory as fromFile since we already have the path
  return resolveImport(syntheticImport, ctx, nsImport.resolvedPath!);
}

// =============================================================================
// Lookup Helpers
// =============================================================================

/**
 * Look up the resolved path for an import specifier.
 *
 * Uses the SourceFacts import information to find the resolved path.
 */
function lookupImportPath(
  specifier: string,
  exportName: string,
  fromFile: NormalizedPath,
  ctx: ResolutionContext
): NormalizedPath | null {
  debug.resolution('lookupImportPath.start', {
    specifier,
    exportName,
    fromFile,
    availableFiles: [...ctx.sourceFacts.keys()].slice(0, 5),
  });

  const fileFacts = ctx.sourceFacts.get(fromFile);
  if (!fileFacts) {
    debug.resolution('lookupImportPath.noFileFacts', { fromFile });
    return null;
  }

  debug.resolution('lookupImportPath.fileFacts', {
    fromFile,
    importCount: fileFacts.imports.length,
    imports: fileFacts.imports.map(i => ({
      moduleSpecifier: i.moduleSpecifier,
      kind: i.kind,
      resolvedPath: i.resolvedPath,
    })),
  });

  for (const imp of fileFacts.imports) {
    if (imp.moduleSpecifier !== specifier) continue;
    if (!imp.resolvedPath) {
      debug.resolution('lookupImportPath.noResolvedPath', {
        specifier,
        moduleSpecifier: imp.moduleSpecifier,
      });
      continue;
    }

    // Check if this import provides the export name we need
    if (imp.kind === 'namespace') {
      // Namespace imports provide access to all exports
      debug.resolution('lookupImportPath.found', { specifier, kind: 'namespace', resolvedPath: imp.resolvedPath });
      return imp.resolvedPath;
    }
    if (imp.kind === 'default' && exportName === 'default') {
      debug.resolution('lookupImportPath.found', { specifier, kind: 'default', resolvedPath: imp.resolvedPath });
      return imp.resolvedPath;
    }
    if (imp.kind === 'named') {
      // Check if the export name matches any imported name
      for (const name of imp.names) {
        if (name.name === exportName || name.alias === exportName) {
          debug.resolution('lookupImportPath.found', { specifier, kind: 'named', exportName, resolvedPath: imp.resolvedPath });
          return imp.resolvedPath;
        }
      }
    }
  }

  debug.resolution('lookupImportPath.notFound', { specifier, exportName });
  return null;
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Fully resolve a value through all layers (2 + 3).
 *
 * This is a convenience function that applies:
 * 1. Scope resolution (Layer 2) - resolves local references
 * 2. Cross-file resolution (Layer 3) - resolves imports
 *
 * @param value - The value to resolve (typically from Layer 1)
 * @param scope - The scope for local resolution
 * @param ctx - Resolution context for cross-file resolution
 * @returns Fully resolved value
 */
export function fullyResolve(
  value: AnalyzableValue,
  scope: LexicalScope,
  ctx: ResolutionContext
): AnalyzableValue {
  // Layer 2: Scope resolution
  const scopeResolved = resolveInScope(value, scope);

  // Layer 3: Cross-file resolution
  return resolveImportsCrossFile(scopeResolved, ctx, scope.filePath);
}
