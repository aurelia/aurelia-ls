import { componentDynamicCompositionAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const componentDynamicCompositionEvidenceProfile: PatternEvidenceProfile = {
  admission: componentDynamicCompositionAdmission,
  documents: [
    {
      relativePath: 'getting-to-know-aurelia/dynamic-composition.md',
      role: 'primary-grounding',
      curationNote: 'Grounds `<au-compose>`, component.bind, bindable forwarding, and bounded dynamic composition.'
    },
    {
      relativePath: 'components/components.md',
      role: 'supporting-grounding',
      curationNote: 'Supports component classes and custom element usage.'
    },
    {
      relativePath: 'templates/conditional-rendering.md',
      role: 'deferred-evidence',
      curationNote: 'Simple alternatives should remain available before promoting to dynamic composition.'
    },
    {
      relativePath: 'developer-guides/error-messages/runtime-html/aur0806.md',
      role: 'supporting-grounding',
      curationNote: 'Supports the registration caution for dynamically composed component names.'
    }
  ],
  requiredEvidence: [
    { key: 'dynamic composition mechanism', signalNames: ['dynamic-composition', 'custom-element-usage'] },
    { key: 'component data forwarding', signalNames: ['bindable-property-binding', 'bindable-component'] }
  ],
  metadataDraft: {
    summary: 'Use `<au-compose>` when a host chooses which component to render from a known set at runtime.',
    whenToUse: [
      'A host switches among known component types.',
      'The host owns the choice and passes simple data.',
      'Static branching would become noisy.'
    ],
    whenNotToUse: [
      'Template control flow is clearer.',
      'The type comes from untrusted data.',
      'Direct instance access is the real need.'
    ],
    assumptions: [
      'Possible components are known.',
      'The host passes plain bindable data.',
      'The selection is local UI state.'
    ],
    handoffNotes: [
      'Prefer simpler template control flow when readable.',
      'Keep the component set bounded.',
      'Use routes for navigation-sized choices.'
    ]
  }
};
