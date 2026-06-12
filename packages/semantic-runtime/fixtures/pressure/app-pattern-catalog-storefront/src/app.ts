import { customElement, resolve } from 'aurelia';
import { ItemList } from './components/item-list';
import { CatalogState } from './state/catalog-state';
import template from './app.html';
import './app.css';

@customElement({
  name: 'app-root',
  template,
  dependencies: [ItemList],
})
export class App {
  readonly state = resolve(CatalogState);
  readonly catalogStatus = Promise.resolve('Featured items refreshes daily.');

  binding(): void {
    void this.state.loadFeaturedItems();
  }
}
