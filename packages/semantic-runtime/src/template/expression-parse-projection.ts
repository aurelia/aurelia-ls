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
} from '../expression/parse-result-algebra.js';
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
  switch (parse.result.kind) {
    case ExpressionParseResultKind.ExpressionSuccess:
    case ExpressionParseResultKind.EmptyExpressionSuccess:
    case ExpressionParseResultKind.InterpolationSuccess:
    case ExpressionParseResultKind.OpaqueSuccess:
      return parse.result.ast;
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
  if (parse.result.kind === ExpressionParseResultKind.IteratorSuccess) {
    return parse.result.ast.iterable;
  }
  return completedTemplateExpressionAstForParse(parse);
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
  return bindingExpressionAstForParse(parse)
    ?? runtimeAcceptedInterpolationAst(parse.result);
}

function runtimeAcceptedInterpolationAst(
  result: TemplateExpressionParse['result'],
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

  if (expressions.length + 1 !== result.rawParts.length) {
    return null;
  }

  return new Interpolation(
    result.primarySpan ?? activeExpression.span,
    [...result.rawParts],
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
