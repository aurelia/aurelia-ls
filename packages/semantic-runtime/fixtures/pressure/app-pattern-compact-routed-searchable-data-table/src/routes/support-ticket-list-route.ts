import { customElement } from 'aurelia';
import { SupportTicketTable } from '../components/support-ticket-table';
import template from './support-ticket-list-route.html';

@customElement({
  name: 'support-ticket-list-route',
  template,
  dependencies: [SupportTicketTable],
})
export class SupportTicketListRoute {}
