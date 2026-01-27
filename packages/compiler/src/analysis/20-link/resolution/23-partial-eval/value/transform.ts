/**
 * AST Transformation (Layer 1)
 *
 * Pure transformation from TypeScript AST to AnalyzableValue tree.
 * No cross-file knowledge - just structural mapping.
 *
 * Design principles:
 * - Pure functions (no side effects)
 * - Every AST node maps to exactly one AnalyzableValue
 * - Unknown patterns produce UnknownValue with descriptive gaps
 * - Source spans preserved for diagnostics
 */

import ts from 'typescript';
import type { TextSpan } from '../../compiler.js';
import { canonicalPath } from '../../util/naming.js';
import { gap } from '../types.js';
import type {
  AnalyzableValue,
  MethodValue,
  ParameterInfo,
  StatementValue,
  VariableDeclaration,
} from './types.js';
import {
  literal,
  array,
  object,
  ref,
  propAccess,
  call,
  spread,
  unknown,
  method,
  returnStmt,
  exprStmt,
  varStmt,
  varDecl,
  ifStmt,
  forOfStmt,
  unknownStmt,
} from './types.js';

function gapWithFile(
  sf: ts.SourceFile,
  what: Parameters<typeof gap>[0],
  why: Parameters<typeof gap>[1],
  suggestion: Parameters<typeof gap>[2],
): ReturnType<typeof gap> {
  return gap(what, why, suggestion, { file: canonicalPath(sf.fileName) });
}

// =============================================================================
// Expression Transformation
// =============================================================================

/**
 * Transform a TypeScript expression to an AnalyzableValue.
 *
 * This is the main entry point for Layer 1 transformation.
 * Handles all expression types relevant to Aurelia resource analysis.
 */
