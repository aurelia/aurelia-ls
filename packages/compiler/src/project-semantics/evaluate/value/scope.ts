/**
 * Scope Building and Resolution (Layer 2)
 *
 * Builds scope chains from source files and resolves local references.
 * This layer bridges AST transformation (Layer 1) and cross-file resolution (Layer 3).
 *
 * Key responsibilities:
 * - Build module-level scopes with ALL bindings (not just exports)
 * - Track import bindings for later cross-file resolution
 * - Create child scopes for function/method bodies
 * - Resolve local references using scope chain lookup
 *
 * Design principles:
 * - Scopes are immutable once built
 * - Resolution produces new values with `resolved` fields populated
 * - Imports are not resolved here - they become ImportValue for Layer 3
 */

import ts from 'typescript';
import type { NormalizedPath } from '../../compiler.js';
import type {
  AnalyzableValue,
  LexicalScope,
  ImportBinding,
  ParameterInfo,
  StatementValue,
  MethodValue,
  FunctionValue,
} from './types.js';
import {
  ref,
  array,
  object,
  propAccess,
  call,
  spread,
  classVal,
  method,
  returnStmt,
  exprStmt,
  varStmt,
  varDecl,
  ifStmt,
  forOfStmt,
} from './types.js';
import { transformExpression, transformParameters, transformBlock } from './transform.js';

// =============================================================================
// Scope Building
// =============================================================================

/**
 * Build a module-level scope from a TypeScript source file.
 *
 * Collects ALL bindings at module level:
 * - Variable declarations (const, let, var)
 * - Function declarations
 * - Class declarations
 * - Import bindings
 *
 * This captures non-exported bindings too, which is essential for
 * analyzing patterns like:
 * ```typescript
 * const components = [A, B, C];  // Not exported
 * export const Config = { register(c) { c.register(...components); } };
 * ```
 */
export function buildFileScope(
  sf: ts.SourceFile,
  filePath: NormalizedPath
): LexicalScope {
  const bindings = new Map<string, AnalyzableValue>();
  const imports = new Map<string, ImportBinding>();

  for (const stmt of sf.statements) {
    // Variable declarations
    if (ts.isVariableStatement(stmt)) {
      collectVariableBindings(stmt, sf, filePath, bindings);
    }
    // Function declarations
    else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      collectFunctionBinding(stmt, sf, bindings);
    }
    // Class declarations
    else if (ts.isClassDeclaration(stmt) && stmt.name) {
      collectClassBinding(stmt, filePath, bindings);
    }
    // Import declarations
    else if (ts.isImportDeclaration(stmt)) {
      collectImportBindings(stmt, sf, imports);
    }
    // Enum declarations (treat as unknown for now)
    else if (ts.isEnumDeclaration(stmt)) {
      // Enums create bindings but we don't fully model enum values
      // Just record the name so references don't fail
      bindings.set(stmt.name.text, ref(stmt.name.text));
    }
  }

  return {
    bindings,
    imports,
    parent: null,
    filePath,
  };
}

/**
 * Collect variable bindings from a variable statement.
 */
function collectVariableBindings(
  stmt: ts.VariableStatement,
  sf: ts.SourceFile,
  filePath: NormalizedPath,
  bindings: Map<string, AnalyzableValue>
): void {
  for (const decl of stmt.declarationList.declarations) {
    if (ts.isIdentifier(decl.name)) {
      const name = decl.name.text;
      if (decl.initializer) {
        bindings.set(name, transformExpression(decl.initializer, sf));
      } else {
        // Declaration without initializer - undefined
        bindings.set(name, { kind: 'literal', value: undefined });
      }
    }
    // Handle destructuring patterns
    else if (ts.isObjectBindingPattern(decl.name)) {
      collectObjectBindingPattern(decl.name, decl.initializer, sf, bindings);
    }
    else if (ts.isArrayBindingPattern(decl.name)) {
      collectArrayBindingPattern(decl.name, decl.initializer, sf, bindings);
    }
  }
}

