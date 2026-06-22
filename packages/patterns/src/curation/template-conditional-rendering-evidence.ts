import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { templateConditionalRenderingAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type TemplateConditionalRenderingEvidenceReport = PatternEvidenceReport;
export type TemplateConditionalRenderingEvidenceCheck = PatternEvidenceCheck;
export type TemplateConditionalRenderingDocumentEvidence = PatternDocumentEvidence;
export type TemplateConditionalRenderingMetadataDraft = PatternMetadataDraft;

export const templateConditionalRenderingEvidenceProfile: PatternEvidenceProfile = {
  admission: templateConditionalRenderingAdmission,
  documents: [
    {
      relativePath: 'templates/conditional-rendering.md',
      role: 'primary-grounding',
      curationNote: 'Grounds if.bind, show.bind, switch.bind, case/default-case rules, and when to preserve or remove DOM state.'
    },
    {
      relativePath: 'essentials/templates.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds conditional rendering as a basic template affordance in ordinary app templates.'
    },
    {
      relativePath: 'templates/repeats-and-list-rendering.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds keyed repeat rendering inside a ready branch without making collection filtering the focus of this pattern.'
    },
    {
      relativePath: 'developer-guides/error-messages/runtime-html/aur0810.md',
      role: 'companion-evidence',
      curationNote: 'Grounds semantic-runtime follow-up pressure for invalid else adjacency.'
    },
    {
      relativePath: 'developer-guides/error-messages/runtime-html/aur0815.md',
      role: 'companion-evidence',
      curationNote: 'Grounds semantic-runtime follow-up pressure for invalid switch case/default-case structure.'
    }
  ],
  requiredEvidence: [
    { key: 'if branch rendering', signalNames: ['if.bind'] },
    { key: 'visibility-preserving branch rendering', signalNames: ['show.bind'] },
    { key: 'switch/case branch rendering', signalNames: ['switch.bind', 'switch-case'] },
    { key: 'ready-branch collection rendering', signalNames: ['repeat.for', 'keyed-repeat'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: templateConditionalRenderingAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use if.bind, show.bind, and switch.bind deliberately to render loading, empty, error, and ready UI states from plain view-model state.',
    whenToUse: [
      'A component has a small set of mutually exclusive UI states such as loading, empty, error, and ready.',
      'Some elements should be removed when inactive while another panel should keep DOM state across frequent toggles.',
      'The state is local to the component and can be expressed as ordinary TypeScript fields and getters.'
    ],
    whenNotToUse: [
      'The branch represents route-critical data that should be prepared in a router loading hook.',
      'The hidden content needs accessibility semantics beyond display toggling, such as modal focus management.',
      'The conditions duplicate permission, validation, or global application state policy that belongs in an injected service.'
    ],
    assumptions: [
      'The branch state is local component state.',
      'Ready and empty branches are mutually exclusive.',
      'Frequent detail toggles should preserve DOM state.'
    ],
    handoffNotes: [
      'Use if.bind when removal is intended.',
      'Use show.bind when preserving DOM state matters.',
      'Keep paired template branches adjacent to the controller they complete.'
    ]
  }
};

export function analyzeTemplateConditionalRenderingEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): TemplateConditionalRenderingEvidenceReport {
  return analyzePatternEvidence(corpus, templateConditionalRenderingEvidenceProfile, pattern);
}

export function formatTemplateConditionalRenderingEvidenceReport(
  report: TemplateConditionalRenderingEvidenceReport
): string {
  return formatPatternEvidenceReport(report);
}
