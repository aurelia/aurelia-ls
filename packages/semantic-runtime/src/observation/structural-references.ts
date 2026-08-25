import {
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
  type KernelDetailReferenceClosure,
} from '../kernel/detail-references.js';
import type { ProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import type { RuntimeBindingValueChannelReference } from './runtime-binding-observation.js';
import type { ComputedObserverSourceReference } from './computed-observer-source.js';
import { ObservationDetailDescriptors } from './detail-descriptors.js';
import type { RuntimeEffectReference } from './runtime-effect.js';

type ObservationProductReference = {
  readonly productHandle: RuntimeBindingValueChannelReference['productHandle'];
  readonly identityHandle: RuntimeBindingValueChannelReference['identityHandle'];
  readonly addressHandle: RuntimeBindingValueChannelReference['addressHandle'];
};

function observationProductReferenceReferences(
  reference: ObservationProductReference | null,
  descriptor: ProductDetailDescriptor<unknown>,
): KernelDetailReferenceClosure {
  return reference == null
    ? mergeKernelDetailReferences()
    : mergeKernelDetailReferences(
        kernelRecordReferences(reference.productHandle, reference.identityHandle, reference.addressHandle),
        [kernelProductDetailReference(descriptor, reference.productHandle)],
      );
}

export function runtimeBindingValueChannelReferenceReferences(
  reference: RuntimeBindingValueChannelReference | null,
): KernelDetailReferenceClosure {
  return observationProductReferenceReferences(
    reference,
    ObservationDetailDescriptors.RuntimeBindingValueChannel,
  );
}

export function computedObserverSourceReferenceReferences(
  reference: ComputedObserverSourceReference | null,
): KernelDetailReferenceClosure {
  return observationProductReferenceReferences(reference, ObservationDetailDescriptors.ComputedObserverSource);
}

export function runtimeEffectReferenceReferences(
  reference: RuntimeEffectReference | null,
): KernelDetailReferenceClosure {
  return observationProductReferenceReferences(reference, ObservationDetailDescriptors.RuntimeEffect);
}
