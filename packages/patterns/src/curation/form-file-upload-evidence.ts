import { formFileUploadAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const formFileUploadEvidenceProfile: PatternEvidenceProfile = {
  admission: formFileUploadAdmission,
  documents: [
    {
      relativePath: 'templates/forms/file-uploads.md',
      role: 'primary-grounding',
      curationNote: 'Grounds native file input, File objects, and FormData upload shape.'
    },
    {
      relativePath: 'templates/forms/submission.md',
      role: 'primary-grounding',
      curationNote: 'Grounds submit.trigger and form submission state.'
    },
    {
      relativePath: 'templates/forms/README.md',
      role: 'supporting-grounding',
      curationNote: 'Supports native form controls and browser form semantics.'
    },
    {
      relativePath: 'developer-guides/working-with-web-standards.md',
      role: 'supporting-grounding',
      curationNote: 'Supports using platform web APIs instead of framework-specific file abstractions.'
    }
  ],
  requiredEvidence: [
    { key: 'file upload substrate', signalNames: ['file-upload'] },
    { key: 'native submit workflow', signalNames: ['form-element', 'submit.trigger'] }
  ],
  metadataDraft: {
    summary: 'Use a native file input plus `FormData` when a component owns a direct upload interaction.',
    whenToUse: [
      'The user selects files natively.',
      'The upload is a normal form interaction.',
      'State is transient.'
    ],
    whenNotToUse: [
      'Uploads need background queues.',
      'The upload belongs to a larger draft.',
      'A specialized SDK owns the transaction.'
    ],
    assumptions: [
      'The endpoint accepts multipart FormData.',
      'Selected files are transient component state.',
      'Selection can clear after success.'
    ],
    handoffNotes: [
      'Promote complex upload state intentionally.',
      'Keep native file semantics intact.',
      'Match server contract details separately.'
    ]
  }
};
