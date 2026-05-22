import { bindable, customElement, resolve } from 'aurelia';
import type { Item } from '../models/item';
import { CatalogState } from '../state/catalog-state';
import template from './item-card.html';

@customElement({
  name: 'item-card',
  template,
})
export class ItemCard {
  readonly state = resolve(CatalogState);

  @bindable item: Item | null = null;
}
