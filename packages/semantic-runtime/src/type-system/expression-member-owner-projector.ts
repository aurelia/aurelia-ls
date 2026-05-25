import type {
  AccessMemberExpression,
  ArrowFunction,
  CallMemberExpression,
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
}

/** Offset-aware projector for the owner expression behind a member-access cursor. */
export class CheckerExpressionMemberOwnerProjector {
  constructor(
    private readonly host: CheckerExpressionMemberOwnerProjectorHost,
  ) {}

  evaluateAtOffset(
    context: CheckerExpressionTypeEvaluationContext,
    offset: number,
  ): CheckerExpressionTypeEvaluation | null {
    const expression = context.expression;
    switch (expression.$kind) {
      case 'AccessMember':
        return this.memberNameContainsOffset(expression, offset)
          ? this.host.evaluateNode(context.child(expression.object, `owner:${expression.name.name}`))
          : this.evaluateAtOffset(context.child(expression.object, 'object'), offset);
      case 'CallMember':
        return this.memberNameContainsOffset(expression, offset)
          ? this.host.evaluateNode(context.child(expression.object, `owner:${expression.name.name}`))
          : this.evaluateAtOffset(context.child(expression.object, 'object'), offset)
            ?? this.evaluateArgumentListAtOffset(expression, expression.args, context, offset);
      case 'Paren':
      case 'Unary':
        return this.evaluateAtOffset(context.child(expression.expression, 'expression', context.contextualType), offset);
      case 'BindingBehavior':
      case 'ValueConverter':
        return this.evaluateAtOffset(context.child(expression.expression, 'expression', context.contextualType), offset)
          ?? this.evaluateListAtOffset(expression.args, context, 'args', offset);
      case 'AccessKeyed':
        return this.evaluateAtOffset(context.child(expression.object, 'object'), offset)
          ?? this.evaluateAtOffset(context.child(expression.key, 'key'), offset);
      case 'CallFunction':
        return this.evaluateAtOffset(context.child(expression.func, 'func'), offset)
          ?? this.evaluateArgumentListAtOffset(expression, expression.args, context, offset);
      case 'CallScope':
      case 'CallGlobal':
        return this.evaluateArgumentListAtOffset(expression, expression.args, context, offset);
      case 'New':
        return this.evaluateAtOffset(context.child(expression.func, 'func'), offset)
          ?? this.evaluateArgumentListAtOffset(expression, expression.args, context, offset);
      case 'TaggedTemplate':
        return this.evaluateAtOffset(context.child(expression.func, 'func'), offset)
          ?? this.evaluateArgumentListAtOffset(expression, expression.expressions, context, offset);
      case 'Binary':
        return this.evaluateAtOffset(context.child(expression.left, 'left'), offset)
          ?? this.evaluateAtOffset(context.child(expression.right, 'right'), offset);
      case 'Conditional':
        return this.evaluateAtOffset(context.child(expression.condition, 'condition'), offset)
          ?? this.evaluateAtOffset(context.child(expression.yes, 'yes', context.contextualType), offset)
          ?? this.evaluateAtOffset(context.child(expression.no, 'no', context.contextualType), offset);
      case 'Assign':
        return this.evaluateAtOffset(context.child(expression.target, 'target'), offset)
          ?? this.evaluateAtOffset(context.child(expression.value, 'value'), offset);
      case 'ArrowFunction': {
        if (!this.expressionContainsOffset(expression.body, offset)) {
          return null;
        }
        return this.evaluateAtOffset(
          context.childInScope(
            expression.body,
            this.host.arrowFunctionScope(expression, context),
            'arrow-body',
          ),
          offset,
        );
      }
      case 'ArrayLiteral':
        return this.evaluateArrayLiteralAtOffset(expression, context, offset);
      case 'ObjectLiteral':
        return this.evaluateObjectLiteralAtOffset(expression, context, offset);
      case 'Template':
      case 'Interpolation':
        return this.evaluateListAtOffset(expression.expressions, context, 'expressions', offset);
      case 'ForOfStatement':
        return this.evaluateAtOffset(context.child(expression.iterable, 'iterable'), offset);
      case 'BindingPatternDefault':
        return this.evaluateAtOffset(context.child(expression.target, 'target'), offset)
          ?? this.evaluateAtOffset(context.child(expression.default, 'default'), offset);
      case 'ArrayBindingPattern':
        return this.evaluateListAtOffset(expression.elements, context, 'elements', offset)
          ?? (expression.rest == null ? null : this.evaluateAtOffset(context.child(expression.rest, 'rest'), offset));
      case 'ObjectBindingPattern':
        return this.evaluateListAtOffset(expression.properties.map((property) => property.value), context, 'properties', offset)
          ?? (expression.rest == null ? null : this.evaluateAtOffset(context.child(expression.rest, 'rest'), offset));
      case 'DestructuringAssignment':
        return this.evaluateAtOffset(context.child(expression.pattern, 'pattern'), offset)
          ?? this.evaluateAtOffset(context.child(expression.source, 'source'), offset);
      case 'AccessThis':
      case 'AccessBoundary':
      case 'AccessScope':
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

  private evaluateArrayLiteralAtOffset(
    expression: { readonly elements: readonly ExpressionAstNode[] },
    context: CheckerExpressionTypeEvaluationContext,
    offset: number,
  ): CheckerExpressionTypeEvaluation | null {
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
      const evaluation = this.evaluateAtOffset(
        context.child(element, `elements:${index}`, elementContextualType),
        offset,
      );
      if (evaluation != null) {
        return evaluation;
      }
    }
    return null;
  }

  private evaluateObjectLiteralAtOffset(
    expression: { readonly keys: readonly (number | string)[]; readonly values: readonly ExpressionAstNode[] },
    context: CheckerExpressionTypeEvaluationContext,
    offset: number,
  ): CheckerExpressionTypeEvaluation | null {
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
      const evaluation = this.evaluateAtOffset(
        context.child(value, `values:${index}`, propertyContextualType),
        offset,
      );
      if (evaluation != null) {
        return evaluation;
      }
    }
    return null;
  }

