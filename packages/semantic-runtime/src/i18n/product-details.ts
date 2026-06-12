import { defineProductDetailSlot } from '../kernel/product-details.js';
import { KernelVocabulary } from '../kernel/vocabulary.js';
import type { I18nTranslationKey } from './model.js';

/** Typed detail slots for i18n products consumed by authoring inquiries. */
export const I18nProductDetails = {
  TranslationKey: defineProductDetailSlot<I18nTranslationKey>(
    KernelVocabulary.I18n.TranslationKey.key,
    'i18n.translation-key',
    'I18n translation key admitted from static init resources.',
  ),
} as const;
