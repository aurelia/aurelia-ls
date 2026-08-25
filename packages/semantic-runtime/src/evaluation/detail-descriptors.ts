import { defineProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { EvaluationIssue } from './evaluation-issue.js';

export const EvaluationDetailDescriptors = {
  Issue: defineProductDetailDescriptor<EvaluationIssue>(
    KernelVocabulary.Evaluation.Issue.key,
    'evaluation.issue',
    'Source-backed static evaluation or ModuleLoader issue with diagnostic authority.',
  ),
} as const;
