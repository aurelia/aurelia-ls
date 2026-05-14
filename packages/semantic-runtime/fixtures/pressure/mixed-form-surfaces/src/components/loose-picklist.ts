import { BindingMode, bindable, customElement } from '@aurelia/runtime-html';
import template from './loose-picklist.html';

@customElement({
  name: 'loose-picklist',
  template,
})
export class LoosePicklist {
  @bindable({ mode: BindingMode.twoWay }) value: unknown = null;
  @bindable options: readonly unknown[] = [];
  @bindable label = '';
}
