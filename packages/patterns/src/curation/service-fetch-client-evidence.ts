import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { serviceFetchClientAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type ServiceFetchClientEvidenceReport = PatternEvidenceReport;
export type ServiceFetchClientEvidenceCheck = PatternEvidenceCheck;
export type ServiceFetchClientDocumentEvidence = PatternDocumentEvidence;
export type ServiceFetchClientMetadataDraft = PatternMetadataDraft;

export const serviceFetchClientEvidenceProfile: PatternEvidenceProfile = {
  admission: serviceFetchClientAdmission,
  documents: [
    {
      relativePath: 'aurelia-packages/fetch-client/overview.md',
      role: 'primary-grounding',
      curationNote: 'Grounds IHttpClient, resolve(), HTTP methods, JSON reads, request status, and the idea of service-owned API access.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/setting-up.md',
      role: 'primary-grounding',
      curationNote: 'Grounds the DI quick start plus the warning that shared client configuration is application policy.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/response-types.md',
      role: 'primary-grounding',
      curationNote: 'Grounds response.ok/status checks and JSON response handling before broader binary/text/streaming formats.'
    },
    {
      relativePath: 'developer-guides/working-with-web-standards.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds the broader Aurelia posture of wrapping web APIs in DI services for reuse and testing.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/outcome-recipes.md',
      role: 'deferred-evidence',
      curationNote: 'Auth, retries, abortable uploads, caching, and request instrumentation are important later outcomes, not the baseline data-service slice.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/caching.md',
      role: 'deferred-evidence',
      curationNote: 'Fetch-client caching is intentionally deferred until a pattern explicitly owns cache policy.'
    }
  ],
  requiredEvidence: [
    { key: 'Aurelia fetch-client injection', signalNames: ['http-client', 'resolve-service'] },
    { key: 'service boundary for HTTP', signalNames: ['service-class', 'di-interface-token', 'singleton-service'] },
    { key: 'JSON request and response handling', signalNames: ['http-request', 'http-response-check', 'json-response'] },
    { key: 'component async loading lifecycle', signalNames: ['component-load-lifecycle', 'loading-state'] },
    { key: 'component error feedback', signalNames: ['error-feedback'] },
    { key: 'template renders fetched records', signalNames: ['repeat.for', 'interpolation'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: serviceFetchClientAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use an injected service around Aurelia fetch-client when a component needs JSON data from an HTTP API.',
    whenToUse: [
      'A component needs API data but should not own HTTP details directly.',
      'The useful first behavior is a typed JSON read with component loading and error feedback.',
      'The app does not yet need cache, retry, auth, abort, upload, or router-loading policy in the same slice.'
    ],
    whenNotToUse: [
      'The data is local, already loaded, or supplied by a parent.',
      'Navigation must wait for the data before the route enters.',
      'The main problem is auth, caching, retries, uploads, cancellation, or global request tracking.'
    ],
    assumptions: [
      '@aurelia/fetch-client is installed and IHttpClient is available through DI.',
      'The endpoint returns JSON compatible with the pattern type.',
      'The component can show non-blocking loading and error states.'
    ],
    handoffNotes: [
      'Configure base URLs, credentials, auth, interceptors, retries, and caching where app policy belongs.',
      'Validate or map real API payloads before trusting response.json() casts.',
      'Use router lifecycle patterns when navigation must wait for the data.'
    ]
  }
};

export function analyzeServiceFetchClientEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): ServiceFetchClientEvidenceReport {
  return analyzePatternEvidence(corpus, serviceFetchClientEvidenceProfile, pattern);
}

export function formatServiceFetchClientEvidenceReport(report: ServiceFetchClientEvidenceReport): string {
  return formatPatternEvidenceReport(report);
}
