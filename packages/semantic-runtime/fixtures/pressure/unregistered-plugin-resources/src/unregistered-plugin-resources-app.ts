import { customElement } from '@aurelia/runtime-html';
import template from './unregistered-plugin-resources-app.html';

@customElement({ name: 'unregistered-plugin-resources-app', template })
export class UnregisteredPluginResourcesApp {
  items = ['alpha', 'beta'];
  errors = [];
  labelKey = 'dashboard.title';
  displayName = 'Ada';
  dashboardState = { ready: true };
}