/**
 * Collect bindings from object destructuring pattern.
 * e.g., `const { a, b: c } = obj`
 *
 * Limitations (intentional, documented):
 * - Nested destructuring not supported: `{ a: { b } }` only binds what's at top level
 * - Rest patterns not supported: `{ a, ...rest }` - 'rest' is not bound
 * - Computed property names not supported: `{ [expr]: x }` skipped
 *
 * These patterns are rare in typical Aurelia resource registration code.
 * If encountered, consider extending this function.
 */
function collectObjectBindingPattern(
  pattern: ts.ObjectBindingPattern,
  initializer: ts.Expression | undefined,
  sf: ts.SourceFile,
  bindings: Map<string, AnalyzableValue>
): void {
  const initValue = initializer ? transformExpression(initializer, sf) : undefined;

  for (const element of pattern.elements) {
    if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
      const boundName = element.name.text;
      // The property being accessed
      const propertyName = element.propertyName
        ? (ts.isIdentifier(element.propertyName) ? element.propertyName.text : boundName)
        : boundName;

      if (initValue) {
        // Create a property access: initValue.propertyName
        bindings.set(boundName, propAccess(initValue, propertyName));
      } else {
        bindings.set(boundName, ref(boundName));
      }
    }
    // Note: Nested patterns (element.name is ObjectBindingPattern/ArrayBindingPattern)
    // and rest patterns (element.dotDotDotToken) are silently skipped.
  }
}

/**
 * Collect bindings from array destructuring pattern.
 * e.g., `const [a, b] = arr`
 *
 * Limitations (intentional, documented):
 * - Nested destructuring not supported: `[a, [b, c]]` only binds 'a'
 * - Rest patterns not supported: `[first, ...rest]` - 'rest' is not bound
 * - Holes are handled correctly: `[, second]` binds 'second' at index 1
 *
 * These patterns are rare in typical Aurelia resource registration code.
 * If encountered, consider extending this function.
 */
function collectArrayBindingPattern(
  pattern: ts.ArrayBindingPattern,
  initializer: ts.Expression | undefined,
  sf: ts.SourceFile,
  bindings: Map<string, AnalyzableValue>
): void {
  const initValue = initializer ? transformExpression(initializer, sf) : undefined;

  pattern.elements.forEach((element, index) => {
    if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
      const boundName = element.name.text;
      if (initValue) {
        // Create a property access: initValue[index]
        bindings.set(boundName, propAccess(initValue, String(index)));
      } else {
        bindings.set(boundName, ref(boundName));
      }
    }
    // Note: Nested patterns and rest patterns (element.dotDotDotToken) are silently skipped.
  });
}

/**
 * Collect a function declaration binding.
 */
function collectFunctionBinding(
  decl: ts.FunctionDeclaration,
  sf: ts.SourceFile,
  bindings: Map<string, AnalyzableValue>
): void {
  if (!decl.name) return;

  const name = decl.name.text;
  const params = transformParameters(decl.parameters, sf);
  const body = decl.body ? transformBlock(decl.body, sf) : [];

  const funcValue: FunctionValue = {
    kind: 'function',
    name,
    params,
    body,
    span: { start: decl.getStart(sf), end: decl.getEnd() },
  };

  bindings.set(name, funcValue);
}

/**
 * Collect a class declaration binding.
 */
function collectClassBinding(
  decl: ts.ClassDeclaration,
  filePath: NormalizedPath,
  bindings: Map<string, AnalyzableValue>
): void {
  if (!decl.name) return;

  const name = decl.name.text;
  // Class declarations become ClassValue references
  bindings.set(name, classVal(name, filePath));
}

/**
 * Collect import bindings from an import declaration.
 */
