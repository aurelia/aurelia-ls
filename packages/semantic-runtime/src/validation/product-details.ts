import { kernelRecordReferences } from '../kernel/detail-references.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import { ValidationDetailDescriptors } from './detail-descriptors.js';

export const ValidationProductDetails = {
  Issue: defineProductDetailSlot(
    ValidationDetailDescriptors.Issue,
    (issue) => kernelRecordReferences(issue.ownerIdentityHandle),
  ),
} as const;
