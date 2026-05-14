import { bindable, customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { AppState, type ContactPreference, type RequestTopic } from '../state/app-state';
import template from './state-backed-form.html';

@customElement({
  name: 'state-backed-form',
  template,
})
export class StateBackedForm {
  private readonly state = resolve(AppState);

  @bindable requestId = '';

  get customerName(): string {
    return this.request?.customerName ?? '';
  }

  set customerName(value: string) {
    const request = this.request;
    if (request != null) {
      request.customerName = value;
    }
  }

  get email(): string {
    return this.request?.email ?? '';
  }

  set email(value: string) {
    const request = this.request;
    if (request != null) {
      request.email = value;
    }
  }

  get urgent(): boolean {
    return this.request?.urgent ?? false;
  }

  set urgent(value: boolean) {
    const request = this.request;
    if (request != null) {
      request.urgent = value;
    }
  }

  get contactPreference(): ContactPreference {
    return this.request?.contactPreference ?? this.emailPreference;
  }

  set contactPreference(value: ContactPreference) {
    const request = this.request;
    if (request != null) {
      request.contactPreference = value;
    }
  }

  get topics(): RequestTopic[] {
    return this.request?.topics ?? [];
  }

  get notes(): string {
    return this.request?.notes ?? '';
  }

  set notes(value: string) {
    const request = this.request;
    if (request != null) {
      request.notes = value;
    }
  }

  get emailPreference(): ContactPreference {
    return this.state.emailPreference;
  }

  get phonePreference(): ContactPreference {
    return this.state.phonePreference;
  }

  get hardwareTopic(): RequestTopic {
    return this.state.hardwareTopic;
  }

  get billingTopic(): RequestTopic {
    return this.state.billingTopic;
  }

  get supportTopic(): RequestTopic {
    return this.state.supportTopic;
  }

  get canSubmit(): boolean {
    return this.customerName !== '' && this.email !== '';
  }

  submit(): void {
    this.state.submitRequest(this.requestId);
  }

  private get request() {
    return this.state.readRequest(this.requestId);
  }
}
