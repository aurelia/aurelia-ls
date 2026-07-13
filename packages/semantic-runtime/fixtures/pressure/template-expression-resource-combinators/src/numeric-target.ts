import { bindable, BindingMode, customElement } from 'aurelia';

@customElement({ name: 'numeric-target', template: '<template>${value}</template>' })
export class NumericTarget {
  @bindable({ mode: BindingMode.twoWay })
  value = 0;
}
