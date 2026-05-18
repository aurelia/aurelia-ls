import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { ProductCard } from './product-card';
import { CatalogState } from '../state/catalog-state';
import template from './product-list.html';

@customElement({
  name: 'product-list',
  template,
  dependencies: [ProductCard],
})
export class ProductList {
  readonly state = resolve(CatalogState);

  binding(): void {
    void this.state.loadFeaturedProducts();
  }
}
