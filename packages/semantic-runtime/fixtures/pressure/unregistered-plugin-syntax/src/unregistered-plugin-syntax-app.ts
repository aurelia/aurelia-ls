import { customElement } from '@aurelia/runtime-html';
import template from './unregistered-plugin-syntax-app.html';

@customElement({ name: 'unregistered-plugin-syntax-app', template })
export class UnregisteredPluginSyntaxApp {
  titleKey = 'dashboard.title';
  dispatchCount = 0;

  dispatch(): void {
    this.dispatchCount++;
  }
}
