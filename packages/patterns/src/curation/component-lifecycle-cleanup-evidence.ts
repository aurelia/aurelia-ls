import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { componentLifecycleCleanupAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type ComponentLifecycleCleanupEvidenceReport = PatternEvidenceReport;
export type ComponentLifecycleCleanupEvidenceCheck = PatternEvidenceCheck;
export type ComponentLifecycleCleanupDocumentEvidence = PatternDocumentEvidence;
export type ComponentLifecycleCleanupMetadataDraft = PatternMetadataDraft;

export const componentLifecycleCleanupEvidenceProfile: PatternEvidenceProfile = {
  admission: componentLifecycleCleanupAdmission,
  documents: [
    {
      relativePath: 'components/component-lifecycles.md',
      role: 'primary-grounding',
      curationNote: 'Grounds attached, detaching, unbinding, dispose, and the setup/cleanup pairing guidance.'
    },
    {
      relativePath: 'components/lifecycle-diagrams.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds lifecycle order and common cleanup pitfalls.'
    },
    {
      relativePath: 'developer-guides/working-with-web-standards.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds platform/browser API usage as an explicit integration point rather than hidden framework magic.'
    },
    {
      relativePath: 'getting-to-know-aurelia/watching-data.md',
      role: 'deferred-evidence',
      curationNote: 'Watcher and observation side-effect APIs are separate reactive side-effect policy, not basic component cleanup.'
    },
    {
      relativePath: 'router/routing-lifecycle.md',
      role: 'deferred-evidence',
      curationNote: 'Router lifecycle hooks are route transaction policy and should not be confused with component DOM setup/cleanup.'
    }
  ],
  requiredEvidence: [
    { key: 'component lifecycle cleanup hook', signalNames: ['lifecycle-cleanup'] },
    { key: 'local component template feedback', signalNames: ['if.bind', 'interpolation'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: componentLifecycleCleanupAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use attached plus detaching or dispose when a component owns browser resources, subscriptions, or third-party setup that must be cleaned up.',
    whenToUse: [
      'A component registers a window or document listener while it is on screen.',
      'A component measures or initializes browser-only behavior after its element is attached.',
      'The cleanup belongs to the same component that performed the setup.'
    ],
    whenNotToUse: [
      'The work is pure local state and can be handled by fields, getters, or template bindings.',
      'The subscription is application-wide and should live in a shell-owned or injected service lifetime.',
      'The work is route-critical data loading, which belongs in router loading hooks instead.'
    ],
    assumptions: [
      'The component owns the listener and should remove it when the component leaves the DOM.',
      'Browser API setup waits until the component is attached.',
      'The state is local display state.'
    ],
    handoffNotes: [
      'Pair setup and cleanup in the matching lifecycle hooks.',
      'Keep the same callback identity for removeEventListener.',
      'Choose a longer-lived owner for application-wide subscriptions.'
    ]
  }
};

export function analyzeComponentLifecycleCleanupEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): ComponentLifecycleCleanupEvidenceReport {
  return analyzePatternEvidence(corpus, componentLifecycleCleanupEvidenceProfile, pattern);
}

export function formatComponentLifecycleCleanupEvidenceReport(
  report: ComponentLifecycleCleanupEvidenceReport
): string {
  return formatPatternEvidenceReport(report);
}
