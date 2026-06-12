import { CustomerAccount } from '../models/customer-account';

interface CustomerAccountRecord {
  readonly id: number;
  readonly name: string;
}

const CUSTOMER_ACCOUNTS: readonly CustomerAccountRecord[] = [
  { id: 1, name: 'Customer Account 1' },
  { id: 2, name: 'Customer Account 2' },
  { id: 3, name: 'Customer Account 3' },
  { id: 4, name: 'Customer Account 4' },
  { id: 5, name: 'Customer Account 5' },
  { id: 6, name: 'Customer Account 6' },
  { id: 7, name: 'Customer Account 7' },
  { id: 8, name: 'Customer Account 8' },
];

export class CustomerAccountService {
  async listCustomerAccounts(): Promise<readonly CustomerAccount[]> {
    return CUSTOMER_ACCOUNTS.map((customerAccount) => new CustomerAccount(
      customerAccount.id,
      customerAccount.name,
    ));
  }
}
