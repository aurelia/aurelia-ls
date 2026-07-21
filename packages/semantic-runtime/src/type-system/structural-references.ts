import {
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
  type KernelDetailReference,
} from '../kernel/detail-references.js';
import { TypeSystemDetailDescriptors } from './detail-descriptors.js';
import type { CheckerTypeReference } from './type-shape.js';

/** Structural occupancy proven by a compact checker-type reference. */
export function checkerTypeReferenceKernelReferences(
  reference: CheckerTypeReference | null,
  includeTypeShape = true,
): readonly KernelDetailReference[] {
  if (reference == null) {
    return [];
  }
  return mergeKernelDetailReferences(
    // A compact reference may carry a logical identity before any identity record exists.
    kernelRecordReferences(reference.sourceAddressHandle),
    includeTypeShape
      ? [kernelProductDetailReference(TypeSystemDetailDescriptors.TypeShape, reference.productHandle)]
      : [],
  );
}
