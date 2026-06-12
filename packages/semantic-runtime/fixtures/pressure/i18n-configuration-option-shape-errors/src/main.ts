import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { I18nConfiguration } from '@aurelia/i18n';
import { I18nConfigurationOptionShapeErrorsApp } from './i18n-configuration-option-shape-errors-app';

new Aurelia()
  .register(
    StandardConfiguration,
    I18nConfiguration.customize((options) => {
      options.resources = {
        en: {
          translation: {
            greeting: 'Hello',
          },
        },
      };
    }),
  )
  .app({
    host: document.body,
    component: I18nConfigurationOptionShapeErrorsApp,
  })
  .start();