function collectImportBindings(
  stmt: ts.ImportDeclaration,
  sf: ts.SourceFile,
  imports: Map<string, ImportBinding>
): void {
  // Get the module specifier
  if (!ts.isStringLiteral(stmt.moduleSpecifier)) return;
  const specifier = stmt.moduleSpecifier.text;

  // We don't have path resolution here - that happens in Layer 3
  // For now, store the specifier and let Layer 3 resolve it
  const resolvedPath: NormalizedPath | null = null;

  const clause = stmt.importClause;
  if (!clause) return; // Side-effect import: import './foo'

  // Default import: import Foo from './foo'
  if (clause.name) {
    imports.set(clause.name.text, {
      specifier,
      exportName: 'default',
      resolvedPath,
    });
  }

  // Named imports: import { Foo, Bar as Baz } from './foo'
  if (clause.namedBindings) {
    if (ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        const localName = element.name.text;
        const importedName = element.propertyName?.text ?? localName;
        imports.set(localName, {
          specifier,
          exportName: importedName,
          resolvedPath,
        });
      }
    }
    // Namespace import: import * as ns from './foo'
    else if (ts.isNamespaceImport(clause.namedBindings)) {
      // Namespace imports are special - the binding is a reference to the whole module
      // We record it with exportName '*' to signal this
      imports.set(clause.namedBindings.name.text, {
        specifier,
        exportName: '*',
        resolvedPath,
      });
    }
  }
}

/**
 * Create a child scope for entering a function or method body.
 *
 * The child scope inherits the parent's bindings through the scope chain,
 * and adds the function parameters as new bindings.
 */
export function enterFunctionScope(
  params: readonly ParameterInfo[],
  parent: LexicalScope
): LexicalScope {
  const bindings = new Map<string, AnalyzableValue>();

  // Add parameters as bindings
  // Parameters are unresolved references - they get their values at runtime
  for (const param of params) {
    // Skip destructuring placeholders
    if (param.name === '(destructuring)') continue;

    // Parameter with default value
    if (param.defaultValue) {
      bindings.set(param.name, param.defaultValue);
    } else {
      // Parameter without default - just a reference to itself
      // This allows us to track "container" in register(container) { ... }
      bindings.set(param.name, ref(param.name));
    }
  }

  return {
    bindings,
    imports: new Map(), // Functions don't have their own imports
    parent,
    filePath: parent.filePath,
  };
}

/**
 * Create a child scope with additional bindings.
 *
 * Useful for:
 * - for-of loop variables
 * - block-scoped let/const
 */
export function createChildScope(
  additionalBindings: ReadonlyMap<string, AnalyzableValue>,
  parent: LexicalScope
): LexicalScope {
  return {
    bindings: new Map(additionalBindings),
    imports: new Map(),
    parent,
    filePath: parent.filePath,
  };
}

// =============================================================================
// Block Binding Collection
// =============================================================================

/**
 * Collect variable bindings from a block of statements.
 *
 * This is a shallow collection - it walks the top-level statements and
 * extracts variable declarations. It does NOT recurse into nested blocks
 * (if/for/etc.) because those create their own scopes.
 *
 * This enables resolving function-local variables like:
 * ```typescript
 * function createConfig() {
 *   const components = [A, B, C];  // Captured
 *   return { register(c) { c.register(...components); } };
 * }
 * ```
 *
 * Limitations (intentional, documented):
 * - Variables in if/for/while/try blocks are NOT captured
 * - This is correct for JavaScript scoping: those vars wouldn't be accessible
 *   in sibling statements anyway
 * - If a plugin has patterns like `if (x) { const extras = [...]; ... }`,
 *   the 'extras' binding is correctly scoped to that block
 *
 * @param body - The statement block to scan
 * @returns Map of variable name to initializer value
 */
function collectBlockBindings(body: readonly StatementValue[]): Map<string, AnalyzableValue> {
  const bindings = new Map<string, AnalyzableValue>();

  for (const stmt of body) {
    if (stmt.kind === 'variable') {
      for (const decl of stmt.declarations) {
        if (decl.init) {
          bindings.set(decl.name, decl.init);
        } else {
          // Declaration without initializer - treat as undefined
          bindings.set(decl.name, { kind: 'literal', value: undefined });
        }
      }
    }
    // Note: We intentionally don't recurse into if/for blocks
    // Those variables are scoped to those blocks and wouldn't be
    // accessible in sibling statements anyway.
  }

  return bindings;
}

