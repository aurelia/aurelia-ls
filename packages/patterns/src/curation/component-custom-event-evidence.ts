import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { componentCustomEventAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type ComponentCustomEventEvidenceReport = PatternEvidenceReport;
export type ComponentCustomEventEvidenceCheck = PatternEvidenceCheck;
export type ComponentCustomEventDocumentEvidence = PatternDocumentEvidence;
export type ComponentCustomEventMetadataDraft = PatternMetadataDraft;

export const componentCustomEventEvidenceProfile: PatternEvidenceProfile = {
  admission: componentCustomEventAdmission,
  documents: [
    {
      relativePath: 'templates/template-syntax/event-binding.md',
      role: 'primary-grounding',
      curationNote: 'Grounds .trigger event handling, $event payload access, and child custom elements dispatching bubbling CustomEvent output.'
    },
    {
      relativePath: 'components/bindable-properties.md',
      role: 'primary-grounding',
      curationNote: 'Grounds child component inputs and the boundary between one-way bindables, two-way/from-view bindables, callbacks, coercion, and attribute transfer.'
    },
    {
      relativePath: 'components/components.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds custom element imports and parent templates using child components.'
    },
    {
      relativePath: 'essentials/components.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds ordinary component view-model/template pairs and composition basics.'
    },
    {
      relativePath: 'getting-to-know-aurelia/event-aggregator.md',
      role: 'capability-reference',
      curationNote: 'EventAggregator is real capability evidence, but it should not become the default public answer for shared feature state or ordinary component output.'
    },
    {
      relativePath: 'aurelia-packages/event-aggregator.md',
      role: 'capability-reference',
      curationNote: 'Package-level EventAggregator usage is reference evidence for exceptional pub/sub or infrastructure-style notifications, not a public pattern default.'
    }
  ],
  requiredEvidence: [
    { key: 'child dispatches a CustomEvent', signalNames: ['custom-event-dispatch'] },
    { key: 'CustomEvent carries explicit detail', signalNames: ['custom-event-detail'] },
    { key: 'CustomEvent bubbles to parent', signalNames: ['bubbling-custom-event'] },
    { key: 'parent listens with .trigger', signalNames: ['custom-event-listener', 'event-binding'] },
    { key: 'child receives parent input', signalNames: ['bindable-component', 'bindable-property-binding'] },
    { key: 'custom element composition', signalNames: ['custom-element-import', 'custom-element-usage'] },
    { key: 'view-model class source', signalNames: ['exported-view-model-class'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: componentCustomEventAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use a bubbling CustomEvent when a reusable child component needs to emit one DOM-like action to the parent template that renders it.',
    whenToUse: [
      'The child owns the local interaction and the visible parent owns the one resulting operation.',
      'The event payload is small and explicit.',
      'The listener is declared in the parent template.'
    ],
    whenNotToUse: [
      'The component only needs parent-to-child input values.',
      'The relationship represents shared or long-lived state that more than one component should read or update.',
      'The sender and receiver are unrelated feature collaborators rather than a visible parent-child UI boundary.'
    ],
    assumptions: [
      'The child is rendered inside the parent listener so a bubbling event can reach the parent.',
      'The payload is part of the child component contract and should remain small.',
      'The parent performs the app operation after receiving the event.'
    ],
    handoffNotes: [
      'Name output events after the action the parent handles.',
      'Keep persistence, routing, shared state, or side effects at the parent or service boundary.',
      'Promote shared feature behavior into an injected state/service class instead of chaining component output events.'
    ]
  }
};

export function analyzeComponentCustomEventEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): ComponentCustomEventEvidenceReport {
  return analyzePatternEvidence(corpus, componentCustomEventEvidenceProfile, pattern);
}

export function formatComponentCustomEventEvidenceReport(report: ComponentCustomEventEvidenceReport): string {
  return formatPatternEvidenceReport(report);
}
