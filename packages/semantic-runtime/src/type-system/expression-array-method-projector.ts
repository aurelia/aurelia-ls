import {
  BindingContextSlot,
  BindingScope,
  BindingScopeOwnerKind,
} from '../configuration/scope.js';
import { uncommittedScopeFromParent } from '../configuration/uncommitted-binding-scope.js';
import type {
  ArrowFunction,
  CallMemberExpression,
  ExpressionAstNode,
} from '../expression/ast.js';
import {
  AureliaArrayCallbackParameterShape,
  AureliaArrayMethodTypeProjectionKind,
  aureliaArrayMethodSemanticsFor,
  type AureliaArrayMethodSemantics,
} from '../expression/array-method-semantics.js';
import type { AddressHandle } from '../kernel/handles.js';
import type { KernelStore } from '../kernel/store.js';
import {
  type CheckerExpressionTypeEvaluation,
  CheckerExpressionTypeEvaluationResultKind,
  CheckerExpressionTypeOpenKind,
} from './expression-type-evaluation.js';
import type { CheckerExpressionTypeEvaluationContext } from './expression-type-context.js';
import { CheckerExpressionTypeSupport } from './expression-type-support.js';
import {
  type CheckerTypeReference,
  type CheckerTypeShape,
} from './type-shape.js';
import { checkerTypeShapeIsSyntheticRuntimeArray } from './synthetic-array-type-surface.js';

export interface CheckerExpressionArrayMethodProjectorHost {
  evaluateNode(context: CheckerExpressionTypeEvaluationContext): CheckerExpressionTypeEvaluation;
}

type SyntheticArrayReceiverProjection =
  | {
    readonly kind: 'receiver';
    readonly typeShape: CheckerTypeShape;
    readonly elementType: CheckerTypeReference;
  }
  | {
    readonly kind: 'open';
    readonly evaluation: CheckerExpressionTypeEvaluation;
  };

/** Projects native Array method semantics for product-owned synthetic array and tuple shapes. */
export class CheckerExpressionArrayMethodProjector {
  constructor(
    private readonly store: KernelStore,
    private readonly support: CheckerExpressionTypeSupport,
    private readonly host: CheckerExpressionArrayMethodProjectorHost,
  ) {}

