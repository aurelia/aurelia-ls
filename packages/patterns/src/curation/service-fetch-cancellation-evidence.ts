import { serviceFetchCancellationAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const serviceFetchCancellationEvidenceProfile: PatternEvidenceProfile = {
  admission: serviceFetchCancellationAdmission,
  documents: [
    {
      relativePath: 'aurelia-packages/fetch-client/abort-controller.md',
      role: 'primary-grounding',
      curationNote: 'Grounds AbortController with fetch-client, stale request cancellation, and cleanup guidance.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/setting-up.md',
      role: 'primary-grounding',
      curationNote: 'Grounds passing AbortSignal to fetch-client requests.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/advanced.md',
      role: 'supporting-grounding',
      curationNote: 'Supports advanced cancellation contexts without making retry/cache part of this baseline.'
    },
    {
      relativePath: 'components/component-lifecycles.md',
      role: 'supporting-grounding',
      curationNote: 'Supports detaching cleanup for component-owned resources.'
    }
  ],
  requiredEvidence: [
    { key: 'AbortController request cancellation', signalNames: ['abort-controller'] },
    { key: 'fetch-client request handling', signalNames: ['http-client', 'http-request'] },
    { key: 'component cleanup', signalNames: ['lifecycle-cleanup'] }
  ],
  metadataDraft: {
    summary: 'Use `AbortController` with Aurelia fetch-client when a component must cancel stale or leaving-page requests.',
    whenToUse: [
      'A newer request should cancel an older one.',
      'Leaving the component should cancel active work.',
      'Cancellation is the first policy need.'
    ],
    whenNotToUse: [
      'The request is route-critical.',
      'The request should complete in the background.',
      'The main issue is retry, cache, upload progress, or global tracking.'
    ],
    assumptions: [
      'New searches cancel older searches.',
      'Leaving cancels the active request.',
      'Abort errors are expected control flow.'
    ],
    handoffNotes: [
      'Keep route-critical requests in router loading.',
      'Avoid mixing cancellation with retry policy casually.',
      'Move shared search state behind DI if needed.'
    ]
  }
};
