import { customElement } from 'aurelia';
import { ItemTable } from '../components/item-table';
import template from './item-list-route.html';

@customElement({
  name: 'item-list-route',
  template,
  dependencies: [ItemTable],
})
export class ItemListRoute {}
