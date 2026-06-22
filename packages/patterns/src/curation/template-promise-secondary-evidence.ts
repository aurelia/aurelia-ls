import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { templatePromiseSecondaryAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type TemplatePromiseSecondaryEvidenceReport = PatternEvidenceReport;
export type TemplatePromiseSecondaryEvidenceCheck = PatternEvidenceCheck;
export type TemplatePromiseSecondaryDocumentEvidence = PatternDocumentEvidence;
export type TemplatePromiseSecondaryMetadataDraft = PatternMetadataDraft;

export const templatePromiseSecondaryEvidenceProfile: PatternEvidenceProfile = {
  admission: templatePromiseSecondaryAdmission,
  documents: [
    {
      relativePath: 'templates/template-syntax/template-promises.md',
      role: 'primary-grounding',
      curationNote: 'Grounds promise.bind plus pending, then, and catch states, including retry-style examples and isolated promise scope.'
    },
    {
      relativePath: 'templates/README.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds template promise binding as a first-class template syntax topic.'
    },
    {
      relativePath: 'developer-guides/error-messages/runtime-html/aur0813.md',
      role: 'diagnostic-reference',
      curationNote: 'Grounds the direct-child structural rule for pending/then/catch states under the promise controller.'
    },
    {
      relativePath: 'developer-guides/error-handling-patterns.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds promise templates as one way to show async loading and error states, but not the whole error-handling architecture.'
    },
    {
      relativePath: 'developer-guides/cheat-sheet.md',
      role: 'caution-evidence',
      curationNote: 'Contains compact promise and route snippets, but is reference material rather than public pattern source.'
    },
    {
      relativePath: 'router/routing-lifecycle.md',
      role: 'contrast-evidence',
      curationNote: 'Grounds the boundary: route-critical data belongs in router loading hooks, not promise-bound secondary panels.'
    }
  ],
  requiredEvidence: [
    { key: 'promise controller', signalNames: ['promise.bind'] },
    { key: 'pending state', signalNames: ['promise-pending'] },
    { key: 'resolved state', signalNames: ['promise-then'] },
    { key: 'rejected state', signalNames: ['promise-catch'] },
    { key: 'template result rendering', signalNames: ['repeat.for', 'interpolation'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: templatePromiseSecondaryAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use promise.bind when secondary async content can render its own pending, success, and error states without blocking component or route activation.',
    whenToUse: [
      'A panel, feed, preview, or recommendation list can appear after the main view is already useful.',
      'The async state belongs to one template region and can be retried from that region.',
      'You want declarative pending, then, and catch UI around a stable Promise property.'
    ],
    whenNotToUse: [
      'The route must not render until the data is available.',
      'The async operation needs cancellation, stale-response guards, caching, or shared request tracking.',
      'Several components need to coordinate the same async state or command.'
    ],
    assumptions: [
      'The main view remains useful while this secondary content is pending.',
      'A Promise property is assigned deliberately and replaced on retry.',
      'The async operation is local to this component region.'
    ],
    handoffNotes: [
      'Use router loading for route-critical data.',
      'Move operational async policy into an injected service.',
      'Keep pending, then, and catch children directly under the promise controller.'
    ]
  }
};

export function analyzeTemplatePromiseSecondaryEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): TemplatePromiseSecondaryEvidenceReport {
  return analyzePatternEvidence(corpus, templatePromiseSecondaryEvidenceProfile, pattern);
}

export function formatTemplatePromiseSecondaryEvidenceReport(
  report: TemplatePromiseSecondaryEvidenceReport
): string {
  return formatPatternEvidenceReport(report);
}
