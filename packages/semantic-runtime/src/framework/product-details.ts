import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { FrameworkCapabilityDemand } from './capability-demand.js';
import type { FrameworkServiceRoot } from './service-root.js';

export const FrameworkProductDetails = {
  ServiceRoot: defineProductDetailSlot<FrameworkServiceRoot>(
    KernelVocabulary.Framework.ServiceRoot.key,
    'framework.service-root',
    'Source-backed framework service or container root with evidence basis and provenance.',
  ),
  CapabilityDemand: defineProductDetailSlot<FrameworkCapabilityDemand>(
    KernelVocabulary.Framework.CapabilityDemand.key,
    'framework.capability-demand',
    'Authored framework capability demand joined to admission and availability evidence.',
  ),
} as const;
