import {
  kernelRecordReferences,
  type KernelDetailReference,
} from '../kernel/detail-references.js';
import type { BindingScopeReference } from './scope.js';

/** Structural occupancy proven by a compact binding-scope reference. */
export function bindingScopeReferenceKernelReferences(
  reference: BindingScopeReference | null,
): readonly KernelDetailReference[] {
  return reference == null
    ? []
    // Scope references also describe speculative evaluator contexts whose logical product/identity was never emitted.
    : kernelRecordReferences(reference.sourceAddressHandle);
}
