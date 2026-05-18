import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { ProductList } from './components/product-list';
import { CatalogState } from './state/catalog-state';
import template from './app.html';
import './app.css';

@customElement({
  name: 'app-root',
  template,
  dependencies: [ProductList],
})
export class App {
  readonly state = resolve(CatalogState);
  private readonly catalogStatusPromise = Promise.resolve('Featured product availability refreshes daily.');

  get cartProgressPercent(): number {
    return Math.min(100, Math.round((this.state.cart.itemCount / 3) * 100));
  }

  get catalogStatus(): Promise<string> {
    return this.catalogStatusPromise;
  }

  get cartProductNames(): readonly string[] {
    return this.state.cart.productIds.map((productId) =>
      this.state.products.readProduct(productId)?.name ?? productId
    );
  }

  binding(): void {
    void this.state.loadFeaturedProducts();
  }
}
