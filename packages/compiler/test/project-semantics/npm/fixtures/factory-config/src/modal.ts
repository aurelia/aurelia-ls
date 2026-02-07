import { customElement, bindable } from 'aurelia';

@customElement('modal')
export class ModalCustomElement {
  @bindable() title: string = '';
  @bindable() isOpen: boolean = false;
  @bindable() size: 'sm' | 'md' | 'lg' = 'md';
}
