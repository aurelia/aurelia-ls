import { collectionPaginationAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const collectionPaginationEvidenceProfile: PatternEvidenceProfile = {
  admission: collectionPaginationAdmission,
  documents: [
    {
      relativePath: 'templates/repeats-and-list-rendering.md',
      role: 'primary-grounding',
      curationNote: 'Grounds repeat.for list rendering and keyed repeat patterns.'
    },
    {
      relativePath: 'advanced-scenarios/performance-optimization-techniques.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds pagination and performance tradeoffs for larger lists.'
    },
    {
      relativePath: 'developer-guides/ui-virtualization.md',
      role: 'deferred-evidence',
      curationNote: 'Marks the escalation path when local pagination is not enough.'
    }
  ],
  requiredEvidence: [
    { key: 'local pagination state', signalNames: ['pagination'] },
    { key: 'list rendering substrate', signalNames: ['repeat.for', 'keyed-repeat'] }
  ],
  metadataDraft: {
    summary: 'Use view-model pagination getters when a local collection should render a bounded page without introducing server or router state.',
    whenToUse: [
      'The full collection is already local.',
      'Page choice is presentation state.',
      'Normal repeat rendering is enough.'
    ],
    whenNotToUse: [
      'The server owns paging.',
      'The page belongs in the URL.',
      'The list needs virtualization.'
    ],
    assumptions: [
      'The full collection is in memory.',
      'Changing pages does not fetch data.',
      'The list is modest in size.'
    ],
    handoffNotes: [
      'Move server-owned page state to a service or route.',
      'Keep page state deterministic after filtering.',
      'Escalate large lists deliberately.'
    ]
  }
};