/**
 * Create a function scope with both parameters and block bindings.
 *
 * This is an enhanced version of enterFunctionScope that also includes
 * variable declarations collected from the function body.
 *
 * @param params - Function parameters
 * @param blockBindings - Variable declarations from the function body
 * @param parent - Parent scope
 */
function enterFunctionScopeWithBindings(
  params: readonly ParameterInfo[],
  blockBindings: Map<string, AnalyzableValue>,
  parent: LexicalScope
): LexicalScope {
  const bindings = new Map<string, AnalyzableValue>();

  // Add parameters first (they shadow any block bindings with same name)
  for (const param of params) {
    // Skip destructuring placeholders
    if (param.name === '(destructuring)') continue;

    // Parameter with default value
    if (param.defaultValue) {
      bindings.set(param.name, param.defaultValue);
    } else {
      // Parameter without default - just a reference to itself
      bindings.set(param.name, ref(param.name));
    }
  }

  // Add block bindings (variables declared in function body)
  // These don't override parameters (parameters shadow them)
  for (const [name, value] of blockBindings) {
    if (!bindings.has(name)) {
      bindings.set(name, value);
    }
  }

  return {
    bindings,
    imports: new Map(), // Functions don't have their own imports
    parent,
    filePath: parent.filePath,
  };
}

// =============================================================================
// Scope Lookup
// =============================================================================

/**
 * Look up a binding in the scope chain.
 *
 * Returns:
 * - The AnalyzableValue if found in bindings
 * - The ImportBinding if found in imports
 * - undefined if not found
 */
export function lookupBinding(
  name: string,
  scope: LexicalScope
): AnalyzableValue | ImportBinding | undefined {
  // Check bindings first (local variables, parameters)
  const binding = scope.bindings.get(name);
  if (binding !== undefined) {
    return binding;
  }

  // Check imports
  const importBinding = scope.imports.get(name);
  if (importBinding !== undefined) {
    return importBinding;
  }

  // Check parent scope
  if (scope.parent) {
    return lookupBinding(name, scope.parent);
  }

  // Not found
  return undefined;
}

/**
 * Check if a lookup result is an ImportBinding.
 */
export function isImportBinding(
  result: AnalyzableValue | ImportBinding | undefined
): result is ImportBinding {
  if (!result) return false;
  return 'specifier' in result && 'exportName' in result;
}

// =============================================================================
// Scope Resolution
// =============================================================================

/**
 * Resolve all references in an AnalyzableValue using the given scope.
 *
 * This is the main entry point for Layer 2 resolution. It:
 * - Resolves ReferenceValue nodes by looking up in scope chain
 * - Converts references to imports into ImportValue (for Layer 3)
 * - Recursively resolves nested structures (arrays, objects, calls, etc.)
 * - Preserves immutability by returning new values
 *
 * @param value - The value to resolve
 * @param scope - The scope to use for resolution
 * @returns A new value with references resolved where possible
 */
export function resolveInScope(
  value: AnalyzableValue,
  scope: LexicalScope
): AnalyzableValue {
  return resolveValue(value, scope, new Set());
}

/**
 * Internal resolution with cycle detection.
 */
function resolveValue(
  value: AnalyzableValue,
  scope: LexicalScope,
  resolving: Set<string>
): AnalyzableValue {
  switch (value.kind) {
    // ─────────────────────────────────────────────────────────────────────────
    // Leaf values - already resolved
    // ─────────────────────────────────────────────────────────────────────────
    case 'literal':
    case 'class':
    case 'unknown':
      return value;

    // ─────────────────────────────────────────────────────────────────────────
    // References - look up in scope
    // ─────────────────────────────────────────────────────────────────────────
    case 'reference':
      return resolveReference(value, scope, resolving);

    case 'import':
      // Imports are resolved in Layer 3 - leave as-is but resolve any nested values
      return value;

    // ─────────────────────────────────────────────────────────────────────────
    // Compound values - resolve recursively
    // ─────────────────────────────────────────────────────────────────────────
    case 'array':
      return resolveArray(value, scope, resolving);

    case 'object':
      return resolveObject(value, scope, resolving);

    case 'function':
      return resolveFunction(value, scope, resolving);

    case 'propertyAccess':
      return resolvePropertyAccess(value, scope, resolving);

    case 'call':
      return resolveCall(value, scope, resolving);

    case 'spread':
      return resolveSpread(value, scope, resolving);

    case 'new':
      return resolveNew(value, scope, resolving);
  }
}

