import { Registration } from '@aurelia/kernel';
import { Aurelia, ISanitizer, StandardConfiguration, customElement } from '@aurelia/runtime-html';
import template from './sanitize-value-converter-custom-app.html';

class AppSanitizer implements ISanitizer {
  sanitize(input: string): string {
    return input;
  }
}

@customElement({
  name: 'sanitize-value-converter-custom-app',
  template,
})
export class SanitizeValueConverterCustomApp {
  unsafeMarkup = '<strong>safe by app policy</strong>';
}

new Aurelia()
  .register(
    StandardConfiguration,
    Registration.singleton(ISanitizer, AppSanitizer),
  )
  .app({
    host: document.body,
    component: SanitizeValueConverterCustomApp,
  })
  .start();
