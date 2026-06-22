import { templateEventSelfAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const templateEventSelfEvidenceProfile: PatternEvidenceProfile = {
  admission: templateEventSelfAdmission,
  documents: [
    {
      relativePath: 'templates/template-syntax/event-binding.md',
      role: 'primary-grounding',
      curationNote: 'Grounds trigger event binding and self-filtered events.'
    },
    {
      relativePath: 'templates/binding-behaviors.md',
      role: 'primary-grounding',
      curationNote: 'Grounds `self` as a built-in binding behavior for event source filtering.'
    },
    {
      relativePath: 'components/component-lifecycles.md',
      role: 'deferred-evidence',
      curationNote: 'Manual listener setup and cleanup belong to lifecycle patterns, not this local template event slice.'
    }
  ],
  requiredEvidence: [
    { key: 'self-filtered event behavior', signalNames: ['self-event-behavior', 'binding-behavior'] },
    { key: 'event binding mechanism', signalNames: ['event-binding'] }
  ],
  metadataDraft: {
    summary: 'Use the built-in `self` behavior when a local event handler should run only for events that start on the bound element.',
    whenToUse: [
      'A container click clears or closes local UI.',
      'Child controls have their own handlers.',
      'The behavior is local DOM interaction.'
    ],
    whenNotToUse: [
      'Ancestor handling is intentional.',
      'The event is shared feature coordination.',
      'The interaction needs global listeners or focus trapping.'
    ],
    assumptions: [
      'The event is local to one component.',
      'Child controls keep their own event handlers.',
      'No global click listener is needed.'
    ],
    handoffNotes: [
      'Keep `self` for local event filtering.',
      'Move shared coordination into an injected service.',
      'Add keyboard behavior explicitly for modal-like dismissal.'
    ]
  }
};
