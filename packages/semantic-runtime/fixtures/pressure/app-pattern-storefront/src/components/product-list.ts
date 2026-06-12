import { customElement, resolve } from 'aurelia';
import { AvailabilityBadge } from './availability-badge';
import { ProductCard } from './product-card';
import { StorefrontState } from '../state/storefront-state';
import template from './product-list.html';

@customElement({
  name: 'product-list',
  template,
  dependencies: [AvailabilityBadge, ProductCard],
})
export class ProductList {
  readonly state = resolve(StorefrontState);
  availabilityBadge: AvailabilityBadge | null = null;
  featuredCard: ProductCard | null = null;

  get featuredProductId(): string {
    return this.state.catalog.productIds[0] ?? '';
  }

  get featuredCardBindings(): { productId: string } {
    return {
      productId: this.featuredProductId,
    };
  }
}
