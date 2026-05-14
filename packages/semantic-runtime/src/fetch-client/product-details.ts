import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { FetchClientIssue } from './fetch-client-issue.js';

export const FetchClientProductDetails = {
  Issue: defineProductDetailSlot<FetchClientIssue>(
    KernelVocabulary.FetchClient.Issue.key,
    'fetch-client.issue',
    '@aurelia/fetch-client source-backed issue where configuration or retry policy would throw.',
  ),
} as const;
