import { customElement, resolve } from 'aurelia';
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
  readonly state = resolve(StorefrontState);
  private readonly launchNotePromise = Promise.resolve('Complimentary wrapping on orders over 75');

  get launchNote(): Promise<string> {
    return this.launchNotePromise;
  }

  binding(): void {
    void this.state.loadFeaturedProducts();
  }
}
