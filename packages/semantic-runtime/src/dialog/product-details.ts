import { kernelRecordReferences } from '../kernel/detail-references.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import { DialogDetailDescriptors } from './detail-descriptors.js';

export const DialogProductDetails = {
  Issue: defineProductDetailSlot(
    DialogDetailDescriptors.Issue,
    (issue) => kernelRecordReferences(issue.ownerIdentityHandle),
  ),
} as const;
