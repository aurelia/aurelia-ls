/**
 * Value Model Types for Partial Evaluation
 *
 * Core IR for static value analysis in npm package extraction (Phase 2/3).
 * Represents "what we know about a value at compile time."
 *
 * Design principles:
 * - Immutable values (cacheable, parallelizable)
 * - Optional `resolved` fields for lazy resolution with caching
 * - Source spans on all values for diagnostic provenance
 * - Separate MethodValue for interprocedural analysis
 *
 * See: partial-evaluation-design.md
 */

import type { NormalizedPath, TextSpan } from '@aurelia-ls/compiler';
import type { AnalysisGap } from '../../extraction/types.js';

// =============================================================================
// Core Value Types
// =============================================================================

/**
 * Represents a value that can be analyzed at compile time.
 * Forms a tree structure that mirrors the expression's semantic structure.
 */
export type AnalyzableValue =
  // ─────────────────────────────────────────────────────────────────────────
  // Fully known values (leaves)
  // ─────────────────────────────────────────────────────────────────────────
  | LiteralValue
  | ArrayValue
  | ObjectValue
  | FunctionValue
  | ClassValue

  // ─────────────────────────────────────────────────────────────────────────
  // References (may be resolvable)
  // ─────────────────────────────────────────────────────────────────────────
  | ReferenceValue
  | ImportValue
  | PropertyAccessValue

  // ─────────────────────────────────────────────────────────────────────────
  // Compound expressions
  // ─────────────────────────────────────────────────────────────────────────
  | CallValue
  | SpreadValue
  | NewValue

  // ─────────────────────────────────────────────────────────────────────────
  // Analysis boundaries
  // ─────────────────────────────────────────────────────────────────────────
  | UnknownValue;

// =============================================================================
// Leaf Values (Fully Known)
// =============================================================================

/**
 * Primitive literal: string, number, boolean, null, undefined.
 */
export interface LiteralValue {
  readonly kind: 'literal';
  readonly value: string | number | boolean | null | undefined;
  readonly span?: TextSpan;
}

/**
 * Array literal with analyzable elements.
 */
export interface ArrayValue {
  readonly kind: 'array';
  readonly elements: readonly AnalyzableValue[];
  readonly span?: TextSpan;
}

/**
 * Object literal with analyzable properties and methods.
 *
 * Note: Properties are keyed by their computed string name.
 * Computed property names that can't be resolved are recorded as gaps
 * on the containing analysis context.
 */
export interface ObjectValue {
  readonly kind: 'object';
  readonly properties: ReadonlyMap<string, AnalyzableValue>;
  readonly methods: ReadonlyMap<string, MethodValue>;
  readonly span?: TextSpan;
}

/**
 * Function definition (for interprocedural analysis).
 *
 * Represents arrow functions and function expressions.
 * Class methods are represented as MethodValue.
 */
export interface FunctionValue {
  readonly kind: 'function';
  readonly name: string | null;
  readonly params: readonly ParameterInfo[];
  readonly body: readonly StatementValue[];
  readonly span?: TextSpan;
}

/**
 * Class reference (for resource extraction).
 *
 * When we see a class identifier in a `container.register()` call,
 * we need to track which class it refers to for resource extraction.
 */
export interface ClassValue {
  readonly kind: 'class';
  readonly className: string;
  readonly filePath: NormalizedPath;
  readonly span?: TextSpan;
}

// =============================================================================
// Reference Values (May Be Resolvable)
// =============================================================================

/**
 * Reference to a local identifier.
 *
 * The `resolved` field is populated by scope resolution (Layer 2).
 */
export interface ReferenceValue {
  readonly kind: 'reference';
  readonly name: string;
  /** Set after scope resolution */
  readonly resolved?: AnalyzableValue;
  readonly span?: TextSpan;
}

/**
 * Reference to an imported value.
 *
 * The `resolved` field is populated by cross-file resolution (Layer 3).
 */
