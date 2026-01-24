/**
 * Factory Return Analysis (Layer 4 Pattern Matching)
 *
 * Resolves factory function patterns where configuration is created via function call:
 *
 * ```typescript
 * export const Config = createConfig();
 *
 * function createConfig() {
 *   return {
 *     register(container) { ... }
 *   };
 * }
 * ```
 *
 * The analysis:
 * 1. Detects CallValue exports that might be factories
 * 2. Resolves the callee to a function definition
 * 3. Analyzes the function body to find return statements
 * 4. Returns the resolved return value for IRegistry detection
 *
 * Limitations:
 * - Only analyzes simple return statements (not conditional returns)
 * - Doesn't track multiple return paths
 * - Doesn't analyze recursive factory calls
 */

import { debug } from '../../compiler.js';
import type { AnalysisGap } from '../../23-partial-eval/types.js';
import { gap } from '../../23-partial-eval/types.js';
import type {
  AnalyzableValue,
  CallValue,
  FunctionValue,
  MethodValue,
  StatementValue,
  LexicalScope,
  ResolutionContext,
} from '../../23-partial-eval/value/types.js';
import { getResolvedValue } from '../../23-partial-eval/value/types.js';
import { resolveInScope } from '../../23-partial-eval/value/scope.js';
import { fullyResolve } from '../../23-partial-eval/value/resolve.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of factory return analysis.
 */
