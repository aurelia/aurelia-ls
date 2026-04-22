import ts from 'typescript';

export function findNodeBySpan(
  sourceFile: ts.SourceFile,
  start: number,
  end: number,
): ts.Node | null {
  let best: ts.Node | null = null;

  const visit = (node: ts.Node) => {
    const nodeStart = node.getStart(sourceFile);
    if (nodeStart === start && node.end === end) {
      best = node;
      return;
    }
    if (start >= nodeStart && end <= node.end) {
      ts.forEachChild(node, visit);
    }
  };

  visit(sourceFile);
  return best;
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

export function hasStaticModifier(
  node: ts.Node,
): boolean {
  return ts.canHaveModifiers(node)
    ? (ts.getModifiers(node)?.some((current) => current.kind === ts.SyntaxKind.StaticKeyword) ?? false)
    : false;
}

export function readPropertyName(
  name: ts.PropertyName,
): string | null {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)
    ? name.text
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
  ) {
    current = current.expression;
  }

  return current;
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

export function readStringLiteralValue(
  expression: ts.Expression | null,
): string | null {
  return expression != null && (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression))
    ? expression.text
    : null;
}

export function readStringArrayValues(
  expression: ts.Expression | null,
): readonly string[] {
  if (expression == null || !ts.isArrayLiteralExpression(unwrapExpression(expression))) {
    return [];
  }

  const array = unwrapExpression(expression) as ts.ArrayLiteralExpression;
  const values: string[] = [];
  for (const element of array.elements) {
    const current = ts.isSpreadElement(element)
      ? unwrapExpression(element.expression)
      : unwrapExpression(element);
    if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
      values.push(current.text);
    }
  }

  return values;
}

export const BOUNDED_REFERENCE_SEED_KINDS = [
  'identifier-name',
  'property-access-name',
  'string-key',
  'open-expression',
] as const;

export type BoundedReferenceSeedKind =
  typeof BOUNDED_REFERENCE_SEED_KINDS[number];

export interface BoundedReferenceSeed {
  readonly kind: BoundedReferenceSeedKind;
  readonly candidateName: string | null;
}

export function readReferenceName(
  expression: ts.Expression,
): string | null {
  const seed = readReferenceSeed(expression);
  return seed.candidateName;
}

export function readReferenceSeed(
  expression: ts.Expression,
): BoundedReferenceSeed {
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
