import { bindable, customElement } from '@aurelia/runtime-html';
import template from './status-badge.html';

@customElement({ name: 'status-badge', template })
export class StatusBadge {
  @bindable public label: string = '';
}
