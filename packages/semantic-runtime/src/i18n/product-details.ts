import { kernelRecordReferences, mergeKernelDetailReferences } from '../kernel/detail-references.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import { I18nDetailDescriptors } from './detail-descriptors.js';

/** Typed detail slots for i18n products consumed by authoring inquiries. */
export const I18nProductDetails = {
  TranslationKey: defineProductDetailSlot(
    I18nDetailDescriptors.TranslationKey,
    (key) => mergeKernelDetailReferences(
      kernelRecordReferences(...key.fieldProvenance.map((entry) => entry.provenanceHandle)),
    ),
  ),
} as const;
