import { collectionVirtualRepeatAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const collectionVirtualRepeatEvidenceProfile: PatternEvidenceProfile = {
  admission: collectionVirtualRepeatAdmission,
  documents: [
    {
      relativePath: 'developer-guides/ui-virtualization.md',
      role: 'primary-grounding',
      curationNote: 'Grounds virtual-repeat, scroll-container constraints, and large-list DOM performance.'
    },
    {
      relativePath: 'advanced-scenarios/performance-optimization-techniques.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds performance tradeoffs and marks when virtualized rendering is preferable to normal repeat rendering.'
    },
    {
      relativePath: 'templates/repeats-and-list-rendering.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds ordinary repeat.for list rendering that virtual-repeat replaces only when DOM volume demands it.'
    }
  ],
  requiredEvidence: [
    { key: 'virtual repeat substrate', signalNames: ['virtual-repeat'] },
    { key: 'large-list rendering pressure', signalNames: ['repeat.for', 'local-array'] },
    { key: 'scroll and row style constraints', signalNames: ['style-source'] },
    { key: 'filtered local source data', signalNames: ['filter-or-sort', 'computed-getter'] }
  ],
  metadataDraft: {
    summary: 'Use virtual-repeat when a client-owned large collection needs recycled DOM instead of a full repeat.',
    whenToUse: [
      'Thousands of similarly sized rows are local.',
      'The scroll container has stable dimensions.',
      'Rows render from stable item data.'
    ],
    whenNotToUse: [
      'The collection is small.',
      'Rows cannot be measured predictably.',
      'The server owns filtering or paging.'
    ],
    assumptions: [
      'The scroll container is measurable.',
      'Rows have predictable height.',
      'The collection is already local.'
    ],
    handoffNotes: [
      'Keep the repeated root measurable.',
      'Avoid positional selectors with recycled rows.',
      'Use server-query patterns for data volume.'
    ]
  }
};
