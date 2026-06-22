import { templateLetVariablesAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const templateLetVariablesEvidenceProfile: PatternEvidenceProfile = {
  admission: templateLetVariablesAdmission,
  documents: [
    {
      relativePath: 'templates/template-syntax/template-variables.md',
      role: 'primary-grounding',
      curationNote: 'Grounds `<let>` declarations and template-local variables.'
    },
    {
      relativePath: 'templates/repeats-and-list-rendering.md',
      role: 'supporting-grounding',
      curationNote: 'Supports the common repeated-list display context where local derived labels and counts help readability.'
    },
    {
      relativePath: 'templates/conditional-rendering.md',
      role: 'supporting-grounding',
      curationNote: 'Supports surrounding conditional display without making `<let>` a control-flow substitute.'
    }
  ],
  requiredEvidence: [
    { key: 'template local variable mechanism', signalNames: ['let-variable'] },
    { key: 'list display substrate', signalNames: ['repeat.for', 'interpolation'] }
  ],
  metadataDraft: {
    summary: 'Use `<let>` for small template-local names that make repeated derived template expressions easier to read.',
    whenToUse: [
      'A template repeats a simple derived display value.',
      'The value is display-only.',
      'The component owns the actual state.'
    ],
    whenNotToUse: [
      'The value needs tests or reuse.',
      'The variable hides expensive work.',
      'The same state is shared elsewhere.'
    ],
    assumptions: [
      'The values are display helpers.',
      'Reusable derivation stays in TypeScript.',
      'The names improve scanning.'
    ],
    handoffNotes: [
      'Move complex derivation to TypeScript.',
      'Keep `<let>` near its reads.',
      'Do not use `<let>` as shared state.'
    ]
  }
};
