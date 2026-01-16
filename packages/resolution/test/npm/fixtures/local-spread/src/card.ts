import { customElement, bindable } from 'aurelia';

@customElement('card')
export class CardCustomElement {
  @bindable() title: string = '';
  @bindable() subtitle: string = '';
  @bindable() variant: 'default' | 'outlined' = 'default';
}