export function transformExpression(expr: ts.Expression, sf: ts.SourceFile): AnalyzableValue {
  const span = nodeSpan(expr, sf);

  // Literals
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) {
    return literal(expr.text, span);
  }
  if (ts.isNumericLiteral(expr)) {
    return literal(Number(expr.text), span);
  }
  if (expr.kind === ts.SyntaxKind.TrueKeyword) {
    return literal(true, span);
  }
  if (expr.kind === ts.SyntaxKind.FalseKeyword) {
    return literal(false, span);
  }
  if (expr.kind === ts.SyntaxKind.NullKeyword) {
    return literal(null, span);
  }
  if (expr.kind === ts.SyntaxKind.UndefinedKeyword || ts.isIdentifier(expr) && expr.text === 'undefined') {
    return literal(undefined, span);
  }

  // Identifiers (references)
  if (ts.isIdentifier(expr)) {
    return ref(expr.text, undefined, span);
  }

  // Array literals
  if (ts.isArrayLiteralExpression(expr)) {
    return transformArrayLiteral(expr, sf, span);
  }

  // Object literals
  if (ts.isObjectLiteralExpression(expr)) {
    return transformObjectLiteral(expr, sf, span);
  }

  // Property access: base.property
  if (ts.isPropertyAccessExpression(expr)) {
    const base = transformExpression(expr.expression, sf);
    return propAccess(base, expr.name.text, span);
  }

  // Element access: base[index] - limited support
  if (ts.isElementAccessExpression(expr)) {
    return transformElementAccess(expr, sf, span);
  }

  // Call expression: callee(args)
  if (ts.isCallExpression(expr)) {
    return transformCallExpression(expr, sf, span);
  }

  // New expression: new Callee(args)
  if (ts.isNewExpression(expr)) {
    return transformNewExpression(expr, sf, span);
  }

  // Spread element: ...x
  if (ts.isSpreadElement(expr)) {
    const target = transformExpression(expr.expression, sf);
    return spread(target, undefined, span);
  }

  // Arrow function: (params) => body
  if (ts.isArrowFunction(expr)) {
    return transformArrowFunction(expr, sf, span);
  }

  // Function expression: function(params) { body }
  if (ts.isFunctionExpression(expr)) {
    return transformFunctionExpression(expr, sf, span);
  }

  // Parenthesized expression: (expr)
  if (ts.isParenthesizedExpression(expr)) {
    return transformExpression(expr.expression, sf);
  }

  // As expression: expr as Type (strip type assertion)
  if (ts.isAsExpression(expr)) {
    return transformExpression(expr.expression, sf);
  }

  // Type assertion: <Type>expr (strip type assertion)
  if (ts.isTypeAssertionExpression(expr)) {
    return transformExpression(expr.expression, sf);
  }

  // Non-null assertion: expr! (strip assertion)
  if (ts.isNonNullExpression(expr)) {
    return transformExpression(expr.expression, sf);
  }

  // Satisfies expression: expr satisfies Type (strip)
  if (ts.isSatisfiesExpression(expr)) {
    return transformExpression(expr.expression, sf);
  }

  // Template literal (without substitutions handled above)
  if (ts.isTemplateExpression(expr)) {
    // Template with substitutions - can't statically evaluate
    return unknown(
      gapWithFile(
        sf,
        'template literal',
        { kind: 'dynamic-value', expression: expr.getText(sf) },
        'Template literals with substitutions cannot be statically analyzed',
      ),
      span
    );
  }

  // Binary expressions - limited support for string concatenation
  if (ts.isBinaryExpression(expr)) {
    return transformBinaryExpression(expr, sf, span);
  }

  // Conditional expression: cond ? then : else
  if (ts.isConditionalExpression(expr)) {
    return unknown(
      gapWithFile(
        sf,
        'conditional expression',
        { kind: 'dynamic-value', expression: expr.getText(sf) },
        'Conditional expressions cannot be statically analyzed',
      ),
      span
    );
  }

  // Class expression
  if (ts.isClassExpression(expr)) {
    // Class expressions are rare in registration patterns
    // Just note we saw a class
    const name = expr.name?.text ?? '(anonymous class)';
    return unknown(
      gapWithFile(
        sf,
        `class expression "${name}"`,
        { kind: 'dynamic-value', expression: 'class expression' },
        'Class expressions are not tracked - use class declarations',
      ),
      span
    );
  }

  // Await expression
  if (ts.isAwaitExpression(expr)) {
    return unknown(
      gapWithFile(
        sf,
        'await expression',
        { kind: 'dynamic-value', expression: 'await ...' },
        'Async values cannot be statically analyzed',
      ),
      span
    );
  }

  // Yield expression
  if (ts.isYieldExpression(expr)) {
    return unknown(
      gapWithFile(
        sf,
        'yield expression',
        { kind: 'dynamic-value', expression: 'yield ...' },
        'Generator values cannot be statically analyzed',
      ),
      span
    );
  }

  // Optional chaining (foo?.bar, foo?.[x], foo?.())
  // These introduce runtime conditionality that can't be statically resolved.
  // TypeScript represents these as regular PropertyAccessExpression/ElementAccessExpression/CallExpression
  // with a `questionDotToken` property. We check for this and produce a specific gap.
  if ('questionDotToken' in expr && (expr as { questionDotToken?: unknown }).questionDotToken) {
    return unknown(
      gapWithFile(
        sf,
        'optional chain',
        { kind: 'dynamic-value', expression: expr.getText(sf).slice(0, 50) },
        'Optional chaining introduces runtime conditionality',
      ),
      span
    );
  }

  // Default: unknown expression type
  return unknown(
    gapWithFile(
      sf,
      'expression',
      { kind: 'dynamic-value', expression: expr.getText(sf).slice(0, 50) },
      `Unsupported expression type: ${ts.SyntaxKind[expr.kind]}`,
    ),
    span
  );
}

/**
 * Transform an array literal expression.
 */
function transformArrayLiteral(
  expr: ts.ArrayLiteralExpression,
  sf: ts.SourceFile,
  span: TextSpan
): AnalyzableValue {
  const elements: AnalyzableValue[] = [];

  for (const element of expr.elements) {
    if (ts.isSpreadElement(element)) {
      // Spread in array: [...x]
      const target = transformExpression(element.expression, sf);
      elements.push(spread(target, undefined, nodeSpan(element, sf)));
    } else if (ts.isOmittedExpression(element)) {
      // Omitted element: [a, , b] - treat as undefined
      elements.push(literal(undefined, nodeSpan(element, sf)));
    } else {
      elements.push(transformExpression(element, sf));
    }
  }

  return array(elements, span);
}

