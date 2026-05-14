import { customElement } from '@aurelia/runtime-html';
import template from './i18n-translation-binding-errors-app.html';

@customElement({
  name: 'i18n-translation-binding-errors-app',
  template,
})
export class I18nTranslationBindingErrorsApp {
  customerName = 'Ada';
  otherName = 'Grace';
  numericKey = 123;
}
