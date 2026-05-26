import { customElement, resolve } from 'aurelia';
import { route } from '@aurelia/router';
import { ItemDetailRoute } from './routes/item-detail-route';
import { ItemListRoute } from './routes/item-list-route';
import { CatalogState } from './state/catalog-state';
import template from './app.html';
import './app.css';


@route({
  title: 'generated-routed-catalog-storefront',
  routes: [
    {
      path: '',
      redirectTo: 'items',
    },
    {
      id: 'items',
      path: 'items',
      component: ItemListRoute,
      title: 'Items',
      viewport: 'main',
    },
    {
      id: 'item-detail',
      path: 'items/:itemId',
      component: ItemDetailRoute,
      title: 'Item detail',
      viewport: 'main',
    },
  ],
})
@customElement({
  name: 'app-root',
  template,
  dependencies: [ItemListRoute, ItemDetailRoute],
})
export class App {
  readonly state = resolve(CatalogState);
  readonly catalogStatus = Promise.resolve('Featured items refreshes daily.');

  binding(): void {
    void this.state.loadFeaturedItems();
  }
}