export interface ImportValue {
  readonly kind: 'import';
  /** Module specifier (e.g., './config', '@aurelia/router') */
  readonly specifier: string;
  /** What's being imported ('default' for default imports) */
  readonly exportName: string;
  /** Resolved file path (populated during import resolution) */
  readonly resolvedPath?: NormalizedPath;
  /** Set after cross-file resolution */
  readonly resolved?: AnalyzableValue;
  readonly span?: TextSpan;
}

/**
 * Property access: base.property
 *
 * The result of resolving depends on resolving the base first.
 */
export interface PropertyAccessValue {
  readonly kind: 'propertyAccess';
  readonly base: AnalyzableValue;
  readonly property: string;
  readonly span?: TextSpan;
}

// =============================================================================
// Compound Values
// =============================================================================

/**
 * Function/method call.
 *
 * For factory patterns, we may attempt to resolve the return value
 * by analyzing the callee function's body.
 */
export interface CallValue {
  readonly kind: 'call';
  readonly callee: AnalyzableValue;
  readonly args: readonly AnalyzableValue[];
  /** Set after interprocedural analysis (if attempted) */
  readonly returnValue?: AnalyzableValue;
  readonly span?: TextSpan;
}

/**
 * Spread expression: ...x
 *
 * When used in register() calls, we need to expand the array
 * to enumerate all registered resources.
 */
export interface SpreadValue {
  readonly kind: 'spread';
  readonly target: AnalyzableValue;
  /** Set after resolution if target is an array */
  readonly expanded?: readonly AnalyzableValue[];
  readonly span?: TextSpan;
}

/**
 * New expression: new X(args)
 *
 * Primarily for recognizing `new Aurelia().register(...)` pattern.
 */
export interface NewValue {
  readonly kind: 'new';
  readonly callee: AnalyzableValue;
  readonly args: readonly AnalyzableValue[];
  readonly span?: TextSpan;
}

// =============================================================================
// Analysis Boundary
// =============================================================================

/**
 * Analysis boundary - we cannot determine the value.
 *
 * Instead of throwing or failing, we record why analysis stopped.
 * This enables graceful degradation with actionable diagnostics.
 */
export interface UnknownValue {
  readonly kind: 'unknown';
  readonly reason: AnalysisGap;
  readonly span?: TextSpan;
}

// =============================================================================
// Method and Statement Values (for Interprocedural Analysis)
// =============================================================================

/**
 * Method or function definition.
 *
 * Used for:
 * - Object methods in IRegistry patterns: `{ register(c) { ... } }`
 * - Factory function bodies: `function createConfig() { return { ... } }`
 */
export interface MethodValue {
  readonly kind: 'method';
  readonly name: string;
  readonly params: readonly ParameterInfo[];
  readonly body: readonly StatementValue[];
  readonly span?: TextSpan;
}

/**
 * Parameter information for methods/functions.
 */
export interface ParameterInfo {
  readonly name: string;
  /** Default value if present */
  readonly defaultValue?: AnalyzableValue;
  /** Rest parameter: ...args */
  readonly isRest?: boolean;
  readonly span?: TextSpan;
}

/**
 * Simplified statement representation for method body analysis.
 *
 * We don't model the full language - only patterns relevant to
 * resource registration analysis.
 */
export type StatementValue =
  | ReturnStatement
  | ExpressionStatement
  | VariableStatement
  | IfStatement
  | ForOfStatement
  | UnknownStatement;

/**
 * Return statement: return expr
 *
 * Critical for factory pattern analysis - we need to know what
 * the factory function returns.
 */
export interface ReturnStatement {
  readonly kind: 'return';
  readonly value: AnalyzableValue | null;
  readonly span?: TextSpan;
}

/**
 * Expression statement: expr;
 *
 * Most register() calls appear as expression statements.
 */
export interface ExpressionStatement {
  readonly kind: 'expression';
  readonly value: AnalyzableValue;
  readonly span?: TextSpan;
}

