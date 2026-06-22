import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { templateFocusControlAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type TemplateFocusControlEvidenceReport = PatternEvidenceReport;
export type TemplateFocusControlEvidenceCheck = PatternEvidenceCheck;
export type TemplateFocusControlDocumentEvidence = PatternDocumentEvidence;
export type TemplateFocusControlMetadataDraft = PatternMetadataDraft;

export const templateFocusControlEvidenceProfile: PatternEvidenceProfile = {
  admission: templateFocusControlAdmission,
  documents: [
    {
      relativePath: 'templates/focus.md',
      role: 'primary-grounding',
      curationNote: 'Grounds built-in focus.bind and the recommended focus.to-view pattern for open-and-focus UI.'
    },
    {
      relativePath: 'templates/conditional-rendering.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds rendering the panel only when it is open.'
    },
    {
      relativePath: 'templates/template-syntax/event-binding.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds ordinary click and submit event bindings for local UI state changes.'
    },
    {
      relativePath: 'templates/forms/README.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds native input, label, and form semantics around the focus target.'
    },
    {
      relativePath: 'templates/custom-attributes.md',
      role: 'deferred-evidence',
      curationNote: 'Custom attribute authoring is useful later, but this slice uses the built-in focus attribute rather than teaching resource authoring.'
    }
  ],
  requiredEvidence: [
    { key: 'built-in focus binding', signalNames: ['focus-binding', 'focus-to-view'] },
    { key: 'conditional panel rendering', signalNames: ['if.bind'] },
    { key: 'local UI state events', signalNames: ['event-binding', 'submit.trigger'] },
    { key: 'focusable native control', signalNames: ['value.bind', 'label-for', 'form-element'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: templateFocusControlAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use Aurelia focus.to-view when a component opens UI and should move focus to a newly rendered control.',
    whenToUse: [
      'Opening a search panel, dialog-like region, or inline editor should focus the first useful input.',
      'Focus should follow view-model state into the view without blur changing that state.',
      'The focused element is conditionally rendered with ordinary template bindings.'
    ],
    whenNotToUse: [
      'Blur should write back into the same state property; use two-way focus deliberately for that case.',
      'The target element is not naturally focusable and has not been given a valid tabindex.',
      'The behavior needs custom keyboard trapping, roving tabindex, or full dialog focus management.'
    ],
    assumptions: [
      'Opening the panel should focus the input, but blurring the input should not close the panel.',
      'The target is a native input and focusable without extra tabindex work.',
      'The panel is local component UI state.'
    ],
    handoffNotes: [
      'Use two-way focus only when blur should update state.',
      'Make non-input targets focusable before binding focus to them.',
      'Use a dedicated accessibility pattern for complex focus management.'
    ]
  }
};

export function analyzeTemplateFocusControlEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): TemplateFocusControlEvidenceReport {
  return analyzePatternEvidence(corpus, templateFocusControlEvidenceProfile, pattern);
}

export function formatTemplateFocusControlEvidenceReport(report: TemplateFocusControlEvidenceReport): string {
  return formatPatternEvidenceReport(report);
}