/**
 * Resolve a reference by looking it up in the scope chain.
 */
function resolveReference(
  value: ReferenceValue,
  scope: LexicalScope,
  resolving: Set<string>
): AnalyzableValue {
  const { name } = value;

  // Cycle detection - if we're already resolving this name, return as-is
  if (resolving.has(name)) {
    return value;
  }

  const lookup = lookupBinding(name, scope);

  // Not found - leave as unresolved reference (might be global or resolved in Layer 3)
  if (lookup === undefined) {
    return value;
  }

  // Import binding - convert to ImportValue for Layer 3
  if (isImportBinding(lookup)) {
    return {
      kind: 'import',
      specifier: lookup.specifier,
      exportName: lookup.exportName,
      resolvedPath: lookup.resolvedPath ?? undefined,
      span: value.span,
    };
  }

  // Local binding found - resolve it recursively
  resolving.add(name);
  const resolved = resolveValue(lookup, scope, resolving);
  resolving.delete(name);

  // Return reference with resolved field populated
  return {
    ...value,
    resolved,
  };
}

/**
 * Resolve all elements in an array.
 */
function resolveArray(
  value: ArrayValue,
  scope: LexicalScope,
  resolving: Set<string>
): ArrayValue {
  const elements = value.elements.map(el => resolveValue(el, scope, resolving));

  // Only create new array if something changed
  if (elements.every((el, i) => el === value.elements[i])) {
    return value;
  }

  return {
    ...value,
    elements,
  };
}

/**
 * Resolve all properties and methods in an object.
 */
function resolveObject(
  value: ObjectValue,
  scope: LexicalScope,
  resolving: Set<string>
): ObjectValue {
  let changed = false;

  // Resolve properties
  const properties = new Map<string, AnalyzableValue>();
  for (const [key, propValue] of value.properties) {
    const resolved = resolveValue(propValue, scope, resolving);
    properties.set(key, resolved);
    if (resolved !== propValue) changed = true;
  }

  // Resolve methods (their bodies)
  const methods = new Map<string, MethodValue>();
  for (const [key, methodValue] of value.methods) {
    const resolved = resolveMethod(methodValue, scope, resolving);
    methods.set(key, resolved);
    if (resolved !== methodValue) changed = true;
  }

  if (!changed) {
    return value;
  }

  return {
    ...value,
    properties,
    methods,
  };
}

/**
 * Resolve a function value (its body).
 *
 * Enhanced: Also collects variable declarations from the function
 * body and adds them to the scope. This enables resolving spreads of
 * function-local arrays, e.g.:
 *
 * ```typescript
 * function createConfig() {
 *   const components = [A, B, C];  // Now captured in scope
 *   return { register(c) { c.register(...components); } };
 * }
 * ```
 */
function resolveFunction(
  value: FunctionValue,
  scope: LexicalScope,
  resolving: Set<string>
): FunctionValue {
  // Collect block-scoped variable bindings from function body
  const blockBindings = collectBlockBindings(value.body);

  // Create a child scope with parameters AND block bindings
  const funcScope = enterFunctionScopeWithBindings(value.params, blockBindings, scope);

  // Resolve the body in the function scope
  const body = value.body.map(stmt => resolveStatement(stmt, funcScope, resolving));

  // Only create new function if something changed
  if (body.every((stmt, i) => stmt === value.body[i])) {
    return value;
  }

  return {
    ...value,
    body,
  };
}

/**
 * Resolve a method value (its body).
 *
 * Enhanced: Same as resolveFunction - collects block bindings
 * from the method body for scope resolution.
 */
