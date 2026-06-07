import ts from 'typescript';
import {
  bindingDataFlowDirectionIncludesSourceToTarget,
  bindingDataFlowDirectionIncludesTargetToSource,
} from './binding-data-flow-direction.js';
import {
  collectionElementTypeFor,
  mapKeyTypeFor,
  mapValueTypeFor,
  mutableCollectionElementTypeFor,
  mutableMapKeyTypeFor,
  mutableMapValueTypeFor,
  stringLiteralValuesForType,
} from '../type-system/checker-collection-types.js';
import {
  CheckerTypeNullishPresence,
  checkerStringIndexInfo,
  checkerTypeNullishPresence,
} from '../type-system/checker-related-types.js';
import {
  checkerRawTypeAssignable,
  checkerTypeReferenceAssignable,
} from '../type-system/checker-type-assignability.js';
import {
  checkerPrimitiveTypeAssignableToType,
  checkerStringLiteralAssignableToType,
} from '../type-system/checker-primitive-types.js';
import type {
  CheckerTypeCarrier,
  CheckerTypeReference,
  CheckerTypeShape,
} from '../type-system/type-shape.js';
import {
  checkerIndexedAccessSupportsString,
  CheckerTypeProjectionOrigin,
  CheckerTypeShapeKind,
} from '../type-system/type-shape.js';
import type {
  KernelStore,
} from '../kernel/store.js';
import {
  runtimeBindingPrimitiveValueAssignableToType,
  runtimeBindingStringPrimitiveDomain,
} from './runtime-binding-primitive-value.js';
import {
  RuntimeBindingDataFlowDirection,
  RuntimeBindingDataFlowTypeMismatchKind,
  type RuntimeBindingPrimitiveValue,
  type RuntimeBindingValueChannel,
  RuntimeBindingValueChannelCouplingKind,
  RuntimeBindingValueChannelKind,
} from './runtime-binding-observation.js';

/** Type-system capability surface consumed by binding data-flow assignability policy. */
export interface BindingDataFlowAssignabilityTypeAccess {
  readonly store: KernelStore;
  readTypeShape(reference: CheckerTypeReference | null): CheckerTypeShape | null;
  isRuntimeArrayInstanceType(reference: CheckerTypeReference | null): boolean;
  isRepeatSourceRuntimeAccepted(reference: CheckerTypeReference | null): boolean | null;
  isCallableBooleanFunction(reference: CheckerTypeReference | null, runtimeArgumentCount?: number): boolean | null;
}

/** Directional assignment facts published by binding data-flow after value-channel policy is applied. */
export type BindingDataFlowAssignability = {
  readonly sourceToTargetAssignable: boolean | null;
  readonly targetToSourceAssignable: boolean | null;
  readonly sourceToTargetTypeMismatchKinds: readonly RuntimeBindingDataFlowTypeMismatchKind[];
  readonly targetToSourceTypeMismatchKinds: readonly RuntimeBindingDataFlowTypeMismatchKind[];
};

interface StringIndexedTargetValue {
  readonly reference: CheckerTypeReference | null;
  readonly carrier: CheckerTypeCarrier | null;
}

/** Evaluates source/target assignability using observer value-channel and TypeChecker facts. */
export class BindingDataFlowAssignabilityEvaluator {
  constructor(private readonly typeAccess: BindingDataFlowAssignabilityTypeAccess) {}

