import {
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
  type KernelDetailReference,
} from '../kernel/detail-references.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import { checkerTypeReferenceKernelReferences } from '../type-system/structural-references.js';
import { StateDetailDescriptors } from './detail-descriptors.js';
import type { StateGetterBinding } from './model.js';

function stateGetterBindingReferences(
  binding: StateGetterBinding,
): readonly KernelDetailReference[] {
  return mergeKernelDetailReferences(
    kernelRecordReferences(
      binding.selectorSourceAddressHandle,
      binding.targetSourceAddressHandle,
      binding.storeProductHandle,
      binding.storeIdentityHandle,
    ),
    [kernelProductDetailReference(
      StateDetailDescriptors.StoreConfiguration,
      binding.storeProductHandle,
    )],
    checkerTypeReferenceKernelReferences(binding.selectorReturnType),
    checkerTypeReferenceKernelReferences(binding.targetMemberType),
  );
}

/** Typed detail slots for @aurelia/state products consumed by authoring inquiries. */
export const StateProductDetails = {
  StoreConfiguration: defineProductDetailSlot(
    StateDetailDescriptors.StoreConfiguration,
    (configuration) => mergeKernelDetailReferences(
      kernelRecordReferences(
        configuration.nameSourceAddressHandle,
        configuration.initialStateSourceAddressHandle,
        configuration.optionsOrHandlerSourceAddressHandle,
        ...configuration.actionHandlerSourceAddressHandles,
      ),
      checkerTypeReferenceKernelReferences(configuration.initialStateType),
    ),
  ),
  GetterBinding: defineProductDetailSlot(
    StateDetailDescriptors.GetterBinding,
    stateGetterBindingReferences,
  ),
  Issue: defineProductDetailSlot(
    StateDetailDescriptors.Issue,
    (issue) => kernelRecordReferences(issue.ownerIdentityHandle),
  ),
} as const;
