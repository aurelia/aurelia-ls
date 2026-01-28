import { customElement, bindable } from '@aurelia/runtime-html';

@customElement('sub-card')
export class SubCard {
  @bindable label: string = '';
}
