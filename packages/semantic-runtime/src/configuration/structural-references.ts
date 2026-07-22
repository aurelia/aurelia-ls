import {
  kernelRecordReferences,
  mergeKernelDetailReferences,
  type KernelDetailReferenceClosure,
} from '../kernel/detail-references.js';
import type { BindingScopeReference } from './scope.js';

/** Structural occupancy proven by a compact binding-scope reference. */
export function bindingScopeReferenceKernelReferences(
  reference: BindingScopeReference | null,
): KernelDetailReferenceClosure {
  return reference == null
    ? mergeKernelDetailReferences()
    // Scope references also describe speculative evaluator contexts whose logical product/identity was never emitted.
    : mergeKernelDetailReferences(kernelRecordReferences(reference.sourceAddressHandle));
}
