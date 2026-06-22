import { collectionBatchSelectionAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const collectionBatchSelectionEvidenceProfile: PatternEvidenceProfile = {
  admission: collectionBatchSelectionAdmission,
  documents: [
    {
      relativePath: 'templates/forms/collections.md',
      role: 'primary-grounding',
      curationNote: 'Grounds checkbox collection binding and form collection behavior.'
    },
    {
      relativePath: 'templates/repeats-and-list-rendering.md',
      role: 'primary-grounding',
      curationNote: 'Grounds keyed list rendering for selectable rows.'
    },
    {
      relativePath: 'getting-to-know-aurelia/watching-data.md',
      role: 'supporting-grounding',
      curationNote: 'Supports Set-shaped local state and observation cautions.'
    }
  ],
  requiredEvidence: [
    { key: 'batch selection state', signalNames: ['batch-selection'] },
    { key: 'checkbox repeat substrate', signalNames: ['checked.bind', 'repeat.for'] }
  ],
  metadataDraft: {
    summary: 'Use a local `Set` of item ids when a component needs repeatable batch selection over a visible collection.',
    whenToUse: [
      'Selection is local to one workflow.',
      'Rows have stable ids.',
      'Batch actions can use selected ids.'
    ],
    whenNotToUse: [
      'Selection persists across routes.',
      'The server owns selected rows.',
      'Selection belongs to shared state.'
    ],
    assumptions: [
      'Selection is local to the view.',
      'Each row has a stable id.',
      'Actions can use ids.'
    ],
    handoffNotes: [
      'Promote shared selection to an injected service.',
      'Treat server paging as a different shape.',
      'Keep checkbox state derived from ids.'
    ]
  }
};
