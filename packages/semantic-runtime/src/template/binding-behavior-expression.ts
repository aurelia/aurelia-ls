import {
  BindingBehaviorExpression,
  type ExpressionAstNode,
  type IsAssign,
  PrimitiveLiteralExpression,
  ValueConverterExpression,
} from '../expression/ast.js';

/** Walk a runtime-accepted expression from the outer binding-behavior chain inward. */
export function bindingBehaviorExpressions(expression: ExpressionAstNode): readonly BindingBehaviorExpression[] {
  if (expression instanceof BindingBehaviorExpression) {
    return [
      expression,
      ...bindingBehaviorExpressions(expression.expression),
    ];
  }
  if (expression instanceof ValueConverterExpression) {
    return bindingBehaviorExpressions(expression.expression);
  }
  if (expression.$kind === 'Interpolation') {
    return expression.expressions.flatMap((part) => bindingBehaviorExpressions(part));
  }
  return [];
}

export function staticStringLiteralExpression(expression: IsAssign | null | undefined): string | null {
  return expression instanceof PrimitiveLiteralExpression && typeof expression.value === 'string'
    ? expression.value
    : null;
}
