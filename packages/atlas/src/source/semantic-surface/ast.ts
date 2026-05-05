import ts from "typescript";

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

export function visitNode(
  node: ts.Node,
  visitor: (node: ts.Node) => void,
): void {
  visitor(node);
  ts.forEachChild(node, (child) => visitNode(child, visitor));
}
