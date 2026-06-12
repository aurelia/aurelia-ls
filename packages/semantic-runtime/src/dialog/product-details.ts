import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { DialogIssue } from './dialog-issue.js';

export const DialogProductDetails = {
  Issue: defineProductDetailSlot<DialogIssue>(
    KernelVocabulary.Dialog.Issue.key,
    'dialog.issue',
    '@aurelia/dialog source-backed issue where configuration or service usage would hit a framework error.',
  ),
} as const;
