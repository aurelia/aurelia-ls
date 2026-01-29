import { customElement, bindable } from 'aurelia';

@customElement('advanced-element')
export class AdvancedElement {
  @bindable() value: string = '';
  @bindable() options: Record<string, unknown> = {};
}
