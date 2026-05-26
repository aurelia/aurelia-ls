import Aurelia from 'aurelia';
import { RouterConfiguration } from '@aurelia/router';
import { ValidationHtmlConfiguration } from '@aurelia/validation-html';
import { I18nConfiguration } from '@aurelia/i18n';
import { App } from './app';

Aurelia
  .register(
    RouterConfiguration.customize({
      useHref: false,
      useUrlFragmentHash: true,
    }),
    ValidationHtmlConfiguration,
    I18nConfiguration.customize((options) => {
      options.initOptions = {
        resources: {
          en: {
            translation: {
              app: {
                title: 'Service Request',
                request: 'Service Request',
                submitted: 'Submissions: {{count}}',
              },
              form: {
                summary: 'Editing request {{requestId}}',
                contactPreference: 'Contact preference',
                submit: 'Submit request',
              },
            },
          },
        },
      };
    })
  )
  .app(App)
  .start();