/**
 * Transform an object literal expression.
 */
function transformObjectLiteral(
  expr: ts.ObjectLiteralExpression,
  sf: ts.SourceFile,
  span: TextSpan
): AnalyzableValue {
  const properties = new Map<string, AnalyzableValue>();
  const methods = new Map<string, MethodValue>();
  const propertyKeySpans = new Map<string, TextSpan>();

  for (const prop of expr.properties) {
    // Property assignment: { key: value }
    if (ts.isPropertyAssignment(prop)) {
      const key = getPropertyName(prop.name, sf);
      if (!key) {
        // Computed property name we can't resolve - skip with warning
        continue;
      }
      properties.set(key.name, transformExpression(prop.initializer, sf));
      if (key.span) {
        propertyKeySpans.set(key.name, key.span);
      }
    }
    // Shorthand property: { x } means { x: x }
    else if (ts.isShorthandPropertyAssignment(prop)) {
      const name = prop.name.text;
      properties.set(name, ref(name, undefined, nodeSpan(prop, sf)));
      propertyKeySpans.set(name, nodeSpan(prop.name, sf));
    }
    // Method definition: { method() { } }
    else if (ts.isMethodDeclaration(prop)) {
      const key = getPropertyName(prop.name, sf);
      if (!key) continue;

      const params = transformParameters(prop.parameters, sf);
      const body = prop.body ? transformBlock(prop.body, sf) : [];
      methods.set(key.name, method(key.name, params, body, nodeSpan(prop, sf)));
      if (key.span) {
        propertyKeySpans.set(key.name, key.span);
      }
    }
    // Getter: { get x() { } }
    else if (ts.isGetAccessorDeclaration(prop)) {
      const key = getPropertyName(prop.name, sf);
      if (!key) continue;
      // Treat getter as unknown value for now
      properties.set(key.name, unknown(
        gapWithFile(
          sf,
          `getter "${key.name}"`,
          { kind: 'function-return', functionName: `get ${key.name}` },
          'Getter return values cannot be statically analyzed',
        ),
        nodeSpan(prop, sf)
      ));
      if (key.span) {
        propertyKeySpans.set(key.name, key.span);
      }
    }
    // Setter: { set x(v) { } }
    else if (ts.isSetAccessorDeclaration(prop)) {
      // Setters don't produce values - skip
    }
    // Spread property: { ...x }
    else if (ts.isSpreadAssignment(prop)) {
      // Spread in object literal - can't merge statically without knowing the source
      // We could handle this in Layer 2 if the spread target is resolved to an object
      // For now, note this as a limitation
      const spreadTarget = transformExpression(prop.expression, sf);
      // Store with a special key that Layer 2 can recognize
      properties.set(`__spread_${properties.size}`, spread(spreadTarget, undefined, nodeSpan(prop, sf)));
    }
  }

  return object(
    properties,
    methods,
    span,
    propertyKeySpans.size > 0 ? propertyKeySpans : undefined
  );
}

/**
 * Get the string name of a property, or null if it's a computed property
 * that can't be statically determined.
 */
type PropertyNameInfo = { name: string; span?: TextSpan };

function getPropertyName(name: ts.PropertyName, sf: ts.SourceFile): PropertyNameInfo | null {
  if (ts.isIdentifier(name)) {
    return { name: name.text, span: nodeSpan(name, sf) };
  }
  if (ts.isStringLiteral(name)) {
    return { name: name.text, span: nodeSpan(name, sf) };
  }
  if (ts.isNumericLiteral(name)) {
    return { name: name.text, span: nodeSpan(name, sf) };
  }
  if (ts.isComputedPropertyName(name)) {
    // Try to evaluate simple computed names
    const expr = name.expression;
    if (ts.isStringLiteral(expr)) {
      return { name: expr.text, span: nodeSpan(expr, sf) };
    }
    if (ts.isNumericLiteral(expr)) {
      return { name: expr.text, span: nodeSpan(expr, sf) };
    }
    // Complex computed property - can't determine statically
    return null;
  }
  if (ts.isPrivateIdentifier(name)) {
    // Private identifiers start with #
    return { name: `#${name.text}`, span: nodeSpan(name, sf) };
  }
  return null;
}

