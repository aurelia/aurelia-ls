import { I18nConfiguration } from '@aurelia/i18n';
import { ValidationHtmlConfiguration } from '@aurelia/validation-html';

const runtimeTranslationAliases = window.location.hash === '#canonical'
  ? ['t']
  : ['i18n'];
const runtimeSubscriberAttribute = window.location.hash === '#validation-errors';
const runtimeSubscriberTemplate = window.location.search.includes('validation-container')
  ? '<template><slot></slot></template>'
  : '';

export const openI18n = I18nConfiguration.customize((options) => {
  options.translationAttributeAliases = runtimeTranslationAliases;
});

export const openValidation = ValidationHtmlConfiguration.customize((options) => {
  options.UseSubscriberCustomAttribute = runtimeSubscriberAttribute;
  options.SubscriberCustomElementTemplate = runtimeSubscriberTemplate;
});

export const closedOpenAlias = I18nConfiguration.customize((options) => {
  options.translationAttributeAliases = ['open'];
});

export const closedHashAlias = I18nConfiguration.customize((options) => {
  options.translationAttributeAliases = ['x#y'];
});

export const closedEscapedAlias = I18nConfiguration.customize((options) => {
  options.translationAttributeAliases = ['x~23y'];
});