export interface FactoryAnalysisResult {
  /** The resolved return value, or null if analysis failed */
  returnValue: AnalyzableValue | null;
  /** Gaps encountered during analysis */
  gaps: AnalysisGap[];
  /** Whether this was identified as a factory pattern */
  isFactory: boolean;
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Attempt to resolve the return value of a factory function call.
 *
 * Given a CallValue like `createConfig()`, this function:
 * 1. Resolves the callee to find the function definition
 * 2. Analyzes the function body for return statements
 * 3. Resolves and returns the return value
 *
 * @param call - The CallValue to analyze
 * @param scope - Local scope for the file containing the call
 * @param ctx - Cross-file resolution context
 * @returns Analysis result with return value, gaps, and factory detection
 */
export function analyzeFactoryCall(
  call: CallValue,
  scope: LexicalScope,
  ctx: ResolutionContext
): FactoryAnalysisResult {
  const gaps: AnalysisGap[] = [];

  debug.resolution('factory.analyzeCall', {
    calleeKind: call.callee.kind,
    argCount: call.args.length,
  });

  // Step 1: Resolve the callee to find the function definition
  const callee = getResolvedValue(call.callee);
  let functionDef: FunctionValue | null = null;

  if (callee.kind === 'function') {
    // Direct function expression: (function() { ... })()
    functionDef = callee;
  } else if (callee.kind === 'reference') {
    // Named function call: createConfig()
    // Try to resolve the reference to a function
    const resolved = resolveInScope(callee, scope);
    const resolvedValue = getResolvedValue(resolved);

    if (resolvedValue.kind === 'function') {
      functionDef = resolvedValue;
    } else if (resolvedValue.kind === 'reference' && resolvedValue.resolved?.kind === 'function') {
      functionDef = resolvedValue.resolved;
    }
  } else if (callee.kind === 'import') {
    // Imported function call: need cross-file resolution
    const resolved = fullyResolve(callee, scope, ctx);
    const resolvedValue = getResolvedValue(resolved);

    if (resolvedValue.kind === 'function') {
      functionDef = resolvedValue;
    }
  }

  if (!functionDef) {
    debug.resolution('factory.noFunction', {
      calleeKind: callee.kind,
      resolvedKind: callee.kind === 'reference' ? callee.resolved?.kind : undefined,
    });

    // Not a factory pattern we can analyze
    return {
      returnValue: null,
      gaps,
      isFactory: false,
    };
  }

  debug.resolution('factory.foundFunction', {
    name: functionDef.name,
    paramCount: functionDef.params.length,
    bodyLength: functionDef.body.length,
  });

  // Step 2: Analyze the function body for return statements
  const returnValue = findReturnValue(functionDef.body, scope, ctx, gaps);

  if (!returnValue) {
    gaps.push(gap(
      `factory function "${functionDef.name ?? '(anonymous)'}"`,
      { kind: 'function-return', functionName: functionDef.name ?? '(anonymous)' },
      'Could not determine the return value of this factory function'
    ));
  }

  return {
    returnValue,
    gaps,
    isFactory: true,
  };
}

// =============================================================================
// Return Value Analysis
// =============================================================================

/**
 * Find the return value from a function body.
 *
 * Scans the function body for return statements and returns the
 * first return value found. For simple factory patterns, there's
 * typically just one return statement at the end.
 *
 * @param body - Function body statements
 * @param scope - Local scope for resolution
 * @param ctx - Cross-file resolution context
 * @param gaps - Gap accumulator
 * @returns The resolved return value, or null if not found
 */
function findReturnValue(
  body: readonly StatementValue[],
  scope: LexicalScope,
  ctx: ResolutionContext,
  gaps: AnalysisGap[]
): AnalyzableValue | null {
  for (const stmt of body) {
    const returnValue = extractReturnFromStatement(stmt, scope, ctx, gaps);
    if (returnValue) {
      return returnValue;
    }
  }

  return null;
}

/**
 * Extract return value from a statement (recursive).
 *
 * Handles:
 * - Direct return statements
 * - Returns inside if/else blocks
 * - Returns in for-of loops (less common)
 *
 * Does NOT handle:
 * - Conditional returns based on runtime values (produces gap)
 * - Multiple return paths (takes first found)
 */
function extractReturnFromStatement(
  stmt: StatementValue,
  scope: LexicalScope,
  ctx: ResolutionContext,
  gaps: AnalysisGap[]
): AnalyzableValue | null {
  switch (stmt.kind) {
    case 'return':
      if (stmt.value) {
        // Resolve the return expression through all layers
        return fullyResolve(stmt.value, scope, ctx);
      }
      return null;

    case 'if':
      // Check both branches for returns
      // For factories, we typically have a single return at the end,
      // but handle if/else for robustness
      for (const thenStmt of stmt.thenBranch) {
        const returnValue = extractReturnFromStatement(thenStmt, scope, ctx, gaps);
        if (returnValue) {
          // Note: We take the first return found, which may not cover all paths
          // For conditional factories, this is a limitation
          gaps.push(gap(
            'conditional return',
            { kind: 'conditional-registration', condition: '(condition)' },
            'Factory has conditional return - some configurations may not be detected'
          ));
          return returnValue;
        }
      }
      if (stmt.elseBranch) {
        for (const elseStmt of stmt.elseBranch) {
          const returnValue = extractReturnFromStatement(elseStmt, scope, ctx, gaps);
          if (returnValue) {
            return returnValue;
          }
        }
      }
      return null;

    case 'forOf':
      // Unusual pattern but handle for completeness
      for (const bodyStmt of stmt.body) {
        const returnValue = extractReturnFromStatement(bodyStmt, scope, ctx, gaps);
        if (returnValue) {
          return returnValue;
        }
      }
      return null;

    case 'expression':
    case 'variable':
    case 'unknownStatement':
      // These don't contain return statements at this level
      return null;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a value is a CallValue that might be a factory.
 *
 * Simple heuristic: It's a call expression. The callee will be
 * analyzed to determine if it's actually a factory function.
 */
export function mightBeFactoryCall(value: AnalyzableValue): value is CallValue {
  return value.kind === 'call';
}

/**
 * Try to resolve a CallValue as a factory, returning the resolved value.
 *
 * This is a convenience wrapper that either:
 * - Returns the factory's return value if analysis succeeds
 * - Returns the original CallValue if analysis fails
 *
 * This allows callers to try factory resolution without changing
 * their logic significantly.
 */
export function tryResolveAsFactory(
  value: AnalyzableValue,
  scope: LexicalScope,
  ctx: ResolutionContext
): { value: AnalyzableValue; isFactory: boolean; gaps: AnalysisGap[] } {
  if (!mightBeFactoryCall(value)) {
    return { value, isFactory: false, gaps: [] };
  }

  const result = analyzeFactoryCall(value, scope, ctx);

  if (result.returnValue) {
    return {
      value: result.returnValue,
      isFactory: result.isFactory,
      gaps: result.gaps,
    };
  }

  // Factory analysis failed - return original value
  return {
    value,
    isFactory: result.isFactory,
    gaps: result.gaps,
  };
}