  dataFlowAssignability(
    direction: RuntimeBindingDataFlowDirection,
    sourceType: CheckerTypeReference | null,
    targetValueType: CheckerTypeReference | null,
    sourceAssignmentValueType: CheckerTypeReference | null,
    targetToSourceValueType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): BindingDataFlowAssignability {
    const sourceToTargetAssignable = bindingDataFlowDirectionIncludesSourceToTarget(direction)
      ? this.isSourceAssignableToTarget(sourceType, targetValueType, valueChannel)
      : null;
    const targetToSourceAssignable = bindingDataFlowDirectionIncludesTargetToSource(direction)
      ? this.isTargetAssignableToSource(targetToSourceValueType, sourceAssignmentValueType, valueChannel)
      : null;
    return {
      sourceToTargetAssignable,
      targetToSourceAssignable,
      sourceToTargetTypeMismatchKinds: sourceToTargetAssignable === false
        && this.nullishTypeBlocksAssignment(sourceType, targetValueType)
        ? [RuntimeBindingDataFlowTypeMismatchKind.SourceNullishToRequiredTarget]
        : [],
      targetToSourceTypeMismatchKinds: targetToSourceAssignable === false
        && this.nullishTypeBlocksAssignment(targetToSourceValueType, sourceAssignmentValueType)
        ? [RuntimeBindingDataFlowTypeMismatchKind.TargetNullishToRequiredSource]
        : [],
    };
  }

  private nullishTypeBlocksAssignment(
    from: CheckerTypeReference | null,
    to: CheckerTypeReference | null,
  ): boolean {
    const fromCarrier = this.typeAccess.readTypeShape(from)?.carrier ?? null;
    const toCarrier = this.typeAccess.readTypeShape(to)?.carrier ?? null;
    if (fromCarrier == null || toCarrier == null || fromCarrier.checker !== toCarrier.checker) {
      return false;
    }
    if (checkerTypeNullishPresence(fromCarrier.checker, fromCarrier.type) === CheckerTypeNullishPresence.None) {
      return false;
    }
    return checkerRawTypeAssignable(
      fromCarrier.checker,
      fromCarrier.checker.getNonNullableType(fromCarrier.type),
      toCarrier.type,
    );
  }

  private isTypeAssignable(
    from: CheckerTypeReference | null,
    to: CheckerTypeReference | null,
  ): boolean | null {
    return checkerTypeReferenceAssignable(this.typeAccess.store, from, to);
  }

  private isSourceAssignableToTarget(
    sourceType: CheckerTypeReference | null,
    targetType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const observerSync = this.observerSourceToTargetRuntimeAcceptance(sourceType, targetType, valueChannel);
    if (observerSync != null) {
      return observerSync;
    }
    const valueDomain = valueChannel?.valueDomain ?? [];
    const primitiveValueDomain = this.primitiveValueDomain(valueChannel);
    if (primitiveValueDomain.length > 0 && valueChannel?.channelKind === RuntimeBindingValueChannelKind.CheckedRadioValue) {
      return this.isPrimitiveDomainAssignableToType(primitiveValueDomain, sourceType);
    }
    if (bindingValueChannelMutatesCollection(valueChannel)) {
      return primitiveValueDomain.length > 0
        ? this.isPrimitiveDomainObservableFromSourceCollection(primitiveValueDomain, sourceType, valueChannel)
        : this.isTypeObservableFromSourceCollection(targetType, sourceType, valueChannel);
    }
    if (valueChannel?.channelKind === RuntimeBindingValueChannelKind.TemplateControllerIteration) {
      return this.typeAccess.isRepeatSourceRuntimeAccepted(sourceType);
    }
    const checkerAssignable = this.isTypeAssignable(sourceType, targetType);
    if (checkerAssignable != null) {
      return checkerAssignable;
    }
    if (valueDomain.length === 0) {
      return null;
    }
    return this.isTypeAssignableToStringDomain(sourceType, valueDomain);
  }

  private observerSourceToTargetRuntimeAcceptance(
    sourceType: CheckerTypeReference | null,
    targetType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    if (sourceType == null || valueChannel == null) {
      return null;
    }
    switch (valueChannel.channelKind) {
      case RuntimeBindingValueChannelKind.CustomMatcherFunction:
        return this.typeAccess.isCallableBooleanFunction(sourceType, 2);
      case RuntimeBindingValueChannelKind.SelectSingleOptionValue:
        return !this.typeAccess.isRuntimeArrayInstanceType(sourceType);
      case RuntimeBindingValueChannelKind.CheckedRadioValue:
      case RuntimeBindingValueChannelKind.CheckedBoolean:
      case RuntimeBindingValueChannelKind.CheckedDynamicModelValue:
        return true;
      case RuntimeBindingValueChannelKind.RouterParameters:
        return this.isSyntheticObjectAssignableToStringIndexedTarget(sourceType, targetType);
      default:
        return null;
    }
  }

