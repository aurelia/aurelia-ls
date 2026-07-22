import {
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
} from '../kernel/detail-references.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import { ResourceDetailDescriptors } from '../resources/detail-descriptors.js';
import { FrameworkDetailDescriptors } from './detail-descriptors.js';

export const FrameworkProductDetails = {
  ServiceRoot: defineProductDetailSlot(
    FrameworkDetailDescriptors.ServiceRoot,
    (root) => mergeKernelDetailReferences(
      kernelRecordReferences(
        root.serviceKeyIdentityHandle,
        root.evidenceSourceAddressHandle,
        root.ownerIdentityHandle,
        root.ownerProductHandle,
      ),
    ),
  ),
  CapabilityDemand: defineProductDetailSlot(
    FrameworkDetailDescriptors.CapabilityDemand,
    (demand) => mergeKernelDetailReferences(
      kernelRecordReferences(
        ...demand.blockingOpenSeamHandles,
        demand.ownerIdentityHandle,
        demand.templateSourceAddressHandle,
        demand.resourceDefinitionProductHandle,
      ),
      kernelRecordReferences(
        ...demand.packageEvidence.map((evidence) => evidence.sourceAddressHandle),
      ),
      [kernelProductDetailReference(
        ResourceDetailDescriptors.Definition,
        demand.resourceDefinitionProductHandle,
      )],
    ),
  ),
} as const;
