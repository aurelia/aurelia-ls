import {
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
  type KernelDetailReferenceClosure,
} from '../kernel/detail-references.js';
import type { BindingScopeReference } from './scope.js';
import { ConfigurationDetailDescriptors } from './detail-descriptors.js';

/** Structural occupancy proven by a compact binding-scope reference. */
export function bindingScopeReferenceKernelReferences(
  reference: BindingScopeReference | null,
): KernelDetailReferenceClosure {
  return reference == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        [kernelProductDetailReference(ConfigurationDetailDescriptors.BindingScope, reference.productHandle)],
        kernelRecordReferences(
          reference.identityHandle,
          reference.sourceAddressHandle,
        ),
      );
}
