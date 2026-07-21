import { kernelRecordReferences } from '../kernel/detail-references.js';
import { defineProductDetailSlot } from '../kernel/product-details.js';
import { FetchClientDetailDescriptors } from './detail-descriptors.js';

export const FetchClientProductDetails = {
  Issue: defineProductDetailSlot(
    FetchClientDetailDescriptors.Issue,
    (issue) => kernelRecordReferences(issue.ownerIdentityHandle),
  ),
} as const;
