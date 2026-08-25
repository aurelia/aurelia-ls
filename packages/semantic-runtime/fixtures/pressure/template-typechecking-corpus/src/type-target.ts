import { BindingMode, bindable, customElement } from 'aurelia';
import template from './type-target.html';

@customElement({ name: 'type-target', template })
export class TypeTarget {
  @bindable requiredText = '';
  @bindable count = 0;
  @bindable({ mode: BindingMode.twoWay }) current = '';
}
