import { customElement } from 'aurelia';
import { ItemTable } from './components/item-table';
import template from './app.html';
import './app.css';

@customElement({
  name: 'app-root',
  template,
  dependencies: [ItemTable],
})
export class App {}
