import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { EvaluationIssue } from './evaluation-issue.js';

/** Typed detail slots for evaluation and module-loader products. */
export const EvaluationProductDetails = {
  Issue: defineProductDetailSlot<EvaluationIssue>(
    KernelVocabulary.Evaluation.Issue.key,
    'evaluation.issue',
    'Source-backed static evaluation or ModuleLoader issue with diagnostic authority.',
  ),
} as const;
