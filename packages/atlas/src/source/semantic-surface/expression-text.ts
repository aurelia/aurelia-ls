import ts from "typescript";

/** Render an expression as a compact source-shape key without embedding argument or callback bodies. */
export function compactExpressionText(
  expression: ts.Expression,
  sourceFile: ts.SourceFile = expression.getSourceFile(),
): string {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return `${compactExpressionText(expression.expression, sourceFile)}.${expression.name.text}`;
  }
  if (ts.isCallExpression(expression)) {
    return `${compactExpressionText(expression.expression, sourceFile)}()`;
  }
  if (ts.isNewExpression(expression)) {
    return `new ${compactExpressionText(expression.expression, sourceFile)}`;
  }
  if (ts.isElementAccessExpression(expression)) {
    return `${compactExpressionText(expression.expression, sourceFile)}[]`;
  }
  if (ts.isParenthesizedExpression(expression) || ts.isNonNullExpression(expression)) {
    return compactExpressionText(expression.expression, sourceFile);
  }
  if (ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression)) {
    return compactExpressionText(expression.expression, sourceFile);
  }
  return expression.getText(sourceFile);
}
