import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { templateDomRefAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type TemplateDomRefEvidenceReport = PatternEvidenceReport;
export type TemplateDomRefEvidenceCheck = PatternEvidenceCheck;
export type TemplateDomRefDocumentEvidence = PatternDocumentEvidence;
export type TemplateDomRefMetadataDraft = PatternMetadataDraft;

export const templateDomRefEvidenceProfile: PatternEvidenceProfile = {
  admission: templateDomRefAdmission,
  documents: [
    {
      relativePath: 'templates/template-syntax/template-references.md',
      role: 'primary-grounding',
      curationNote: 'Grounds DOM element refs and exposes advanced component, custom-attribute, and controller refs that this public pattern deliberately does not default to.'
    },
    {
      relativePath: 'templates/focus.md',
      role: 'companion-evidence',
      curationNote: 'Grounds the built-in focus custom attribute, which should remain the first choice for state-driven focus.'
    },
    {
      relativePath: 'components/component-lifecycles.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds the lifecycle timing caveat that refs are not constructor-time state.'
    },
    {
      relativePath: 'developer-guides/working-with-web-standards.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds using platform browser APIs from Aurelia components when the component owns the element.'
    }
  ],
  requiredEvidence: [
    { key: 'DOM template reference', signalNames: ['template-ref'] },
    { key: 'advanced refs visible before admission', signalNames: ['component-ref', 'custom-attribute-ref', 'controller-ref'] },
    { key: 'built-in focus companion', signalNames: ['focus-binding', 'focus-to-view'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: templateDomRefAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use a plain template ref when a component needs a typed DOM element handle for small browser APIs such as focus or selection.',
    whenToUse: [
      'A component needs to call a narrow DOM method on an element it renders itself.',
      'The element reference is local to the component and does not model application data flow.',
      'Bindings still own the data state, while the ref owns only the imperative browser action.'
    ],
    whenNotToUse: [
      'The same result can be expressed with an ordinary binding or the built-in focus custom attribute.',
      'The parent wants to coordinate child component behavior or shared feature state.',
      'The code needs framework controller access or reusable DOM behavior across many elements.'
    ],
    assumptions: [
      'The ref target is rendered by this component before any button can call the ref-backed method.',
      'The ref is only used for browser element APIs.',
      'The element is a native input with stable focus and selection methods.'
    ],
    handoffNotes: [
      'Keep refs local and imperative.',
      'Prefer dedicated bindings when Aurelia already has one.',
      'Do not use advanced refs as a default communication channel.'
    ]
  }
};

export function analyzeTemplateDomRefEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): TemplateDomRefEvidenceReport {
  return analyzePatternEvidence(corpus, templateDomRefEvidenceProfile, pattern);
}

export function formatTemplateDomRefEvidenceReport(report: TemplateDomRefEvidenceReport): string {
  return formatPatternEvidenceReport(report);
}
