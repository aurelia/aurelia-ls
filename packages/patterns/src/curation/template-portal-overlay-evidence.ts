import { templatePortalOverlayAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const templatePortalOverlayEvidenceProfile: PatternEvidenceProfile = {
  admission: templatePortalOverlayAdmission,
  documents: [
    {
      relativePath: 'getting-to-know-aurelia/portalling-elements.md',
      role: 'primary-grounding',
      curationNote: 'Grounds portal target and position syntax.'
    },
    {
      relativePath: 'getting-to-know-aurelia/template-controllers.md',
      role: 'supporting-grounding',
      curationNote: 'Supports portal as structural template behavior rather than shared state.'
    },
    {
      relativePath: 'developer-guides/error-messages/runtime-html/aur0812.md',
      role: 'supporting-grounding',
      curationNote: 'Supports portal target failure cautions.'
    },
    {
      relativePath: 'developer-guides/error-messages/runtime-html/aur0779.md',
      role: 'supporting-grounding',
      curationNote: 'Supports portal target position cautions.'
    }
  ],
  requiredEvidence: [
    { key: 'portal rendering mechanism', signalNames: ['portal'] },
    { key: 'conditional overlay rendering', signalNames: ['if.bind'] }
  ],
  metadataDraft: {
    summary: 'Use the portal attribute when component-owned overlay markup must render at a stable DOM location outside the component subtree.',
    whenToUse: [
      'Markup must escape local DOM context.',
      'A stable target exists.',
      'The component owns open state.'
    ],
    whenNotToUse: [
      'In-place rendering is enough.',
      'Overlay state is app-wide.',
      'The target is unstable.'
    ],
    assumptions: [
      'The portal target exists.',
      'The component owns open state.',
      'Accessibility is adapted to the real overlay.'
    ],
    handoffNotes: [
      'Promote app-wide overlays to a DI service.',
      'Keep the target stable and explicit.',
      'Complete real modal behavior outside this snippet.'
    ]
  }
};
