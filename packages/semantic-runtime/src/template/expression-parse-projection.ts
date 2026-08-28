import {
  Interpolation,
  type ExpressionAstNode,
  type IsBindingBehavior,
} from '../expression/ast.js';
import {
  ExpressionExpectedContinuationClass,
  ExpressionFrontierKind,
  ExpressionGapKind,
  ExpressionParseResultKind,
  InterpolationHoleBoundaryKind,
  type InterpolationFrontierPublication,
  type ExpressionParseResult,
} from '../expression/parse-result-algebra.js';
import { runtimeAssignmentTargetAstForExpression } from '../expression/runtime-assignment.js';
import { expressionSpanContainsOffset } from '../expression/source-span.js';
import type { TemplateExpressionParse } from './value-site.js';

type IndexedBindingExpression = {
  readonly index: number;
  readonly expression: IsBindingBehavior;
};

/**
 * Returns the completed template expression AST that is directly represented by
 * the parser publication. Iterator headers are intentionally excluded because
 * their iterable is only one lane inside the header product.
 */
export function completedTemplateExpressionAstForParse(
  parse: TemplateExpressionParse,
): ExpressionAstNode | null {
  return completedTemplateExpressionAstForResult(parse.result);
}

/** Result-level form shared by durable parse products and candidate-owned live compiler expression calls. */
export function completedTemplateExpressionAstForResult(
  result: ExpressionParseResult,
): ExpressionAstNode | null {
  switch (result.kind) {
    case ExpressionParseResultKind.ExpressionSuccess:
    case ExpressionParseResultKind.EmptyExpressionSuccess:
    case ExpressionParseResultKind.InterpolationSuccess:
    case ExpressionParseResultKind.OpaqueSuccess:
      return result.ast;
    default:
      return null;
  }
}

/**
 * Returns the binding expression used by runtime binding consumers. For
 * iterator headers this is the iterable lane, matching Aurelia's runtime use of
 * the header expression during repeat-style scope/data-flow work.
 */
export function bindingExpressionAstForParse(
  parse: TemplateExpressionParse,
): ExpressionAstNode | null {
  return bindingExpressionAstForResult(parse.result);
}

export function bindingExpressionAstForResult(
  result: ExpressionParseResult,
): ExpressionAstNode | null {
  if (result.kind === ExpressionParseResultKind.IteratorSuccess) {
    return result.ast.iterable;
  }
  return completedTemplateExpressionAstForResult(result);
}

/** Returns the runtime binding expression, narrowed to the active interpolation hole when a cursor offset is inside one. */
export function bindingExpressionAstForParseAtOffset(
  parse: TemplateExpressionParse,
  offset: number,
): ExpressionAstNode | null {
  const expression = bindingExpressionAstForParse(parse);
  if (expression?.$kind !== 'Interpolation') {
    return expression;
  }
  return expression.expressions.find((part) => expressionSpanContainsOffset(part.span, offset))
    ?? expression;
}

/**
 * Returns a binding expression projection for syntax that Aurelia's runtime
 * expression parser accepts even when the authoring parser keeps a stricter
 * frontier publication. The parser result kind/state remains unchanged, so API
 * rows can still expose the authored strictness pressure while runtime-shaped
 * data-flow keeps moving.
 */
export function runtimeAcceptedBindingExpressionAstForParse(
  parse: TemplateExpressionParse,
): ExpressionAstNode | null {
  return runtimeAcceptedBindingExpressionAstForResult(parse.result);
}

export function runtimeAcceptedBindingExpressionAstForResult(
  result: ExpressionParseResult,
): ExpressionAstNode | null {
  return bindingExpressionAstForResult(result)
    ?? runtimeAcceptedInterpolationAst(result);
}

/** Select one runtime-evaluable chain while retaining the parser product as aggregate authority. */
export function runtimeAcceptedBindingExpressionAstForParseChain(
  parse: TemplateExpressionParse,
  expressionChainIndex: number,
): ExpressionAstNode | null {
  return runtimeAcceptedBindingExpressionAstForResultChain(parse.result, expressionChainIndex);
}

export function runtimeAcceptedBindingExpressionAstForResultChain(
  result: ExpressionParseResult,
  expressionChainIndex: number,
): ExpressionAstNode | null {
  const aggregate = runtimeAcceptedBindingExpressionAstForResult(result);
  if (aggregate?.$kind === 'Interpolation') {
    return aggregate.expressions[expressionChainIndex] ?? null;
  }
  return expressionChainIndex === 0 ? aggregate : null;
}

export function runtimeAssignmentTargetAstForParse(
  parse: TemplateExpressionParse,
): ExpressionAstNode | null {
  const ast = runtimeAcceptedBindingExpressionAstForParse(parse);
  return ast == null ? null : runtimeAssignmentTargetAstForExpression(ast);
}

function runtimeAcceptedInterpolationAst(
  result: ExpressionParseResult,
): Interpolation | null {
  if (result.kind !== ExpressionParseResultKind.InterpolationFrontierPublication) {
    return null;
  }
  if (!isRuntimeAcceptedMissingInterpolationClose(result)) {
    return null;
  }

  const activeExpression = activeHoleBindingExpression(result);
  if (activeExpression == null) {
    return null;
  }

  const expressions = [
    ...result.closedHoles
      .filter((hole) => isBindingExpressionAst(hole.ast))
      .map((hole): IndexedBindingExpression => ({
        index: hole.index,
        expression: hole.ast,
      })),
    {
      index: result.activeHole.holeIndex,
      expression: activeExpression,
    },
  ].sort((left, right) => left.index - right.index);

  if (expressions.length + 1 !== result.parts.length) {
    return null;
  }

  return new Interpolation(
    result.primarySpan ?? activeExpression.span,
    [...result.parts],
    expressions.map((entry) => entry.expression),
  );
}

function isRuntimeAcceptedMissingInterpolationClose(
  result: InterpolationFrontierPublication,
): boolean {
  return result.activeHole.boundaryState.kind === InterpolationHoleBoundaryKind.Unterminated
    && result.activeHole.frontierKind === ExpressionFrontierKind.AwaitingClosingDelimiter
    && result.activeHole.expectedContinuationClasses.includes(ExpressionExpectedContinuationClass.InterpolationHoleClose)
    && result.activeHole.gapDescriptors.some((gap) =>
      gap.gapKind === ExpressionGapKind.MissingClosingDelimiter
      && gap.expectedContinuationClasses.includes(ExpressionExpectedContinuationClass.InterpolationHoleClose)
    );
}

function activeHoleBindingExpression(
  result: InterpolationFrontierPublication,
): IsBindingBehavior | null {
  const activeExpression = result.activeHole.closedSubtreeRefs.find((ref) => ref.relation === 'root-prefix')?.node ?? null;
  return activeExpression != null && isBindingExpressionAst(activeExpression)
    ? activeExpression
    : null;
}

function isBindingExpressionAst(
  expression: ExpressionAstNode,
): expression is IsBindingBehavior {
  switch (expression.$kind) {
    case 'BindingIdentifier':
    case 'ForOfStatement':
    case 'Interpolation':
    case 'BindingPatternDefault':
    case 'BindingPatternHole':
    case 'ArrayBindingPattern':
    case 'ObjectBindingPattern':
      return false;
    default:
      return true;
  }
}
