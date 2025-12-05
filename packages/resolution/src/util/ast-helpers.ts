import ts from "typescript";

/**
 * Unwrap a decorator to get its name and arguments.
 * Handles both `@decorator` and `@decorator(args)` forms.
 */
export function unwrapDecorator(dec: ts.Decorator): { name: string; args: readonly ts.Expression[] } | null {
  const expr = dec.expression;
  if (ts.isIdentifier(expr)) {
    return { name: expr.text, args: [] };
  }
  if (ts.isCallExpression(expr)) {
    const callee = expr.expression;
    if (ts.isIdentifier(callee)) return { name: callee.text, args: expr.arguments };
    if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)) {
      return { name: callee.name.text, args: expr.arguments };
    }
  }
  return null;
}

/**
 * Get decorators from a node.
 * Handles both old TS API (node.decorators) and new API (ts.getDecorators).
 */
export function decoratorsOf(node: ts.Node): readonly ts.Decorator[] {
  const helper = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
  const direct = (node as ts.Node & { decorators?: readonly ts.Decorator[] }).decorators;
  return helper ?? direct ?? [];
}

/**
 * Get a property assignment from an object literal by name.
 */
export function getProp(obj: ts.ObjectLiteralExpression, name: string): ts.PropertyAssignment | undefined {
  return obj.properties.find(
    (p): p is ts.PropertyAssignment =>
      ts.isPropertyAssignment(p) &&
      ((ts.isIdentifier(p.name) && p.name.text === name) || (ts.isStringLiteralLike(p.name) && p.name.text === name)),
  );
}

/**
 * Read a string property from an object literal.
 */
export function readStringProp(obj: ts.ObjectLiteralExpression, name: string): string | undefined {
  const prop = getProp(obj, name);
  if (!prop) return undefined;
  const init = prop.initializer;
  return ts.isStringLiteralLike(init) ? init.text : undefined;
}

/**
 * Read a boolean property from an object literal.
 */
export function readBooleanProp(obj: ts.ObjectLiteralExpression, name: string): boolean | undefined {
  const prop = getProp(obj, name);
  if (!prop) return undefined;
  const init = prop.initializer;
  if (init.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (init.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
}

/**
 * Read a string array property from an object literal.
 * Also handles single string values.
 */
export function readStringArrayProp(obj: ts.ObjectLiteralExpression, name: string): string[] {
  const prop = getProp(obj, name);
  if (!prop) return [];
  const init = prop.initializer;
  if (ts.isStringLiteralLike(init)) return [init.text];
  if (!ts.isArrayLiteralExpression(init)) return [];
  const values: string[] = [];
  for (const element of init.elements) {
    if (ts.isStringLiteralLike(element)) values.push(element.text);
  }
  return values;
}

/**
 * Infer the TypeScript type name of a node.
 */
export function inferTypeName(node: ts.Node, checker: ts.TypeChecker): string | null {
  try {
    const type = checker.getTypeAtLocation(node);
    if (!type) return null;
    const text = checker.typeToString(type);
    return text || null;
  } catch {
    return null;
  }
}

/**
 * Check if a class member has the `static` modifier.
 */
export function hasStaticModifier(node: ts.ClassElement): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some((m) => m.kind === ts.SyntaxKind.StaticKeyword) ?? false;
}
