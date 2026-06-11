import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { FrameworkCapabilityDemand } from './capability-demand.js';

export const FrameworkProductDetails = {
  CapabilityDemand: defineProductDetailSlot<FrameworkCapabilityDemand>(
    KernelVocabulary.Framework.CapabilityDemand.key,
    'framework.capability-demand',
    'Authored framework capability demand joined to admission and availability evidence.',
  ),
} as const;
