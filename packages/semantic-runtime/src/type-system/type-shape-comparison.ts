import {
  KernelPublicationDecisionKind,
  sameKernelFieldProvenance,
  sameKernelRecordWitness,
  type KernelComparablePublicationDecision,
  type KernelPublicationComparisonContext,
} from '../kernel/publication-comparison.js';
import type {
  CheckerTypeCarrier,
  CheckerTypeMember,
  CheckerTypeMemberCarrier,
  CheckerTypeReference,
  CheckerTypeShape,
} from './type-shape.js';

/** Compare a projected checker shape without retaining a carrier from another checker generation. */
export function compareCheckerTypeShapeDetails(
  previous: CheckerTypeShape,
  next: CheckerTypeShape,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (
    previous.semanticKey !== next.semanticKey
    || previous.shapeKind !== next.shapeKind
    || previous.origin !== next.origin
    || previous.display !== next.display
    || previous.indexedAccessKeyKind !== next.indexedAccessKeyKind
    || !sameCheckerTypeReferenceSemantics(previous.indexedValueType, next.indexedValueType)
    || !sameCheckerTypeReferenceSemantics(previous.iteratedValueType, next.iteratedValueType)
    || !sameCheckerTypeReferenceSemantics(previous.callReturnType, next.callReturnType)
    || !sameCheckerTypeReferenceSemantics(previous.constructReturnType, next.constructReturnType)
    || !sameCheckerTypeCarrier(previous.carrier, next.carrier)
    || previous.members.length !== next.members.length
  ) {
    return KernelPublicationDecisionKind.Replace;
  }

  let decision: KernelComparablePublicationDecision = KernelPublicationDecisionKind.Retain;
  for (let index = 0; index < previous.members.length; index += 1) {
    const memberDecision = compareCheckerTypeMemberDetails(
      previous.members[index]!,
      next.members[index]!,
      context,
    );
    if (memberDecision === KernelPublicationDecisionKind.Replace) {
      return KernelPublicationDecisionKind.Replace;
    }
    if (memberDecision === KernelPublicationDecisionKind.RefreshWitness) {
      decision = KernelPublicationDecisionKind.RefreshWitness;
    }
  }

  return decision === KernelPublicationDecisionKind.RefreshWitness
    || !sameKernelRecordWitness(
      previous.declarationSourceAddressHandle,
      next.declarationSourceAddressHandle,
      context,
    )
    || !sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context)
    || !sameCheckerTypeReferenceWitness(previous.indexedValueType, next.indexedValueType, context)
    || !sameCheckerTypeReferenceWitness(previous.iteratedValueType, next.iteratedValueType, context)
    || !sameCheckerTypeReferenceWitness(previous.callReturnType, next.callReturnType, context)
    || !sameCheckerTypeReferenceWitness(previous.constructReturnType, next.constructReturnType, context)
    ? KernelPublicationDecisionKind.RefreshWitness
    : KernelPublicationDecisionKind.Retain;
}

/** Compare one product-owned checker member, preserving declaration identity as semantic data. */
export function compareCheckerTypeMemberDetails(
  previous: CheckerTypeMember,
  next: CheckerTypeMember,
  context: KernelPublicationComparisonContext,
): KernelComparablePublicationDecision {
  if (
    previous.detailHandle !== next.detailHandle
    || previous.name !== next.name
    || previous.memberKind !== next.memberKind
    || previous.isOptional !== next.isOptional
    || previous.isReadonly !== next.isReadonly
    || previous.declarationIdentityHandle !== next.declarationIdentityHandle
    || !sameCheckerTypeReferenceSemantics(previous.ownerType, next.ownerType)
    || !sameCheckerTypeReferenceSemantics(previous.valueType, next.valueType)
    || !sameCheckerTypeMemberCarrier(previous.carrier, next.carrier)
  ) {
    return KernelPublicationDecisionKind.Replace;
  }

  const declarationDecision = previous.declarationIdentityHandle == null
    ? KernelPublicationDecisionKind.Retain
    : context.compareRecordHandles(previous.declarationIdentityHandle, next.declarationIdentityHandle);
  if (declarationDecision === KernelPublicationDecisionKind.Replace) {
    return KernelPublicationDecisionKind.Replace;
  }

  return declarationDecision === KernelPublicationDecisionKind.RefreshWitness
    || !sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context)
    || !sameKernelFieldProvenance(previous.fieldProvenance, next.fieldProvenance, context)
    || !sameCheckerTypeReferenceWitness(previous.ownerType, next.ownerType, context)
    || !sameCheckerTypeReferenceWitness(previous.valueType, next.valueType, context)
    ? KernelPublicationDecisionKind.RefreshWitness
    : KernelPublicationDecisionKind.Retain;
}

function sameCheckerTypeReferenceSemantics(
  previous: CheckerTypeReference | null,
  next: CheckerTypeReference | null,
): boolean {
  return previous == null || next == null
    ? previous === next
    : previous.productHandle === next.productHandle
      && previous.identityHandle === next.identityHandle
      && previous.semanticKey === next.semanticKey
      && previous.display === next.display
      && previous.shapeKind === next.shapeKind
      && previous.origin === next.origin;
}

function sameCheckerTypeReferenceWitness(
  previous: CheckerTypeReference | null,
  next: CheckerTypeReference | null,
  context: KernelPublicationComparisonContext,
): boolean {
  return previous == null || next == null
    ? previous === next
    : sameKernelRecordWitness(previous.sourceAddressHandle, next.sourceAddressHandle, context);
}

function sameCheckerTypeCarrier(
  previous: CheckerTypeCarrier | null,
  next: CheckerTypeCarrier | null,
): boolean {
  return previous == null || next == null
    ? previous === next
    : previous.checker === next.checker
      && previous.type === next.type
      && previous.symbol === next.symbol
      && sameObjectReferences(previous.declarations, next.declarations);
}

function sameCheckerTypeMemberCarrier(
  previous: CheckerTypeMemberCarrier | null,
  next: CheckerTypeMemberCarrier | null,
): boolean {
  return previous == null || next == null
    ? previous === next
    : previous.checker === next.checker
      && previous.symbol === next.symbol
      && previous.valueType === next.valueType
      && sameObjectReferences(previous.declarations, next.declarations);
}

function sameObjectReferences<TValue extends object>(
  previous: readonly TValue[],
  next: readonly TValue[],
): boolean {
  return previous.length === next.length
    && previous.every((value, index) => value === next[index]);
}
