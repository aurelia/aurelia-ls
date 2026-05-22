import { bindable, customElement } from '@aurelia/runtime-html';
import template from './loose-table.html';

@customElement({
  name: 'loose-table',
  template,
})
export class LooseTable {
  @bindable title = '';
  @bindable rows = [];
  @bindable filters = [];
}
