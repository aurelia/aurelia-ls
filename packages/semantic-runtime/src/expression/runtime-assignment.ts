import type {
  ExpressionAstNode,
  ValueConverterExpression,
} from './ast.js';
import { unwrapExpressionAstNodeParens } from './parse-result-inspection.js';

/**
 * Returns the expression shape Aurelia hands to runtime assignment policy after transparent wrappers.
 */
export function runtimeAssignmentTargetAstForExpression(
  expression: ExpressionAstNode,
): ExpressionAstNode {
  let current = unwrapExpressionAstNodeParens(expression);
  for (;;) {
    if (current.$kind !== 'BindingBehavior' && current.$kind !== 'ValueConverter') {
      return current;
    }
    current = unwrapExpressionAstNodeParens(current.expression);
  }
}

/**
 * Returns value converters in the order `astAssign` spends them during writeback.
 */
export function runtimeAssignmentValueConverterChainForExpression(
  expression: ExpressionAstNode,
): readonly ValueConverterExpression[] {
  const converters: ValueConverterExpression[] = [];
  let current = unwrapExpressionAstNodeParens(expression);
  for (;;) {
    if (current.$kind === 'ValueConverter') {
      converters.push(current);
      current = unwrapExpressionAstNodeParens(current.expression);
      continue;
    }
    if (current.$kind === 'BindingBehavior') {
      current = unwrapExpressionAstNodeParens(current.expression);
      continue;
    }
    return converters;
  }
}
