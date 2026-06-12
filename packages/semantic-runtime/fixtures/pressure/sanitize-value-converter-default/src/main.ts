import { Aurelia, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import template from './sanitize-value-converter-default-app.html';

@customElement({
  name: 'sanitize-value-converter-default-app',
  template,
})
export class SanitizeValueConverterDefaultApp {
  unsafeMarkup = '<strong>unsafe</strong>';
}

new Aurelia()
  .register(StandardConfiguration)
  .app({
    host: document.body,
    component: SanitizeValueConverterDefaultApp,
  })
  .start();
