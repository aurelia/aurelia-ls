import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { componentLocalCollectionAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type LocalCollectionEvidenceReport = PatternEvidenceReport;
export type LocalCollectionEvidenceCheck = PatternEvidenceCheck;
export type LocalCollectionDocumentEvidence = PatternDocumentEvidence;
export type LocalCollectionMetadataDraft = PatternMetadataDraft;

export type LocalCollectionEvidenceRole =
  | 'primary-grounding'
  | 'recipe-evidence'
  | 'parser-test'
  | 'deferred-evidence'
  | 'supporting-grounding';

export const localCollectionEvidenceProfile: PatternEvidenceProfile = {
  admission: componentLocalCollectionAdmission,
  documents: [
    {
      relativePath: 'templates/repeats-and-list-rendering.md',
      role: 'primary-grounding',
      curationNote: 'Primary repeat.for and keyed-repeat grounding for local array rendering.'
    },
    {
      relativePath: 'templates/recipes/product-catalog.md',
      role: 'recipe-evidence',
      curationNote: 'Useful searchable/filterable local collection evidence, but too broad to copy wholesale.'
    },
    {
      relativePath: 'templates/recipes/data-table.md',
      role: 'parser-test',
      curationNote: 'Strong multi-section recipe/parser test; pagination and batch selection stay out of the base pattern.'
    },
    {
      relativePath: 'templates/recipes/search-autocomplete.md',
      role: 'deferred-evidence',
      curationNote: 'Evidence for later autocomplete/bindable/async component work, not for the first local collection pattern.'
    },
    {
      relativePath: 'essentials/reactivity.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds plain properties and cheap getters before decorators or watchers.'
    },
    {
      relativePath: 'essentials/components.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds the component pair as TypeScript view-model plus HTML template.'
    },
    {
      relativePath: 'essentials/templates.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds interpolation, value.bind, event binding, conditionals, and repeat.for as core template syntax.'
    },
    {
      relativePath: 'templates/conditional-rendering.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds if.bind empty-state rendering for the curated pattern.'
    }
  ],
  requiredEvidence: [
    { key: 'repeat.for', signalNames: ['repeat.for'] },
    { key: 'ordinary template binding', signalNames: ['value.bind', 'interpolation', 'event-binding', 'if.bind'] },
    { key: 'view-model class', signalNames: ['exported-view-model-class'] },
    { key: 'local array data', signalNames: ['local-array'] },
    { key: 'cheap derived filtering', signalNames: ['computed-getter', 'filter-or-sort'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: componentLocalCollectionAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use a component view-model to own a small local collection, expose a cheap filtered list, and handle row selection through ordinary Aurelia bindings.',
    whenToUse: [
      'You need a non-routed component that displays, searches, and selects records from a small collection.',
      'The collection is local view-lifetime state rather than shared application state.',
      'You want a complete component pair before introducing remote data or shared services.'
    ],
    whenNotToUse: [
      'The collection is loaded from a remote API or needs caching, retries, pagination, or persistence.',
      'Multiple routes or components need to share the same collection or selection state.',
      'The list/detail selection should be represented in the URL.'
    ],
    assumptions: [
      'The collection belongs to one component and can be reset when that component is destroyed.',
      'Seed records are illustrative and should be replaced before production use.',
      'Visual styling belongs to the application or design system.'
    ],
    handoffNotes: [
      'Move records behind an app data boundary once they come from persistence, HTTP, or shared state.',
      'Promote local state to an injected service only when another app area needs the same records or selection.',
      'Rename the local collection, fields, actions, and empty-state copy around the real affordance.'
    ]
  }
};

export function analyzeLocalCollectionEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): LocalCollectionEvidenceReport {
  return analyzePatternEvidence(corpus, localCollectionEvidenceProfile, pattern);
}

export function formatLocalCollectionEvidenceReport(report: LocalCollectionEvidenceReport): string {
  return formatPatternEvidenceReport(report);
}
