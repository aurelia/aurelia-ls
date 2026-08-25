import { defineProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ValidationIssue } from './validation-issue.js';

export const ValidationDetailDescriptors = {
  Issue: defineProductDetailDescriptor<ValidationIssue>(
    KernelVocabulary.Validation.Issue.key,
    'validation.issue',
    '@aurelia/validation source-backed issue where rule construction or hydration would throw.',
  ),
} as const;
