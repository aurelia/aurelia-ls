import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { routerRouteParametersAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type RouterRouteParametersEvidenceReport = PatternEvidenceReport;
export type RouterRouteParametersEvidenceCheck = PatternEvidenceCheck;
export type RouterRouteParametersDocumentEvidence = PatternDocumentEvidence;
export type RouterRouteParametersMetadataDraft = PatternMetadataDraft;

export const routerRouteParametersEvidenceProfile: PatternEvidenceProfile = {
  admission: routerRouteParametersAdmission,
  documents: [
    {
      relativePath: 'router/route-parameters.md',
      role: 'primary-grounding',
      curationNote: 'Grounds parameter declaration, direct Params hook use, nested route aggregation, merge strategy, and optional query parameter inclusion.'
    },
    {
      relativePath: 'router/routing-lifecycle.md',
      role: 'primary-grounding',
      curationNote: 'Grounds the route loading hook as the point where route-critical data can use aggregated parent and child parameters.'
    },
    {
      relativePath: 'router/api-reference.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds the IRouteContext.getRouteParameters API shape and accepted merge strategies.'
    },
    {
      relativePath: 'router/child-routing.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds parent and child routes as the scenario where route-context parameter aggregation is useful.'
    },
    {
      relativePath: 'router/README.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds the public router guide entry for accessing route parameters through IRouteContext.'
    },
    {
      relativePath: 'developer-guides/cheat-sheet.md',
      role: 'caution-evidence',
      curationNote: 'Contains useful route context snippets but mixes many compact reference surfaces, so it should not be copied as a public pattern.'
    },
    {
      relativePath: 'developer-guides/testing/mocks-spies.md',
      role: 'companion-evidence',
      curationNote: 'Shows IRouteContext can be mocked in tests; useful as handoff support, not as the primary authoring pattern.'
    }
  ],
  requiredEvidence: [
    { key: 'route context access', signalNames: ['route-context'] },
    { key: 'route parameter aggregation helper', signalNames: ['route-parameter-aggregation'] },
    { key: 'merge strategy choice', signalNames: ['route-parameter-merge-strategy'] },
    { key: 'query parameter inclusion', signalNames: ['route-query-parameters'] },
    { key: 'route lifecycle loading collaboration', signalNames: ['route-lifecycle', 'loading-hook'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: routerRouteParametersAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use IRouteContext.getRouteParameters() when route params (route parameters) from parent, child, and query string form one typed identity before loading data.',
    whenToUse: [
      'Nested routes split one route identity across parent and child URL segments.',
      'A route loading hook needs the full identity before it asks an injected service for data.',
      'Query string values are part of the same read boundary, such as a tab, filter, or view mode.'
    ],
    whenNotToUse: [
      'A flat route only needs the Params argument passed into canLoad or loading.',
      'The problem is relative navigation or active-link state rather than parameter aggregation.',
      'The route needs auth, cache, stale-response, or error-recovery policy beyond reading URL identity.'
    ],
    assumptions: [
      'The route tree captures identity across parent and child routes.',
      'The loading hook owns the route-critical data request.',
      'Query parameters are included only when they belong to the same data boundary.'
    ],
    handoffNotes: [
      'Read aggregated parameters at the point of route loading.',
      'Choose the merge strategy deliberately.',
      'Keep parameter reading separate from data policy.'
    ]
  }
};

export function analyzeRouterRouteParametersEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): RouterRouteParametersEvidenceReport {
  return analyzePatternEvidence(corpus, routerRouteParametersEvidenceProfile, pattern);
}

export function formatRouterRouteParametersEvidenceReport(
  report: RouterRouteParametersEvidenceReport
): string {
  return formatPatternEvidenceReport(report);
}
