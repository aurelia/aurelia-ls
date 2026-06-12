import { customElement, resolve } from 'aurelia';
import { ItemCard } from '../components/item-card';
import { CatalogState } from '../state/catalog-state';
import template from './item-list-route.html';

@customElement({
  name: 'item-list-route',
  template,
  dependencies: [ItemCard],
})
export class ItemListRoute {
  readonly state = resolve(CatalogState);
}
