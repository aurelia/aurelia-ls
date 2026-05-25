import type { ArrowFunction, ExpressionAstNode } from '../expression/ast.js';
import type { AddressHandle } from '../kernel/handles.js';
import { localKeyPart } from '../kernel/local-key.js';
import type { KernelStore } from '../kernel/store.js';
import {
  BindingContextSlot,
  BindingScope,
} from '../configuration/scope.js';
import { uncommittedScopeFromParent } from '../configuration/uncommitted-binding-scope.js';
import { CheckerTypeShapeAccess } from './checker-type-shape-access.js';
import {
  CheckerExpressionCallableParameterKind,
  CheckerExpressionCallProjector,
} from './expression-call-projector.js';
import {
  CheckerExpressionTypeEvaluationResultKind,
} from './expression-type-evaluation.js';
import { CheckerExpressionTypeSynthesizer } from './expression-type-synthesis.js';
import { CheckerExpressionTypeSupport } from './expression-type-support.js';
import type { CheckerTypeReference, CheckerTypeShape } from './type-shape.js';

/** Projects contextual target types into expression-local scopes and literal element/property contexts. */
export class CheckerExpressionContextualTypeProjector {
  constructor(
    private readonly store: KernelStore,
    private readonly support: CheckerExpressionTypeSupport,
    private readonly typeAccess: CheckerTypeShapeAccess,
    private readonly calls: CheckerExpressionCallProjector,
    private readonly synthesis: CheckerExpressionTypeSynthesizer,
  ) {}

  arrowFunctionScope(
    expression: ArrowFunction,
    parentScope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType: CheckerTypeReference | null = null,
  ): BindingScope {
    return uncommittedScopeFromParent(this.store, {
      localKey: `type-system:arrow:${localKey}`,
      parent: parentScope,
      bindingContextSlots: this.arrowParameterSlots(expression, parentScope, localKey, sourceAddressHandle, contextualType),
      sourceAddressHandle,
    });
  }

  arrowFunctionScopeForParameterTypes(
    expression: ArrowFunction,
    parentScope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    parameterTypes: readonly CheckerTypeReference[],
  ): BindingScope {
    return uncommittedScopeFromParent(this.store, {
      localKey: `type-system:arrow:${localKey}:parameters`,
      parent: parentScope,
      bindingContextSlots: this.arrowParameterSlotsFromTypes(expression, localKey, sourceAddressHandle, parameterTypes),
      sourceAddressHandle,
    });
  }

  contextualArrayElementType(
    contextualType: CheckerTypeReference | null,
    elementIndex: number,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const typeShape = this.support.typeShapeForReference(contextualType);
    const elementType = typeShape == null
      ? null
      : this.typeAccess.numericIndexValueType(typeShape, elementIndex, localKey, sourceAddressHandle);
    return elementType?.toReference() ?? null;
  }

  contextualObjectPropertyType(
    contextualType: CheckerTypeReference | null,
    propertyName: string,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const typeShape = this.support.typeShapeForReference(contextualType);
    const propertyType = typeShape == null
      ? null
      : this.typeAccess.memberValueType(typeShape, propertyName, `${localKey}:${localKeyPart(propertyName)}`);
    if (propertyType != null) {
      return propertyType.toReference();
    }
    const numericPropertyName = Number(propertyName);
    return Number.isInteger(numericPropertyName)
      ? this.contextualArrayElementType(contextualType, numericPropertyName, localKey, sourceAddressHandle)
      : null;
  }

  private arrowParameterSlots(
    expression: ArrowFunction,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    contextualType: CheckerTypeReference | null,
  ): readonly BindingContextSlot[] {
    return expression.args.map((parameter, index) => new BindingContextSlot(
      parameter.name.name,
      null,
      null,
      this.arrowParameterType(expression, scope, localKey, sourceAddressHandle, parameter.name.name, index, contextualType),
      sourceAddressHandle,
    ));
  }

  private arrowParameterSlotsFromTypes(
    expression: ArrowFunction,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    parameterTypes: readonly CheckerTypeReference[],
  ): readonly BindingContextSlot[] {
    return expression.args.map((parameter, index) => new BindingContextSlot(
      parameter.name.name,
      null,
      null,
      parameterTypes[index] ?? this.synthesizeUnknownType(`${localKey}:param:${index}:${parameter.name.name}`, sourceAddressHandle),
      sourceAddressHandle,
    ));
  }

  private arrowParameterType(
    expression: ArrowFunction,
    scope: BindingScope,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
    name: string,
    index: number,
    contextualType: CheckerTypeReference | null,
  ): CheckerTypeReference {
    const isRest = expression.rest && index === expression.args.length - 1;
    const listenerEventType = index === 0 && !isRest
      ? scope.lookup('$event').slot?.targetType ?? null
      : null;
    if (listenerEventType != null) {
      return listenerEventType;
    }
    const contextualParameterType = this.contextualArrowParameterType(
      expression,
      contextualType,
      index,
      isRest
        ? CheckerExpressionCallableParameterKind.Rest
        : CheckerExpressionCallableParameterKind.Positional,
      `${localKey}:param:${index}:${name}:context`,
      sourceAddressHandle,
    );
    if (contextualParameterType != null) {
      return contextualParameterType;
    }
    return isRest
      ? this.synthesizeArrayType(
        expression,
        scope,
        this.synthesizeUnknownType(`${localKey}:param:${index}:${name}:rest-element`, sourceAddressHandle),
        `${localKey}:param:${index}:${name}:rest-array`,
        sourceAddressHandle,
      ).toReference()
      : this.synthesizeUnknownType(`${localKey}:param:${index}:${name}`, sourceAddressHandle);
  }

  private contextualArrowParameterType(
    expression: ArrowFunction,
    contextualType: CheckerTypeReference | null,
    index: number,
    parameterKind: CheckerExpressionCallableParameterKind,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference | null {
    const typeShape = this.support.typeShapeForReference(contextualType);
    return typeShape == null
      ? null
      : this.calls.contextualCallableParameterType(
        typeShape,
        index,
        expression.args.length,
        parameterKind,
        localKey,
        sourceAddressHandle,
      );
  }

  private synthesizeUnknownType(
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeReference {
    return this.synthesis.unknownTypeReference(localKey, sourceAddressHandle);
  }

  private synthesizeArrayType(
    expression: ExpressionAstNode,
    scope: BindingScope,
    elementType: CheckerTypeReference,
    localKey: string,
    sourceAddressHandle: AddressHandle | null,
  ): CheckerTypeShape {
    const lengthType = this.support.projectPrimitive(expression, scope, `${localKey}:length`, 'number', sourceAddressHandle);
    const lengthReference = lengthType.kind === CheckerExpressionTypeEvaluationResultKind.Type
      ? lengthType.typeReference
      : null;
    return this.synthesis.arrayType(elementType, lengthReference, localKey, sourceAddressHandle);
  }
}
