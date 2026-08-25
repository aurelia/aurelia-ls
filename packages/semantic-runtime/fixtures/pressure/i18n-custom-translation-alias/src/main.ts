import {
  Aurelia,
  StandardConfiguration,
} from '@aurelia/runtime-html';
import { I18nConfiguration } from '@aurelia/i18n';
import { I18nCustomAliasApp } from './i18n-custom-alias-app';

const customI18n = I18nConfiguration.customize((options) => {
  options.translationAttributeAliases = ['i18n'];
});

new Aurelia()
  .register(
    StandardConfiguration,
    customI18n,
  )
  .app({
    host: document.body,
    component: I18nCustomAliasApp,
  })
  .start();
