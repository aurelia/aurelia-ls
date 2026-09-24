/* global window */
import Aurelia from 'aurelia';
import { I18N, I18nConfiguration } from '@aurelia/i18n';
import { App } from './app';

const aurelia = Aurelia
  .register(
    I18nConfiguration.customize((options) => {
      options.initOptions = {
        lng: 'en',
        fallbackLng: 'en',
        resources: {
          en: {
            translation: {
              app: {
                title: 'Service Request',
                history: 'Request history',
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
          de: {
            translation: {
              app: {
                title: 'Serviceanfrage',
                history: 'Anfragenverlauf',
                request: 'Serviceanfrage',
                submitted: 'Einreichungen: {{count}}',
              },
              form: {
                summary: 'Anfrage {{requestId}} bearbeiten',
                contactPreference: 'Kontaktpräferenz',
                submit: 'Anfrage senden',
              },
            },
          },
        },
      };
    })
  )
  .app(App);

await aurelia.start();
window.__localizedFormAssurance = {
  ready: true,
  setLocale(locale) {
    return aurelia.container.get(I18N).setLocale(locale);
  },
  async stop() {
    await aurelia.stop(true);
    aurelia.dispose();
  },
};
