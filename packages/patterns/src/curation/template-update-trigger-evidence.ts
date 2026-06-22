import { templateUpdateTriggerAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const templateUpdateTriggerEvidenceProfile: PatternEvidenceProfile = {
  admission: templateUpdateTriggerAdmission,
  documents: [
    {
      relativePath: 'templates/binding-behaviors.md',
      role: 'primary-grounding',
      curationNote: 'Grounds updateTrigger as built-in input update timing policy.'
    },
    {
      relativePath: 'templates/forms/README.md',
      role: 'primary-grounding',
      curationNote: 'Grounds native controls and value binding as the form substrate.'
    },
    {
      relativePath: 'templates/template-syntax/event-binding.md',
      role: 'supporting-grounding',
      curationNote: 'Supports the underlying DOM event model without making this an event-handler pattern.'
    },
    {
      relativePath: 'templates/forms/submission.md',
      role: 'supporting-grounding',
      curationNote: 'Supports native submit flow around timing-controlled inputs.'
    }
  ],
  requiredEvidence: [
    { key: 'updateTrigger behavior', signalNames: ['update-trigger-behavior', 'binding-behavior'] },
    { key: 'native form value binding', signalNames: ['value.bind', 'form-element'] }
  ],
  metadataDraft: {
    summary: 'Use `updateTrigger` when an input should update view-model state on specific DOM events such as blur or paste.',
    whenToUse: [
      'Typing should not commit state until blur or paste.',
      'Native input semantics are enough.',
      'The problem is timing policy.'
    ],
    whenNotToUse: [
      'Every keystroke must update state.',
      'The problem is rate limiting.',
      'The form needs validation or remote checks.'
    ],
    assumptions: [
      'The chosen DOM events are the commit points.',
      'Native input behavior remains enough.',
      'Submit reads the committed value.'
    ],
    handoffNotes: [
      'Use immediate updates for live feedback.',
      'Use debounce or throttle for rate limiting.',
      'Keep validation policy separate.'
    ]
  }
};
