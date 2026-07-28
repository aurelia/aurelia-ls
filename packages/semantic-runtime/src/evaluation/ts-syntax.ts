import ts from 'typescript';

import type { AddressHandle } from '../kernel/handles.js';
import type { SourceSpanSite } from '../kernel/source-address.js';

export const REFERENCE_SEED_KINDS = [
  'identifier-name',
  'property-access-name',
  'string-key',
  'open-expression',
] as const;

export type ReferenceSeedKind =
  typeof REFERENCE_SEED_KINDS[number];

export interface ReferenceSeed {
  readonly kind: ReferenceSeedKind;
  readonly candidateName: string | null;
}

export interface ImportedAureliaExpressionBindings {
  readonly aureliaIdentifiers: ReadonlySet<string>;
  readonly aureliaNamespaces: ReadonlySet<string>;
}

export interface TypeScriptSourceSiteContext {
  readonly sourcePath: string;
  readonly sourceFileAddressHandle: AddressHandle;
  readonly sourceFile: ts.SourceFile;
}

export interface TypeScriptNodeSourceSite extends SourceSpanSite {
  readonly sourcePath: string;
}

export function sourceSiteForNode<TDetails extends object>(
  context: TypeScriptSourceSiteContext,
  node: ts.Node,
  details: TDetails,
): TypeScriptNodeSourceSite & TDetails {
  return {
    sourcePath: context.sourcePath,
    sourceFileAddressHandle: context.sourceFileAddressHandle,
    start: node.getStart(context.sourceFile),
    end: node.getEnd(),
    ...details,
  };
}

export function guessScriptKind(
  filePath: string,
): ts.ScriptKind {
  return filePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : filePath.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.cjs')
      ? ts.ScriptKind.JS
      : filePath.endsWith('.cts') || filePath.endsWith('.mts') || filePath.endsWith('.ts')
        ? ts.ScriptKind.TS
      : ts.ScriptKind.TS;
}

export function readPropertyName(
  name: ts.PropertyName,
): string | null {
  return ts.isIdentifier(name)
    || ts.isStringLiteral(name)
    || ts.isNoSubstitutionTemplateLiteral(name)
    || ts.isNumericLiteral(name)
    ? name.text
    : null;
}

/** Recover the authored property-name token that one retained property write/declaration represents. */
export function authoredPropertyNameNode(node: ts.Node): ts.Node {
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
    const target = unwrapExpression(node.left);
    if (ts.isPropertyAccessExpression(target)) {
      return target.name;
    }
    if (ts.isElementAccessExpression(target) && target.argumentExpression != null) {
      return target.argumentExpression;
    }
  }
  if (
    (
      ts.isPropertyAssignment(node)
      || ts.isShorthandPropertyAssignment(node)
      || ts.isMethodDeclaration(node)
      || ts.isPropertyDeclaration(node)
      || ts.isGetAccessorDeclaration(node)
      || ts.isSetAccessorDeclaration(node)
    )
    && node.name != null
  ) {
    return node.name;
  }
  return node;
}

/** Recover the authored content span for a retained property write/declaration. */
export function authoredPropertyNameSpan(
  sourceFile: ts.SourceFile,
  node: ts.Node,
): Pick<SourceSpanSite, 'start' | 'end'> | null {
  const sourceNode = authoredPropertyNameNode(node);
  let start = sourceNode.getStart(sourceFile);
  let end = sourceNode.end;
  if (ts.isStringLiteralLike(sourceNode) || ts.isNoSubstitutionTemplateLiteral(sourceNode)) {
    start += 1;
    end -= 1;
  }
  return end < start ? null : { start, end };
}

export function readObjectPropertyExpression(
  object: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.Expression | null {
  for (const property of object.properties) {
    if (!ts.isPropertyAssignment(property) || readPropertyName(property.name) !== propertyName) {
      continue;
    }
    return property.initializer;
  }
  return null;
}

export function isImportedAureliaExpression(
  expression: ts.Expression,
  bindings: ImportedAureliaExpressionBindings,
): boolean {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return bindings.aureliaIdentifiers.has(current.text);
  }
  return ts.isPropertyAccessExpression(current)
    && current.name.text === 'Aurelia'
    && ts.isIdentifier(unwrapExpression(current.expression))
    && bindings.aureliaNamespaces.has((unwrapExpression(current.expression) as ts.Identifier).text);
}

export function readDeclarationLocalName(
  declaration: ts.Declaration | null,
): string | null {
  if (declaration == null) {
    return null;
  }

  const name = (declaration as { readonly name?: ts.Node }).name;
  if (
    name != null
    && (
      ts.isIdentifier(name)
      || ts.isStringLiteral(name)
      || ts.isNoSubstitutionTemplateLiteral(name)
      || ts.isNumericLiteral(name)
    )
  ) {
    return name.text;
  }

  const parent = declaration.parent;
  return parent != null && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)
    ? parent.name.text
    : null;
}

export function unwrapExpression(
  expression: ts.Expression,
): ts.Expression {
  let current = expression;

  while (
    ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isParenthesizedExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }

  return current;
}

export function isFunctionLikeBoundary(
  node: ts.Node,
): boolean {
  return ts.isArrowFunction(node)
    || ts.isFunctionExpression(node)
    || ts.isFunctionDeclaration(node)
    || ts.isMethodDeclaration(node)
    || ts.isGetAccessorDeclaration(node)
    || ts.isSetAccessorDeclaration(node)
    || ts.isConstructorDeclaration(node);
}

