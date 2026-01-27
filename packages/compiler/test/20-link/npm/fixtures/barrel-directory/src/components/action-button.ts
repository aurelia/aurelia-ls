import { customElement, bindable } from '@aurelia/runtime-html';

@customElement('action-button')
export class ActionButton {
  @bindable label: string = '';
  @bindable disabled: boolean = false;
}
