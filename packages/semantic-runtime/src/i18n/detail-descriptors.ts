import { defineProductDetailDescriptor } from '../kernel/detail-descriptors.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { I18nTranslationKey } from './model.js';

export const I18nDetailDescriptors = {
  TranslationKey: defineProductDetailDescriptor<I18nTranslationKey>(
    KernelVocabulary.I18n.TranslationKey.key,
    'i18n.translation-key',
    'I18n translation key admitted from static init resources.',
  ),
} as const;
