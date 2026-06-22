import { collectionServerQueryAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const collectionServerQueryEvidenceProfile: PatternEvidenceProfile = {
  admission: collectionServerQueryAdmission,
  documents: [
    {
      relativePath: 'templates/recipes/data-table.md',
      role: 'primary-grounding',
      curationNote: 'Grounds table filtering, sorting, and paging affordances; curated source moves server ownership into a typed service and URL query state.'
    },
    {
      relativePath: 'router/route-parameters.md',
      role: 'primary-grounding',
      curationNote: 'Grounds route query-parameter reads and route-context parameter handling.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/setting-up.md',
      role: 'primary-grounding',
      curationNote: 'Grounds injected fetch-client services, HTTP requests, response checks, and JSON parsing.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/abort-controller.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds request cancellation for stale server-backed queries.'
    },
    {
      relativePath: 'templates/forms/README.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds native form controls used to edit query state.'
    }
  ],
  requiredEvidence: [
    { key: 'server query controls', signalNames: ['pagination', 'filter-or-sort'] },
    { key: 'route query source of truth', signalNames: ['route-query-parameters'] },
    { key: 'fetch-client request boundary', signalNames: ['http-client', 'http-request', 'json-response'] },
    { key: 'stale request cancellation', signalNames: ['abort-controller'] }
  ],
  metadataDraft: {
    summary: 'Use a typed query service plus URL query state when filtering, sorting, and pagination belong to the server.',
    whenToUse: [
      'The server owns the result set.',
      'The current query should be shareable in the URL.',
      'Stale requests should be cancelled.'
    ],
    whenNotToUse: [
      'The full collection is local.',
      'Selection must survive across query changes.',
      'The issue is DOM volume rather than data ownership.'
    ],
    assumptions: [
      'The API accepts URL query parameters.',
      'The route query string is reviewable state.',
      'Cross-page selection is not local page state.'
    ],
    handoffNotes: [
      'Adapt the query object first.',
      'Keep cancellation beside the visible query owner.',
      'Move cross-page selection into injected state.'
    ]
  }
};
