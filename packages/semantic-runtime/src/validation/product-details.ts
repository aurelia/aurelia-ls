import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { ValidationIssue } from './validation-issue.js';

export const ValidationProductDetails = {
  Issue: defineProductDetailSlot<ValidationIssue>(
    KernelVocabulary.Validation.Issue.key,
    'validation.issue',
    '@aurelia/validation source-backed issue where rule construction or hydration would throw.',
  ),
} as const;
