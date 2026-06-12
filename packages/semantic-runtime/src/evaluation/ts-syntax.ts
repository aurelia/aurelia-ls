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
