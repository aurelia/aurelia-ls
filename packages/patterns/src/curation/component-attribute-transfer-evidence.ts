import { componentAttributeTransferAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const componentAttributeTransferEvidenceProfile: PatternEvidenceProfile = {
  admission: componentAttributeTransferAdmission,
  documents: [
    {
      relativePath: 'getting-to-know-aurelia/introduction/attribute-transferring.md',
      role: 'primary-grounding',
      curationNote: 'Grounds capture and `$attrs` transfer for wrapper components.'
    },
    {
      relativePath: 'components/bindable-properties.md',
      role: 'primary-grounding',
      curationNote: 'Grounds the explicit bindable portion of the wrapper API.'
    },
    {
      relativePath: 'components/components.md',
      role: 'supporting-grounding',
      curationNote: 'Supports ordinary custom element usage and imports.'
    },
    {
      relativePath: 'templates/forms/README.md',
      role: 'supporting-grounding',
      curationNote: 'Supports native form-control attributes passed through the shell.'
    }
  ],
  requiredEvidence: [
    { key: 'attribute capture and transfer', signalNames: ['attribute-capture'] },
    { key: 'bindable custom element API', signalNames: ['bindable-component', 'custom-element-usage'] }
  ],
  metadataDraft: {
    summary: 'Use attribute capture and `$attrs` transfer when a wrapper component should forward native attributes to an inner element.',
    whenToUse: [
      'A wrapper should forward native control attributes.',
      'A few bindables are not enough for normal native attributes.',
      'The caller owns the native control contract.'
    ],
    whenNotToUse: [
      'Explicit bindables are clearer.',
      'Each option needs reinterpretation.',
      'The component is a domain workflow.'
    ],
    assumptions: [
      'The wrapper forwards native attributes.',
      'The public API remains small.',
      'Callers know which element receives attributes.'
    ],
    handoffNotes: [
      'Prefer named bindables for semantic inputs.',
      'Document the transfer target.',
      'Escalate only when behavior changes.'
    ]
  }
};
