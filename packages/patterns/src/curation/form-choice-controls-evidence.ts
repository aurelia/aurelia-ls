import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { formChoiceControlsAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type FormChoiceControlsEvidenceReport = PatternEvidenceReport;
export type FormChoiceControlsEvidenceCheck = PatternEvidenceCheck;
export type FormChoiceControlsDocumentEvidence = PatternDocumentEvidence;
export type FormChoiceControlsMetadataDraft = PatternMetadataDraft;

export const formChoiceControlsEvidenceProfile: PatternEvidenceProfile = {
  admission: formChoiceControlsAdmission,
  documents: [
    {
      relativePath: 'templates/forms/collections.md',
      role: 'primary-grounding',
      curationNote: 'Grounds checkbox arrays, radio groups, select controls, model.bind, checked.bind, and when matcher.bind/Sets/Maps are needed.'
    },
    {
      relativePath: 'templates/forms/README.md',
      role: 'primary-grounding',
      curationNote: 'Grounds ordinary native form controls and value.bind before collection-specific controls.'
    },
    {
      relativePath: 'templates/forms.md',
      role: 'supporting-grounding',
      curationNote: 'Comprehensive form reference confirms collection controls, but is too broad and validation-heavy to copy.'
    },
    {
      relativePath: 'templates/repeats-and-list-rendering.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds repeat.for over local option arrays and keyed repeats.'
    },
    {
      relativePath: 'templates/forms/advanced-patterns.md',
      role: 'deferred-evidence',
      curationNote: 'Dynamic, validation-heavy, file, and multi-step form material remains deferred from the native choice-control baseline.'
    }
  ],
  requiredEvidence: [
    { key: 'checkbox collection choice', signalNames: ['checkbox-input', 'checked.bind', 'model.bind'] },
    { key: 'radio single choice', signalNames: ['radio-input', 'checked.bind', 'model.bind'] },
    { key: 'select single choice', signalNames: ['select-element', 'value.bind'] },
    { key: 'native grouped controls', signalNames: ['form-element', 'fieldset-legend'] },
    { key: 'local option arrays', signalNames: ['local-array', 'repeat.for', 'keyed-repeat'] },
    { key: 'derived choice summary', signalNames: ['computed-getter', 'interpolation', 'if.bind'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: formChoiceControlsAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use native select, radio, and checkbox controls with value.bind, model.bind, and checked.bind for local primitive choice state.',
    whenToUse: [
      'A form needs primitive choices such as ids, slugs, or enum-like strings.',
      'Checkboxes should add and remove selected values from a local array.',
      'Radio buttons or a select should hold one selected value.'
    ],
    whenNotToUse: [
      'Choices are objects that need custom equality or matcher.bind.',
      'The control set needs select-all behavior, Sets, Maps, virtualization, or very large lists.',
      'The form needs validation-plugin rules, dynamic schema rendering, or submit behavior in the same pattern.'
    ],
    assumptions: [
      'Choice values are primitive ids, so strict equality is enough.',
      'Checkbox selections belong in a local array owned by the form component.',
      'Choosing values is separate from submitting or validating the form.'
    ],
    handoffNotes: [
      'Use matcher.bind when options are objects or reloaded instances.',
      'Promote to Sets, Maps, or select-all behavior only for larger selection problems.',
      'Layer submit and validation behavior separately.'
    ]
  }
};

export function analyzeFormChoiceControlsEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): FormChoiceControlsEvidenceReport {
  return analyzePatternEvidence(corpus, formChoiceControlsEvidenceProfile, pattern);
}

export function formatFormChoiceControlsEvidenceReport(report: FormChoiceControlsEvidenceReport): string {
  return formatPatternEvidenceReport(report);
}
