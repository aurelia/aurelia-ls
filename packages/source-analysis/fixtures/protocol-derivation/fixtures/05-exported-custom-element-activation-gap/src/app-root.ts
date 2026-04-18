import { customElement } from '@aurelia/runtime-html';
import { LazyPanel } from './index';
import template from './app-root.html';

@customElement({ name: 'app-root', template, dependencies: [LazyPanel] })
export class AppRoot {
  public body = 'Waiting for activation';
}
