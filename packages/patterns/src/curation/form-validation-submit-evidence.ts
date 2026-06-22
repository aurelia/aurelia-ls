import { formValidationSubmitAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const formValidationSubmitEvidenceProfile: PatternEvidenceProfile = {
  admission: formValidationSubmitAdmission,
  documents: [
    {
      relativePath: 'aurelia-packages/validation/outcome-recipes.md',
      role: 'primary-grounding',
      curationNote: 'Grounds validation-html registration, scoped controllers, validation binding behavior, form submit, and error rendering.'
    },
    {
      relativePath: 'aurelia-packages/validation/validation-controller.md',
      role: 'primary-grounding',
      curationNote: 'Grounds explicit validation-controller ownership and manual validation.'
    },
    {
      relativePath: 'aurelia-packages/validation/validate-binding-behavior.md',
      role: 'primary-grounding',
      curationNote: 'Grounds validate binding behavior triggers.'
    },
    {
      relativePath: 'aurelia-packages/validation/displaying-errors.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds validation error display patterns.'
    },
    {
      relativePath: 'aurelia-packages/validation/configuration-and-customization.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds plugin configuration without making global customization part of the default example.'
    }
  ],
  requiredEvidence: [
    { key: 'validation plugin substrate', signalNames: ['validation-plugin'] },
    { key: 'form submit validation flow', signalNames: ['form-element', 'submit.trigger'] },
    { key: 'validation binding behavior', signalNames: ['binding-behavior'] },
    { key: 'inline validation errors', signalNames: ['from-view-bindable', 'repeat.for'] }
  ],
  metadataDraft: {
    summary: 'Use validation-html when native constraints are not enough and client-side rules must block submit.',
    whenToUse: [
      'Rules exceed native constraints.',
      'Errors should render beside controls.',
      'The controller is scoped to one form.'
    ],
    whenNotToUse: [
      'Native browser constraints are enough.',
      'Only server error mapping is missing.',
      'Localization or schema generation is the real problem.'
    ],
    assumptions: [
      'The plugin is registered once.',
      'The form owns a scoped controller.',
      'The server still validates the submit.'
    ],
    handoffNotes: [
      'Keep rules beside the validated model.',
      'Choose triggers intentionally.',
      'Map API field errors through the server-error pattern.'
    ]
  }
};
