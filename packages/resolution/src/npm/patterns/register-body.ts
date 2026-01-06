/**
 * Register Body Analysis (Layer 4 Pattern Matching)
 *
 * Extracts resources from IRegistry `register(container)` method bodies.
 * Finds `container.register(...)` calls and resolves their arguments
 * to ExtractedResource definitions.
 *
 * This is the core of Phase 2 plugin configuration analysis.
 *
 * Patterns handled:
 * - Direct class references: `container.register(FooElement)`
 * - Resolved references: `container.register(MyComponent)` where MyComponent resolves to a class
 * - Array arguments: `container.register([A, B, C])`
 * - Spread arguments: `container.register(...DefaultComponents)`
 * - Conditional registration: `if (opts.x) container.register(A)` (gap + extract both branches)
 *
 * Patterns skipped:
 * - DI service registration: `Registration.singleton(...)`, `Registration.aliasTo(...)`
 * - Unknown/unresolvable: produces gaps
 */

import type { NormalizedPath, TextSpan } from '@aurelia-ls/compiler';
import { debug } from '@aurelia-ls/compiler';
import type { AnalysisResult, AnalysisGap } from '../../extraction/types.js';
import { gap, partial, highConfidence } from '../../extraction/types.js';
import type { ExtractedResource } from '../types.js';
import type {
  AnalyzableValue,
  MethodValue,
  StatementValue,
  CallValue,
  ClassValue,
  SpreadValue,
} from '../value/types.js';
import { getResolvedValue } from '../value/types.js';

// =============================================================================
// Context Types
// =============================================================================

/**
 * Context for register body analysis.
 *
 * The `resolveClass` callback allows the caller to provide resource extraction
 * logic, keeping this module focused on pattern matching.
 */
export interface RegisterBodyContext {
  /**
   * Resolve a ClassValue to an ExtractedResource.
   *
   * This callback should:
   * 1. Look up ClassFacts for the class
   * 2. Run inference (decorators, static $au, conventions)
   * 3. Return ExtractedResource or null if not a resource
   */
  readonly resolveClass: (classVal: ClassValue) => ExtractedResource | null;

