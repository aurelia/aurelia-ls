import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { templateClassStyleBindingAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type TemplateClassStyleBindingEvidenceReport = PatternEvidenceReport;
export type TemplateClassStyleBindingEvidenceCheck = PatternEvidenceCheck;
export type TemplateClassStyleBindingDocumentEvidence = PatternDocumentEvidence;
export type TemplateClassStyleBindingMetadataDraft = PatternMetadataDraft;

export const templateClassStyleBindingEvidenceProfile: PatternEvidenceProfile = {
  admission: templateClassStyleBindingAdmission,
  documents: [
    {
      relativePath: 'templates/class-and-style-bindings.md',
      role: 'primary-grounding',
      curationNote: 'Grounds .class toggles, class.bind/string forms, property style binding, and style.bind object forms.'
    },
    {
      relativePath: 'components/class-and-style-binding.md',
      role: 'primary-grounding',
      curationNote: 'Rich class/style binding guide; useful evidence, but broad theming, CSS variables, Shadow DOM, and build-tool concerns stay out of the baseline.'
    },
    {
      relativePath: 'getting-to-know-aurelia/introduction/class-and-style-binding.md',
      role: 'supporting-grounding',
      curationNote: 'Introductory class/style binding explanation that reinforces the simple boolean and style-object forms.'
    },
    {
      relativePath: 'templates/template-syntax/attribute-binding.md',
      role: 'supporting-grounding',
      curationNote: 'Attribute-binding reference confirms class.bind and style.bind are ordinary template binding affordances.'
    },
    {
      relativePath: 'developer-guides/scenarios/tailwindcss-integration.md',
      role: 'deferred-evidence',
      curationNote: 'Tailwind scanner guidance is important build-tool policy, not the default class/style binding pattern.'
    }
  ],
  requiredEvidence: [
    { key: 'state-driven class binding', signalNames: ['class-style-binding', 'class-toggle-binding', 'class-binding'] },
    { key: 'state-driven style binding', signalNames: ['style-property-binding', 'style-object-binding'] },
    { key: 'view-model state for visual decisions', signalNames: ['exported-view-model-class', 'computed-getter'] },
    { key: 'template event or conditional state changes', signalNames: ['event-binding', 'if.bind', 'interpolation'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: templateClassStyleBindingAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use Aurelia class and style bindings to reflect component state in native HTML without adding DOM manipulation code.',
    whenToUse: [
      'A component needs selected, compact, warning, loading, or similar visual states.',
      'CSS classes should change from simple booleans or comparisons in the template.',
      'A small inline style value, such as width or opacity, should come from view-model state.'
    ],
    whenNotToUse: [
      'The main problem is theming architecture, CSS modules, Shadow DOM isolation, or build-tool scanning.',
      'The class name needs value conversion or i18n/plugin-specific formatting.',
      'The visual state should be represented by validation, router activity, animation orchestration, or a design-system component.'
    ],
    assumptions: [
      'Visual state is already available as simple view-model properties or getters.',
      'Named CSS classes live in the component stylesheet or application design system.',
      'Inline style values are small, bounded, and safe to derive from component state.'
    ],
    handoffNotes: [
      'Keep class names stable when a CSS scanner or design system needs to see them.',
      'Move complex visual decisions into view-model getters.',
      'Use a styling architecture pattern for isolation, theming, or animation orchestration.'
    ]
  }
};

export function analyzeTemplateClassStyleBindingEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): TemplateClassStyleBindingEvidenceReport {
  return analyzePatternEvidence(corpus, templateClassStyleBindingEvidenceProfile, pattern);
}

export function formatTemplateClassStyleBindingEvidenceReport(
  report: TemplateClassStyleBindingEvidenceReport
): string {
  return formatPatternEvidenceReport(report);
}
