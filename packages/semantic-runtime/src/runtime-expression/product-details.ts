import {
  kernelHotDetailReference,
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
} from '../kernel/detail-references.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import { TemplateDetailDescriptors } from '../template/detail-descriptors.js';
import { TypeSystemHotDetailDescriptors } from '../type-system/detail-descriptors.js';
import { RuntimeExpressionDetailDescriptors } from './detail-descriptors.js';

/** Typed hot-sidecar slots for owner-qualified runtime expression products. */
export const RuntimeExpressionProductDetails = {
  AccessUse: defineProductDetailSlot(
    RuntimeExpressionDetailDescriptors.AccessUse,
    (use) => mergeKernelDetailReferences(
      kernelRecordReferences(
        use.ownerProductHandle,
        use.operationProductHandle,
        use.expressionProductHandle,
        use.scopeProductHandle,
        use.sourceAddressHandle,
        use.nameSourceAddressHandle,
        ...use.executionQualifiers.map((qualifier) => qualifier.sourceAddressHandle),
        ...use.targetLinks.flatMap((target) => [
          target.authorityProductHandle,
          target.targetIdentityHandle,
          target.declarationSourceAddressHandle,
        ]),
      ),
      [kernelProductDetailReference(
        TemplateDetailDescriptors.ExpressionParse,
        use.expressionProductHandle,
      )],
      [
        ...use.targetLinks.flatMap((target) => [
          kernelHotDetailReference(
            TypeSystemHotDetailDescriptors.TypeMember,
            target.targetTypeMemberHandle,
          ),
          kernelHotDetailReference(
            TypeSystemHotDetailDescriptors.TypeMember,
            target.targetTypeSourceMemberHandle,
          ),
        ]),
      ],
    ),
  ),
} as const;
