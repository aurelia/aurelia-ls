import { customElement, resolve } from 'aurelia';
import { ProductTierList } from './components/product-tier-list';
import { CatalogState } from './state/catalog-state';
import template from './app.html';

@customElement({
  name: 'app-root',
  template,
  dependencies: [ProductTierList],
})
export class App {
  readonly state = resolve(CatalogState);

  binding(): void {
    void this.state.loadFeaturedProductTiers();
  }
}
