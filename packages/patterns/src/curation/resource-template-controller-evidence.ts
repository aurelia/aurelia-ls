import { resourceTemplateControllerAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const resourceTemplateControllerEvidenceProfile: PatternEvidenceProfile = {
  admission: resourceTemplateControllerAdmission,
  documents: [
    {
      relativePath: 'getting-to-know-aurelia/template-controllers.md',
      role: 'primary-grounding',
      curationNote: 'Grounds @templateController, IViewFactory, IRenderLocation, and stamped synthetic views.'
    },
    {
      relativePath: 'templates/custom-attributes.md',
      role: 'primary-grounding',
      curationNote: 'Grounds custom-attribute resource semantics behind the template controller.'
    },
    {
      relativePath: 'components/component-lifecycles.md',
      role: 'supporting-grounding',
      curationNote: 'Supports lifecycle and cleanup review for runtime-close resources.'
    }
  ],
  requiredEvidence: [
    { key: 'template controller resource', signalNames: ['template-controller'] },
    { key: 'custom attribute substrate', signalNames: ['custom-attribute'] }
  ],
  metadataDraft: {
    summary: 'Use a template controller when a reusable attribute owns whether and how an attached template view is stamped into the DOM.',
    whenToUse: [
      'The behavior is structural.',
      'Built-in control flow would be repeated.',
      'The resource owns view lifecycle.'
    ],
    whenNotToUse: [
      'A built-in template controller is enough.',
      'The behavior is feature state.',
      'The resource would own communication.'
    ],
    assumptions: [
      'The behavior is structural.',
      'The resource owns cleanup.',
      'The resource is registered or imported.'
    ],
    handoffNotes: [
      'Prefer built-in template controllers first.',
      'Keep feature decisions outside the resource.',
      'Keep lifecycle signatures narrow.'
    ]
  }
};
