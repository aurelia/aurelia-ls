import { customElement, resolve } from 'aurelia';
import { ItemCard } from './item-card';
import { CatalogState } from '../state/catalog-state';
import template from './item-list.html';

@customElement({
  name: 'item-list',
  template,
  dependencies: [ItemCard],
})
export class ItemList {
  readonly state = resolve(CatalogState);
}