/**
 * Transform an element access expression: base[index]
 */
function transformElementAccess(
  expr: ts.ElementAccessExpression,
  sf: ts.SourceFile,
  span: TextSpan
): AnalyzableValue {
  const base = transformExpression(expr.expression, sf);

  // If index is a string literal, treat like property access
  if (ts.isStringLiteral(expr.argumentExpression)) {
    return propAccess(base, expr.argumentExpression.text, span);
  }

  // If index is a numeric literal, note the index
  if (ts.isNumericLiteral(expr.argumentExpression)) {
    // Could be array access - treat as property access with numeric key
    return propAccess(base, expr.argumentExpression.text, span);
  }

  // Dynamic index - can't analyze
  return unknown(
    gapWithFile(
      sf,
      'element access',
      { kind: 'computed-property', expression: expr.argumentExpression.getText(sf) },
      'Dynamic property access cannot be statically analyzed',
    ),
    span
  );
}

/**
 * Transform a call expression: callee(args)
 */
function transformCallExpression(
  expr: ts.CallExpression,
  sf: ts.SourceFile,
  span: TextSpan
): AnalyzableValue {
  // Handle dynamic imports: import('./module')
  // These can't be statically resolved - the module path might be dynamic and
  // the import is async. Return Unknown with a descriptive gap.
  if (expr.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const specifier = expr.arguments[0];
    const specifierText = specifier ? specifier.getText(sf).slice(0, 50) : '?';
    return unknown(
      gapWithFile(
        sf,
        'dynamic import',
        { kind: 'dynamic-value', expression: `import(${specifierText})` },
        'Dynamic imports cannot be statically resolved - use static import declarations',
      ),
      span
    );
  }

  const callee = transformExpression(expr.expression, sf);
  const args: AnalyzableValue[] = [];

  for (const arg of expr.arguments) {
    if (ts.isSpreadElement(arg)) {
      args.push(spread(transformExpression(arg.expression, sf), undefined, nodeSpan(arg, sf)));
    } else {
      args.push(transformExpression(arg, sf));
    }
  }

  return call(callee, args, undefined, span);
}

/**
 * Transform a new expression: new Callee(args)
 */
function transformNewExpression(
  expr: ts.NewExpression,
  sf: ts.SourceFile,
  span: TextSpan
): AnalyzableValue {
  const callee = transformExpression(expr.expression, sf);
  const args: AnalyzableValue[] = [];

  if (expr.arguments) {
    for (const arg of expr.arguments) {
      if (ts.isSpreadElement(arg)) {
        args.push(spread(transformExpression(arg.expression, sf), undefined, nodeSpan(arg, sf)));
      } else {
        args.push(transformExpression(arg, sf));
      }
    }
  }

  return {
    kind: 'new',
    callee,
    args,
    span,
  };
}

/**
 * Transform an arrow function: (params) => body
 */
function transformArrowFunction(
  expr: ts.ArrowFunction,
  sf: ts.SourceFile,
  span: TextSpan
): AnalyzableValue {
  const params = transformParameters(expr.parameters, sf);

  let body: StatementValue[];
  if (ts.isBlock(expr.body)) {
    body = transformBlock(expr.body, sf);
  } else {
    // Expression body: () => expr is equivalent to () => { return expr; }
    body = [returnStmt(transformExpression(expr.body, sf), nodeSpan(expr.body, sf))];
  }

  return {
    kind: 'function',
    name: null,
    params,
    body,
    span,
  };
}

/**
 * Transform a function expression: function name(params) { body }
 */
function transformFunctionExpression(
  expr: ts.FunctionExpression,
  sf: ts.SourceFile,
  span: TextSpan
): AnalyzableValue {
  const name = expr.name?.text ?? null;
  const params = transformParameters(expr.parameters, sf);
  const body = expr.body ? transformBlock(expr.body, sf) : [];

  return {
    kind: 'function',
    name,
    params,
    body,
    span,
  };
}

/**
 * Transform a binary expression - limited support.
 */
