import { Aurelia, StandardConfiguration } from '@aurelia/runtime-html';
import { I18nConfiguration } from '@aurelia/i18n';
import { App } from './app';

new Aurelia()
  .register(StandardConfiguration,
    I18nConfiguration.customize((options) => {
      options.initOptions = {
        resources: {
          en: {
            translation: {
              app: {
                title: 'Service request',
                request: 'Request',
                submitted: '{{count}} submitted request(s)',
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
    }))
  .app({
    host: document.body,
    component: App,
  })
  .start();
