import { frameworkErrorCode } from '../kernel/framework-error-code.js';

/**
 * Aurelia i18n TranslationBinding error-code labels that semantic-runtime can cite
 * when i18n binding emulation reaches the same framework failure boundary.
 */
export const I18nTranslationBindingFrameworkErrorCode = {
  /** `i18n ErrorNames.i18n_translation_key_not_found`; TranslationBinding.bind ran without a translation-key AST. */
  TranslationKeyNotFound: frameworkErrorCode('i18n', 'ErrorNames', 'i18n_translation_key_not_found', 'AUR4000'),
  /** `i18n ErrorNames.i18n_translation_parameter_existed`; TranslationBinding.useParameter received a second parameter binding. */
  TranslationParameterExisted: frameworkErrorCode('i18n', 'ErrorNames', 'i18n_translation_parameter_existed', 'AUR4001'),
  /** `i18n ErrorNames.i18n_translation_key_invalid`; TranslationBinding._ensureKeyExpression saw a non-string key value. */
  TranslationKeyInvalid: frameworkErrorCode('i18n', 'ErrorNames', 'i18n_translation_key_invalid', 'AUR4002'),
} as const;

export type I18nTranslationBindingFrameworkErrorCode =
  typeof I18nTranslationBindingFrameworkErrorCode[keyof typeof I18nTranslationBindingFrameworkErrorCode];