/**
 * Variable declaration: const/let/var x = value
 *
 * Needed to track local bindings within method bodies.
 */
export interface VariableStatement {
  readonly kind: 'variable';
  readonly declarations: readonly VariableDeclaration[];
  readonly span?: TextSpan;
}

/**
 * Single variable declaration.
 */
export interface VariableDeclaration {
  readonly name: string;
  readonly init: AnalyzableValue | null;
  readonly span?: TextSpan;
}

/**
 * If statement: if (cond) { then } else { else }
 *
 * Conditional registration patterns produce gaps but we still
 * try to extract resources from both branches.
 */
export interface IfStatement {
  readonly kind: 'if';
  readonly condition: AnalyzableValue;
  readonly thenBranch: readonly StatementValue[];
  readonly elseBranch?: readonly StatementValue[];
  readonly span?: TextSpan;
}

/**
 * For-of statement: for (const x of arr) { body }
 *
 * Some packages iterate over arrays to register resources.
 * We detect this as a gap but try to analyze if the array is known.
 */
export interface ForOfStatement {
  readonly kind: 'forOf';
  readonly variable: string;
  readonly iterable: AnalyzableValue;
  readonly body: readonly StatementValue[];
  readonly span?: TextSpan;
}

/**
 * Statement we don't model - marks an analysis boundary in method body.
 */
export interface UnknownStatement {
  readonly kind: 'unknownStatement';
  readonly reason: AnalysisGap;
  readonly span?: TextSpan;
}

// =============================================================================
// Scope Types
// =============================================================================

/**
 * Lexical scope for value resolution.
 *
 * Scopes form a chain from innermost (function body) to outermost (module).
 */
export interface Scope {
  /** Variable bindings in this scope */
  readonly bindings: ReadonlyMap<string, AnalyzableValue>;

  /** Import bindings (module-level only) */
  readonly imports: ReadonlyMap<string, ImportBinding>;

  /** Parent scope (null for module scope) */
  readonly parent: Scope | null;

  /** File this scope belongs to */
  readonly filePath: NormalizedPath;
}

/**
 * Import binding information.
 *
 * Records how an imported name maps to its source.
 */
export interface ImportBinding {
  /** Module specifier */
  readonly specifier: string;
  /** Export name from the source module */
  readonly exportName: string;
  /** Resolved path to the source file */
  readonly resolvedPath: NormalizedPath | null;
}

// =============================================================================
// Resolution Context
// =============================================================================

/**
 * Context for cross-file value resolution.
 *
 * Carries the state needed to resolve imports across file boundaries
 * while detecting cycles.
 */
export interface ResolutionContext {
  /** Map of file paths to their module scopes */
  readonly fileScopes: ReadonlyMap<NormalizedPath, Scope>;

  /** Export binding map from export-resolver.ts */
  readonly exportBindings: ExportBindingMap;

  /** Source facts for all files (for import specifier resolution) */
  readonly sourceFacts: ReadonlyMap<NormalizedPath, SourceFactsLike>;

  /** Currently resolving (for cycle detection) */
  readonly resolving: Set<string>;

  /** Gap accumulator */
  readonly gaps: AnalysisGap[];

  /** Package root path (for relative path resolution) */
  readonly packagePath: string;
}

/**
 * Minimal interface for SourceFacts used by cross-file resolution.
 * Only needs import information for specifier → path mapping.
 */
export interface SourceFactsLike {
  readonly path: NormalizedPath;
  readonly imports: readonly ImportFactLike[];
}

/**
 * Minimal interface for ImportFact used by cross-file resolution.
 */
export type ImportFactLike =
  | { readonly kind: "namespace"; readonly alias: string; readonly moduleSpecifier: string; readonly resolvedPath: NormalizedPath | null }
  | { readonly kind: "named"; readonly names: readonly { readonly name: string; readonly alias: string | null }[]; readonly moduleSpecifier: string; readonly resolvedPath: NormalizedPath | null }
  | { readonly kind: "default"; readonly alias: string; readonly moduleSpecifier: string; readonly resolvedPath: NormalizedPath | null };

