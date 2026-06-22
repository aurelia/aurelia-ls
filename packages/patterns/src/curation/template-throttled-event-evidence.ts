import { templateThrottledEventAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const templateThrottledEventEvidenceProfile: PatternEvidenceProfile = {
  admission: templateThrottledEventAdmission,
  documents: [
    {
      relativePath: 'templates/template-syntax/event-binding.md',
      role: 'primary-grounding',
      curationNote: 'Grounds high-frequency event handling with throttle on event bindings.'
    },
    {
      relativePath: 'templates/binding-behaviors.md',
      role: 'primary-grounding',
      curationNote: 'Grounds throttle as a built-in binding behavior and distinguishes it from debounce and signal flushing.'
    },
    {
      relativePath: 'advanced-scenarios/performance-optimization-techniques.md',
      role: 'supporting-grounding',
      curationNote: 'Supports the performance motivation without importing broader optimization policy.'
    }
  ],
  requiredEvidence: [
    { key: 'throttle behavior', signalNames: ['throttle-behavior', 'binding-behavior'] },
    { key: 'event binding mechanism', signalNames: ['event-binding'] }
  ],
  metadataDraft: {
    summary: 'Use `throttle` on high-frequency local events when the handler should run at a controlled interval.',
    whenToUse: [
      'A high-frequency event fires too often.',
      'Skipping intermediate events is acceptable.',
      'The handler updates local state only.'
    ],
    whenNotToUse: [
      'Only the settled value matters.',
      'Every event must be handled.',
      'The handler starts remote work or route changes.'
    ],
    assumptions: [
      'Intermediate events can be dropped.',
      'The handler performs local updates.',
      'The interval is responsive enough.'
    ],
    handoffNotes: [
      'Use debounce for final-value workflows.',
      'Keep remote work out of throttled handlers.',
      'Review accessibility for pointer-only affordances.'
    ]
  }
};
