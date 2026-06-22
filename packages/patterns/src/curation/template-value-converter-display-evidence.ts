import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { templateValueConverterDisplayAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type TemplateValueConverterDisplayEvidenceReport = PatternEvidenceReport;
export type TemplateValueConverterDisplayEvidenceCheck = PatternEvidenceCheck;
export type TemplateValueConverterDisplayDocumentEvidence = PatternDocumentEvidence;
export type TemplateValueConverterDisplayMetadataDraft = PatternMetadataDraft;

export const templateValueConverterDisplayEvidenceProfile: PatternEvidenceProfile = {
  admission: templateValueConverterDisplayAdmission,
  documents: [
    {
      relativePath: 'templates/value-converters.md',
      role: 'primary-grounding',
      curationNote: 'Grounds value converter classes, toView, template pipe syntax, parameters, registration patterns, and deferred advanced converter features.'
    },
    {
      relativePath: 'templates/template-syntax/attribute-binding.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds the broader template guidance to keep complex expressions out of templates and move named logic to view-models or resources.'
    },
    {
      relativePath: 'developer-guides/error-messages/runtime-html/aur0103.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds the registration and naming failure mode for missing value converters.'
    },
    {
      relativePath: 'aurelia-packages/internationalization.md',
      role: 'deferred-evidence',
      curationNote: 'i18n-provided value converters are useful later, but plugin formatting and locale signals are not the base display-converter pattern.'
    },
    {
      relativePath: 'templates/binding-behaviors.md',
      role: 'deferred-evidence',
      curationNote: 'Binding behaviors compose with value converters but remain a separate template-affordance pattern.'
    }
  ],
  requiredEvidence: [
    { key: 'value converter resource', signalNames: ['value-converter-class', 'to-view-converter'] },
    { key: 'template pipe syntax', signalNames: ['value-converter'] },
    { key: 'converter parameter syntax', signalNames: ['converter-parameter'] },
    { key: 'registration or import awareness', signalNames: ['custom-element-import', 'manual-registration'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: templateValueConverterDisplayAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use a pure value converter when the same display transformation needs to stay reusable across Aurelia templates.',
    whenToUse: [
      'Several templates need the same label, formatting, or display mapping.',
      'The transformation is pure and can be expressed as toView(value, ...parameters).',
      'Template readability improves when the formatting name is explicit in the binding expression.'
    ],
    whenNotToUse: [
      'Only one component needs the value and a view-model getter would be clearer.',
      'The converter needs async work, HTTP, mutable state, caching policy, or access to caller context.',
      'The problem is localization, validation messages, two-way parsing, or plugin-provided formatting.'
    ],
    assumptions: [
      'The converter is pure and display-only.',
      'The converter is registered where the consuming template can resolve it.',
      'The transformation is reused enough that a converter is clearer than a component getter.'
    ],
    handoffNotes: [
      'Keep local-only display logic on the view model.',
      'Register the converter deliberately.',
      'Use separate patterns for fromView parsing, signalable converters, caller-context access, i18n, and caching.'
    ]
  }
};

export function analyzeTemplateValueConverterDisplayEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): TemplateValueConverterDisplayEvidenceReport {
  return analyzePatternEvidence(corpus, templateValueConverterDisplayEvidenceProfile, pattern);
}

export function formatTemplateValueConverterDisplayEvidenceReport(
  report: TemplateValueConverterDisplayEvidenceReport
): string {
  return formatPatternEvidenceReport(report);
}
