import { customElement, resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { SupportTicketTableState } from '../state/support-ticket-table-state';
import template from './support-ticket-detail-route.html';

@customElement({
  name: 'support-ticket-detail-route',
  template,
})
export class SupportTicketDetailRoute {
  readonly state = resolve(SupportTicketTableState);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    ticketId: string;
    ref?: string;
  }, 'child-first'>({ includeQueryParams: true, mergeStrategy: 'child-first' });

  binding(): void {
    void this.state.loadSupportTickets();
  }
}
