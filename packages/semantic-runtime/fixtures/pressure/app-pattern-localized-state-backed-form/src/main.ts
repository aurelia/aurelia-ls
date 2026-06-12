import Aurelia from 'aurelia';
import { I18nConfiguration } from '@aurelia/i18n';
import { App } from './app';

Aurelia
  .register(
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
