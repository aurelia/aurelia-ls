import { customElement, resolve } from 'aurelia';
import { CustomerAccountTableState } from '../state/customer-account-table-state';
import template from './customer-account-table.html';

@customElement({
  name: 'customer-account-table',
  template,
})
export class CustomerAccountTable {
  readonly state = resolve(CustomerAccountTableState);

  binding(): void {
    void this.state.loadCustomerAccounts();
  }
}
