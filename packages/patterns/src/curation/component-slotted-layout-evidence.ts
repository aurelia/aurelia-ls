import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { componentSlottedLayoutAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type ComponentSlottedLayoutEvidenceReport = PatternEvidenceReport;
export type ComponentSlottedLayoutEvidenceCheck = PatternEvidenceCheck;
export type ComponentSlottedLayoutDocumentEvidence = PatternDocumentEvidence;
export type ComponentSlottedLayoutMetadataDraft = PatternMetadataDraft;

export const componentSlottedLayoutEvidenceProfile: PatternEvidenceProfile = {
  admission: componentSlottedLayoutAdmission,
  documents: [
    {
      relativePath: 'components/shadow-dom-and-slots.md',
      role: 'primary-grounding',
      curationNote: 'Grounds au-slot, named projections, fallback content, direct-child projection rules, and projection scope behavior.'
    },
    {
      relativePath: 'components/shadow-dom.md',
      role: 'caution-evidence',
      curationNote: 'Grounds native slot and Shadow DOM behavior as a different component boundary than this light-DOM au-slot pattern.'
    },
    {
      relativePath: 'components/bindable-properties.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds scalar bindable inputs that should remain bindables rather than projected markup.'
    },
    {
      relativePath: 'components/components.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds custom element authoring and usage around a reusable component frame.'
    },
    {
      relativePath: 'templates/conditional-rendering.md',
      role: 'companion-evidence',
      curationNote: 'Shows that au-slot projections can combine with template controllers, but conditional state is not the focus of this pattern.'
    },
    {
      relativePath: 'developer-guides/error-messages/runtime-html/aur9990.md',
      role: 'companion-evidence',
      curationNote: 'Grounds invalid @slotted decorator usage as advanced slot-observation pressure, not part of this slice.'
    }
  ],
  requiredEvidence: [
    { key: 'slot content projection', signalNames: ['slot-content'] },
    { key: 'custom element shell', signalNames: ['bindable-component', 'custom-element-usage'] },
    { key: 'caller-owned projected action', signalNames: ['event-binding'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: componentSlottedLayoutAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use au-slot when a reusable application component should own the frame while callers provide named content regions without Shadow DOM.',
    whenToUse: [
      'A card, panel, toolbar, or list shell should provide a consistent frame while callers provide actions or body content.',
      'The projected content should keep the caller component scope.',
      'Light-DOM styling and application-owned composition are more important than native Shadow DOM encapsulation.'
    ],
    whenNotToUse: [
      'The component only needs scalar data from its parent; start with ordinary bindables instead.',
      'The component is a web-component-style boundary that intentionally requires native Shadow DOM slots.',
      'Projected content needs slot mutation observation, slotted decorators, or reusable library packaging policy.'
    ],
    assumptions: [
      'The layout component owns structure and fallback content.',
      'The app wants Aurelia light-DOM slotting through au-slot.',
      'Projected content is direct child content of the custom element.'
    ],
    handoffNotes: [
      'Start with bindables before introducing slot composition.',
      'Keep projected content at the custom element boundary.',
      'Use a separate advanced pattern for slot observation.'
    ]
  }
};

export function analyzeComponentSlottedLayoutEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): ComponentSlottedLayoutEvidenceReport {
  return analyzePatternEvidence(corpus, componentSlottedLayoutEvidenceProfile, pattern);
}

export function formatComponentSlottedLayoutEvidenceReport(
  report: ComponentSlottedLayoutEvidenceReport
): string {
  return formatPatternEvidenceReport(report);
}
