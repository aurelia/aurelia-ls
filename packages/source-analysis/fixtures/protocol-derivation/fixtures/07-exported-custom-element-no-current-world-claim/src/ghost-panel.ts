import { bindable, customElement } from '@aurelia/runtime-html';
import template from './ghost-panel.html';

@customElement({ name: 'ghost-panel', template })
export class GhostPanel {
  @bindable public message: string = '';
}
