import {
  kernelHotDetailReference,
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
} from '../kernel/detail-references.js';
import { defineHotDetailSlot } from '../kernel/hot-details.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import { TemplateDetailDescriptors } from '../template/detail-descriptors.js';
import { TypeSystemHotDetailDescriptors } from '../type-system/detail-descriptors.js';
import {
  RuntimeExpressionDetailDescriptors,
  RuntimeExpressionHotDetailDescriptors,
} from './detail-descriptors.js';
import type {
  RuntimeBindingExpressionAccessResolution,
} from './runtime-binding-expression-access-resolution.js';
import type {
  TemplateExpressionAccessOccurrence,
} from './template-expression-access-occurrence.js';

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
        kernelHotDetailReference(
          RuntimeExpressionHotDetailDescriptors.TemplateAccessOccurrence,
          use.occurrenceHandle,
        ),
        kernelHotDetailReference(
          RuntimeExpressionHotDetailDescriptors.BindingAccessResolution,
          use.resolutionHandle,
        ),
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

function templateAccessOccurrenceReferences(
  occurrence: TemplateExpressionAccessOccurrence,
) {
  return mergeKernelDetailReferences(
    kernelRecordReferences(
      occurrence.expressionProductHandle,
      occurrence.sourceAddressHandle,
      occurrence.nameSourceAddressHandle,
    ),
    [kernelProductDetailReference(
      TemplateDetailDescriptors.ExpressionParse,
      occurrence.expressionProductHandle,
    )],
  );
}

function bindingAccessResolutionReferences(
  resolution: RuntimeBindingExpressionAccessResolution,
) {
  return mergeKernelDetailReferences(
    kernelRecordReferences(
      resolution.bindingProductHandle,
      resolution.bindingIdentityHandle,
      resolution.scopeProductHandle,
      ...resolution.targetLinks.flatMap((target) => [
        target.authorityProductHandle,
        target.targetIdentityHandle,
        target.declarationSourceAddressHandle,
      ]),
    ),
    [
      kernelHotDetailReference(
        RuntimeExpressionHotDetailDescriptors.TemplateAccessOccurrence,
        resolution.occurrence.detailHandle,
      ),
      ...resolution.targetLinks.flatMap((target) => [
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
  );
}

/** High-cardinality authored occurrence and binding-resolution rows owned by existing products. */
export const RuntimeExpressionHotDetails = {
  TemplateAccessOccurrence: defineHotDetailSlot(
    RuntimeExpressionHotDetailDescriptors.TemplateAccessOccurrence,
    templateAccessOccurrenceReferences,
  ),
  BindingAccessResolution: defineHotDetailSlot(
    RuntimeExpressionHotDetailDescriptors.BindingAccessResolution,
    bindingAccessResolutionReferences,
  ),
} as const;
