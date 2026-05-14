import { bindable, customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { ContactChannel, FulfillmentMethod, TicketDraft } from '../models/ticket';
import { SupportState } from '../state/support-state';
import { LoosePicklist } from './loose-picklist';
import template from './ticket-editor.html';

@customElement({
  name: 'ticket-editor',
  template,
  dependencies: [LoosePicklist],
})
export class TicketEditor {
  private readonly state = resolve(SupportState);

  @bindable ticketId = '';
  @bindable draft: TicketDraft | null = null;
  @bindable onCommit: ((ticketId: string) => void) | null = null;

  readonly emailChannel: ContactChannel = 'email';
  readonly phoneChannel: ContactChannel = 'phone';
  readonly smsChannel: ContactChannel = 'sms';

  get ticket(): TicketDraft | null {
    return this.draft ?? this.state.readTicket(this.ticketId);
  }

  get fulfillmentOptions() {
    return this.state.fulfillmentOptions;
  }

  get channelOptions() {
    return this.state.channelOptions;
  }

  get tagOptions(): readonly string[] {
    return this.state.tagOptions;
  }

  get customerName(): string {
    return this.ticket?.customer.displayName ?? '';
  }

  set customerName(value: string) {
    const ticket = this.ticket;
    if (ticket != null) {
      ticket.customer.displayName = value;
    }
  }

  get customerEmail(): string {
    return this.ticket?.customer.email ?? '';
  }

  set customerEmail(value: string) {
    const ticket = this.ticket;
    if (ticket != null) {
      ticket.customer.email = value;
    }
  }

  get fulfillmentMethod(): FulfillmentMethod | null {
    return this.ticket?.fulfillmentMethod ?? null;
  }

  set fulfillmentMethod(value: FulfillmentMethod | null) {
    const ticket = this.ticket;
    if (ticket != null && value != null) {
      ticket.fulfillmentMethod = value;
    }
  }

  get preferredChannels(): ContactChannel[] {
    return this.ticket?.preferredChannels ?? [];
  }

  get channelConsent(): Map<ContactChannel, boolean> {
    return this.ticket?.channelConsent ?? new Map<ContactChannel, boolean>();
  }

  get requestedTags(): string[] {
    return this.ticket?.requestedTags ?? [];
  }

  get priority(): number {
    return this.ticket?.priority ?? 0;
  }

  set priority(value: number) {
    const ticket = this.ticket;
    if (ticket != null) {
      ticket.priority = value;
    }
  }

  get looseFloor(): string | number | boolean | null {
    return this.ticket?.looseFields.floor ?? null;
  }

  set looseFloor(value: string | number | boolean | null) {
    const ticket = this.ticket;
    if (ticket != null) {
      ticket.looseFields.floor = value;
    }
  }

  get emailErrors(): readonly string[] {
    return this.state.readFieldError('customer.email');
  }

  submit(): void {
    this.onCommit?.(this.ticketId);
  }
}
