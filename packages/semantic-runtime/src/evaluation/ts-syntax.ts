import ts from 'typescript';

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

export function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return ts.canHaveModifiers(node)
    ? ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false
    : false;
}

export function hasStaticModifier(node: ts.Node): boolean {
  return hasModifier(node, ts.SyntaxKind.StaticKeyword);
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
