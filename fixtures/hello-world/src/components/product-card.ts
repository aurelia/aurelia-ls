import { bindable, customElement } from 'aurelia';
import type { CatalogItem } from '../models';
import template from './product-card.html';

@customElement({
  name: 'product-card',
  template,
})
export class ProductCard {
  @bindable item: CatalogItem | null = null;
  @bindable({ attribute: 'display-label' }) labelText = '';
  @bindable selected = false;
  readonly selectionProgressPercent = 40;

  get stockText(): string {
    if (this.item == null) {
      return 'No product';
    }
    return this.item.quantity > 0
      ? `${this.item.quantity} in stock`
      : 'Out of stock';
  }
}
