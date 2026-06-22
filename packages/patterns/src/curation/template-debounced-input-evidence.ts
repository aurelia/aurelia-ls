import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { templateDebouncedInputAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type TemplateDebouncedInputEvidenceReport = PatternEvidenceReport;
export type TemplateDebouncedInputEvidenceCheck = PatternEvidenceCheck;
export type TemplateDebouncedInputDocumentEvidence = PatternDocumentEvidence;
export type TemplateDebouncedInputMetadataDraft = PatternMetadataDraft;

export const templateDebouncedInputEvidenceProfile: PatternEvidenceProfile = {
  admission: templateDebouncedInputAdmission,
  documents: [
    {
      relativePath: 'templates/binding-behaviors.md',
      role: 'primary-grounding',
      curationNote: 'Grounds built-in debounce behavior, delay parameters, and deferred throttle/updateTrigger/signal/custom behavior concerns.'
    },
    {
      relativePath: 'templates/repeats-and-list-rendering.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds rendering local filtered results after the debounced query updates.'
    },
    {
      relativePath: 'templates/template-syntax/attribute-binding.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds the broader advice to keep complex binding expressions out of templates.'
    },
    {
      relativePath: 'templates/forms/README.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds native input and label binding around the debounced value.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/overview.md',
      role: 'deferred-evidence',
      curationNote: 'Remote search should move to an async data-service pattern with cancellation/loading/error policy, not stay in the local debounce baseline.'
    }
  ],
  requiredEvidence: [
    { key: 'debounce binding behavior', signalNames: ['binding-behavior', 'debounce-behavior'] },
    { key: 'local input binding', signalNames: ['value.bind', 'label-for'] },
    { key: 'local derived filtering', signalNames: ['computed-getter', 'filter-or-sort', 'local-array'] },
    { key: 'rendered filtered results', signalNames: ['repeat.for', 'interpolation', 'if.bind'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: templateDebouncedInputAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use the built-in debounce binding behavior when local view-model state should update only after the user pauses typing.',
    whenToUse: [
      'A search, filter, or preview input should avoid recalculating on every keystroke.',
      'The delayed value stays local to the component and drives synchronous derived UI.',
      'A small debounce interval is enough without request cancellation or flush signals.'
    ],
    whenNotToUse: [
      'Every input event must update state immediately, such as strict form validation or masks.',
      'Typing starts HTTP requests that need cancellation, stale-response guards, or loading state.',
      'The problem is throttling continuous events, flushing pending updates, or changing updateTrigger events.'
    ],
    assumptions: [
      'The debounced value drives local synchronous UI, not immediate validation or remote requests.',
      'A 300ms delay is acceptable for this interaction.',
      'The view-model property may lag briefly behind what the user is typing.'
    ],
    handoffNotes: [
      'Use immediate binding for strict input workflows.',
      'Move remote search behind an async data pattern.',
      'Use throttle, updateTrigger, and signal deliberately for their own timing problems.'
    ]
  }
};

export function analyzeTemplateDebouncedInputEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): TemplateDebouncedInputEvidenceReport {
  return analyzePatternEvidence(corpus, templateDebouncedInputEvidenceProfile, pattern);
}

export function formatTemplateDebouncedInputEvidenceReport(report: TemplateDebouncedInputEvidenceReport): string {
  return formatPatternEvidenceReport(report);
}
