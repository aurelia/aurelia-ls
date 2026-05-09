import ts from "typescript";

export type TypeScriptLiteralValue = string | number | boolean | null;

export function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

export function propertyNameText(
  name: ts.PropertyName | undefined,
  sourceFile?: ts.SourceFile,
): string | null {
  if (name === undefined) {
    return null;
  }
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteralLike(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }
  if (ts.isPrivateIdentifier(name)) {
    return name.text.startsWith("#") ? name.text : `#${name.text}`;
  }
  if (ts.isComputedPropertyName(name)) {
    const expression = unwrapExpression(name.expression);
    if (ts.isStringLiteralLike(expression) || ts.isNumericLiteral(expression)) {
      return expression.text;
    }
  }
  return sourceFile === undefined ? null : name.getText(sourceFile);
}

export function propertyNameNodeText(
  name: ts.Node | undefined,
  sourceFile?: ts.SourceFile,
): string | null {
  return name !== undefined && isPropertyNameNode(name)
    ? propertyNameText(name, sourceFile)
    : null;
}

export function isPropertyNameNode(node: ts.Node): node is ts.PropertyName {
  return (
    ts.isIdentifier(node) ||
    ts.isPrivateIdentifier(node) ||
    ts.isStringLiteralLike(node) ||
    ts.isNumericLiteral(node) ||
    ts.isComputedPropertyName(node)
  );
}

export function propertyOrIdentifierName(
  expression: ts.Expression,
  sourceFile?: ts.SourceFile,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }
  return sourceFile === undefined ? null : current.getText(sourceFile);
}

export function calleeNameForExpression(
  expression: ts.Expression,
  sourceFile: ts.SourceFile = expression.getSourceFile(),
  fallbackName: string | null = null,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (ts.isPropertyAccessExpression(current)) {
    return current.name.text;
  }
  if (ts.isElementAccessExpression(current)) {
    return current.argumentExpression?.getText(sourceFile) ?? fallbackName;
  }
  return fallbackName;
}

export function declarationNameNode(node: ts.Node): ts.Node | undefined {
  if ("name" in node) {
    const named = node as { readonly name?: ts.Node | null };
    return named.name ?? undefined;
  }
  return undefined;
}

export function firstArgumentText(
  call: ts.CallExpression | ts.NewExpression,
  sourceFile: ts.SourceFile = call.getSourceFile(),
): string | null {
  return call.arguments?.[0]?.getText(sourceFile) ?? null;
}

export function declarationInitializer(node: ts.Node): ts.Expression | undefined {
  return ts.isVariableDeclaration(node) ||
    ts.isParameter(node) ||
    ts.isPropertyDeclaration(node)
    ? node.initializer
    : undefined;
}

export function assignmentTargetReceiverName(
  expression: ts.Expression,
): string | null {
  const target = unwrapExpression(expression);
  if (ts.isIdentifier(target)) {
    return target.text;
  }
  if (
    ts.isPropertyAccessExpression(target) &&
    target.expression.kind === ts.SyntaxKind.ThisKeyword
  ) {
    return target.name.text;
  }
  return null;
}

export function objectLiteralStringPropertyValue(
  object: ts.Expression,
  propertyName: string,
  sourceFile: ts.SourceFile = object.getSourceFile(),
): string | null {
  const property = objectLiteralPropertyAssignment(
    object,
    propertyName,
    sourceFile,
  );
  if (property !== null && ts.isStringLiteralLike(property.initializer)) {
    return property.initializer.text;
  }
  return null;
}

export function objectLiteralObjectPropertyValue(
  object: ts.Expression,
  propertyName: string,
  sourceFile: ts.SourceFile = object.getSourceFile(),
): ts.ObjectLiteralExpression | null {
  const property = objectLiteralPropertyAssignment(
    object,
    propertyName,
    sourceFile,
  );
  return property !== null && ts.isObjectLiteralExpression(property.initializer)
    ? property.initializer
    : null;
}

