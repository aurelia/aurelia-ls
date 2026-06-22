import { localizationI18nLocaleServiceAdmission } from './admission-records.js';
import type { PatternEvidenceProfile } from './evidence-review.js';

export const localizationI18nLocaleServiceEvidenceProfile: PatternEvidenceProfile = {
  admission: localizationI18nLocaleServiceAdmission,
  documents: [
    {
      relativePath: 'aurelia-packages/internationalization.md',
      role: 'primary-grounding',
      curationNote: 'Grounds i18n plugin registration, translation keys, template translations, and programmatic translation.'
    },
    {
      relativePath: 'aurelia-packages/internationalization-outcome-recipes.md',
      role: 'primary-grounding',
      curationNote: 'Grounds runtime locale changes and persistence-oriented locale recipes.'
    },
    {
      relativePath: 'getting-started/extended-tutorial/step-7-internationalization.md',
      role: 'supporting-grounding',
      curationNote: 'Grounds applied i18n in a larger app while leaving router and validation localization out of the first public pattern.'
    }
  ],
  requiredEvidence: [
    { key: 'i18n plugin substrate', signalNames: ['i18n-plugin'] },
    { key: 'runtime locale service', signalNames: ['service-class', 'resolve-service'] },
    { key: 'locale persistence pressure', signalNames: ['browser-storage'] },
    { key: 'template translation usage', signalNames: ['interpolation', 'value-converter'] }
  ],
  metadataDraft: {
    summary: 'Use i18n with stable keys and a small locale service when text and attributes change with the active locale.',
    whenToUse: [
      'User-facing text must translate.',
      'Users can switch locale at runtime.',
      'Programmatic strings use the same keys.'
    ],
    whenNotToUse: [
      'Only local formatting is needed.',
      'Keys are not stable yet.',
      'Validation localization is the main issue.'
    ],
    assumptions: [
      'Translation keys are application contracts.',
      'Locale persistence is a local preference.',
      'The plugin updates translated bindings.'
    ],
    handoffNotes: [
      'Keep resources close until extraction is needed.',
      'Translate attributes deliberately.',
      'Separate validation localization from UI text.'
    ]
  }
};
