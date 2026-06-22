import { serviceFetchCachePolicyAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const serviceFetchCachePolicyEvidenceProfile: PatternEvidenceProfile = {
  admission: serviceFetchCachePolicyAdmission,
  documents: [
    {
      relativePath: 'aurelia-packages/fetch-client/caching.md',
      role: 'primary-grounding',
      curationNote: 'Grounds CacheInterceptor, cacheTime, staleTime, and cache freshness policy.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/setting-up.md',
      role: 'primary-grounding',
      curationNote: 'Grounds fetch-client configuration and client registration.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/utilities-and-lifecycle.md',
      role: 'supporting-grounding',
      curationNote: 'Supports interceptor lifecycle and ordering cautions.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/interceptors.md',
      role: 'supporting-grounding',
      curationNote: 'Supports cache policy as interceptor-shaped HTTP policy without making generic interceptors the pattern.'
    }
  ],
  requiredEvidence: [
    { key: 'cache interceptor policy', signalNames: ['http-cache', 'http-interceptor'] },
    { key: 'fetch-client configuration', signalNames: ['http-client-configuration', 'http-client'] }
  ],
  metadataDraft: {
    summary: 'Use a configured fetch-client cache interceptor when a read service can safely reuse recent responses across component visits.',
    whenToUse: [
      'The endpoint tolerates a freshness window.',
      'Several visits ask for the same data.',
      'The cache lifetime is HTTP policy.'
    ],
    whenNotToUse: [
      'The request must always be live.',
      'The response contains editable draft state.',
      'The real need is retry, cancellation, or auth.'
    ],
    assumptions: [
      'The endpoint is safe to cache briefly.',
      'The configured client is shared deliberately.',
      'Components only track render state.'
    ],
    handoffNotes: [
      'Keep cache policy close to the HTTP boundary.',
      'Use injected state for editable or collaborative data.',
      'Avoid duplicate interceptor registration.'
    ]
  }
};
