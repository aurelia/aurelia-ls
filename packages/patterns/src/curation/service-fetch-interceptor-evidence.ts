import { serviceFetchInterceptorAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const serviceFetchInterceptorEvidenceProfile: PatternEvidenceProfile = {
  admission: serviceFetchInterceptorAdmission,
  documents: [
    {
      relativePath: 'aurelia-packages/fetch-client/interceptors.md',
      role: 'primary-grounding',
      curationNote: 'Grounds IFetchInterceptor and withInterceptor request/response hooks.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/setting-up.md',
      role: 'primary-grounding',
      curationNote: 'Grounds interceptor registration in fetch-client configuration.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/utilities-and-lifecycle.md',
      role: 'supporting-grounding',
      curationNote: 'Supports lifecycle and ordering cautions around configured interceptors.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/overview.md',
      role: 'supporting-grounding',
      curationNote: 'Supports fetch-client as the package substrate for interceptor policy.'
    }
  ],
  requiredEvidence: [
    { key: 'interceptor mechanism', signalNames: ['http-interceptor'] },
    { key: 'fetch-client configuration', signalNames: ['http-client-configuration', 'http-client'] }
  ],
  metadataDraft: {
    summary: 'Use a fetch-client interceptor when every request through a configured client should receive the same request or response treatment.',
    whenToUse: [
      'A client needs consistent tracing or format headers.',
      'The behavior belongs to HTTP policy.',
      'The interceptor stays small.'
    ],
    whenNotToUse: [
      'Only one request needs the option.',
      'The behavior needs feature state.',
      'The policy is retry, cache, cancellation, or authentication.'
    ],
    assumptions: [
      'The behavior applies to all requests through the client.',
      'The interceptor does not need component state.',
      'Setup runs once at a clear boundary.'
    ],
    handoffNotes: [
      'Keep request-specific options near the request.',
      'Separate interceptor concerns deliberately.',
      'Register setup where lifetime is clear.'
    ]
  }
};
