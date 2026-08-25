import {
  kernelRecordReferences,
  mergeKernelDetailReferences,
  type KernelDetailReferenceClosure,
} from '../kernel/detail-references.js';
import { checkerTypeReferenceKernelReferences } from '../type-system/structural-references.js';
import type { ResourceTargetReference } from './resource-reference.js';

/** Exact kernel closure carried by one resource-owned target/declaration reference. */
export function resourceTargetReferenceKernelReferences(
  target: ResourceTargetReference | null,
): KernelDetailReferenceClosure {
  return target == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        kernelRecordReferences(
          target.identityHandle,
          target.addressHandle,
          target.declarationSourceAddressHandle,
        ),
        checkerTypeReferenceKernelReferences(target.targetType),
      );
}
