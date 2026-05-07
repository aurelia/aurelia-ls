import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
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
  private readonly state = resolve(StorefrontState);
  availabilityBadge: AvailabilityBadge | null = null;
  featuredCard: ProductCard | null = null;

  get productIds(): readonly string[] {
    return this.state.catalog.productIds;
  }

  get featuredProductId(): string {
    return this.productIds[0] ?? '';
  }

  get featuredCardBindings(): { productId: string } {
    return {
      productId: this.featuredProductId,
    };
  }
}