  private isSyntheticObjectAssignableToStringIndexedTarget(
    sourceType: CheckerTypeReference | null,
    targetType: CheckerTypeReference | null,
  ): boolean | null {
    const sourceShape = this.typeAccess.readTypeShape(sourceType);
    const targetShape = this.typeAccess.readTypeShape(targetType);
    if (sourceShape == null || targetShape == null) {
      return null;
    }
    if (sourceShape.shapeKind === CheckerTypeShapeKind.Any) {
      return true;
    }
    if (sourceShape.shapeKind !== CheckerTypeShapeKind.Object
      || sourceShape.origin !== CheckerTypeProjectionOrigin.SyntheticExpressionType) {
      return null;
    }
    const targetIndexedValue = this.stringIndexedTargetValue(targetShape);
    if (targetIndexedValue.reference == null && targetIndexedValue.carrier == null) {
      return null;
    }
    const indexedSourceAssignable = sourceShape.indexedValueType != null
      && checkerIndexedAccessSupportsString(sourceShape.indexedAccessKeyKind)
      ? this.isTypeAssignableToStringIndexedTarget(sourceShape.indexedValueType, targetIndexedValue)
      : null;
    if (indexedSourceAssignable === false) {
      return false;
    }
    let sawOpenMember = indexedSourceAssignable == null && sourceShape.indexedValueType != null;
    for (const member of sourceShape.members) {
      if (member.valueType == null) {
        sawOpenMember = true;
        continue;
      }
      const memberAssignable = this.isTypeAssignableToStringIndexedTarget(member.valueType, targetIndexedValue);
      if (memberAssignable === false) {
        return false;
      }
      if (memberAssignable == null) {
        sawOpenMember = true;
      }
    }
    return sawOpenMember ? null : true;
  }

  private stringIndexedTargetValue(targetShape: CheckerTypeShape): StringIndexedTargetValue {
    const carrier = targetShape.carrier;
    const nonNullishType = carrier == null
      ? null
      : carrier.checker.getNonNullableType(carrier.type);
    const indexInfo = carrier == null || nonNullishType == null
      ? null
      : checkerStringIndexInfo(carrier.checker, nonNullishType);
    return {
      reference: checkerIndexedAccessSupportsString(targetShape.indexedAccessKeyKind)
        ? targetShape.indexedValueType
        : null,
      carrier: indexInfo == null || carrier == null
        ? null
        : {
          checker: carrier.checker,
          type: indexInfo.type,
          symbol: null,
          declarations: indexInfo.declaration == null ? [] : [indexInfo.declaration],
        },
    };
  }

  private isTypeAssignableToStringIndexedTarget(
    from: CheckerTypeReference | null,
    target: StringIndexedTargetValue,
  ): boolean | null {
    const referenceAssignable = target.reference == null
      ? null
      : this.isTypeAssignable(from, target.reference);
    if (referenceAssignable != null) {
      return referenceAssignable;
    }
    const fromCarrier = this.typeAccess.readTypeShape(from)?.carrier ?? null;
    return fromCarrier == null || target.carrier == null || fromCarrier.checker !== target.carrier.checker
      ? null
      : checkerRawTypeAssignable(fromCarrier.checker, fromCarrier.type, target.carrier.type);
  }

