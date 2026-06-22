import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { shellNavigationProgressAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type ShellNavigationProgressEvidenceReport = PatternEvidenceReport;
export type ShellNavigationProgressEvidenceCheck = PatternEvidenceCheck;
export type ShellNavigationProgressDocumentEvidence = PatternDocumentEvidence;
export type ShellNavigationProgressMetadataDraft = PatternMetadataDraft;

export const shellNavigationProgressEvidenceProfile: PatternEvidenceProfile = {
  admission: shellNavigationProgressAdmission,
  documents: [
    {
      relativePath: 'router/router-events.md',
      role: 'primary-grounding',
      curationNote: 'Grounds IRouterEvents, navigation-start/end/cancel/error events, and the docs-side preference for typed router events over EventAggregator.'
    },
    {
      relativePath: 'router/viewports.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds shell-level au-viewport placement for routed content.'
    },
    {
      relativePath: 'router/routing-lifecycle.md',
      role: 'companion-evidence',
      curationNote: 'Route lifecycle hooks explain why the shell shows progress while routed components own route-specific loading work.'
    },
    {
      relativePath: 'router/router-configuration.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds router setup as application startup policy, not shell component logic.'
    },
    {
      relativePath: 'getting-to-know-aurelia/event-aggregator.md',
      role: 'capability-reference',
      curationNote: 'EventAggregator is intentionally reference evidence only; typed router events are the preferred public pattern for router progress.'
    }
  ],
  requiredEvidence: [
    { key: 'typed router events service', signalNames: ['router-events'] },
    {
      key: 'navigation lifecycle event coverage',
      signalNames: [
        'navigation-start-event',
        'navigation-end-event',
        'navigation-cancel-event',
        'navigation-error-event'
      ]
    },
    { key: 'shell viewport support', signalNames: ['route-viewport'] },
    { key: 'template progress and error display', signalNames: ['if.bind', 'interpolation'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: shellNavigationProgressAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use the typed router events service from an app shell or shell-owned state service to show navigation progress and navigation errors.',
    whenToUse: [
      'A routed app needs one visible progress indicator while route guards, loading hooks, or lazy components run.',
      'The progress state belongs to the application shell rather than one routed page.',
      'Typed router events are a better fit than generic pub/sub wiring.'
    ],
    whenNotToUse: [
      'The async work belongs entirely inside one component and does not affect navigation.',
      'The route should block on critical data; pair this with a route loading pattern.',
      'The app needs analytics, breadcrumb policy, or error recovery beyond basic progress and failure feedback.'
    ],
    assumptions: [
      '@aurelia/router is configured in app startup and the shell owns the top-level viewport.',
      'Navigation progress is app-shell UI state, not page data or route authorization.',
      'Analytics and recovery policy are app-specific.'
    ],
    handoffNotes: [
      'Keep route data loading inside routed components or data services.',
      'Dispose subscriptions if this state is scoped below the application lifetime.',
      'Add error recovery only after navigation-error policy exists.'
    ]
  }
};

export function analyzeShellNavigationProgressEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): ShellNavigationProgressEvidenceReport {
  return analyzePatternEvidence(corpus, shellNavigationProgressEvidenceProfile, pattern);
}

export function formatShellNavigationProgressEvidenceReport(
  report: ShellNavigationProgressEvidenceReport
): string {
  return formatPatternEvidenceReport(report);
}