  evaluateMemberCall(
    expression: CallMemberExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): CheckerExpressionTypeEvaluation | null {
    const receiver = this.syntheticArrayReceiver(expression, context);
    if (receiver == null) {
      return null;
    }
    if (receiver.kind === 'open') {
      return receiver.evaluation;
    }

    const elementType = receiver.elementType;
    const method = expression.name.name;
    const semantics = aureliaArrayMethodSemanticsFor(method);
    if (semantics == null || semantics.typeProjectionKind == null) {
      return null;
    }

    switch (semantics.typeProjectionKind) {
      case AureliaArrayMethodTypeProjectionKind.ConcatElementArray:
        return this.evaluateConcat(expression, context, receiver.typeShape, elementType, method);
      case AureliaArrayMethodTypeProjectionKind.ElementOrUndefined:
        if (semantics.callbackParameterShape != null) {
          return this.evaluateCallbackPresenceThen(
            expression,
            receiver.typeShape,
            method,
            () => this.elementOrUndefined(expression, context, elementType, method),
          );
        }
        return this.elementOrUndefined(expression, context, elementType, method);
      case AureliaArrayMethodTypeProjectionKind.Number:
        return semantics.callbackParameterShape != null
          ? this.evaluateCallbackPresenceThen(
            expression,
            receiver.typeShape,
            method,
            () => this.primitive(expression, context, `${method}:number`, 'number'),
          )
          : this.primitive(expression, context, `${method}:number`, 'number');
      case AureliaArrayMethodTypeProjectionKind.Boolean:
        if (semantics.callbackParameterShape == null) {
          return this.primitive(expression, context, `${method}:boolean`, 'boolean');
        }
        return this.evaluateCallbackPresenceThen(
          expression,
          receiver.typeShape,
          method,
          () => this.primitive(expression, context, `${method}:boolean`, 'boolean'),
        );
      case AureliaArrayMethodTypeProjectionKind.String:
        return this.primitive(expression, context, `${method}:string`, 'string');
      case AureliaArrayMethodTypeProjectionKind.Undefined:
        return this.evaluateCallbackPresenceThen(
          expression,
          receiver.typeShape,
          method,
          () => this.primitive(expression, context, `${method}:undefined`, 'undefined'),
        );
      case AureliaArrayMethodTypeProjectionKind.ReceiverElementArrayWithCallbackPresence:
        return this.evaluateCallbackPresenceThen(
          expression,
          receiver.typeShape,
          method,
          () => this.arrayOf(expression, context, elementType, `${method}:array`, `Synthetic Array.${method} returns an array of the receiver element type.`),
        );
      case AureliaArrayMethodTypeProjectionKind.CallbackReturnArray:
        return this.evaluateCallbackThen(
          expression,
          context,
          receiver.typeShape,
          elementType,
          method,
          (callback) => this.arrayOf(
            expression,
            context,
            callback.typeReference,
            `${method}:array`,
            'Synthetic Array.map returns an array of the callback result type.',
          ),
        );
      case AureliaArrayMethodTypeProjectionKind.FlattenedCallbackReturnArray:
        return this.evaluateCallbackThen(
          expression,
          context,
          receiver.typeShape,
          elementType,
          method,
          (callback) => this.arrayOf(
            expression,
            context,
            this.flattenedElementTypeReference(
              callback.typeShape,
              callback.typeReference,
              context,
              `${method}:callback-return:flat-element`,
            ),
            `${method}:array`,
            'Synthetic Array.flatMap returns an array of the callback result or its iterated element type.',
          ),
        );
      case AureliaArrayMethodTypeProjectionKind.FlattenedReceiverElementArray: {
        const element = this.support.typeShapeForReference(elementType);
        return this.arrayOf(
          expression,
          context,
          this.flattenedElementTypeReference(
            element,
            elementType,
            context,
            `${method}:receiver-element:flat-element`,
          ),
          `${method}:array`,
          'Synthetic Array.flat returns an array of the element or nested element type.',
        );
      }
      case AureliaArrayMethodTypeProjectionKind.ReceiverElementArray:
        return this.arrayOf(expression, context, elementType, `${method}:array`, `Synthetic Array.${method} returns an array of the receiver element type.`);
      case AureliaArrayMethodTypeProjectionKind.ReceiverElementArrayWithComparator:
        return this.arrayOf(expression, context, elementType, `${method}:array`, `Synthetic Array.${method} returns an array of the receiver element type.`);
      case AureliaArrayMethodTypeProjectionKind.ReducerReturn:
        return this.evaluateReduce(expression, context, receiver.typeShape, elementType, method);
      default:
        return null;
    }
  }

  callbackScopeForArgument(
    expression: CallMemberExpression,
    argumentIndex: number,
    argumentExpression: ExpressionAstNode,
    context: CheckerExpressionTypeEvaluationContext,
  ): BindingScope | null {
    if (argumentIndex !== 0 || argumentExpression.$kind !== 'ArrowFunction' || expression.args[0] !== argumentExpression) {
      return null;
    }

    const receiver = this.syntheticArrayReceiver(expression, context);
    if (receiver == null || receiver.kind === 'open') {
      return null;
    }

    const method = expression.name.name;
    const semantics = aureliaArrayMethodSemanticsFor(method);
    if (semantics?.typeProjectionKind == null) {
      return null;
    }
    const parameterTypes = this.callbackParameterTypesForMethod(
      expression,
      context,
      receiver.typeShape,
      receiver.elementType,
      method,
      semantics,
    );
    return parameterTypes == null
      ? null
      : this.callbackScope(argumentExpression, context.scope, parameterTypes, `${method}:contextual-callback`, context.sourceAddressHandle);
  }

  private syntheticArrayReceiver(
    expression: CallMemberExpression,
    context: CheckerExpressionTypeEvaluationContext,
  ): SyntheticArrayReceiverProjection | null {
    const owner = this.host.evaluateNode(context.child(
      expression.object,
      `synthetic-array-owner:${expression.name.name}`,
    ));
    if (owner.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return { kind: 'open', evaluation: owner };
    }
    if (!checkerTypeShapeIsSyntheticRuntimeArray(owner.typeShape)) {
      return null;
    }
    const elementType = owner.typeShape.iteratedValueType;
    return elementType == null
      ? {
        kind: 'open',
        evaluation: this.support.open(
          CheckerExpressionTypeOpenKind.MissingIterableElementType,
          expression,
          `Synthetic array method '${expression.name.name}' needs an iterated element type.`,
          owner.typeReference,
        ),
      }
      : { kind: 'receiver', typeShape: owner.typeShape, elementType };
  }