export function objectLiteralPropertyAssignment(
  object: ts.Expression,
  propertyName: string,
  sourceFile: ts.SourceFile = object.getSourceFile(),
): ts.PropertyAssignment | null {
  const property = objectLiteralProperty(object, propertyName, sourceFile);
  return property !== null && ts.isPropertyAssignment(property)
    ? property
    : null;
}

export function objectLiteralProperty(
  object: ts.Expression,
  propertyName: string,
  sourceFile: ts.SourceFile = object.getSourceFile(),
): ts.ObjectLiteralElementLike | null {
  if (!ts.isObjectLiteralExpression(object)) {
    return null;
  }
  for (const property of object.properties) {
    if (propertyNameText(property.name, sourceFile) === propertyName) {
      return property;
    }
  }
  return null;
}

export function literalValueForExpression(
  expression: ts.Expression,
): TypeScriptLiteralValue | undefined {
  const current = unwrapExpression(expression);
  if (ts.isStringLiteralLike(current)) {
    return current.text;
  }
  if (ts.isNumericLiteral(current)) {
    return Number(current.text);
  }
  if (
    ts.isPrefixUnaryExpression(current) &&
    current.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(current.operand)
  ) {
    return -Number(current.operand.text);
  }
  if (current.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (current.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (current.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }
  return undefined;
}

export function literalValueField(
  expression: ts.Expression,
): { readonly literalValue?: TypeScriptLiteralValue } {
  const literalValue = literalValueForExpression(expression);
  return literalValue === undefined ? {} : { literalValue };
}

export function ownerNameForNode(node: ts.Node): string | null {
  const sourceFile = node.getSourceFile();
  let current: ts.Node | undefined = node;
  while (current !== undefined) {
    const name = ownerCandidateName(current, sourceFile);
    if (name !== null) {
      return name;
    }
    current = current.parent;
  }
  return null;
}

function ownerCandidateName(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): string | null {
  if (
    ts.isClassDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node)
  ) {
    return node.name?.getText(sourceFile) ?? null;
  }
  if (
    ts.isMethodDeclaration(node) ||
    ts.isPropertyDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  ) {
    return propertyNameText(node.name, sourceFile);
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    return node.name.text;
  }
  return null;
}

export function isAssignmentOperator(kind: ts.SyntaxKind): boolean {
  return kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
}

export function isExportedDeclaration(node: ts.Node): boolean {
  const target = ts.isVariableDeclaration(node) ? node.parent.parent : node;
  return (
    ts.canHaveModifiers(target) &&
    ts
      .getModifiers(target)
      ?.some(
        (modifier) =>
          modifier.kind === ts.SyntaxKind.ExportKeyword ||
          modifier.kind === ts.SyntaxKind.DefaultKeyword,
      ) === true
  );
}

export function isNestedExecutionBoundary(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isClassLike(node)
  );
}

export function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return (
    ts.canHaveModifiers(node) &&
    ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) === true
  );
}

export function hasStaticModifier(node: ts.Node): boolean {
  return hasModifier(node, ts.SyntaxKind.StaticKeyword);
}

export function visitNode(
  node: ts.Node,
  visitor: (node: ts.Node) => void,
): void {
  visitor(node);
  ts.forEachChild(node, (child) => visitNode(child, visitor));
}

export function deepestNodeContainingText(
  root: ts.Node,
  text: string,
  isCandidate: (node: ts.Node) => boolean,
): ts.Node | null {
  let match: ts.Node | null = null;
  const sourceFile = root.getSourceFile();
  const visit = (node: ts.Node): void => {
    if (!node.getFullText(sourceFile).includes(text)) {
      return;
    }
    ts.forEachChild(node, visit);
    if (match === null && isCandidate(node)) {
      match = node;
    }
  };
  visit(root);
  return match;
}