export function isNestedExecutionBoundary(
  node: ts.Node,
): boolean {
  return isFunctionLikeBoundary(node)
    || ts.isClassDeclaration(node)
    || ts.isClassExpression(node);
}

export function typescriptExpressionSourceRootName(
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);
  if (ts.isIdentifier(current)) {
    return current.text;
  }
  if (current.kind === ts.SyntaxKind.ThisKeyword) {
    return 'this';
  }
  if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
    return typescriptExpressionSourceRootName(current.expression);
  }
  return null;
}

export function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node)
    ? ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false
    : false;
}

export function hasStaticModifier(node: ts.Node): boolean {
  return hasModifier(node, ts.SyntaxKind.StaticKeyword);
}

export function hasAccessorModifier(node: ts.Node): boolean {
  return hasModifier(node, ts.SyntaxKind.AccessorKeyword);
}

export function isParameterProperty(
  parameter: ts.ParameterDeclaration,
): boolean {
  return hasModifier(parameter, ts.SyntaxKind.PublicKeyword)
    || hasModifier(parameter, ts.SyntaxKind.ProtectedKeyword)
    || hasModifier(parameter, ts.SyntaxKind.PrivateKeyword)
    || hasModifier(parameter, ts.SyntaxKind.ReadonlyKeyword);
}

export function isAssignmentOperator(kind: ts.SyntaxKind): boolean {
  return kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;
}

/** Source-language value access performed by one TypeScript expression occurrence. */
export const enum TypeScriptAccessMode {
  /** Evaluating the occurrence reads its reached value. */
  Read = 1 << 0,
  /** Evaluating the occurrence writes its reached target. */
  Write = 1 << 1,
  /** Evaluating the occurrence reads and then writes the same target. */
  ReadWrite = Read | Write,
}

/**
 * Classify the terminal source access without confusing owner/key evaluation with mutation.
 *
 * `owner.value = next` writes `value` but still reads `owner`; compound assignment and increment
 * read before writing. Destructuring carriers are followed until their enclosing assignment or
 * loop target is reached, while computed property names remain ordinary reads.
 */
export function typescriptAccessModeForExpression(
  expression: ts.Expression,
): TypeScriptAccessMode {
  let current: ts.Node = expression;
  let parent = current.parent;

  while (parent != null && isTypeScriptAssignmentTargetCarrier(parent, current)) {
    current = parent;
    parent = current.parent;
  }

  if (
    parent != null
    && ts.isBinaryExpression(parent)
    && parent.left === current
    && isAssignmentOperator(parent.operatorToken.kind)
  ) {
    return parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ? TypeScriptAccessMode.Write
      : TypeScriptAccessMode.ReadWrite;
  }
  if (
    parent != null
    && (ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent))
    && parent.operand === current
    && (parent.operator === ts.SyntaxKind.PlusPlusToken || parent.operator === ts.SyntaxKind.MinusMinusToken)
  ) {
    return TypeScriptAccessMode.ReadWrite;
  }
  if (parent != null && ts.isDeleteExpression(parent) && parent.expression === current) {
    return TypeScriptAccessMode.Write;
  }
  if (
    parent != null
    && (ts.isForOfStatement(parent) || ts.isForInStatement(parent))
    && parent.initializer === current
  ) {
    return TypeScriptAccessMode.Write;
  }
  return TypeScriptAccessMode.Read;
}

function isTypeScriptAssignmentTargetCarrier(
  parent: ts.Node,
  child: ts.Node,
): boolean {
  if (
    (
      ts.isAsExpression(parent)
      || ts.isTypeAssertionExpression(parent)
      || ts.isParenthesizedExpression(parent)
      || ts.isNonNullExpression(parent)
      || ts.isSatisfiesExpression(parent)
    )
    && parent.expression === child
  ) {
    return true;
  }
  if (ts.isPropertyAssignment(parent) && parent.initializer === child) {
    return true;
  }
  if (
    (ts.isSpreadAssignment(parent) || ts.isSpreadElement(parent))
    && parent.expression === child
  ) {
    return true;
  }
  if (ts.isObjectLiteralExpression(parent)) {
    return parent.properties.some((property) => property === child);
  }
  if (ts.isArrayLiteralExpression(parent)) {
    return parent.elements.some((element) => element === child);
  }
  return false;
}

export function readCallCalleeText(
  expression: ts.Expression,
): string | null {
  const current = unwrapExpression(expression);

  if (ts.isIdentifier(current)) {
    return current.text;
  }

  if (ts.isPropertyAccessExpression(current)) {
    const left = readCallCalleeText(current.expression);
    return left == null ? current.name.text : `${left}.${current.name.text}`;
  }

  return null;
}

export function readReferenceName(
  expression: ts.Expression,
): string | null {
  return readReferenceSeed(expression).candidateName;
}

export function readReferenceSeed(
  expression: ts.Expression,
): ReferenceSeed {
  const current = unwrapExpression(expression);

  if (ts.isIdentifier(current)) {
    return {
      kind: 'identifier-name',
      candidateName: current.text,
    };
  }

  if (ts.isPropertyAccessExpression(current)) {
    return {
      kind: 'property-access-name',
      candidateName: current.name.text,
    };
  }

  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return {
      kind: 'string-key',
      candidateName: current.text,
    };
  }

  return {
    kind: 'open-expression',
    candidateName: null,
  };
}
