import { dialogConfirmEditAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const dialogConfirmEditEvidenceProfile: PatternEvidenceProfile = {
  admission: dialogConfirmEditAdmission,
  documents: [
    {
      relativePath: 'aurelia-packages/dialog.md',
      role: 'primary-grounding',
      curationNote: 'Grounds dialog registration, dialog service usage, dialog controller, close results, and lifecycle hooks.'
    },
    {
      relativePath: 'getting-started/extended-tutorial/step-9-dialogs.md',
      role: 'primary-grounding',
      curationNote: 'Grounds real application dialog flows and illustrates why public defaults need curation away from broader tutorial concerns.'
    },
    {
      relativePath: 'templates/forms/README.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds native form controls inside edit dialogs.'
    }
  ],
  requiredEvidence: [
    { key: 'dialog package substrate', signalNames: ['dialog-plugin'] },
    { key: 'dialog open and close flow', signalNames: ['async-operation', 'resolve-service'] },
    { key: 'edit form body', signalNames: ['form-element', 'submit.trigger', 'value.bind'] }
  ],
  metadataDraft: {
    summary: 'Use @aurelia/dialog for blocking confirm or edit flows that return a close result to the opener.',
    whenToUse: [
      'A modal decision or edit should return a result.',
      'Focus and close semantics matter.',
      'The opener should mutate after close.'
    ],
    whenNotToUse: [
      'The UI is a non-blocking overlay.',
      'Inline editing is enough.',
      'A design-system dialog service owns policy.'
    ],
    assumptions: [
      'Dialog configuration is registered once.',
      'Dialog state is temporary.',
      'Page state changes after close.'
    ],
    handoffNotes: [
      'Use dialog for blocking decisions.',
      'Wrap repeated opens in a small service.',
      'Guard dirty dialog drafts locally.'
    ]
  }
};
