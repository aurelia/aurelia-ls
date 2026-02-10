import { customElement, bindable } from 'aurelia';

@customElement('basic-element')
export class BasicElement {
  @bindable() value: string = '';
}