/**
 * Export binding map type (imported from binding/types.ts).
 * Map: filePath → (exportName → ResolvedExport)
 */
export type ExportBindingMap = ReadonlyMap<NormalizedPath, ReadonlyMap<string, ResolvedExportLike>>;

/**
 * Minimal interface for ResolvedExport.
 */
export interface ResolvedExportLike {
  readonly definitionPath: NormalizedPath;
  readonly definitionName: string;
}

// =============================================================================
// Type Guards
// =============================================================================

/** Check if a value is fully resolved (no unresolved references) */
export function isResolved(value: AnalyzableValue): boolean {
  switch (value.kind) {
    case 'literal':
    case 'class':
      return true;

    case 'array':
      return value.elements.every(isResolved);

    case 'object':
      return [...value.properties.values()].every(isResolved) &&
             [...value.methods.values()].every(m => m.body.every(isStatementResolved));

    case 'function':
      return value.body.every(isStatementResolved);

    case 'reference':
      return value.resolved !== undefined && isResolved(value.resolved);

    case 'import':
      return value.resolved !== undefined && isResolved(value.resolved);

    case 'propertyAccess':
      return isResolved(value.base);

    case 'call':
      return isResolved(value.callee) && value.args.every(isResolved);

    case 'spread':
      return value.expanded !== undefined && value.expanded.every(isResolved);

    case 'new':
      return isResolved(value.callee) && value.args.every(isResolved);

    case 'unknown':
      return false;
  }
}

/** Check if a statement's values are resolved */
function isStatementResolved(stmt: StatementValue): boolean {
  switch (stmt.kind) {
    case 'return':
      return stmt.value === null || isResolved(stmt.value);
    case 'expression':
      return isResolved(stmt.value);
    case 'variable':
      return stmt.declarations.every(d => d.init === null || isResolved(d.init));
    case 'if':
      return isResolved(stmt.condition) &&
             stmt.thenBranch.every(isStatementResolved) &&
             (stmt.elseBranch?.every(isStatementResolved) ?? true);
    case 'forOf':
      return isResolved(stmt.iterable) && stmt.body.every(isStatementResolved);
    case 'unknownStatement':
      return false;
  }
}

/** Check if a value is an object with a specific method */
export function hasMethod(value: AnalyzableValue, methodName: string): value is ObjectValue {
  return value.kind === 'object' && value.methods.has(methodName);
}

/** Check if a value is an IRegistry-shaped object (has register method) */
export function isRegistryShape(value: AnalyzableValue): value is ObjectValue {
  return hasMethod(value, 'register');
}

/** Check if a value is a class reference */
export function isClassValue(value: AnalyzableValue): value is ClassValue {
  return value.kind === 'class';
}

/** Check if a value is a resolved reference to a class */
export function isResolvedClassRef(value: AnalyzableValue): value is ReferenceValue & { resolved: ClassValue } {
  return value.kind === 'reference' &&
         value.resolved !== undefined &&
         value.resolved.kind === 'class';
}

/** Get the resolved value, following reference chains */
export function getResolvedValue(value: AnalyzableValue): AnalyzableValue {
  if (value.kind === 'reference' && value.resolved) {
    return getResolvedValue(value.resolved);
  }
  if (value.kind === 'import' && value.resolved) {
    return getResolvedValue(value.resolved);
  }
  return value;
}

// =============================================================================
// Value Constructors (Helpers)
// =============================================================================

/** Create a literal value */
export function literal(value: string | number | boolean | null | undefined, span?: TextSpan): LiteralValue {
  return { kind: 'literal', value, span };
}

/** Create an array value */
export function array(elements: readonly AnalyzableValue[], span?: TextSpan): ArrayValue {
  return { kind: 'array', elements, span };
}

