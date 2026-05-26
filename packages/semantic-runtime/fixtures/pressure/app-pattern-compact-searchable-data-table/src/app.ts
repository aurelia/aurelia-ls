import { customElement } from 'aurelia';
import { CustomerAccountTable } from './components/customer-account-table';
import template from './app.html';

@customElement({
  name: 'app-root',
  template,
  dependencies: [CustomerAccountTable],
})
export class App {}