  private callbackParameterTypesForMethod(
    expression: CallMemberExpression,
    context: CheckerExpressionTypeEvaluationContext,
    receiverType: CheckerTypeShape,
    elementType: CheckerTypeReference,
    method: string,
    semantics: AureliaArrayMethodSemantics,
  ): readonly CheckerTypeReference[] | null {
    switch (semantics.callbackParameterShape) {
      case AureliaArrayCallbackParameterShape.Iteration:
        return this.arrayIterationParameterTypes(
          expression,
          context,
          receiverType,
          [elementType],
          `${method}:callback`,
        );
      case AureliaArrayCallbackParameterShape.Comparator:
        return [elementType, elementType];
      case AureliaArrayCallbackParameterShape.Reducer: {
        const initial = expression.args[1] == null
          ? this.resolveElement(expression, elementType, context, `${method}:initial-element`)
          : this.host.evaluateNode(context.child(expression.args[1], `${method}:initial-value`));
        return initial.kind === CheckerExpressionTypeEvaluationResultKind.Open
          ? null
          : this.arrayIterationParameterTypes(expression, context, receiverType, [initial.typeReference, elementType], `${method}:callback`);
      }
      case null:
        return null;
    }
  }

  private evaluateReduce(
    expression: CallMemberExpression,
    context: CheckerExpressionTypeEvaluationContext,
    receiverType: CheckerTypeShape,
    elementType: CheckerTypeReference,
    method: string,
  ): CheckerExpressionTypeEvaluation {
    const callback = expression.args[0];
    if (callback?.$kind !== 'ArrowFunction') {
      return this.support.open(
        CheckerExpressionTypeOpenKind.UnsupportedCallTarget,
        expression,
        `Synthetic Array.${method} needs an inline Aurelia arrow callback before it can project the result type.`,
        receiverType.toReference(),
      );
    }
    const initial = expression.args[1] == null
      ? this.resolveElement(expression, elementType, context, `${method}:initial-element`)
      : this.host.evaluateNode(context.child(expression.args[1], `${method}:initial-value`));
    if (initial.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return initial;
    }
    const callbackResult = this.evaluateCallbackBody(
      callback,
      context,
      this.arrayIterationParameterTypes(callback, context, receiverType, [initial.typeReference, elementType], `${method}:callback`),
      `${method}:callback`,
    );
    return callbackResult;
  }

  private evaluateConcat(
    expression: CallMemberExpression,
    context: CheckerExpressionTypeEvaluationContext,
    receiverType: CheckerTypeShape,
    elementType: CheckerTypeReference,
    method: string,
  ): CheckerExpressionTypeEvaluation {
    const alternatives: Extract<CheckerExpressionTypeEvaluation, { readonly kind: CheckerExpressionTypeEvaluationResultKind.Type }>[] = [];
    const receiverElement = this.resolveElement(expression, elementType, context, `${method}:receiver-element`);
    if (receiverElement.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
      return receiverElement;
    }
    alternatives.push(receiverElement);

    for (let index = 0; index < expression.args.length; index += 1) {
      const argument = expression.args[index]!;
      const argumentType = this.host.evaluateNode(context.child(argument, `${method}:argument:${index}`));
      if (argumentType.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
        return argumentType;
      }
      if (checkerTypeShapeIsSyntheticRuntimeArray(argumentType.typeShape) && argumentType.typeShape.iteratedValueType != null) {
        const argumentElement = this.resolveElement(
          argument,
          this.flattenedElementTypeReference(
            argumentType.typeShape,
            argumentType.typeShape.iteratedValueType,
            context,
            `${method}:argument:${index}:iterated-element`,
          ),
          context,
          `${method}:argument:${index}:element`,
        );
        if (argumentElement.kind === CheckerExpressionTypeEvaluationResultKind.Open) {
          return argumentElement;
        }
        alternatives.push(argumentElement);
      } else {
        alternatives.push(argumentType);
      }
    }

    const union = this.support.evaluateTypeUnion(
      alternatives,
      `${context.projectionLocalKey()}:${method}:element-union`,
      context.sourceAddressHandle,
      'Synthetic Array.concat returns an array whose element type is the receiver element or concatenated argument element type.',
    );
    return union.kind === CheckerExpressionTypeEvaluationResultKind.Open
      ? union
      : this.arrayOf(expression, context, union.typeReference, `${method}:array`, 'Synthetic Array.concat returns an array of concatenated element types.');
  }

