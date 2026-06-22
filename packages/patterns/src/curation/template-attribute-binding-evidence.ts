import { templateAttributeBindingAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const templateAttributeBindingEvidenceProfile: PatternEvidenceProfile = {
  admission: templateAttributeBindingAdmission,
  documents: [
    {
      relativePath: 'templates/template-syntax/attribute-binding.md',
      role: 'primary-grounding',
      curationNote: 'Grounds explicit attribute binding, `.attr`, the `attr` behavior, and ARIA/data/SVG use cases.'
    },
    {
      relativePath: 'templates/binding-behaviors.md',
      role: 'primary-grounding',
      curationNote: 'Grounds `attr` as a built-in binding behavior and keeps it separate from event behaviors.'
    },
    {
      relativePath: 'templates/class-and-style-bindings.md',
      role: 'supporting-grounding',
      curationNote: 'Supports the distinction between ordinary property/class/style binding and attribute-specific binding.'
    },
    {
      relativePath: 'developer-guides/accessibility.md',
      role: 'supporting-grounding',
      curationNote: 'Supports the platform/accessibility reason for keeping ARIA attributes accurate.'
    }
  ],
  requiredEvidence: [
    { key: 'attribute binding mechanism', signalNames: ['attribute-binding', 'event-or-attribute-behavior'] }
  ],
  metadataDraft: {
    summary: 'Use `.attr` or the built-in `attr` behavior when the DOM attribute itself must reflect view-model state.',
    whenToUse: [
      'ARIA, data, SVG, or integration attributes must be present as attributes.',
      'The attribute value is platform semantics or read from markup.',
      'The state remains local and simple.'
    ],
    whenNotToUse: [
      'A normal property binding is enough.',
      'The value belongs in a component API.',
      'The state is shared across components.'
    ],
    assumptions: [
      'The attribute value itself matters.',
      'The attribute can be derived locally.',
      'The pattern is not defining a reusable component API.'
    ],
    handoffNotes: [
      'Prefer property binding before `.attr`.',
      'Use getters for repeated attribute formatting.',
      'Promote repeated attribute behavior into a custom attribute later.'
    ]
  }
};
