import { customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { SupportState } from './state/support-state';
import { TicketEditor } from './components/ticket-editor';
import template from './app.html';

@customElement({
  name: 'support-desk-app',
  template,
  dependencies: [TicketEditor],
})
export class SupportDeskApp {
  private readonly state = resolve(SupportState);

  readonly shellTone = 'ticket-shell';

  get selectedTicketId(): string {
    return this.state.selectedTicketId;
  }

  set selectedTicketId(value: string) {
    this.state.selectedTicketId = value;
  }

  get selectedTicket() {
    return this.state.selectedTicket;
  }

  get ticketIds(): readonly string[] {
    return this.state.ticketIds;
  }

  get weakMetadata() {
    return this.state.selectedTicket?.metadata;
  }

  get shellClasses(): Record<string, boolean> {
    return {
      'has-selection': this.selectedTicket != null,
      'has-channel-warning': this.state.selectedTicket?.preferredChannels.length === 0,
    };
  }

  commitTicket = (ticketId: string): void => {
    this.state.commitTicket(ticketId);
  };
}