function resolveMethod(
  value: MethodValue,
  scope: LexicalScope,
  resolving: Set<string>
): MethodValue {
  // Collect block-scoped variable bindings from method body
  const blockBindings = collectBlockBindings(value.body);

  // Create a child scope with parameters AND block bindings
  const methodScope = enterFunctionScopeWithBindings(value.params, blockBindings, scope);

  // Resolve the body in the method scope
  const body = value.body.map(stmt => resolveStatement(stmt, methodScope, resolving));

  // Only create new method if something changed
  if (body.every((stmt, i) => stmt === value.body[i])) {
    return value;
  }

  return {
    ...value,
    body,
  };
}

/**
 * Resolve a property access expression.
 */
function resolvePropertyAccess(
  value: PropertyAccessValue,
  scope: LexicalScope,
  resolving: Set<string>
): AnalyzableValue {
  const base = resolveValue(value.base, scope, resolving);

  // If base didn't change, return original
  if (base === value.base) {
    return value;
  }

  // Get the actual resolved value (follow reference chain)
  const resolvedBase = getResolvedBase(base);

  // Try to resolve the property access if base is now resolved
  // For example: if base resolved to an object, we can get the property
  if (resolvedBase?.kind === 'object') {
    const propValue = resolvedBase.properties.get(value.property);
    if (propValue) {
      return resolveValue(propValue, scope, resolving);
    }
  }

  // If base resolved to an array and property is numeric, get the element
  if (resolvedBase?.kind === 'array') {
    const index = parseInt(value.property, 10);
    if (!isNaN(index) && index >= 0 && index < resolvedBase.elements.length) {
      return resolvedBase.elements[index]!;
    }
  }

  return {
    ...value,
    base,
  };
}

/**
 * Get the resolved value from a potentially wrapped reference.
 */
function getResolvedBase(value: AnalyzableValue): AnalyzableValue | undefined {
  if (value.kind === 'reference' && value.resolved) {
    return getResolvedBase(value.resolved);
  }
  if (value.kind === 'import' && value.resolved) {
    return getResolvedBase(value.resolved);
  }
  return value;
}

/**
 * Resolve a call expression.
 */
function resolveCall(
  value: CallValue,
  scope: LexicalScope,
  resolving: Set<string>
): CallValue {
  const callee = resolveValue(value.callee, scope, resolving);
  const args = value.args.map(arg => resolveValue(arg, scope, resolving));

  // Check if anything changed
  const calleeChanged = callee !== value.callee;
  const argsChanged = args.some((arg, i) => arg !== value.args[i]);

  if (!calleeChanged && !argsChanged) {
    return value;
  }

  return {
    ...value,
    callee,
    args,
  };
}

/**
 * Resolve a spread expression.
 */
function resolveSpread(
  value: SpreadValue,
  scope: LexicalScope,
  resolving: Set<string>
): SpreadValue {
  const target = resolveValue(value.target, scope, resolving);

  // If target resolved to an array, we can expand it
  let expanded: readonly AnalyzableValue[] | undefined = value.expanded;
  if (target.kind === 'array' && !value.expanded) {
    expanded = target.elements;
  }
  // If target is a reference that resolved to an array
  else if (target.kind === 'reference' && target.resolved?.kind === 'array') {
    expanded = target.resolved.elements;
  }

  if (target === value.target && expanded === value.expanded) {
    return value;
  }

  return {
    ...value,
    target,
    ...(expanded !== undefined && { expanded }),
  };
}

/**
 * Resolve a new expression.
 */
function resolveNew(
  value: NewValue,
  scope: LexicalScope,
  resolving: Set<string>
): NewValue {
  const callee = resolveValue(value.callee, scope, resolving);
  const args = value.args.map(arg => resolveValue(arg, scope, resolving));

  const calleeChanged = callee !== value.callee;
  const argsChanged = args.some((arg, i) => arg !== value.args[i]);

  if (!calleeChanged && !argsChanged) {
    return value;
  }

  return {
    ...value,
    callee,
    args,
  };
}

// =============================================================================
// Statement Resolution
// =============================================================================

/**
 * Resolve all references in a statement.
 */
