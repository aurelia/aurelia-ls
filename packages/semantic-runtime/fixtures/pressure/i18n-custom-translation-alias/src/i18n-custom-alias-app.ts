import { customElement } from '@aurelia/runtime-html';
import template from './i18n-custom-alias-app.html';

@customElement({
  name: 'i18n-custom-alias-app',
  template,
})
export class I18nCustomAliasApp {
  readonly titleKey = 'dashboard.title';
}
