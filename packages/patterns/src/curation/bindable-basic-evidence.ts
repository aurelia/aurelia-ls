import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { componentBindableBasicAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type BindableBasicEvidenceReport = PatternEvidenceReport;
export type BindableBasicEvidenceCheck = PatternEvidenceCheck;
export type BindableBasicDocumentEvidence = PatternDocumentEvidence;
export type BindableBasicMetadataDraft = PatternMetadataDraft;

export const bindableBasicEvidenceProfile: PatternEvidenceProfile = {
  admission: componentBindableBasicAdmission,
  documents: [
    {
      relativePath: 'components/bindable-properties.md',
      role: 'primary-grounding',
      curationNote: 'Primary grounding for @bindable inputs, default one-way flow, attribute names, callbacks, coercion, and spread pressure.'
    },
    {
      relativePath: 'components/components.md',
      role: 'primary-grounding',
      curationNote: 'Grounds component creation, local template imports, custom element usage, and presenter-style bindable components.'
    },
    {
      relativePath: 'essentials/components.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds component view-model/template pairs and the basic decision to create a component.'
    },
    {
      relativePath: 'components/component-lifecycles.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds the lifecycle warning that constructor work must not depend on bindable values.'
    },
    {
      relativePath: 'templates/recipes/search-autocomplete.md',
      role: 'deferred-evidence',
      curationNote: 'Useful later callback/async component evidence; too broad for the basic presenter pattern and not the default child-output path.'
    },
    {
      relativePath: 'components/shadow-dom-and-slots.md',
      role: 'deferred-evidence',
      curationNote: 'Slot composition belongs to a later composition pattern, not the first bindable input slice.'
    }
  ],
  requiredEvidence: [
    { key: '@bindable child inputs', signalNames: ['bindable-component'] },
    { key: 'parent imports child component', signalNames: ['custom-element-import'] },
    { key: 'parent binds values into child', signalNames: ['bindable-property-binding', 'custom-element-usage'] },
    { key: 'child renders bindable values', signalNames: ['interpolation'] },
    { key: 'view-model class source', signalNames: ['exported-view-model-class'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: componentBindableBasicAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use a small child custom element with @bindable inputs when a parent should pass display data into a reusable presenter component.',
    whenToUse: [
      'You need reusable UI that accepts data from a parent component.',
      'The child component should render data it receives rather than fetch or own shared state.',
      'Default one-way parent-to-child flow is enough.'
    ],
    whenNotToUse: [
      'The child needs to own a direct UI action output rather than only render parent-supplied input.',
      'The component interaction represents shared feature state or commands needed by more than one component.',
      'The component needs slots, attribute capture, Shadow DOM, or component-library packaging.',
      'The component needs router access, async loading, or validation-plugin integration.'
    ],
    assumptions: [
      'Bindable values are provided by the parent and are not read in the child constructor.',
      'Primitive values that must remain booleans or numbers are passed with `.bind` or handled by a later coercion pattern.',
      'The child is a presenter component, so it does not fetch data or mutate shared application state.'
    ],
    handoffNotes: [
      'Add explicit output behavior only when the child truly needs to notify the parent.',
      'Use a narrow DOM CustomEvent for one visible parent-child UI action; use an injected state/service class when the behavior becomes shared feature state.',
      'Move to slots or attribute capture only when explicit bindables make the component interface too narrow or repetitive.'
    ]
  }
};

export function analyzeBindableBasicEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): BindableBasicEvidenceReport {
  return analyzePatternEvidence(corpus, bindableBasicEvidenceProfile, pattern);
}

export function formatBindableBasicEvidenceReport(report: BindableBasicEvidenceReport): string {
  return formatPatternEvidenceReport(report);
}
