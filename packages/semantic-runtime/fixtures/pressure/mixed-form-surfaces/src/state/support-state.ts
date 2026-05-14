import { ContactChannel, CustomerProfile, FulfillmentMethod, TicketDraft, TicketOption } from '../models/ticket';

export class SupportState {
  readonly ticketIds = ['ticket-1001', 'ticket-1002'];
  selectedTicketId = 'ticket-1001';

  readonly fulfillmentOptions: readonly TicketOption<FulfillmentMethod>[] = [
    new TicketOption('Ship replacement', 'ship'),
    new TicketOption('Store pickup', 'pickup'),
    new TicketOption('On-site service', 'onsite'),
  ];

  readonly channelOptions: readonly TicketOption<ContactChannel>[] = [
    new TicketOption('Email', 'email'),
    new TicketOption('Phone', 'phone'),
    new TicketOption('SMS', 'sms'),
  ];

  readonly tagOptions = ['warranty', 'priority', 'hardware', 'follow-up'];

  private readonly tickets = new Map<string, TicketDraft>([
    ['ticket-1001', createTicket('ticket-1001', 'Ada Lovelace', 'email')],
    ['ticket-1002', createTicket('ticket-1002', 'Grace Hopper', 'phone')],
  ]);

  readonly fieldErrors: Record<string, string[]> = {
    'customer.email': ['Email is missing a domain'],
  };

  get selectedTicket(): TicketDraft | null {
    return this.tickets.get(this.selectedTicketId) ?? null;
  }

  readTicket(ticketId: string): TicketDraft | null {
    return this.tickets.get(ticketId) ?? null;
  }

  readFieldError(path: string): readonly string[] {
    return this.fieldErrors[path] ?? [];
  }

  commitTicket(ticketId: string): void {
    const ticket = this.tickets.get(ticketId);
    if (ticket == null) {
      return;
    }
    ticket.metadata.lastCommit = new Date().toISOString();
  }
}

function createTicket(id: string, displayName: string, channel: ContactChannel): TicketDraft {
  const customer = new CustomerProfile();
  customer.id = `${id}-customer`;
  customer.displayName = displayName;
  customer.email = `${displayName.toLowerCase().replace(' ', '.')}@example.test`;

  return {
    id,
    customer,
    fulfillmentMethod: 'ship',
    preferredChannels: [channel],
    channelConsent: new Map<ContactChannel, boolean>([[channel, true]]),
    requestedTags: ['hardware'],
    priority: 2,
    metadata: {
      source: 'legacy-import',
      externalCorrelation: id,
    },
    looseFields: {
      floor: null,
      receivesNewsletter: false,
    },
  };
}
