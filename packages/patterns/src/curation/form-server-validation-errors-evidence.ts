import { formServerValidationErrorsAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const formServerValidationErrorsEvidenceProfile: PatternEvidenceProfile = {
  admission: formServerValidationErrorsAdmission,
  documents: [
    {
      relativePath: 'aurelia-packages/validation/outcome-recipes.md',
      role: 'primary-grounding',
      curationNote: 'Grounds validation-html controller, submit flow, validation-errors, and validate binding behavior.'
    },
    {
      relativePath: 'aurelia-packages/validation/validation-controller.md',
      role: 'primary-grounding',
      curationNote: 'Grounds validation controller as the form-level error owner.'
    },
    {
      relativePath: 'aurelia-packages/validation/displaying-errors.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds reuse of validation error display paths.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/forms.md',
      role: 'primary-grounding',
      curationNote: 'Grounds form submit API boundaries and HTTP response handling.'
    },
    {
      relativePath: 'aurelia-packages/fetch-client/response-types.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds typed JSON response handling for validation payloads.'
    }
  ],
  requiredEvidence: [
    { key: 'validation controller ownership', signalNames: ['validation-plugin', 'resolve-service'] },
    { key: 'field error rendering', signalNames: ['from-view-bindable', 'repeat.for'] },
    { key: 'API validation response boundary', signalNames: ['http-client', 'http-response-check', 'json-response'] }
  ],
  metadataDraft: {
    summary: 'Map server field validation failures into the same scoped validation controller used by the form.',
    whenToUse: [
      'The API returns field-level validation errors.',
      'Client-side rules already pass.',
      'One error rendering path is desired.'
    ],
    whenNotToUse: [
      'The failure is not field-level validation.',
      'The form does not use validation-html.',
      'Recovery belongs on another screen.'
    ],
    assumptions: [
      'API property names match the form draft.',
      'Server errors clear before retry or edit.',
      'Operational failures stay outside field errors.'
    ],
    handoffNotes: [
      'Normalize errors at the service boundary.',
      'Use controller addError and removeError.',
      'Keep general failures in a general message.'
    ]
  }
};
