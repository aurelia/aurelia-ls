import { customElement, resolve } from 'aurelia';
import { ItemTableState } from '../state/item-table-state';
import template from './item-table.html';

@customElement({
  name: 'item-table',
  template,
})
export class ItemTable {
  readonly state = resolve(ItemTableState);

  binding(): void {
    void this.state.loadItems();
  }
}
