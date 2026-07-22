import { defineProductDetailSlot } from '../kernel/product-details.js';
import { defineHotDetailSlot } from '../kernel/hot-details.js';
import {
  kernelHotDetailReference,
  kernelFieldProvenanceReferences,
  kernelRecordReferences,
  mergeKernelDetailReferences,
  type KernelDetailReference,
} from '../kernel/detail-references.js';
import type {
  CheckerTypeMember,
  CheckerTypeShape,
} from './type-shape.js';
import {
  TypeSystemDetailDescriptors,
  TypeSystemHotDetailDescriptors,
} from './detail-descriptors.js';
import { checkerTypeReferenceKernelReferences } from './structural-references.js';
import {
  compareCheckerTypeMemberDetails,
  compareCheckerTypeShapeDetails,
} from './type-shape-comparison.js';

function checkerTypeShapeReferences(
  shape: CheckerTypeShape,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    shape.members.map((member) => kernelHotDetailReference(
      TypeSystemHotDetailDescriptors.TypeMember,
      member.detailHandle,
    )),
    checkerTypeReferenceKernelReferences(shape.indexedValueType),
    checkerTypeReferenceKernelReferences(shape.iteratedValueType),
    checkerTypeReferenceKernelReferences(shape.callReturnType),
    checkerTypeReferenceKernelReferences(shape.constructReturnType),
    kernelRecordReferences(shape.declarationSourceAddressHandle),
    kernelFieldProvenanceReferences(shape.fieldProvenance),
  );
}

function checkerTypeMemberReferences(
  member: CheckerTypeMember,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    checkerTypeReferenceKernelReferences(member.ownerType, false),
    checkerTypeReferenceKernelReferences(member.valueType),
    kernelRecordReferences(
      member.declarationIdentityHandle,
      member.sourceAddressHandle,
    ),
    kernelFieldProvenanceReferences(member.fieldProvenance),
  );
}

/** Typed detail slots for type-system products used by expression and template inquiry. */
export const TypeSystemProductDetails = {
  TypeShape: defineProductDetailSlot(
    TypeSystemDetailDescriptors.TypeShape,
    checkerTypeShapeReferences,
    compareCheckerTypeShapeDetails,
  ),
} as const;

/** Hot TypeChecker details whose lifetime is owned by a projected type shape. */
export const TypeSystemHotDetails = {
  TypeMember: defineHotDetailSlot(
    TypeSystemHotDetailDescriptors.TypeMember,
    checkerTypeMemberReferences,
    compareCheckerTypeMemberDetails,
  ),
} as const;
