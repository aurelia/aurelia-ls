import { customElement, bindable } from 'aurelia';

@customElement('badge')
export class BadgeCustomElement {
  @bindable() value: string | number = '';
  @bindable() color: 'primary' | 'secondary' | 'danger' = 'primary';
}