  /**
   * Package path for diagnostic messages.
   */
  readonly packagePath: string;
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Extract resources from a register() method body.
 *
 * Walks the method body looking for `container.register(...)` calls
 * and extracts resources from their arguments.
 *
 * @param method - The register method from an IRegistry object
 * @param ctx - Context with class resolution callback
 * @returns Extracted resources with confidence and gaps
 */
export function extractRegisterBodyResources(
  method: MethodValue,
  ctx: RegisterBodyContext
): AnalysisResult<ExtractedResource[]> {
  const resources: ExtractedResource[] = [];
  const gaps: AnalysisGap[] = [];

  // Find the container parameter (first param, usually 'container' or 'c')
  const containerParam = method.params[0]?.name;
  if (!containerParam) {
    gaps.push(gap(
      'register method',
      { kind: 'parse-error', message: 'no container parameter' },
      'The register() method should have a container parameter'
    ));
    return partial([], 'manual', gaps);
  }

  // Walk the method body
  for (const stmt of method.body) {
    extractFromStatement(stmt, containerParam, resources, gaps, ctx);
  }

  // Determine confidence based on gaps
  if (gaps.length === 0) {
    return highConfidence(resources);
  }
  return partial(resources, resources.length > 0 ? 'partial' : 'manual', gaps);
}

// =============================================================================
// Statement Analysis
// =============================================================================

/**
 * Extract resources from a statement in the register body.
 *
 * Supported statements: expression, return, variable, if, forOf
 *
 * Unsupported (produce gaps via 'unknownStatement'):
 * - try/catch/finally: Rare in registration, and catch blocks may have different
 *   registration logic. Not worth the complexity to analyze.
 * - switch: Uncommon pattern for registration. Would need full case analysis.
 * - while/do-while: Loop count unknown at static analysis time.
 * - labeled statements, with statements: Exotic patterns not seen in plugins.
 *
 * All unsupported statements propagate their gap to the caller, so users know
 * analysis may be incomplete.
 */
function extractFromStatement(
  stmt: StatementValue,
  containerParam: string,
  resources: ExtractedResource[],
  gaps: AnalysisGap[],
  ctx: RegisterBodyContext
): void {
  switch (stmt.kind) {
    case 'expression':
      extractFromExpression(stmt.value, containerParam, resources, gaps, ctx);
      break;

    case 'return':
      // Return statements may contain register calls (e.g., `return container.register(...)`)
      if (stmt.value) {
        extractFromExpression(stmt.value, containerParam, resources, gaps, ctx);
      }
      break;

    case 'variable':
      // Variable declarations may have register calls in initializers
      for (const decl of stmt.declarations) {
        if (decl.init) {
          extractFromExpression(decl.init, containerParam, resources, gaps, ctx);
        }
      }
      break;

    case 'if':
      // Conditional registration - extract from both branches but record gap
      gaps.push(gap(
        'conditional registration',
        { kind: 'conditional-registration', condition: '(condition)' },
        'Resources may or may not be registered depending on runtime conditions. Consider extracting conditionally-registered resources.'
      ));
      // Still try to extract from both branches
      for (const thenStmt of stmt.thenBranch) {
        extractFromStatement(thenStmt, containerParam, resources, gaps, ctx);
      }
      if (stmt.elseBranch) {
        for (const elseStmt of stmt.elseBranch) {
          extractFromStatement(elseStmt, containerParam, resources, gaps, ctx);
        }
      }
      break;

    case 'forOf':
      // For-of loops - try to analyze if iterable is known
      gaps.push(gap(
        'loop registration',
        { kind: 'loop-variable', variable: stmt.variable },
        'Resources are registered in a loop. If the loop iterates over a known array, consider spreading it directly.'
      ));
      // If the iterable is a resolved array, we can still extract
      const iterable = getResolvedValue(stmt.iterable);
      if (iterable.kind === 'array') {
        for (const element of iterable.elements) {
          extractFromValue(element, resources, gaps, ctx);
        }
      }
      // Also walk the body in case there are nested register calls
      for (const bodyStmt of stmt.body) {
        extractFromStatement(bodyStmt, containerParam, resources, gaps, ctx);
      }
      break;

    case 'unknownStatement':
      // Already has a gap in the reason
      gaps.push(stmt.reason);
      break;
  }
}

/**
 * Extract resources from an expression.
 */
function extractFromExpression(
  expr: AnalyzableValue,
  containerParam: string,
  resources: ExtractedResource[],
  gaps: AnalysisGap[],
  ctx: RegisterBodyContext
): void {
  // Check if this is a container.register(...) call
  if (expr.kind === 'call' && isContainerRegisterCall(expr, containerParam)) {
    // Extract resources from the call arguments
    for (const arg of expr.args) {
      extractFromValue(arg, resources, gaps, ctx);
    }

    // For chained calls like container.register(A).register(B),
    // also extract from the base call (which is also a register call)
    if (expr.callee.kind === 'propertyAccess' && expr.callee.base.kind === 'call') {
      extractFromExpression(expr.callee.base, containerParam, resources, gaps, ctx);
    }
    return;
  }

  // Recursively check nested calls (e.g., chained method calls)
  if (expr.kind === 'call') {
    // Check the callee for nested register calls
    extractFromExpression(expr.callee, containerParam, resources, gaps, ctx);
    // Check args for nested register calls
    for (const arg of expr.args) {
      if (arg.kind === 'call') {
        extractFromExpression(arg, containerParam, resources, gaps, ctx);
      }
    }
  }

  // Check property access chains
  if (expr.kind === 'propertyAccess') {
    extractFromExpression(expr.base, containerParam, resources, gaps, ctx);
  }
}

// =============================================================================
// Value Extraction
// =============================================================================

/**
 * Extract resources from a value (argument to container.register).
 */
function extractFromValue(
  value: AnalyzableValue,
  resources: ExtractedResource[],
  gaps: AnalysisGap[],
  ctx: RegisterBodyContext
): void {
  // Get the resolved value (follow reference/import chains)
  const resolved = getResolvedValue(value);

  debug.resolution('extractFromValue', {
    valueKind: value.kind,
    resolvedKind: resolved.kind,
    hasResolvedField: value.kind === 'import' ? !!(value as any).resolved : undefined,
    importDetails: value.kind === 'import' ? { specifier: (value as any).specifier, exportName: (value as any).exportName } : undefined,
  });

  switch (resolved.kind) {
    case 'class':
      // Direct class reference - extract resource
      extractClassResource(resolved, resources, gaps, ctx);
      break;

    case 'array':
      // Array of resources - recurse on elements
      for (const element of resolved.elements) {
        extractFromValue(element, resources, gaps, ctx);
      }
      break;

    case 'spread':
      // Spread of array - try to expand
      extractFromSpread(resolved, resources, gaps, ctx);
      break;

    case 'call':
      // Check if this is a DI service registration pattern
      if (isRegistrationPattern(resolved)) {
        // Skip - this is DI infrastructure, not a template resource
        return;
      }
      // Unknown function call - can't determine return value
      gaps.push(gap(
        'function call result',
        { kind: 'function-return', functionName: getCalleeName(resolved) },
        'Cannot statically determine the return value of this function call'
      ));
      break;

    case 'reference':
      // Unresolved reference
      gaps.push(gap(
        `reference "${value.kind === 'reference' ? value.name : '?'}"`,
        { kind: 'dynamic-value', expression: value.kind === 'reference' ? value.name : 'unknown' },
        'Could not resolve this reference to a class'
      ));
      break;

    case 'import':
      // Unresolved import
      const imp = value.kind === 'import' ? value : resolved;
      if (imp.kind === 'import') {
        gaps.push(gap(
          `import "${imp.exportName}" from "${imp.specifier}"`,
          { kind: 'unresolved-import', path: imp.specifier, reason: 'not resolved' },
          'Could not resolve this import to a class definition'
        ));
      }
      break;

    case 'object':
      // Object literal - might be a configuration object, not a resource
      // Skip without gap (common pattern for DI config)
      break;

    case 'propertyAccess':
      // Property access that didn't resolve - might be namespace.Class
      gaps.push(gap(
        `property access "${resolved.property}"`,
        { kind: 'dynamic-value', expression: `?.${resolved.property}` },
        'Could not resolve this property access to a class'
      ));
      break;

    case 'unknown':
      // Already has a gap
      gaps.push(resolved.reason);
      break;

    case 'literal':
    case 'function':
    case 'new':
      // Not a resource - skip without gap
      break;
  }
}

/**
 * Extract resource from a ClassValue.
 */
function extractClassResource(
  classVal: ClassValue,
  resources: ExtractedResource[],
  gaps: AnalysisGap[],
  ctx: RegisterBodyContext
): void {
  const resource = ctx.resolveClass(classVal);
  if (resource) {
    // Check for duplicates
    if (!resources.some(r => r.className === resource.className)) {
      resources.push(resource);
    }
  } else {
    // Class doesn't resolve to a known resource
    gaps.push(gap(
      `class "${classVal.className}"`,
      { kind: 'invalid-resource-name', className: classVal.className, reason: 'not an Aurelia resource' },
      `Class "${classVal.className}" does not appear to be an Aurelia resource (no decorator, static $au, or recognized convention)`
    ));
  }
}

/**
 * Extract resources from a spread expression.
 */
function extractFromSpread(
  spread: SpreadValue,
  resources: ExtractedResource[],
  gaps: AnalysisGap[],
  ctx: RegisterBodyContext
): void {
  // Check if spread has been expanded
  if (spread.expanded) {
    for (const element of spread.expanded) {
      extractFromValue(element, resources, gaps, ctx);
    }
    return;
  }

  // Try to resolve the target
  const target = getResolvedValue(spread.target);
  if (target.kind === 'array') {
    for (const element of target.elements) {
      extractFromValue(element, resources, gaps, ctx);
    }
    return;
  }

  // Can't expand - record gap
  const targetName = spread.target.kind === 'reference' ? spread.target.name :
                     spread.target.kind === 'import' ? spread.target.exportName : 'unknown';
  gaps.push(gap(
    `spread of "${targetName}"`,
    { kind: 'spread-unknown', spreadOf: targetName },
    `Cannot determine the contents of the spread array "${targetName}". Consider exporting it as a constant.`
  ));
}

// =============================================================================
// Pattern Detection Helpers
// =============================================================================

/**
 * Check if a call expression is `container.register(...)`.
 *
 * Also handles chained calls like `container.register(A).register(B)` since
 * the register() method returns the container for fluent chaining.
 */
function isContainerRegisterCall(call: CallValue, containerParam: string): boolean {
  // Must be a property access call
  if (call.callee.kind !== 'propertyAccess') return false;

  const propAccess = call.callee;

  // Property must be 'register'
  if (propAccess.property !== 'register') return false;

  // Base must be the container parameter
  const base = propAccess.base;
  if (base.kind === 'reference' && base.name === containerParam) {
    return true;
  }

  // Also handle resolved references
  if (base.kind === 'reference' && base.resolved?.kind === 'reference') {
    return base.resolved.name === containerParam;
  }

  // Handle chained register calls: container.register(A).register(B)
  // The base is a call to register(), which returns the container
  if (base.kind === 'call') {
    return isContainerRegisterCall(base, containerParam);
  }

  return false;
}

/**
 * Check if a call is a DI Registration pattern (not a template resource).
 *
 * Patterns detected:
 * - Registration.singleton(...)
 * - Registration.transient(...)
 * - Registration.instance(...)
 * - Registration.callback(...)
 * - Registration.aliasTo(...)
 * - DI.createInterface(...)
 */
function isRegistrationPattern(call: CallValue): boolean {
  if (call.callee.kind !== 'propertyAccess') return false;

  const propAccess = call.callee;
  const base = getResolvedValue(propAccess.base);

  // Check for Registration.* patterns
  if (base.kind === 'reference' || base.kind === 'import') {
    const name = base.kind === 'reference' ? base.name :
                 base.kind === 'import' ? base.exportName : '';

    if (name === 'Registration') {
      const diMethods = ['singleton', 'transient', 'instance', 'callback', 'aliasTo', 'defer'];
      return diMethods.includes(propAccess.property);
    }

    // DI.createInterface, DI.inject, etc.
    if (name === 'DI') {
      return true;
    }
  }

  return false;
}

/**
 * Get the name of a callee for diagnostic messages.
 */
function getCalleeName(call: CallValue): string {
  const callee = call.callee;

  if (callee.kind === 'reference') {
    return callee.name;
  }

  if (callee.kind === 'import') {
    return callee.exportName;
  }

  if (callee.kind === 'propertyAccess') {
    const baseName = callee.base.kind === 'reference' ? callee.base.name :
                     callee.base.kind === 'import' ? callee.base.exportName : '?';
    return `${baseName}.${callee.property}`;
  }

  return 'unknown';
}

// =============================================================================
// Exports for Testing
// =============================================================================

export {
  isContainerRegisterCall,
  isRegistrationPattern,
  extractFromValue,
};
