import { defineProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { DiIssue } from './di-issue.js';

export const DiDetailDescriptors = {
  Issue: defineProductDetailDescriptor<DiIssue>(
    KernelVocabulary.Di.Issue.key,
    'di.issue',
    'Source-backed DI/container issue with diagnostic authority.',
  ),
} as const;