  private isTargetAssignableToSource(
    targetType: CheckerTypeReference | null,
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const valueDomain = valueChannel?.valueDomain ?? [];
    const primitiveValueDomain = this.primitiveValueDomain(valueChannel);
    if (valueChannel?.channelKind === RuntimeBindingValueChannelKind.CheckedDynamicModelValue) {
      return primitiveValueDomain.length > 0
        ? this.isPrimitiveDomainAssignableToDynamicCheckedSource(primitiveValueDomain, sourceType, valueChannel)
        : this.isTypeAssignableToDynamicCheckedSource(targetType, sourceType, valueChannel);
    }
    if (valueChannelHasCoupling(valueChannel, RuntimeBindingValueChannelCouplingKind.SelectDynamicArraySourceShape)) {
      return null;
    }
    if (bindingValueChannelMutatesCollection(valueChannel)) {
      return primitiveValueDomain.length > 0
        ? this.isPrimitiveDomainAssignableToSourceMutation(primitiveValueDomain, sourceType, valueChannel)
        : this.isTypeAssignableToSourceMutationValue(targetType, sourceType, valueChannel);
    }
    const checkerAssignable = this.isTypeAssignable(targetType, sourceType);
    if (checkerAssignable != null) {
      return checkerAssignable;
    }
    if (valueDomain.length === 0) {
      return null;
    }
    return this.isStringDomainAssignableToType(valueDomain, sourceType);
  }

  private primitiveValueDomain(
    valueChannel: RuntimeBindingValueChannel | null,
  ): readonly RuntimeBindingPrimitiveValue[] {
    const direct = valueChannel?.primitiveValueDomain ?? [];
    return direct.length > 0
      ? direct
      : runtimeBindingStringPrimitiveDomain(valueChannel?.valueDomain ?? []);
  }

  private isPrimitiveDomainAssignableToType(
    values: readonly RuntimeBindingPrimitiveValue[],
    to: CheckerTypeReference | null,
  ): boolean | null {
    const toShape = this.typeAccess.readTypeShape(to);
    const toCarrier = toShape?.carrier ?? null;
    if (toCarrier == null) {
      return null;
    }
    return values.every((value) =>
      runtimeBindingPrimitiveValueAssignableToType(value, toCarrier.checker, toCarrier.type)
    );
  }

  private isStringDomainAssignableToType(
    values: readonly string[],
    to: CheckerTypeReference | null,
  ): boolean | null {
    const toShape = this.typeAccess.readTypeShape(to);
    const toCarrier = toShape?.carrier ?? null;
    if (toCarrier == null) {
      return null;
    }
    return values.every((value) =>
      checkerStringLiteralAssignableToType(toCarrier.checker, value, toCarrier.type)
    );
  }

  private isTypeAssignableToStringDomain(
    from: CheckerTypeReference | null,
    values: readonly string[],
  ): boolean | null {
    const fromShape = this.typeAccess.readTypeShape(from);
    const fromCarrier = fromShape?.carrier ?? null;
    if (fromCarrier == null) {
      return null;
    }
    const sourceValues = stringLiteralValuesForType(fromCarrier.type);
    if (sourceValues == null) {
      return false;
    }
    return sourceValues.every((value) => values.includes(value));
  }

  private isPrimitiveDomainObservableFromSourceCollection(
    values: readonly RuntimeBindingPrimitiveValue[],
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const sourceShape = this.typeAccess.readTypeShape(sourceType);
    const sourceCarrier = sourceShape?.carrier ?? null;
    if (sourceCarrier == null) {
      return null;
    }
    const elementType = valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? mapKeyTypeFor(sourceCarrier.checker, sourceCarrier.type)
      : collectionElementTypeFor(sourceCarrier.checker, sourceCarrier.type);
    if (elementType == null) {
      return null;
    }
    const keyAssignable = values.every((value) =>
      runtimeBindingPrimitiveValueAssignableToType(value, sourceCarrier.checker, elementType)
    );
    return valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? keyAssignable && this.isBooleanObservableFromMapValue(sourceCarrier.checker, sourceCarrier.type)
      : keyAssignable;
  }

