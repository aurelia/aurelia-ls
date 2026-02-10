import { customElement, bindable } from '@aurelia/runtime-html';

@customElement('info-card')
export class InfoCard {
  @bindable title: string = '';
  @bindable content: string = '';
}
