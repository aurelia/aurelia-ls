import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { routerCriticalLoadingAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type RouterCriticalLoadingEvidenceReport = PatternEvidenceReport;
export type RouterCriticalLoadingEvidenceCheck = PatternEvidenceCheck;
export type RouterCriticalLoadingDocumentEvidence = PatternDocumentEvidence;
export type RouterCriticalLoadingMetadataDraft = PatternMetadataDraft;

export const routerCriticalLoadingEvidenceProfile: PatternEvidenceProfile = {
  admission: routerCriticalLoadingAdmission,
  documents: [
    {
      relativePath: 'router/routing-lifecycle.md',
      role: 'primary-grounding',
      curationNote: 'Grounds canLoad as the route entry decision hook and loading() as setup/data preparation after entry is approved.'
    },
    {
      relativePath: 'router/configuring-routes.md',
      role: 'primary-grounding',
      curationNote: 'Grounds route configuration, route parameters, and the difference between route mapping and component activation.'
    },
    {
      relativePath: 'router/getting-started.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds @aurelia/router setup, au-viewport, and simple routed shell shape.'
    },
    {
      relativePath: 'router/router-events.md',
      role: 'companion-evidence',
      curationNote: 'Grounds shell navigation progress as the companion pattern for route-critical loading.'
    },
    {
      relativePath: 'components/component-lifecycles.md',
      role: 'supporting-grounding',
      curationNote: 'Supports the distinction between component lifecycle loading and router lifecycle loading.'
    },
    {
      relativePath: 'developer-guides/cheat-sheet.md',
      role: 'caution-evidence',
      curationNote: 'Contains useful async route snippets but mixes compact reference material with broader patterns, so it should not be copied as a public pattern.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/overview.md',
      role: 'deferred-evidence',
      curationNote: 'HTTP details belong behind an injected data service and remain separate from the route lifecycle pattern.'
    }
  ],
  requiredEvidence: [
    { key: 'route lifecycle hooks', signalNames: ['route-lifecycle'] },
    { key: 'canLoad entry decision', signalNames: ['can-load-hook'] },
    { key: 'loading setup hook', signalNames: ['loading-hook'] },
    { key: 'route parameters', signalNames: ['route-parameter'] },
    { key: 'route configuration and viewport', signalNames: ['route-config', 'route-viewport'] },
    { key: 'shell progress companion evidence', signalNames: ['router-events'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: routerCriticalLoadingAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use router lifecycle hooks so canLoad decides whether a route may enter, while loading() prepares fast route-critical data before render.',
    whenToUse: [
      'A routed page needs a parameter checked before entry and a small critical record ready before render.',
      'The data belongs to the route activation transaction, not a secondary panel.',
      'A shell navigation-progress pattern can show progress while the router waits.'
    ],
    whenNotToUse: [
      'The data is secondary, optional, or can render after the route is visible.',
      'The component is not routed or has no URL-shaped entry decision.',
      'The route needs complex auth, caching, streaming, stale-response handling, or global error recovery.'
    ],
    assumptions: [
      'The project id is part of the route path and can be checked before entry.',
      'The critical record is small enough to load during the router transaction.',
      'Shell progress covers the user-visible wait.'
    ],
    handoffNotes: [
      'Keep entry decisions in canLoad and setup work in loading().',
      'Move real data access behind an injected service boundary.',
      'Use promise-bound secondary content for noncritical panels.'
    ]
  }
};

export function analyzeRouterCriticalLoadingEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): RouterCriticalLoadingEvidenceReport {
  return analyzePatternEvidence(corpus, routerCriticalLoadingEvidenceProfile, pattern);
}

export function formatRouterCriticalLoadingEvidenceReport(
  report: RouterCriticalLoadingEvidenceReport
): string {
  return formatPatternEvidenceReport(report);
}
