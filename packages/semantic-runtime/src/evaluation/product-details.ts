import { kernelRecordReferences } from '../kernel/detail-references.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import { EvaluationDetailDescriptors } from './detail-descriptors.js';

/** Typed detail slots for evaluation and module-loader products. */
export const EvaluationProductDetails = {
  Issue: defineProductDetailSlot(
    EvaluationDetailDescriptors.Issue,
    (issue) => kernelRecordReferences(
      ...issue.fieldProvenance.map((entry) => entry.provenanceHandle),
    ),
  ),
} as const;
