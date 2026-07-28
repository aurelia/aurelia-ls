import type {
  AccessMemberExpression,
  AccessScopeExpression,
  ArrowFunction,
  BinaryExpression,
  CallMemberExpression,
  CallScopeExpression,
  ConditionalExpression,
  ExpressionAstNode,
} from '../expression/ast.js';
import type { BindingScope } from '../configuration/scope.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { CheckerTypeReference } from './type-shape.js';
import type { CheckerExpressionTypeEvaluation } from './expression-type-evaluation.js';
import type { CheckerExpressionArgumentContextExpression } from './expression-argument-context-projector.js';
import type { CheckerExpressionTypeEvaluationContext } from './expression-type-context.js';

export interface CheckerExpressionMemberOwnerProjectorHost {
  evaluateNode(
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation;

  evaluateScopeOwner(
    expression: AccessScopeExpression | CallScopeExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation;

  arrowFunctionScope(
    expression: ArrowFunction,
    context: CheckerExpressionTypeEvaluationContext,
  ): BindingScope;

  contextualArgumentType(
    expression: CheckerExpressionArgumentContextExpression,
    argumentIndex: number,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerTypeReference | null;

  contextualArgumentScope(
    expression: CheckerExpressionArgumentContextExpression,
    argumentIndex: number,
    argumentExpression: ExpressionAstNode,
    context: CheckerExpressionTypeEvaluationContext,
  ): BindingScope | null;

  contextualArrayElementType(
    contextualType: CheckerTypeReference | null,
    elementIndex: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null;

  contextualObjectPropertyType(
    contextualType: CheckerTypeReference | null,
    propertyName: string,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null;

  shortCircuitRightScope(
    expression: BinaryExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): BindingScope;

  conditionalBranchScope(
    expression: ConditionalExpression,
    branch: 'truthy' | 'falsy',
    context: CheckerExpressionTypeEvaluationContext,
  ): BindingScope;
}

type CheckerExpressionOffsetSelector<TResult> = (
  context: CheckerExpressionTypeEvaluationContext,
  offset: number,
) => TResult | undefined;

/** Offset-aware projector for the owner expression behind a member-access cursor. */
export class CheckerExpressionMemberOwnerProjector {
  constructor(
    private readonly host: CheckerExpressionMemberOwnerProjectorHost,
  ) {}

  evaluateAtOffset(
    context: CheckerExpressionTypeEvaluationContext,
    offset: number,
  ): CheckerExpressionTypeEvaluation | null {
    return this.findAtOffset(
      context,
      offset,
      (candidate, candidateOffset) => this.memberOwnerAtOffset(candidate, candidateOffset),
    );
  }

  /** Locate the exact derived evaluation context that owns one expression nested inside the root AST. */
  contextForExpression(
    context: CheckerExpressionTypeEvaluationContext,
    expression: ExpressionAstNode,
  ): CheckerExpressionTypeEvaluationContext | null {
    return this.findAtOffset(
      context,
      expression.span.start,
      (candidate) => (
        candidate.expression === expression
        || sameExpressionOccurrence(candidate.expression, expression)
      )
        ? candidate
        : undefined,
    );
  }

  private memberOwnerAtOffset(
    context: CheckerExpressionTypeEvaluationContext,
    offset: number,
  ): CheckerExpressionTypeEvaluation | undefined {
    const expression = context.expression;
    switch (expression.$kind) {
      case 'AccessMember':
        return this.memberNameContainsOffset(expression, offset)
          ? this.host.evaluateNode(context.child(expression.object, `owner:${expression.name.name}`))
          : undefined;
      case 'CallMember':
        return this.memberNameContainsOffset(expression, offset)
          ? this.host.evaluateNode(context.child(expression.object, `owner:${expression.name.name}`))
          : undefined;
      case 'AccessScope':
        return this.memberNameContainsOffset(expression, offset)
          ? this.host.evaluateScopeOwner(expression, context)
          : undefined;
      case 'CallScope':
        return this.memberNameContainsOffset(expression, offset)
          ? this.host.evaluateScopeOwner(expression, context)
          : undefined;
      case 'AccessKeyed':
        return this.expressionContainsOffset(expression.key, offset)
          ? this.host.evaluateNode(context.child(expression.object, 'keyed-owner'))
          : undefined;
      default:
        return undefined;
    }
  }

  private findAtOffset<TResult>(
    context: CheckerExpressionTypeEvaluationContext,
    offset: number,
    select: CheckerExpressionOffsetSelector<TResult>,
  ): TResult | null {
    const selected = select(context, offset);
    if (selected !== undefined) {
      return selected;
    }

    const expression = context.expression;
    switch (expression.$kind) {
      case 'AccessMember':
        return this.findAtOffset(context.child(expression.object, 'object'), offset, select);
      case 'CallMember':
        return this.findAtOffset(context.child(expression.object, 'object'), offset, select)
          ?? this.findArgumentListAtOffset(expression, expression.args, context, offset, select);
      case 'AccessScope':
        return null;
      case 'Paren':
      case 'Unary':
        return this.findAtOffset(
          context.child(expression.expression, 'expression', context.contextualType),
          offset,
          select,
        );
      case 'BindingBehavior':
      case 'ValueConverter':
        return this.findAtOffset(
          context.child(expression.expression, 'expression', context.contextualType),
          offset,
          select,
        ) ?? this.findListAtOffset(expression.args, context, 'args', offset, select);
      case 'AccessKeyed':
        return this.findAtOffset(context.child(expression.object, 'object'), offset, select)
          ?? this.findAtOffset(context.child(expression.key, 'key'), offset, select);
      case 'CallFunction':
        return this.findAtOffset(context.child(expression.func, 'func'), offset, select)
          ?? this.findArgumentListAtOffset(expression, expression.args, context, offset, select);
      case 'CallScope':
        return this.findArgumentListAtOffset(expression, expression.args, context, offset, select);
      case 'CallGlobal':
        return this.findArgumentListAtOffset(expression, expression.args, context, offset, select);
      case 'New':
        return this.findAtOffset(context.child(expression.func, 'func'), offset, select)
          ?? this.findArgumentListAtOffset(expression, expression.args, context, offset, select);
      case 'TaggedTemplate':
        return this.findAtOffset(context.child(expression.func, 'func'), offset, select)
          ?? this.findArgumentListAtOffset(expression, expression.expressions, context, offset, select);
      case 'Binary':
        return this.findAtOffset(context.child(expression.left, 'left'), offset, select)
          ?? this.findAtOffset(context.childInScope(
            expression.right,
            this.host.shortCircuitRightScope(expression, context),
            'right',
          ), offset, select);
      case 'Conditional':
        return this.findAtOffset(context.child(expression.condition, 'condition'), offset, select)
          ?? this.findAtOffset(context.childInScope(
            expression.yes,
            this.host.conditionalBranchScope(expression, 'truthy', context),
            'yes',
            context.contextualType,
          ), offset, select)
          ?? this.findAtOffset(context.childInScope(
            expression.no,
            this.host.conditionalBranchScope(expression, 'falsy', context),
            'no',
            context.contextualType,
          ), offset, select);
      case 'Assign':
        return this.findAtOffset(context.child(expression.target, 'target'), offset, select)
          ?? this.findAtOffset(context.child(expression.value, 'value'), offset, select);
      case 'ArrowFunction': {
        const functionScope = this.host.arrowFunctionScope(expression, context);
        for (let index = 0; index < expression.args.length; index += 1) {
          const parameter = expression.args[index];
          if (parameter == null) {
            continue;
          }
          if (!this.expressionContainsOffset(parameter, offset)) {
            continue;
          }
          return this.findAtOffset(
            context.childInScope(
              parameter,
              functionScope,
              `arrow-parameter:${index}`,
            ),
            offset,
            select,
          );
        }
        if (!this.expressionContainsOffset(expression.body, offset)) {
          return null;
        }
        return this.findAtOffset(
          context.childInScope(
            expression.body,
            functionScope,
            'arrow-body',
          ),
          offset,
          select,
        );
      }
      case 'ArrayLiteral':
        return this.findArrayLiteralAtOffset(expression, context, offset, select);
      case 'ObjectLiteral':
        return this.findObjectLiteralAtOffset(expression, context, offset, select);
      case 'Template':
      case 'Interpolation':
        return this.findListAtOffset(expression.expressions, context, 'expressions', offset, select);
      case 'ForOfStatement':
        return this.findAtOffset(context.child(expression.iterable, 'iterable'), offset, select);
      case 'BindingPatternDefault':
        return this.findAtOffset(context.child(expression.target, 'target'), offset, select)
          ?? this.findAtOffset(context.child(expression.default, 'default'), offset, select);
      case 'ArrayBindingPattern':
        return this.findListAtOffset(expression.elements, context, 'elements', offset, select)
          ?? (expression.rest == null
            ? null
            : this.findAtOffset(context.child(expression.rest, 'rest'), offset, select));
      case 'ObjectBindingPattern':
        return this.findListAtOffset(
          expression.properties.map((property) => property.value),
          context,
          'properties',
          offset,
          select,
        ) ?? (expression.rest == null
          ? null
          : this.findAtOffset(context.child(expression.rest, 'rest'), offset, select));
      case 'DestructuringAssignment':
        return this.findAtOffset(context.child(expression.pattern, 'pattern'), offset, select)
          ?? this.findAtOffset(context.child(expression.source, 'source'), offset, select);
      case 'AccessThis':
      case 'AccessBoundary':
      case 'AccessGlobal':
      case 'PrimitiveLiteral':
      case 'Identifier':
      case 'BindingIdentifier':
      case 'BindingPatternHole':
      case 'Custom':
        return null;
    }
    return null;
  }

  private findArrayLiteralAtOffset<TResult>(
    expression: { readonly elements: readonly ExpressionAstNode[] },
    context: CheckerExpressionTypeEvaluationContext,
    offset: number,
    select: CheckerExpressionOffsetSelector<TResult>,
  ): TResult | null {
    for (const [index, element] of expression.elements.entries()) {
      if (!this.expressionContainsOffset(element, offset)) {
        continue;
      }
      const elementContextualType = this.host.contextualArrayElementType(
        context.contextualType,
        index,
        `${context.projectionLocalKey()}:elements:${index}`,
        context.sourceAddressHandle,
      );
      const result = this.findAtOffset(
        context.child(element, `elements:${index}`, elementContextualType),
        offset,
        select,
      );
      if (result != null) {
        return result;
      }
    }
    return null;
  }

  private findObjectLiteralAtOffset<TResult>(
    expression: { readonly keys: readonly (number | string)[]; readonly values: readonly ExpressionAstNode[] },
    context: CheckerExpressionTypeEvaluationContext,
    offset: number,
    select: CheckerExpressionOffsetSelector<TResult>,
  ): TResult | null {
    for (const [index, value] of expression.values.entries()) {
      if (!this.expressionContainsOffset(value, offset)) {
        continue;
      }
      const key = String(expression.keys[index] ?? index);
      const propertyContextualType = this.host.contextualObjectPropertyType(
        context.contextualType,
        key,
        `${context.projectionLocalKey()}:values:${index}:${key}`,
        context.sourceAddressHandle,
      );
      const result = this.findAtOffset(
        context.child(value, `values:${index}`, propertyContextualType),
        offset,
        select,
      );
      if (result != null) {
        return result;
      }
    }
    return null;
  }

  private findListAtOffset<TResult>(
    expressions: readonly ExpressionAstNode[],
    context: CheckerExpressionTypeEvaluationContext,
    localSuffix: string,
    offset: number,
    select: CheckerExpressionOffsetSelector<TResult>,
  ): TResult | null {
    for (const [index, expression] of expressions.entries()) {
      if (!this.expressionContainsOffset(expression, offset)) {
        continue;
      }
      const result = this.findAtOffset(
        context.child(expression, `${localSuffix}:${index}`),
        offset,
        select,
      );
      if (result != null) {
        return result;
      }
    }
    return null;
  }

  private findArgumentListAtOffset<TResult>(
    argumentContext: CheckerExpressionArgumentContextExpression,
    expressions: readonly ExpressionAstNode[],
    context: CheckerExpressionTypeEvaluationContext,
    offset: number,
    select: CheckerExpressionOffsetSelector<TResult>,
  ): TResult | null {
    for (const [index, expression] of expressions.entries()) {
      if (!this.expressionContainsOffset(expression, offset)) {
        continue;
      }
      const contextualType = this.host.contextualArgumentType(
        argumentContext,
        index,
        context,
      );
      const contextualScope = this.host.contextualArgumentScope(
        argumentContext,
        index,
        expression,
        context,
      );
      const result = this.findAtOffset(
        contextualScope != null && expression.$kind === 'ArrowFunction' && this.expressionContainsOffset(expression.body, offset)
          ? context.childInScope(expression.body, contextualScope, `args:${index}:arrow-body`)
          : context.child(expression, `args:${index}`, contextualType),
        offset,
        select,
      );
      if (result != null) {
        return result;
      }
    }
    return null;
  }

  private memberNameContainsOffset(
    expression: AccessMemberExpression | CallMemberExpression | AccessScopeExpression | CallScopeExpression,
    offset: number,
  ): boolean {
    return expression.$kind === 'AccessMember' || expression.$kind === 'CallMember'
      ? offset >= expression.object.span.end && offset <= expression.name.span.end
      : this.expressionContainsOffset(expression.name, offset);
  }

  private expressionContainsOffset(
    expression: ExpressionAstNode,
    offset: number,
  ): boolean {
    return expression.span.start <= offset && offset <= expression.span.end;
  }
}

function sameExpressionOccurrence(
  left: ExpressionAstNode,
  right: ExpressionAstNode,
): boolean {
  if (
    left.$kind !== right.$kind
    || left.span.start !== right.span.start
    || left.span.end !== right.span.end
  ) {
    return false;
  }
  const leftFile = left.span.file?.id ?? null;
  const rightFile = right.span.file?.id ?? null;
  // Cursor parse products may retain parser-local coordinates while runtime projections enrich the same AST
  // occurrence with a file identity. A conflicting pair of known files still proves distinct occurrences.
  return leftFile == null || rightFile == null || leftFile === rightFile;
}