function transformBinaryExpression(
  expr: ts.BinaryExpression,
  sf: ts.SourceFile,
  span: TextSpan
): AnalyzableValue {
  // We could try to evaluate simple cases like string concatenation
  // For now, treat as unknown
  return unknown(
    gapWithFile(
      sf,
      'binary expression',
      { kind: 'dynamic-value', expression: expr.getText(sf).slice(0, 50) },
      'Binary expressions cannot be statically analyzed',
    ),
    span
  );
}

// =============================================================================
// Statement Transformation
// =============================================================================

/**
 * Transform a TypeScript statement to a StatementValue.
 */
export function transformStatement(stmt: ts.Statement, sf: ts.SourceFile): StatementValue {
  const span = nodeSpan(stmt, sf);

  // Return statement
  if (ts.isReturnStatement(stmt)) {
    const value = stmt.expression ? transformExpression(stmt.expression, sf) : null;
    return returnStmt(value, span);
  }

  // Expression statement
  if (ts.isExpressionStatement(stmt)) {
    return exprStmt(transformExpression(stmt.expression, sf), span);
  }

  // Variable statement: const/let/var x = value
  if (ts.isVariableStatement(stmt)) {
    return transformVariableStatement(stmt, sf, span);
  }

  // If statement
  if (ts.isIfStatement(stmt)) {
    return transformIfStatement(stmt, sf, span);
  }

  // For-of statement
  if (ts.isForOfStatement(stmt)) {
    return transformForOfStatement(stmt, sf, span);
  }

  // Block (nested)
  if (ts.isBlock(stmt)) {
    // Flatten block into parent - this shouldn't happen at top level
    // but handle gracefully
    return unknownStmt(
      gapWithFile(
        sf,
        'block',
        { kind: 'dynamic-value', expression: '{ ... }' },
        'Nested blocks are flattened',
      ),
      span
    );
  }

  // For statement (traditional for loop)
  if (ts.isForStatement(stmt)) {
    return unknownStmt(
      gapWithFile(
        sf,
        'for loop',
        { kind: 'loop-variable', variable: 'i' },
        'Traditional for loops cannot be statically analyzed',
      ),
      span
    );
  }

  // For-in statement
  if (ts.isForInStatement(stmt)) {
    return unknownStmt(
      gapWithFile(
        sf,
        'for-in loop',
        { kind: 'loop-variable', variable: getLoopVariable(stmt.initializer, sf) },
        'For-in loops cannot be statically analyzed',
      ),
      span
    );
  }

  // While statement
  if (ts.isWhileStatement(stmt)) {
    return unknownStmt(
      gapWithFile(
        sf,
        'while loop',
        { kind: 'loop-variable', variable: '(condition)' },
        'While loops cannot be statically analyzed',
      ),
      span
    );
  }

  // Do-while statement
  if (ts.isDoStatement(stmt)) {
    return unknownStmt(
      gapWithFile(
        sf,
        'do-while loop',
        { kind: 'loop-variable', variable: '(condition)' },
        'Do-while loops cannot be statically analyzed',
      ),
      span
    );
  }

  // Switch statement
  if (ts.isSwitchStatement(stmt)) {
    return unknownStmt(
      gapWithFile(
        sf,
        'switch statement',
        { kind: 'conditional-registration', condition: stmt.expression.getText(sf) },
        'Switch statements cannot be statically analyzed',
      ),
      span
    );
  }

  // Try statement
  if (ts.isTryStatement(stmt)) {
    // We could try to analyze the try block, but error handling
    // suggests dynamic behavior
    return unknownStmt(
      gapWithFile(
        sf,
        'try statement',
        { kind: 'dynamic-value', expression: 'try { ... }' },
        'Try statements suggest dynamic behavior',
      ),
      span
    );
  }

  // Throw statement
  if (ts.isThrowStatement(stmt)) {
    return unknownStmt(
      gapWithFile(
        sf,
        'throw statement',
        { kind: 'dynamic-value', expression: 'throw ...' },
        'Throw statements are not analyzed',
      ),
      span
    );
  }

  // Function declaration (local function)
  if (ts.isFunctionDeclaration(stmt)) {
    // Local function declarations create bindings - handled in scope
    // For now, just note it
    return unknownStmt(
      gapWithFile(
        sf,
        'function declaration',
        { kind: 'function-return', functionName: stmt.name?.text ?? '(anonymous)' },
        'Local function declarations create scope bindings',
      ),
      span
    );
  }

  // Class declaration (local class)
  if (ts.isClassDeclaration(stmt)) {
    return unknownStmt(
      gapWithFile(
        sf,
        'class declaration',
        { kind: 'dynamic-value', expression: `class ${stmt.name?.text ?? '(anonymous)'}` },
        'Local class declarations create scope bindings',
      ),
      span
    );
  }

  // Empty statement (;)
  if (ts.isEmptyStatement(stmt)) {
    // Skip empty statements
    return unknownStmt(
      gapWithFile(
        sf,
        'empty statement',
        { kind: 'dynamic-value', expression: ';' },
        'Empty statement',
      ),
      span
    );
  }

  // Import/export declarations should not appear in function bodies
  // but handle gracefully
  if (ts.isImportDeclaration(stmt) || ts.isExportDeclaration(stmt) || ts.isExportAssignment(stmt)) {
    return unknownStmt(
      gapWithFile(
        sf,
        'import/export',
        { kind: 'dynamic-value', expression: stmt.getText(sf).slice(0, 30) },
        'Import/export declarations are module-level',
      ),
      span
    );
  }

  // Default: unknown statement
  return unknownStmt(
    gapWithFile(
      sf,
      'statement',
      { kind: 'dynamic-value', expression: stmt.getText(sf).slice(0, 30) },
      `Unsupported statement type: ${ts.SyntaxKind[stmt.kind]}`,
    ),
    span
  );
}