/** Create an object value */
export function object(
  properties: ReadonlyMap<string, AnalyzableValue>,
  methods: ReadonlyMap<string, MethodValue> = new Map(),
  span?: TextSpan
): ObjectValue {
  return { kind: 'object', properties, methods, span };
}

/** Create a reference value */
export function ref(name: string, resolved?: AnalyzableValue, span?: TextSpan): ReferenceValue {
  return resolved ? { kind: 'reference', name, resolved, span } : { kind: 'reference', name, span };
}

/** Create an import value */
export function importVal(
  specifier: string,
  exportName: string,
  resolvedPath?: NormalizedPath,
  resolved?: AnalyzableValue,
  span?: TextSpan
): ImportValue {
  const result: ImportValue = { kind: 'import', specifier, exportName, span };
  if (resolvedPath) (result as { resolvedPath: NormalizedPath }).resolvedPath = resolvedPath;
  if (resolved) (result as { resolved: AnalyzableValue }).resolved = resolved;
  return result;
}

/** Create a property access value */
export function propAccess(base: AnalyzableValue, property: string, span?: TextSpan): PropertyAccessValue {
  return { kind: 'propertyAccess', base, property, span };
}

/** Create a call value */
export function call(
  callee: AnalyzableValue,
  args: readonly AnalyzableValue[],
  returnValue?: AnalyzableValue,
  span?: TextSpan
): CallValue {
  const result: CallValue = { kind: 'call', callee, args, span };
  if (returnValue) (result as { returnValue: AnalyzableValue }).returnValue = returnValue;
  return result;
}

/** Create a spread value */
export function spread(target: AnalyzableValue, expanded?: readonly AnalyzableValue[], span?: TextSpan): SpreadValue {
  const result: SpreadValue = { kind: 'spread', target, span };
  if (expanded) (result as { expanded: readonly AnalyzableValue[] }).expanded = expanded;
  return result;
}

/** Create a class value */
export function classVal(className: string, filePath: NormalizedPath, span?: TextSpan): ClassValue {
  return { kind: 'class', className, filePath, span };
}

/** Create an unknown value */
export function unknown(reason: AnalysisGap, span?: TextSpan): UnknownValue {
  return { kind: 'unknown', reason, span };
}

/** Create a method value */
export function method(
  name: string,
  params: readonly ParameterInfo[],
  body: readonly StatementValue[],
  span?: TextSpan
): MethodValue {
  return { kind: 'method', name, params, body, span };
}

// =============================================================================
// Statement Constructors
// =============================================================================

/** Create a return statement */
export function returnStmt(value: AnalyzableValue | null, span?: TextSpan): ReturnStatement {
  return { kind: 'return', value, span };
}

/** Create an expression statement */
export function exprStmt(value: AnalyzableValue, span?: TextSpan): ExpressionStatement {
  return { kind: 'expression', value, span };
}

/** Create a variable statement */
export function varStmt(declarations: readonly VariableDeclaration[], span?: TextSpan): VariableStatement {
  return { kind: 'variable', declarations, span };
}

/** Create a variable declaration */
export function varDecl(name: string, init: AnalyzableValue | null, span?: TextSpan): VariableDeclaration {
  return { name, init, span };
}

/** Create an if statement */
export function ifStmt(
  condition: AnalyzableValue,
  thenBranch: readonly StatementValue[],
  elseBranch?: readonly StatementValue[],
  span?: TextSpan
): IfStatement {
  return { kind: 'if', condition, thenBranch, elseBranch, span };
}

/** Create a for-of statement */
export function forOfStmt(
  variable: string,
  iterable: AnalyzableValue,
  body: readonly StatementValue[],
  span?: TextSpan
): ForOfStatement {
  return { kind: 'forOf', variable, iterable, body, span };
}

/** Create an unknown statement */
export function unknownStmt(reason: AnalysisGap, span?: TextSpan): UnknownStatement {
  return { kind: 'unknownStatement', reason, span };
}
