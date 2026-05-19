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

export interface CheckerExpressionMemberOwnerProjectorHost {
  evaluateNode(
    expression: ExpressionAstNode,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType?: CheckerTypeReference | null,
  ): CheckerExpressionTypeEvaluation;

  arrowFunctionScope(
    expression: ArrowFunction,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType?: CheckerTypeReference | null,
  ): BindingScope;

  contextualArgumentType(
    expression: CheckerExpressionArgumentContextExpression,
    argumentIndex: number,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null;

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
    expression: ExpressionAstNode,
    offset: number,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null = null,
    contextualType: CheckerTypeReference | null = null,
  ): CheckerExpressionTypeEvaluation | null {
    switch (expression.$kind) {
      case 'AccessMember':
        return this.memberNameContainsOffset(expression, offset)
          ? this.host.evaluateNode(expression.object, scope, `${localKey}:owner:${expression.name.name}`, sourceAddressHandle)
          : this.evaluateAtOffset(expression.object, offset, scope, `${localKey}:object`, sourceAddressHandle);
      case 'CallMember':
        return this.memberNameContainsOffset(expression, offset)
          ? this.host.evaluateNode(expression.object, scope, `${localKey}:owner:${expression.name.name}`, sourceAddressHandle)
          : this.evaluateAtOffset(expression.object, offset, scope, `${localKey}:object`, sourceAddressHandle)
            ?? this.evaluateArgumentListAtOffset(expression, expression.args, offset, scope, `${localKey}:args`, sourceAddressHandle);
      case 'Paren':
      case 'Unary':
        return this.evaluateAtOffset(expression.expression, offset, scope, `${localKey}:expression`, sourceAddressHandle, contextualType);
      case 'BindingBehavior':
      case 'ValueConverter':
        return this.evaluateAtOffset(expression.expression, offset, scope, `${localKey}:expression`, sourceAddressHandle, contextualType)
          ?? this.evaluateListAtOffset(expression.args, offset, scope, `${localKey}:args`, sourceAddressHandle);
      case 'AccessKeyed':
        return this.evaluateAtOffset(expression.object, offset, scope, `${localKey}:object`, sourceAddressHandle)
          ?? this.evaluateAtOffset(expression.key, offset, scope, `${localKey}:key`, sourceAddressHandle);
      case 'CallFunction':
        return this.evaluateAtOffset(expression.func, offset, scope, `${localKey}:func`, sourceAddressHandle)
          ?? this.evaluateArgumentListAtOffset(expression, expression.args, offset, scope, `${localKey}:args`, sourceAddressHandle);
      case 'CallScope':
      case 'CallGlobal':
        return this.evaluateArgumentListAtOffset(expression, expression.args, offset, scope, `${localKey}:args`, sourceAddressHandle);
      case 'New':
        return this.evaluateAtOffset(expression.func, offset, scope, `${localKey}:func`, sourceAddressHandle)
          ?? this.evaluateArgumentListAtOffset(expression, expression.args, offset, scope, `${localKey}:args`, sourceAddressHandle);
      case 'TaggedTemplate':
        return this.evaluateAtOffset(expression.func, offset, scope, `${localKey}:func`, sourceAddressHandle)
          ?? this.evaluateArgumentListAtOffset(expression, expression.expressions, offset, scope, `${localKey}:expressions`, sourceAddressHandle);
      case 'Binary':
        return this.evaluateAtOffset(expression.left, offset, scope, `${localKey}:left`, sourceAddressHandle)
          ?? this.evaluateAtOffset(expression.right, offset, scope, `${localKey}:right`, sourceAddressHandle);
      case 'Conditional':
        return this.evaluateAtOffset(expression.condition, offset, scope, `${localKey}:condition`, sourceAddressHandle)
          ?? this.evaluateAtOffset(expression.yes, offset, scope, `${localKey}:yes`, sourceAddressHandle, contextualType)
          ?? this.evaluateAtOffset(expression.no, offset, scope, `${localKey}:no`, sourceAddressHandle, contextualType);
      case 'Assign':
        return this.evaluateAtOffset(expression.target, offset, scope, `${localKey}:target`, sourceAddressHandle)
          ?? this.evaluateAtOffset(expression.value, offset, scope, `${localKey}:value`, sourceAddressHandle);
      case 'ArrowFunction': {
        if (!this.expressionContainsOffset(expression.body, offset)) {
          return null;
        }
        return this.evaluateAtOffset(
          expression.body,
          offset,
          this.host.arrowFunctionScope(expression, scope, `${localKey}:arrow`, sourceAddressHandle, contextualType),
          `${localKey}:arrow-body`,
          sourceAddressHandle,
        );
      }
      case 'ArrayLiteral':
        return this.evaluateArrayLiteralAtOffset(expression, offset, scope, `${localKey}:elements`, sourceAddressHandle, contextualType);
      case 'ObjectLiteral':
        return this.evaluateObjectLiteralAtOffset(expression, offset, scope, `${localKey}:values`, sourceAddressHandle, contextualType);
      case 'Template':
      case 'Interpolation':
        return this.evaluateListAtOffset(expression.expressions, offset, scope, `${localKey}:expressions`, sourceAddressHandle);
      case 'ForOfStatement':
        return this.evaluateAtOffset(expression.iterable, offset, scope, `${localKey}:iterable`, sourceAddressHandle);
      case 'BindingPatternDefault':
        return this.evaluateAtOffset(expression.target, offset, scope, `${localKey}:target`, sourceAddressHandle)
          ?? this.evaluateAtOffset(expression.default, offset, scope, `${localKey}:default`, sourceAddressHandle);
      case 'ArrayBindingPattern':
        return this.evaluateListAtOffset(expression.elements, offset, scope, `${localKey}:elements`, sourceAddressHandle)
          ?? (expression.rest == null ? null : this.evaluateAtOffset(expression.rest, offset, scope, `${localKey}:rest`, sourceAddressHandle));
      case 'ObjectBindingPattern':
        return this.evaluateListAtOffset(expression.properties.map((property) => property.value), offset, scope, `${localKey}:properties`, sourceAddressHandle)
          ?? (expression.rest == null ? null : this.evaluateAtOffset(expression.rest, offset, scope, `${localKey}:rest`, sourceAddressHandle));
      case 'DestructuringAssignment':
        return this.evaluateAtOffset(expression.pattern, offset, scope, `${localKey}:pattern`, sourceAddressHandle)
          ?? this.evaluateAtOffset(expression.source, offset, scope, `${localKey}:source`, sourceAddressHandle);
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
    offset: number,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType: CheckerTypeReference | null,
  ): CheckerExpressionTypeEvaluation | null {
    for (const [index, element] of expression.elements.entries()) {
      if (!this.expressionContainsOffset(element, offset)) {
        continue;
      }
      const elementContextualType = this.host.contextualArrayElementType(
        contextualType,
        index,
        `${localKey}:${index}`,
        sourceAddressHandle,
      );
      const evaluation = this.evaluateAtOffset(
        element,
        offset,
        scope,
        `${localKey}:${index}`,
        sourceAddressHandle,
        elementContextualType,
      );
      if (evaluation != null) {
        return evaluation;
      }
    }
    return null;
  }

  private evaluateObjectLiteralAtOffset(
    expression: { readonly keys: readonly (number | string)[]; readonly values: readonly ExpressionAstNode[] },
    offset: number,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType: CheckerTypeReference | null,
  ): CheckerExpressionTypeEvaluation | null {
    for (const [index, value] of expression.values.entries()) {
      if (!this.expressionContainsOffset(value, offset)) {
        continue;
      }
      const key = String(expression.keys[index] ?? index);
      const propertyContextualType = this.host.contextualObjectPropertyType(
        contextualType,
        key,
        `${localKey}:${index}:${key}`,
        sourceAddressHandle,
      );
      const evaluation = this.evaluateAtOffset(
        value,
        offset,
        scope,
        `${localKey}:${index}`,
        sourceAddressHandle,
        propertyContextualType,
      );
      if (evaluation != null) {
        return evaluation;
      }
    }
    return null;
  }

  private evaluateListAtOffset(
    expressions: readonly ExpressionAstNode[],
    offset: number,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation | null {
    for (const [index, expression] of expressions.entries()) {
      if (!this.expressionContainsOffset(expression, offset)) {
        continue;
      }
      const evaluation = this.evaluateAtOffset(
        expression,
        offset,
        scope,
        `${localKey}:${index}`,
        sourceAddressHandle,
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
    offset: number,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerExpressionTypeEvaluation | null {
    for (const [index, expression] of expressions.entries()) {
      if (!this.expressionContainsOffset(expression, offset)) {
        continue;
      }
      const contextualType = this.host.contextualArgumentType(
        argumentContext,
        index,
        scope,
        `${localKey}:${index}`,
        sourceAddressHandle,
      );
      const evaluation = this.evaluateAtOffset(
        expression,
        offset,
        scope,
        `${localKey}:${index}`,
        sourceAddressHandle,
        contextualType,
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