/**
 * Transform a variable statement: const/let/var declarations
 */
function transformVariableStatement(
  stmt: ts.VariableStatement,
  sf: ts.SourceFile,
  span: TextSpan
): StatementValue {
  const declarations: VariableDeclaration[] = [];

  for (const decl of stmt.declarationList.declarations) {
    // Handle simple identifier binding
    if (ts.isIdentifier(decl.name)) {
      const init = decl.initializer ? transformExpression(decl.initializer, sf) : null;
      declarations.push(varDecl(decl.name.text, init, nodeSpan(decl, sf)));
    }
    // Handle destructuring patterns
    else if (ts.isObjectBindingPattern(decl.name) || ts.isArrayBindingPattern(decl.name)) {
      // Destructuring creates multiple bindings - complex to track
      // For now, note as limitation
      declarations.push(varDecl(
        `(destructuring)`,
        decl.initializer ? transformExpression(decl.initializer, sf) : null,
        nodeSpan(decl, sf)
      ));
    }
  }

  return varStmt(declarations, span);
}

/**
 * Transform an if statement.
 */
function transformIfStatement(
  stmt: ts.IfStatement,
  sf: ts.SourceFile,
  span: TextSpan
): StatementValue {
  const condition = transformExpression(stmt.expression, sf);

  // Transform then branch
  const thenBranch = ts.isBlock(stmt.thenStatement)
    ? transformBlock(stmt.thenStatement, sf)
    : [transformStatement(stmt.thenStatement, sf)];

  // Transform else branch if present
  let elseBranch: StatementValue[] | undefined;
  if (stmt.elseStatement) {
    elseBranch = ts.isBlock(stmt.elseStatement)
      ? transformBlock(stmt.elseStatement, sf)
      : [transformStatement(stmt.elseStatement, sf)];
  }

  return ifStmt(condition, thenBranch, elseBranch, span);
}

/**
 * Transform a for-of statement.
 */
function transformForOfStatement(
  stmt: ts.ForOfStatement,
  sf: ts.SourceFile,
  span: TextSpan
): StatementValue {
  const variable = getLoopVariable(stmt.initializer, sf);
  const iterable = transformExpression(stmt.expression, sf);

  const body = ts.isBlock(stmt.statement)
    ? transformBlock(stmt.statement, sf)
    : [transformStatement(stmt.statement, sf)];

  return forOfStmt(variable, iterable, body, span);
}

/**
 * Get the loop variable name from a for-of/for-in initializer.
 */
