import { SupportTicket } from '../models/support-ticket';

interface SupportTicketRecord {
  readonly id: number;
  readonly name: string;
}

const SUPPORT_TICKETS: readonly SupportTicketRecord[] = [
  { id: 1, name: 'Support Ticket 1' },
  { id: 2, name: 'Support Ticket 2' },
  { id: 3, name: 'Support Ticket 3' },
  { id: 4, name: 'Support Ticket 4' },
  { id: 5, name: 'Support Ticket 5' },
  { id: 6, name: 'Support Ticket 6' },
  { id: 7, name: 'Support Ticket 7' },
  { id: 8, name: 'Support Ticket 8' },
];

export class SupportTicketService {
  async listSupportTickets(): Promise<readonly SupportTicket[]> {
    return SUPPORT_TICKETS.map((supportTicket) => new SupportTicket(
      supportTicket.id,
      supportTicket.name,
    ));
  }
}
