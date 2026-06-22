import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { formNativeSubmitAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type NativeFormSubmitEvidenceReport = PatternEvidenceReport;
export type NativeFormSubmitEvidenceCheck = PatternEvidenceCheck;
export type NativeFormSubmitDocumentEvidence = PatternDocumentEvidence;
export type NativeFormSubmitMetadataDraft = PatternMetadataDraft;

export const nativeFormSubmitEvidenceProfile: PatternEvidenceProfile = {
  admission: formNativeSubmitAdmission,
  documents: [
    {
      relativePath: 'templates/forms/README.md',
      role: 'primary-grounding',
      curationNote: 'Grounds native form controls, value.bind, typed values, labels, and platform constraints.'
    },
    {
      relativePath: 'templates/forms/submission.md',
      role: 'primary-grounding',
      curationNote: 'Grounds submit.trigger, async submission state, disabled submit buttons, feedback, and reset behavior.'
    },
    {
      relativePath: 'templates/forms.md',
      role: 'supporting-grounding',
      curationNote: 'Comprehensive reference confirms the same basic/submission forms, but is too broad to copy as a pattern.'
    },
    {
      relativePath: 'templates/forms/collections.md',
      role: 'deferred-evidence',
      curationNote: 'Collection controls are useful future form patterns; keep them out of the native submit baseline.'
    },
    {
      relativePath: 'templates/forms/advanced-patterns.md',
      role: 'deferred-evidence',
      curationNote: 'Strong evidence for validation, router, dynamic, autosave, and file-upload follow-up patterns.'
    }
  ],
  requiredEvidence: [
    { key: 'native form shell', signalNames: ['form-element', 'submit.trigger', 'submit-button'] },
    { key: 'ordinary form controls', signalNames: ['label-for', 'textarea', 'value.bind'] },
    { key: 'native input constraints', signalNames: ['native-input-constraint'] },
    {
      key: 'submission state and feedback',
      signalNames: ['disabled.bind', 'form-reset', 'submission-state', 'success-error-feedback']
    },
    { key: 'async submit handoff', signalNames: ['async-operation', 'fetch-call'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: formNativeSubmitAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use a component view-model to collect native form input, handle submit.trigger, show submission feedback, and keep server/API work behind a replaceable handoff.',
    whenToUse: [
      'You need a single component form with ordinary text, email, or textarea fields.',
      'Browser constraint validation is enough for the first interaction layer.',
      'The form draft and submit messages belong to the component view lifetime.'
    ],
    whenNotToUse: [
      'The form needs validation-plugin rules, cross-field validation, or reusable validation display components.',
      'The flow is multi-step, dynamic, autosaved, or guarded by router navigation hooks.',
      'The submit boundary is already shared by multiple components and should start as an injected service.'
    ],
    assumptions: [
      'The browser is allowed to enforce required/type/minlength constraints before submit handling runs.',
      'Server-side validation remains canonical even when native constraints are present.',
      'The placeholder submit method exists only to mark the app-specific API boundary.'
    ],
    handoffNotes: [
      'Replace the placeholder submit method with the real application boundary.',
      'Move submission to an injected service once it is shared, retried, cached, authenticated, or tested independently.',
      'Add validation-plugin rules only after native constraints are no longer enough for the form requirements.'
    ]
  }
};

export function analyzeNativeFormSubmitEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): NativeFormSubmitEvidenceReport {
  return analyzePatternEvidence(corpus, nativeFormSubmitEvidenceProfile, pattern);
}

export function formatNativeFormSubmitEvidenceReport(report: NativeFormSubmitEvidenceReport): string {
  return formatPatternEvidenceReport(report);
}
