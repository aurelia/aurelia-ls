import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { DiIssue } from './di-issue.js';

/** Typed detail slots for DI products used by app diagnostics and world-construction inquiries. */
export const DiProductDetails = {
  Issue: defineProductDetailSlot<DiIssue>(
    KernelVocabulary.Di.Issue.key,
    'di.issue',
    'Source-backed DI/container issue with diagnostic authority.',
  ),
} as const;
