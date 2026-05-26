import { resolve } from 'aurelia';
import type { CustomerAccount } from '../models/customer-account';
import { CustomerAccountService } from '../services/customer-account-service';



export class TableFilterState {
  searchQuery = '';

  get hasActiveFilters(): boolean {
    return this.searchQuery.trim().length > 0;
  }

  matches(customerAccount: CustomerAccount): boolean {
    const query = this.searchQuery.trim().toLowerCase();
    const matchesSearch = query.length === 0
      || String(customerAccount.name).toLowerCase().includes(query);

    return matchesSearch;
  }

  reset(): void {
    this.searchQuery = '';

  }
}

export class CustomerAccountTableState {
  private readonly customerAccountService = resolve(CustomerAccountService);

  readonly filters = new TableFilterState();

  customerAccounts: CustomerAccount[] = [];
  isLoading = false;

  get filteredCustomerAccounts(): readonly CustomerAccount[] {
    return this.customerAccounts.filter((customerAccount) => this.filters.matches(customerAccount));
  }

  get totalResults(): number {
    return this.filteredCustomerAccounts.length;
  }

  async loadCustomerAccounts(): Promise<void> {
    if (this.customerAccounts.length > 0 || this.isLoading) {
      return;
    }

    this.isLoading = true;
    try {
      this.customerAccounts = [...await this.customerAccountService.listCustomerAccounts()];
    } finally {
      this.isLoading = false;
    }
  }

  readCustomerAccount(id: string | number): CustomerAccount | null {
    const normalizedId = typeof id === 'number' ? id : Number(id);
    if (!Number.isFinite(normalizedId)) {
      return null;
    }
    return this.customerAccounts.find((candidate) => candidate.id === normalizedId) ?? null;
  }

  resetFilters(): void {
    this.filters.reset();

  }
}