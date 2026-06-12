import { customElement, resolve } from 'aurelia';
import { CatalogState } from '../state/catalog-state';
import template from './product-tier-list.html';

@customElement({
  name: 'product-tier-list',
  template,
})
export class ProductTierList {
  readonly state = resolve(CatalogState);
}
