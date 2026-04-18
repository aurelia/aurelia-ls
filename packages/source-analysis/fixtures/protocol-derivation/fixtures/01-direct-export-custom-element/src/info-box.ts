import { bindable, customElement } from '@aurelia/runtime-html';
import template from './info-box.html';

@customElement({ name: 'info-box', template })
export class InfoBox {
  @bindable public title: string = '';
  @bindable public content: string = '';
}
