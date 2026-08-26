import {
  BindingBehaviorExpression,
  type ExpressionAstNode,
  type IsAssign,
  PrimitiveLiteralExpression,
  ValueConverterExpression,
} from '../expression/ast.js';
import { ResourceDefinitionKind } from '../resources/resource-kind.js';

export type ExpressionResourceNode = BindingBehaviorExpression | ValueConverterExpression;

/** Authored expression-resource wrapper before compiler lookup or runtime application. */
export class ExpressionResourceOccurrence<TExpression extends ExpressionResourceNode = ExpressionResourceNode> {
  constructor(
    readonly resourceKind: ResourceDefinitionKind.BindingBehavior | ResourceDefinitionKind.ValueConverter,
    readonly expression: TExpression,
    /** Interpolation-hole index; zero for ordinary binding expressions. */
    readonly chainIndex: number,
    /** Structural wrapper depth, counted from the outermost resource wrapper. */
    readonly chainDepth: number,
  ) {}
}

/** Walk each authored resource chain outermost-to-innermost without conflating separate interpolation holes. */
export function expressionResourceOccurrences(
  expression: ExpressionAstNode,
): readonly ExpressionResourceOccurrence[] {
  if (expression.$kind === 'Interpolation') {
    return expression.expressions.flatMap((part, chainIndex) =>
      resourceOccurrencesForChain(part, chainIndex, 0)
    );
  }
  return resourceOccurrencesForChain(expression, 0, 0);
}

/** Walk one already-selected expression while retaining its aggregate interpolation-chain index. */
export function expressionResourceOccurrencesAtChain(
  expression: ExpressionAstNode,
  expressionChainIndex: number,
): readonly ExpressionResourceOccurrence[] {
  return resourceOccurrencesForChain(expression, expressionChainIndex, 0);
}

export function bindingBehaviorResourceOccurrences(
  expression: ExpressionAstNode,
): readonly ExpressionResourceOccurrence<BindingBehaviorExpression>[] {
  return expressionResourceOccurrences(expression).filter(isBindingBehaviorOccurrence);
}

export function valueConverterResourceOccurrences(
  expression: ExpressionAstNode,
): readonly ExpressionResourceOccurrence<ValueConverterExpression>[] {
  return expressionResourceOccurrences(expression).filter(isValueConverterOccurrence);
}

export function staticStringLiteralExpression(expression: IsAssign | null | undefined): string | null {
  return expression instanceof PrimitiveLiteralExpression && typeof expression.value === 'string'
    ? expression.value
    : null;
}

function resourceOccurrencesForChain(
  expression: ExpressionAstNode,
  chainIndex: number,
  chainDepth: number,
): readonly ExpressionResourceOccurrence[] {
  if (expression instanceof BindingBehaviorExpression) {
    return [
      new ExpressionResourceOccurrence(
        ResourceDefinitionKind.BindingBehavior,
        expression,
        chainIndex,
        chainDepth,
      ),
      ...resourceOccurrencesForChain(expression.expression, chainIndex, chainDepth + 1),
    ];
  }
  if (expression instanceof ValueConverterExpression) {
    return [
      new ExpressionResourceOccurrence(
        ResourceDefinitionKind.ValueConverter,
        expression,
        chainIndex,
        chainDepth,
      ),
      ...resourceOccurrencesForChain(expression.expression, chainIndex, chainDepth + 1),
    ];
  }
  return [];
}

export function isBindingBehaviorOccurrence(
  occurrence: ExpressionResourceOccurrence,
): occurrence is ExpressionResourceOccurrence<BindingBehaviorExpression> {
  return occurrence.expression instanceof BindingBehaviorExpression;
}

export function isValueConverterOccurrence(
  occurrence: ExpressionResourceOccurrence,
): occurrence is ExpressionResourceOccurrence<ValueConverterExpression> {
  return occurrence.expression instanceof ValueConverterExpression;
}
