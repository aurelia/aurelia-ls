import type { AureliaPatternExample } from '../pattern-contract.js';
import type { DocsCorpus } from '../corpus/corpus-types.js';
import { serviceInjectedStateAdmission } from './admission-records.js';
import {
  analyzePatternEvidence,
  formatPatternEvidenceReport,
  type PatternDocumentEvidence,
  type PatternEvidenceCheck,
  type PatternEvidenceProfile,
  type PatternEvidenceReport,
  type PatternMetadataDraft
} from './evidence-review.js';

export type ServiceInjectedStateEvidenceReport = PatternEvidenceReport;
export type ServiceInjectedStateEvidenceCheck = PatternEvidenceCheck;
export type ServiceInjectedStateDocumentEvidence = PatternDocumentEvidence;
export type ServiceInjectedStateMetadataDraft = PatternMetadataDraft;

export const serviceInjectedStateEvidenceProfile: PatternEvidenceProfile = {
  admission: serviceInjectedStateAdmission,
  documents: [
    {
      relativePath: 'essentials/dependency-injection.md',
      role: 'primary-grounding',
      curationNote: 'Grounds services as regular classes, DI interface tokens, singleton registration, resolve() consumers, and test replacement.'
    },
    {
      relativePath: 'getting-to-know-aurelia/dependency-injection.md',
      role: 'primary-grounding',
      curationNote: 'Grounds the architectural reasons for DI: loose coupling, testability, lifetime control, and feature-specific registration caution.'
    },
    {
      relativePath: 'getting-to-know-aurelia/dependency-injection-di/creating-services.md',
      role: 'primary-grounding',
      curationNote: 'Grounds service creation variants and the choice to keep the first slice on DI.createInterface with a default singleton implementation.'
    },
    {
      relativePath: 'getting-started/intermediate-tutorial.md',
      role: 'recipe-evidence',
      curationNote: 'Shows a service used from app code, but the todo/localStorage shape is evidence only and should not become the public pattern personality.'
    },
    {
      relativePath: 'aurelia-packages/state.md',
      role: 'deferred-evidence',
      curationNote: 'State plugin material is real but intentionally deferred from the first plain-DI state service pattern.'
    },
    {
      relativePath: 'aurelia-packages/store/configuration-and-setup.md',
      role: 'deferred-evidence',
      curationNote: 'Store plugin material is real but intentionally deferred from the first plain-DI state service pattern.'
    }
  ],
  requiredEvidence: [
    { key: 'service class source', signalNames: ['service-class'] },
    { key: 'DI interface token registration', signalNames: ['di-interface-token'] },
    { key: 'singleton service lifetime', signalNames: ['singleton-service'] },
    { key: 'component resolves service', signalNames: ['resolve-service', 'dependency-injection'] },
    { key: 'state owned behind a service boundary', signalNames: ['shared-state-service', 'local-array'] },
    {
      key: 'deferred concerns detected before admission',
      signalNames: serviceInjectedStateAdmission.deferredSignals
    }
  ],
  metadataDraft: {
    summary:
      'Use a plain Aurelia DI singleton service when sibling components need to share small feature state without introducing a state plugin.',
    whenToUse: [
      'Multiple components in a feature need the same selection, draft, cache, or coordination state.',
      'The state has behavior around it and would become awkward if passed through every parent layer.',
      'The app only needs Aurelia DI lifetime management, not global state tooling.'
    ],
    whenNotToUse: [
      'The state is only used by one component.',
      'Persistence, fetch/http, retries, or cache invalidation are the main problem being solved.',
      'The app needs global dispatch, reducer/effect policy, scoped container lifetime, router state, or validation state.'
    ],
    assumptions: [
      'The shared state is feature-local and can live as a singleton in the active DI container.',
      'The service owns synchronous state and behavior; external IO belongs behind another service boundary.',
      'Consumers run inside an Aurelia DI context where resolve() can access the registered token.'
    ],
    handoffNotes: [
      'Introduce this pattern only after local component state becomes shared.',
      'Add storage or API collaborators as separate injected services when persistence or remote data becomes real.',
      'Promote to @aurelia/state or @aurelia/store only after app-wide dispatch, tooling, or cross-feature policy becomes valuable.'
    ]
  }
};

export function analyzeServiceInjectedStateEvidence(
  corpus: DocsCorpus,
  pattern?: AureliaPatternExample
): ServiceInjectedStateEvidenceReport {
  return analyzePatternEvidence(corpus, serviceInjectedStateEvidenceProfile, pattern);
}

export function formatServiceInjectedStateEvidenceReport(report: ServiceInjectedStateEvidenceReport): string {
  return formatPatternEvidenceReport(report);
}