  private isTypeObservableFromSourceCollection(
    valueType: CheckerTypeReference | null,
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const sourceShape = this.typeAccess.readTypeShape(sourceType);
    const sourceCarrier = sourceShape?.carrier ?? null;
    const valueShape = this.typeAccess.readTypeShape(valueType);
    const valueCarrier = valueShape?.carrier ?? null;
    if (sourceCarrier == null || valueCarrier == null || sourceCarrier.checker !== valueCarrier.checker) {
      return null;
    }
    const elementType = valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? mapKeyTypeFor(sourceCarrier.checker, sourceCarrier.type)
      : collectionElementTypeFor(sourceCarrier.checker, sourceCarrier.type);
    const keyAssignable = elementType == null
      ? null
      : checkerRawTypeAssignable(sourceCarrier.checker, valueCarrier.type, elementType);
    if (!valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type) || keyAssignable == null) {
      return keyAssignable;
    }
    return keyAssignable && this.isBooleanObservableFromMapValue(sourceCarrier.checker, sourceCarrier.type);
  }

  private isStringDomainAssignableToSourceMutation(
    values: readonly string[],
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const sourceShape = this.typeAccess.readTypeShape(sourceType);
    const sourceCarrier = sourceShape?.carrier ?? null;
    if (sourceCarrier == null) {
      return null;
    }
    const elementType = valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? mutableMapKeyTypeFor(sourceCarrier.checker, sourceCarrier.type)
      : mutableCollectionElementTypeFor(sourceCarrier.checker, sourceCarrier.type);
    if (elementType == null) {
      return this.hasReadonlyCollectionSource(sourceCarrier.checker, sourceCarrier.type, valueChannel)
        ? false
        : null;
    }
    const keyAssignable = values.every((value) =>
      checkerStringLiteralAssignableToType(sourceCarrier.checker, value, elementType)
    );
    return valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? keyAssignable && this.isBooleanAssignableToMapValue(sourceCarrier.checker, sourceCarrier.type)
      : keyAssignable;
  }

  private isPrimitiveDomainAssignableToSourceMutation(
    values: readonly RuntimeBindingPrimitiveValue[],
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const sourceShape = this.typeAccess.readTypeShape(sourceType);
    const sourceCarrier = sourceShape?.carrier ?? null;
    if (sourceCarrier == null) {
      return null;
    }
    const elementType = valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? mutableMapKeyTypeFor(sourceCarrier.checker, sourceCarrier.type)
      : mutableCollectionElementTypeFor(sourceCarrier.checker, sourceCarrier.type);
    if (elementType == null) {
      return this.hasReadonlyCollectionSource(sourceCarrier.checker, sourceCarrier.type, valueChannel)
        ? false
        : null;
    }
    const keyAssignable = values.every((value) =>
      runtimeBindingPrimitiveValueAssignableToType(value, sourceCarrier.checker, elementType)
    );
    return valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? keyAssignable && this.isBooleanAssignableToMapValue(sourceCarrier.checker, sourceCarrier.type)
      : keyAssignable;
  }

  private isTypeAssignableToSourceMutationValue(
    valueType: CheckerTypeReference | null,
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const sourceShape = this.typeAccess.readTypeShape(sourceType);
    const sourceCarrier = sourceShape?.carrier ?? null;
    const valueShape = this.typeAccess.readTypeShape(valueType);
    const valueCarrier = valueShape?.carrier ?? null;
    if (sourceCarrier == null || valueCarrier == null || sourceCarrier.checker !== valueCarrier.checker) {
      return null;
    }
    const elementType = valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type)
      ? mutableMapKeyTypeFor(sourceCarrier.checker, sourceCarrier.type)
      : mutableCollectionElementTypeFor(sourceCarrier.checker, sourceCarrier.type);
    const keyAssignable = elementType == null
      ? (this.hasReadonlyCollectionSource(sourceCarrier.checker, sourceCarrier.type, valueChannel) ? false : null)
      : checkerRawTypeAssignable(sourceCarrier.checker, valueCarrier.type, elementType);
    if (!valueChannelUsesMapMutation(valueChannel, sourceCarrier.checker, sourceCarrier.type) || keyAssignable == null) {
      return keyAssignable;
    }
    return keyAssignable && this.isBooleanAssignableToMapValue(sourceCarrier.checker, sourceCarrier.type);
  }

  private isPrimitiveDomainAssignableToDynamicCheckedSource(
    values: readonly RuntimeBindingPrimitiveValue[],
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const booleanAssignable = this.isBooleanAssignableToSource(sourceType);
    const mutationAssignable = this.isPrimitiveDomainAssignableToSourceMutation(values, sourceType, valueChannel);
    return combineDynamicCheckedAssignment(booleanAssignable, mutationAssignable);
  }

  private isTypeAssignableToDynamicCheckedSource(
    valueType: CheckerTypeReference | null,
    sourceType: CheckerTypeReference | null,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean | null {
    const booleanAssignable = this.isBooleanAssignableToSource(sourceType);
    const mutationAssignable = this.isTypeAssignableToSourceMutationValue(valueType, sourceType, valueChannel);
    return combineDynamicCheckedAssignment(booleanAssignable, mutationAssignable);
  }

  private isBooleanAssignableToSource(
    sourceType: CheckerTypeReference | null,
  ): boolean | null {
    const sourceShape = this.typeAccess.readTypeShape(sourceType);
    const sourceCarrier = sourceShape?.carrier ?? null;
    return sourceCarrier == null
      ? null
      : checkerPrimitiveTypeAssignableToType(sourceCarrier.checker, 'boolean', sourceCarrier.type);
  }

  private hasReadonlyCollectionSource(
    checker: ts.TypeChecker,
    sourceType: ts.Type,
    valueChannel: RuntimeBindingValueChannel | null,
  ): boolean {
    return valueChannelUsesMapMutation(valueChannel, checker, sourceType)
      ? mapKeyTypeFor(checker, sourceType) != null
      : collectionElementTypeFor(checker, sourceType) != null;
  }

  private isBooleanAssignableToMapValue(
    checker: ts.TypeChecker,
    sourceType: ts.Type,
  ): boolean {
    const valueType = mutableMapValueTypeFor(checker, sourceType);
    return valueType == null
      ? false
      : checkerPrimitiveTypeAssignableToType(checker, 'boolean', valueType);
  }

  private isBooleanObservableFromMapValue(
    checker: ts.TypeChecker,
    sourceType: ts.Type,
  ): boolean {
    const valueType = mapValueTypeFor(checker, sourceType);
    return valueType == null
      ? false
      : checkerPrimitiveTypeAssignableToType(checker, 'boolean', valueType);
  }
}

