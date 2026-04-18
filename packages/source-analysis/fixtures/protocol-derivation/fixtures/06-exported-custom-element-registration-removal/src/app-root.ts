import { customElement } from '@aurelia/runtime-html';
import { StatusBadge } from './index';
import template from './app-root.html';

@customElement({ name: 'app-root', template, dependencies: [StatusBadge] })
export class AppRoot {
  public state = 'Stable';
}