  private evaluateCallbackThen(
    expression: CallMemberExpression,
    context: CheckerExpressionTypeEvaluationContext,
    receiverType: CheckerTypeShape,
    elementType: CheckerTypeReference,
    method: string,
    close: (
      callbackResult: Extract<CheckerExpressionTypeEvaluation, { readonly kind: CheckerExpressionTypeEvaluationResultKind.Type }>,
    ) => CheckerExpressionTypeEvaluation,
    leadingParameterTypes: readonly CheckerTypeReference[] = [elementType],
  ): CheckerExpressionTypeEvaluation {
    const callback = expression.args[0];
    if (callback?.$kind !== 'ArrowFunction') {
      return this.support.open(
        CheckerExpressionTypeOpenKind.UnsupportedCallTarget,
        expression,
        `Synthetic Array.${method} needs an inline Aurelia arrow callback before it can project the result type.`,
        receiverType.toReference(),
      );
    }
    const callbackResult = this.evaluateCallbackBody(
      callback,
      context,
      this.arrayIterationParameterTypes(callback, context, receiverType, leadingParameterTypes, `${method}:callback`),
      `${method}:callback`,
    );
    return callbackResult.kind === CheckerExpressionTypeEvaluationResultKind.Open
      ? callbackResult
      : close(callbackResult);
  }

  private evaluateCallbackPresenceThen(
    expression: CallMemberExpression,
    receiverType: CheckerTypeShape,
    method: string,
    close: () => CheckerExpressionTypeEvaluation,
  ): CheckerExpressionTypeEvaluation {
    if (expression.args[0] == null) {
      return this.support.open(
        CheckerExpressionTypeOpenKind.UnsupportedCallTarget,
        expression,
        `Synthetic Array.${method} needs a callback argument before it can project the result type.`,
        receiverType.toReference(),
      );
    }
    return close();
  }

  private evaluateCallbackBody(
    callback: ArrowFunction,
    context: CheckerExpressionTypeEvaluationContext,
    parameterTypes: readonly CheckerTypeReference[],
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    return this.host.evaluateNode(context.childInScope(
      callback.body,
      this.callbackScope(callback, context.scope, parameterTypes, `${localKey}:scope`, context.sourceAddressHandle),
      `${localKey}:body`,
    ));
  }

  private arrayIterationParameterTypes(
    expression: ExpressionAstNode,
    context: CheckerExpressionTypeEvaluationContext,
    receiverType: CheckerTypeShape,
    leadingParameterTypes: readonly CheckerTypeReference[],
    localKey: string,
  ): readonly CheckerTypeReference[] {
    const numberType = this.primitive(expression, context, `${localKey}:index-type`, 'number');
    const indexType = numberType.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? numberType.typeReference
      : null;
    return [
      ...leadingParameterTypes,
      ...(indexType == null ? [] : [indexType]),
      receiverType.toReference(),
    ];
  }

  private callbackScope(
    callback: ArrowFunction,
    parentScope: BindingScope,
    parameterTypes: readonly CheckerTypeReference[],
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): BindingScope {
    const lastIndex = callback.args.length - 1;
    return uncommittedScopeFromParent(this.store, {
      localKey: `type-system:synthetic-array-callback:${callback.span.start}:${callback.span.end}:${localKey}`,
      parent: parentScope,
      ownerKind: BindingScopeOwnerKind.SyntheticView,
      sourceAddressHandle,
      bindingContextSlots: callback.args.map((parameter, index) => new BindingContextSlot(
        parameter.name.name,
        null,
        null,
        callback.rest && index === lastIndex
          ? this.support.synthesis.arrayType(
            parameterTypes[index] ?? parameterTypes.at(-1) ?? this.unknownType(`${localKey}:rest-element`, sourceAddressHandle),
            null,
            `${localKey}:rest:${index}`,
            sourceAddressHandle,
          ).toReference()
          : parameterTypes[index] ?? this.unknownType(`${localKey}:param:${index}`, sourceAddressHandle),
        sourceAddressHandle,
      )),
    });
  }

