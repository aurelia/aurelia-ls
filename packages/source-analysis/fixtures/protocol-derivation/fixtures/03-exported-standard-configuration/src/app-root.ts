import { customElement } from '@aurelia/runtime-html';
import template from './app-root.html';

@customElement({ name: 'app-root', template })
export class AppRoot {
  public message = 'Configuration fixture';
}
