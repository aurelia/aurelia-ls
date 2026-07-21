import { defineProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { DialogIssue } from './dialog-issue.js';

export const DialogDetailDescriptors = {
  Issue: defineProductDetailDescriptor<DialogIssue>(
    KernelVocabulary.Dialog.Issue.key,
    'dialog.issue',
    '@aurelia/dialog source-backed issue where configuration or service usage would hit a framework error.',
  ),
} as const;
