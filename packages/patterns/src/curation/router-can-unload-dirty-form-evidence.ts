import { routerCanUnloadDirtyFormAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const routerCanUnloadDirtyFormEvidenceProfile: PatternEvidenceProfile = {
  admission: routerCanUnloadDirtyFormAdmission,
  documents: [
    {
      relativePath: 'router/routing-lifecycle.md',
      role: 'primary-grounding',
      curationNote: 'Grounds canUnload as the route exit decision hook.'
    },
    {
      relativePath: 'templates/forms/submission.md',
      role: 'primary-grounding',
      curationNote: 'Grounds native submit handling and local save state.'
    },
    {
      relativePath: 'templates/forms/README.md',
      role: 'supporting-grounding',
      curationNote: 'Supports native form controls and value binding.'
    },
    {
      relativePath: 'developer-guides/working-with-web-standards.md',
      role: 'supporting-grounding',
      curationNote: 'Supports using browser APIs directly where appropriate.'
    }
  ],
  requiredEvidence: [
    { key: 'canUnload lifecycle', signalNames: ['can-unload-hook', 'route-lifecycle'] },
    { key: 'native form state', signalNames: ['form-element', 'submit.trigger', 'value.bind'] }
  ],
  metadataDraft: {
    summary: 'Use `canUnload` when a routed form needs to block or confirm navigation away from unsaved local changes.',
    whenToUse: [
      'A route owns dirty form state.',
      'Leaving would discard user data.',
      'A simple confirmation is enough.'
    ],
    whenNotToUse: [
      'The form is not route-owned.',
      'Autosave or persistence protects the user.',
      'The decision depends on validation or remote policy.'
    ],
    assumptions: [
      'The route knows when the form is dirty.',
      'Synchronous confirmation is acceptable.',
      'Saving updates the clean snapshot.'
    ],
    handoffNotes: [
      'Keep dirty checks explicit.',
      'Use richer confirmation UI deliberately.',
      'Separate validation from exit protection.'
    ]
  }
};
