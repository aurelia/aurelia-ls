import { bindable, customElement, resolve } from 'aurelia';
import { Product } from '../models/product';
import { StorefrontState } from '../state/storefront-state';
import template from './product-card.html';

@customElement({
  name: 'product-card',
  template,
})
export class ProductCard {
  @bindable productId = '';

  private readonly state = resolve(StorefrontState);

  get product(): Product | null {
    return this.state.catalog.productById(this.productId);
  }

  get isLoading(): boolean {
    return this.state.catalog.isLoadingProduct(this.productId);
  }

  binding(): void {
    void this.state.ensureProduct(this.productId);
  }

  buy(): void {
    this.state.cart.add(this.productId);
  }
}
