import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { I18nConfiguration } from '@aurelia/i18n';
import { StateDefaultConfiguration } from '@aurelia/state';
import {
  I18nTranslationBindingErrorsApp,
  initialTranslationState,
  translationStateHandler,
} from './i18n-translation-binding-errors-app';

new Aurelia()
  .register(
    StandardConfiguration,
    StateDefaultConfiguration.init(initialTranslationState, translationStateHandler),
    I18nConfiguration.customize((options) => {
      options.initOptions = {
        resources: {
          en: {
            translation: {
              greeting: 'Hello {{name}}',
            },
          },
        },
      };
    }),
  )
  .app({
    host: document.body,
    component: I18nTranslationBindingErrorsApp,
  })
  .start();
