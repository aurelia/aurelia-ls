import { customElement } from 'aurelia';
import { route } from '@aurelia/router';
import { SupportTicketDetailRoute } from './routes/support-ticket-detail-route';
import { SupportTicketListRoute } from './routes/support-ticket-list-route';
import template from './app.html';



@route({
  title: 'Generated Compact Routed Searchable Data Table',
  routes: [
    {
      path: '',
      redirectTo: 'tickets',
    },
    {
      id: 'tickets',
      path: 'tickets',
      component: SupportTicketListRoute,
      title: 'Tickets',
      viewport: 'main',
    },
    {
      id: 'support-ticket-detail',
      path: 'tickets/:ticketId',
      component: SupportTicketDetailRoute,
      title: 'Support Ticket detail',
      viewport: 'main',
    },
  ],
})
@customElement({
  name: 'app-root',
  template,
  dependencies: [SupportTicketListRoute, SupportTicketDetailRoute],
})
export class App {}
