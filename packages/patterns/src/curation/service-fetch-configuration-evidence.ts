import { serviceFetchConfigurationAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const serviceFetchConfigurationEvidenceProfile: PatternEvidenceProfile = {
  admission: serviceFetchConfigurationAdmission,
  documents: [
    {
      relativePath: 'aurelia-packages/fetch-client/setting-up.md',
      role: 'primary-grounding',
      curationNote: 'Grounds configure(), withBaseUrl(), withDefaults(), rejectErrorResponses(), and DI access to IHttpClient.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/overview.md',
      role: 'primary-grounding',
      curationNote: 'Grounds fetch-client as the HTTP client package and shared configuration surface.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/utilities-and-lifecycle.md',
      role: 'supporting-grounding',
      curationNote: 'Supports lifecycle and configuration timing concerns.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/outcome-recipes.md',
      role: 'deferred-evidence',
      curationNote: 'Auth, retries, caching, and instrumentation are later HTTP policy patterns.'
    }
  ],
  requiredEvidence: [
    { key: 'fetch-client configuration', signalNames: ['http-client-configuration', 'http-client'] },
    { key: 'configured request substrate', signalNames: ['http-request', 'json-response'] }
  ],
  metadataDraft: {
    summary: 'Configure Aurelia fetch-client once where API defaults belong, then inject typed services for actual requests.',
    whenToUse: [
      'Several services share base URL or defaults.',
      'HTTP policy should be centralized.',
      'A configured client is enough before richer policy.'
    ],
    whenNotToUse: [
      'A single plain request is enough.',
      'The main concern is cancellation, retry, cache, tracing, or authentication.',
      'Different API domains need separate clients.'
    ],
    assumptions: [
      'The defaults truly apply to shared requests.',
      'Configuration runs before services request data.',
      'Endpoint paths are relative to the base URL.'
    ],
    handoffNotes: [
      'Configure the client at an application boundary.',
      'Split clients when API policy differs.',
      'Add interceptors and retries as explicit later policy.'
    ]
  }
};
