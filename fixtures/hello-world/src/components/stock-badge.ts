import { bindable, customElement } from 'aurelia';
import type { CatalogItem } from '../models';
import template from './stock-badge.html';

@customElement({
  name: 'stock-badge',
  template,
})
export class StockBadge {
  @bindable item: CatalogItem | null = null;

  get label(): string {
    if (this.item == null) {
      return 'No item selected';
    }
    return this.item.quantity > 0
      ? `${this.item.quantity} available`
      : 'Sold out';
  }
}