  private evaluateListAtOffset(
    expressions: readonly ExpressionAstNode[],
    context: CheckerExpressionTypeEvaluationContext,
    localSuffix: string,
    offset: number,
  ): CheckerExpressionTypeEvaluation | null {
    for (const [index, expression] of expressions.entries()) {
      if (!this.expressionContainsOffset(expression, offset)) {
        continue;
      }
      const evaluation = this.evaluateAtOffset(
        context.child(expression, `${localSuffix}:${index}`),
        offset,
      );
      if (evaluation != null) {
        return evaluation;
      }
    }
    return null;
  }

  private evaluateArgumentListAtOffset(
    argumentContext: CheckerExpressionArgumentContextExpression,
    expressions: readonly ExpressionAstNode[],
    context: CheckerExpressionTypeEvaluationContext,
    offset: number,
  ): CheckerExpressionTypeEvaluation | null {
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
      const evaluation = this.evaluateAtOffset(
        contextualScope != null && expression.$kind === 'ArrowFunction' && this.expressionContainsOffset(expression.body, offset)
          ? context.childInScope(expression.body, contextualScope, `args:${index}:arrow-body`)
          : context.child(expression, `args:${index}`, contextualType),
        offset,
      );
      if (evaluation != null) {
        return evaluation;
      }
    }
    return null;
  }

  private memberNameContainsOffset(
    expression: AccessMemberExpression | CallMemberExpression,
    offset: number,
  ): boolean {
    return offset >= expression.object.span.end
      && offset <= expression.name.span.end;
  }

  private expressionContainsOffset(
    expression: ExpressionAstNode,
    offset: number,
  ): boolean {
    return expression.span.start <= offset && offset <= expression.span.end;
  }
}
