import { bindable, customElement } from '@aurelia/runtime-html';
import type { Product } from '../models/product';
import template from './product-summary-card.html';

@customElement({
  name: 'product-summary-card',
  template,
})
export class ProductSummaryCard {
  @bindable product: Product | null = null;
}
