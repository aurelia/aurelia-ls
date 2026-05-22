import { customElement, resolve } from 'aurelia';
import { SupportTicketTableState } from '../state/support-ticket-table-state';
import template from './support-ticket-table.html';

@customElement({
  name: 'support-ticket-table',
  template,
})
export class SupportTicketTable {
  readonly state = resolve(SupportTicketTableState);

  binding(): void {
    void this.state.loadSupportTickets();
  }
}