function getLoopVariable(initializer: ts.ForInitializer, sf: ts.SourceFile): string {
  if (ts.isVariableDeclarationList(initializer)) {
    const decl = initializer.declarations[0];
    if (decl && ts.isIdentifier(decl.name)) {
      return decl.name.text;
    }
  }
  return '(unknown)';
}

/**
 * Transform a block of statements.
 */
export function transformBlock(block: ts.Block, sf: ts.SourceFile): StatementValue[] {
  return block.statements.map(stmt => transformStatement(stmt, sf));
}

// =============================================================================
// Method/Function Transformation
// =============================================================================

/**
 * Transform a method declaration to MethodValue.
 */
export function transformMethod(
  decl: ts.MethodDeclaration | ts.FunctionDeclaration,
  sf: ts.SourceFile
): MethodValue {
  const name = decl.name
    ? (ts.isIdentifier(decl.name) ? decl.name.text : decl.name.getText(sf))
    : '(anonymous)';

  const params = transformParameters(decl.parameters, sf);
  const body = decl.body ? transformBlock(decl.body, sf) : [];

  return method(name, params, body, nodeSpan(decl, sf));
}

/**
 * Transform function parameters.
 */
export function transformParameters(
  params: ts.NodeArray<ts.ParameterDeclaration>,
  sf: ts.SourceFile
): ParameterInfo[] {
  const result: ParameterInfo[] = [];

  for (const param of params) {
    // Get parameter name
    let name: string;
    if (ts.isIdentifier(param.name)) {
      name = param.name.text;
    } else {
      // Destructuring parameter - use placeholder
      name = `(destructuring)`;
    }

    // Check for rest parameter
    const isRest = param.dotDotDotToken !== undefined;

    // Get default value if present
    const defaultValue = param.initializer
      ? transformExpression(param.initializer, sf)
      : undefined;

    result.push({
      name,
      isRest,
      defaultValue,
      span: nodeSpan(param, sf),
    });
  }

  return result;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Get a TextSpan from a TypeScript AST node.
 * Uses getStart() to skip leading trivia (whitespace, comments).
 */
function nodeSpan(node: ts.Node, sf: ts.SourceFile): TextSpan {
  return {
    start: node.getStart(sf),
    end: node.getEnd(),
  };
}

// =============================================================================
// High-Level Convenience Functions
// =============================================================================

/**
 * Transform an exported value declaration.
 *
 * Convenience function for analyzing `export const X = ...` patterns.
 */
export function transformExportedValue(
  name: string,
  initializer: ts.Expression,
  sf: ts.SourceFile
): { name: string; value: AnalyzableValue } {
  return {
    name,
    value: transformExpression(initializer, sf),
  };
}

/**
 * Transform a source file to extract all exported values and functions.
 *
 * Returns a map of export names to their transformed values.
 * This is useful for building the initial scope in Layer 2.
 */
export function transformModuleExports(
  sf: ts.SourceFile
): Map<string, AnalyzableValue> {
  const exports = new Map<string, AnalyzableValue>();

  for (const stmt of sf.statements) {
    // Variable declaration with export modifier
    if (ts.isVariableStatement(stmt)) {
      const hasExport = stmt.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      if (hasExport) {
        for (const decl of stmt.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.initializer) {
            exports.set(decl.name.text, transformExpression(decl.initializer, sf));
          }
        }
      }
    }

    // Function declaration with export modifier
    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      const hasExport = stmt.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      if (hasExport) {
        exports.set(stmt.name.text, {
          kind: 'function',
          name: stmt.name.text,
          params: transformParameters(stmt.parameters, sf),
          body: stmt.body ? transformBlock(stmt.body, sf) : [],
          span: nodeSpan(stmt, sf),
        });
      }
    }

    // Class declaration with export modifier
    if (ts.isClassDeclaration(stmt) && stmt.name) {
      const hasExport = stmt.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
      if (hasExport) {
        // Note: We create a class reference, not a full class value
        // The class details are extracted separately by the existing infrastructure
        exports.set(stmt.name.text, ref(stmt.name.text, undefined, nodeSpan(stmt, sf)));
      }
    }

    // Export assignment: export default X
    if (ts.isExportAssignment(stmt)) {
      exports.set('default', transformExpression(stmt.expression, sf));
    }
  }

  return exports;
}