  private arrayOf(
    expression: ExpressionAstNode,
    context: CheckerExpressionTypeEvaluationContext,
    elementType: CheckerTypeReference,
    localKey: string,
    summary: string,
  ): CheckerExpressionTypeEvaluation {
    const lengthType = this.primitive(expression, context, `${localKey}:length`, 'number');
    const typeShape = this.support.synthesis.arrayType(
      elementType,
      lengthType.kind === CheckerExpressionTypeEvaluationResultKind.Type ? lengthType.typeReference : null,
      `${context.projectionLocalKey()}:${localKey}`,
      context.sourceAddressHandle,
    );
    return this.support.type(typeShape, summary, context.sourceAddressHandle);
  }

  private flattenedElementTypeReference(
    ownerType: CheckerTypeShape | null,
    fallback: CheckerTypeReference,
    context: CheckerExpressionTypeEvaluationContext,
    localKey: string,
  ): CheckerTypeReference {
    if (ownerType == null || ownerType.iteratedValueType == null) {
      return fallback;
    }
    const hydrated = this.support.typeAccess.iteratedValueType(
      ownerType,
      `${context.projectionLocalKey()}:${localKey}`,
      context.sourceAddressHandle,
    );
    return hydrated?.toReference() ?? ownerType.iteratedValueType;
  }

  private resolveElement(
    expression: ExpressionAstNode,
    elementType: CheckerTypeReference,
    context: CheckerExpressionTypeEvaluationContext,
    localKey: string,
  ): CheckerExpressionTypeEvaluation {
    return this.support.resolveReference(
      expression,
      elementType,
      `${context.projectionLocalKey()}:${localKey}`,
      CheckerExpressionTypeOpenKind.MissingIterableElementType,
      'Synthetic array element type could not be projected.',
    );
  }

  private unknownType(localKey: string, sourceAddressHandle: AddressHandle | null): CheckerTypeReference {
    return this.support.synthesis.unknownTypeReference(localKey, sourceAddressHandle);
  }

  private elementOrUndefined(
    expression: ExpressionAstNode,
    context: CheckerExpressionTypeEvaluationContext,
    elementType: CheckerTypeReference,
    method: string,
  ): CheckerExpressionTypeEvaluation {
    const element = this.resolveElement(expression, elementType, context, `${method}:element`);
    return element.kind === CheckerExpressionTypeEvaluationResultKind.Open
      ? element
      : this.unionWithUndefined(
        expression,
        context,
        element,
        `${method}:result`,
        `Synthetic Array.${method} can return an element or undefined.`,
      );
  }

  private primitive(
    expression: ExpressionAstNode,
    context: CheckerExpressionTypeEvaluationContext,
    localKey: string,
    primitive: 'boolean' | 'number' | 'string' | 'undefined',
  ): CheckerExpressionTypeEvaluation {
    return this.support.projectPrimitive(
      expression,
      context.scope,
      `${context.projectionLocalKey()}:${localKey}`,
      primitive,
      context.sourceAddressHandle,
    );
  }

  private unionWithUndefined(
    expression: ExpressionAstNode,
    context: CheckerExpressionTypeEvaluationContext,
    value: Extract<CheckerExpressionTypeEvaluation, { readonly kind: CheckerExpressionTypeEvaluationResultKind.Type }>,
    localKey: string,
    summary: string,
  ): CheckerExpressionTypeEvaluation {
    const undefinedValue = this.primitive(expression, context, `${localKey}:undefined`, 'undefined');
    return undefinedValue.kind === CheckerExpressionTypeEvaluationResultKind.Open
      ? undefinedValue
      : this.support.evaluateTypeUnion(
        [value, undefinedValue],
        `${context.projectionLocalKey()}:${localKey}`,
        context.sourceAddressHandle,
        summary,
      );
  }
}
