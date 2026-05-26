import { resolve } from 'aurelia';
import type { SupportTicket } from '../models/support-ticket';
import { SupportTicketService } from '../services/support-ticket-service';



export class TableFilterState {
  searchQuery = '';

  get hasActiveFilters(): boolean {
    return this.searchQuery.trim().length > 0;
  }

  matches(supportTicket: SupportTicket): boolean {
    const query = this.searchQuery.trim().toLowerCase();
    const matchesSearch = query.length === 0
      || String(supportTicket.name).toLowerCase().includes(query);

    return matchesSearch;
  }

  reset(): void {
    this.searchQuery = '';

  }
}

export class SupportTicketTableState {
  private readonly supportTicketService = resolve(SupportTicketService);

  readonly filters = new TableFilterState();

  supportTickets: SupportTicket[] = [];
  isLoading = false;

  get filteredSupportTickets(): readonly SupportTicket[] {
    return this.supportTickets.filter((supportTicket) => this.filters.matches(supportTicket));
  }

  get totalResults(): number {
    return this.filteredSupportTickets.length;
  }

  async loadSupportTickets(): Promise<void> {
    if (this.supportTickets.length > 0 || this.isLoading) {
      return;
    }

    this.isLoading = true;
    try {
      this.supportTickets = [...await this.supportTicketService.listSupportTickets()];
    } finally {
      this.isLoading = false;
    }
  }

  readSupportTicket(id: string | number): SupportTicket | null {
    const normalizedId = typeof id === 'number' ? id : Number(id);
    if (!Number.isFinite(normalizedId)) {
      return null;
    }
    return this.supportTickets.find((candidate) => candidate.id === normalizedId) ?? null;
  }

  resetFilters(): void {
    this.filters.reset();

  }
}