/** Returns whether a binding value-channel mutates an authored collection source instead of assigning the source slot. */
export function bindingValueChannelMutatesCollection(valueChannel: RuntimeBindingValueChannel | null): boolean {
  return valueChannel?.channelKind === RuntimeBindingValueChannelKind.CheckedCollectionMembership
    || valueChannel?.channelKind === RuntimeBindingValueChannelKind.CheckedMapKeyedBoolean
    || valueChannel?.channelKind === RuntimeBindingValueChannelKind.SelectMultipleOptionValues;
}

function valueChannelHasCoupling(
  valueChannel: RuntimeBindingValueChannel | null,
  coupling: RuntimeBindingValueChannelCouplingKind,
): boolean {
  return valueChannel?.observerCouplings.includes(coupling) === true;
}

function valueChannelUsesMapMutation(
  valueChannel: RuntimeBindingValueChannel | null,
  checker: ts.TypeChecker,
  sourceType: ts.Type,
): boolean {
  if (valueChannel?.channelKind === RuntimeBindingValueChannelKind.CheckedMapKeyedBoolean) {
    return true;
  }
  return valueChannel?.channelKind === RuntimeBindingValueChannelKind.CheckedDynamicModelValue
    && mapKeyTypeFor(checker, sourceType) != null
    && collectionElementTypeFor(checker, sourceType) == null;
}

function combineDynamicCheckedAssignment(
  booleanAssignable: boolean | null,
  mutationAssignable: boolean | null,
): boolean | null {
  if (booleanAssignable === false || mutationAssignable === false) {
    return false;
  }
  if (booleanAssignable == null || mutationAssignable == null) {
    return null;
  }
  return true;
}
