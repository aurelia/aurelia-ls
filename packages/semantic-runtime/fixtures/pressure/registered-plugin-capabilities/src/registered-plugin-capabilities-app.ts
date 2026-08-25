import { customElement } from '@aurelia/runtime-html';
import template from './registered-plugin-capabilities-app.html';

@customElement({ name: 'registered-plugin-capabilities-app', template })
export class RegisteredPluginCapabilitiesApp {
  titleKey = 'dashboard.title';
  items = ['alpha', 'beta'];
  errors = [];
  displayName = 'Ada';
}