function resolveStatement(
  stmt: StatementValue,
  scope: LexicalScope,
  resolving: Set<string>
): StatementValue {
  switch (stmt.kind) {
    case 'return':
      return resolveReturnStatement(stmt, scope, resolving);

    case 'expression':
      return resolveExpressionStatement(stmt, scope, resolving);

    case 'variable':
      return resolveVariableStatement(stmt, scope, resolving);

    case 'if':
      return resolveIfStatement(stmt, scope, resolving);

    case 'forOf':
      return resolveForOfStatement(stmt, scope, resolving);

    case 'unknownStatement':
      return stmt;
  }
}

/**
 * Resolve a return statement.
 */
function resolveReturnStatement(
  stmt: ReturnStatement,
  scope: LexicalScope,
  resolving: Set<string>
): ReturnStatement {
  if (stmt.value === null) {
    return stmt;
  }

  const value = resolveValue(stmt.value, scope, resolving);
  if (value === stmt.value) {
    return stmt;
  }

  return {
    ...stmt,
    value,
  };
}

/**
 * Resolve an expression statement.
 */
function resolveExpressionStatement(
  stmt: ExpressionStatement,
  scope: LexicalScope,
  resolving: Set<string>
): ExpressionStatement {
  const value = resolveValue(stmt.value, scope, resolving);
  if (value === stmt.value) {
    return stmt;
  }

  return {
    ...stmt,
    value,
  };
}

/**
 * Resolve a variable statement.
 *
 * Note: Variable statements inside method bodies create new bindings.
 * We resolve the initializers but don't add to scope (that happens at analysis time).
 */
function resolveVariableStatement(
  stmt: VariableStatement,
  scope: LexicalScope,
  resolving: Set<string>
): VariableStatement {
  let changed = false;
  const declarations = stmt.declarations.map(decl => {
    if (decl.init === null) {
      return decl;
    }
    const init = resolveValue(decl.init, scope, resolving);
    if (init === decl.init) {
      return decl;
    }
    changed = true;
    return { ...decl, init };
  });

  if (!changed) {
    return stmt;
  }

  return {
    ...stmt,
    declarations,
  };
}

/**
 * Resolve an if statement.
 */
function resolveIfStatement(
  stmt: IfStatement,
  scope: LexicalScope,
  resolving: Set<string>
): IfStatement {
  const condition = resolveValue(stmt.condition, scope, resolving);
  const thenBranch = stmt.thenBranch.map(s => resolveStatement(s, scope, resolving));
  const elseBranch = stmt.elseBranch?.map(s => resolveStatement(s, scope, resolving));

  const conditionChanged = condition !== stmt.condition;
  const thenChanged = thenBranch.some((s, i) => s !== stmt.thenBranch[i]);
  const elseChanged = elseBranch?.some((s, i) => s !== stmt.elseBranch?.[i]) ?? false;

  if (!conditionChanged && !thenChanged && !elseChanged) {
    return stmt;
  }

  return {
    ...stmt,
    condition,
    thenBranch,
    elseBranch,
  };
}

/**
 * Resolve a for-of statement.
 *
 * Creates a child scope with the loop variable bound.
 */
function resolveForOfStatement(
  stmt: ForOfStatement,
  scope: LexicalScope,
  resolving: Set<string>
): ForOfStatement {
  const iterable = resolveValue(stmt.iterable, scope, resolving);

  // Create child scope with loop variable
  // The loop variable is a reference to itself (will get value at runtime)
  const loopScope = createChildScope(
    new Map([[stmt.variable, ref(stmt.variable)]]),
    scope
  );

  const body = stmt.body.map(s => resolveStatement(s, loopScope, resolving));

  const iterableChanged = iterable !== stmt.iterable;
  const bodyChanged = body.some((s, i) => s !== stmt.body[i]);

  if (!iterableChanged && !bodyChanged) {
    return stmt;
  }

  return {
    ...stmt,
    iterable,
    body,
  };
}

// =============================================================================
// Type Imports for Internal Use
// =============================================================================

import type {
  ReferenceValue,
  ArrayValue,
  ObjectValue,
  PropertyAccessValue,
  CallValue,
  SpreadValue,
  NewValue,
  ReturnStatement,
  ExpressionStatement,
  VariableStatement,
  IfStatement,
  ForOfStatement,
} from './types.js';
