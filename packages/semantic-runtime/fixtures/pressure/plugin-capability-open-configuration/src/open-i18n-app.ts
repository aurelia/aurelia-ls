import { customElement } from '@aurelia/runtime-html';
import template from './open-i18n-app.html';

@customElement({
  name: 'open-i18n-app',
  template,
})
export class OpenI18nApp {
  readonly titleKey = 'dashboard.title';
  readonly translationParameters = { name: 'Aurelia' };
}
