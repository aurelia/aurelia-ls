import type { ProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import {
  kernelProductDetailReference,
  kernelRecordReferences,
  mergeKernelDetailReferences,
  type KernelDetailReference,
} from '../kernel/detail-references.js';
import { TemplateDetailDescriptors } from './detail-descriptors.js';
import type {
  RuntimeBindingReference,
  RuntimeBindingSourceOperationReference,
  RuntimeBindingTargetAccessReference,
  RuntimeBindingTargetOperationReference,
} from './runtime-binding.js';
import type { RuntimeValueConverterApplicationReference } from './runtime-value-converter.js';
import type { RuntimeWatcherReference } from './runtime-watcher.js';

type TemplateProductReference = {
  readonly productHandle: RuntimeBindingReference['productHandle'];
  readonly identityHandle: RuntimeBindingReference['identityHandle'];
  readonly addressHandle: RuntimeBindingReference['addressHandle'];
};

function templateProductReferenceReferences(
  reference: TemplateProductReference | null,
  descriptor: ProductDetailDescriptor<unknown>,
): readonly KernelDetailReference[] {
  return reference == null
    ? []
    : mergeKernelDetailReferences(
        kernelRecordReferences(reference.productHandle, reference.identityHandle, reference.addressHandle),
        [kernelProductDetailReference(descriptor, reference.productHandle)],
      );
}

export function runtimeBindingReferenceReferences(
  reference: RuntimeBindingReference | null,
): readonly KernelDetailReference[] {
  return templateProductReferenceReferences(reference, TemplateDetailDescriptors.RuntimeBinding);
}

export function runtimeBindingTargetAccessReferenceReferences(
  reference: RuntimeBindingTargetAccessReference | null,
): readonly KernelDetailReference[] {
  return templateProductReferenceReferences(reference, TemplateDetailDescriptors.RuntimeBindingTargetAccess);
}

export function runtimeBindingTargetOperationReferenceReferences(
  reference: RuntimeBindingTargetOperationReference | null,
): readonly KernelDetailReference[] {
  return templateProductReferenceReferences(reference, TemplateDetailDescriptors.RuntimeBindingTargetOperation);
}

export function runtimeBindingSourceOperationReferenceReferences(
  reference: RuntimeBindingSourceOperationReference | null,
): readonly KernelDetailReference[] {
  return templateProductReferenceReferences(reference, TemplateDetailDescriptors.RuntimeBindingSourceOperation);
}

export function runtimeWatcherReferenceReferences(
  reference: RuntimeWatcherReference | null,
): readonly KernelDetailReference[] {
  return templateProductReferenceReferences(reference, TemplateDetailDescriptors.RuntimeWatcher);
}

export function runtimeValueConverterApplicationReferenceReferences(
  reference: RuntimeValueConverterApplicationReference | null,
): readonly KernelDetailReference[] {
  return templateProductReferenceReferences(reference, TemplateDetailDescriptors.RuntimeValueConverterApplication);
}
