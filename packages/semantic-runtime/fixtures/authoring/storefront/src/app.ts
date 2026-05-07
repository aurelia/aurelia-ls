import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { CartSummary } from './components/cart-summary';
import { CheckoutForm } from './components/checkout-form';
import { ProductList } from './components/product-list';
import { StorefrontState } from './state/storefront-state';
import template from './app.html';

@customElement({
  name: 'storefront-app',
  template,
  dependencies: [ProductList, CartSummary, CheckoutForm],
})
export class StorefrontApp {
  private readonly state = resolve(StorefrontState);
  private readonly launchNotePromise = Promise.resolve('Complimentary wrapping on orders over 75');

  get cartCount(): number {
    return this.state.cart.count;
  }

  get productCount(): number {
    return this.state.productCount;
  }

  get isLoading(): boolean {
    return this.state.catalog.isLoading;
  }

  get launchNote(): Promise<string> {
    return this.launchNotePromise;
  }

  binding(): void {
    void this.state.loadFeaturedProducts();
  }
}
