import { bindable, customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { AppState, type ContactPreference, type RequestTopic, type RequestTopicSummary } from '../state/app-state';
import template from './service-backed-form.html';

@customElement({
  name: 'service-backed-form',
  template,
})
export class ServiceBackedForm {
  private readonly state = resolve(AppState);

  @bindable requestId = '';

  get customerName(): string {
    return this.request?.customerName ?? '';
  }

  set customerName(value: string) {
    this.state.updateCustomerName(this.requestId, value);
  }

  get email(): string {
    return this.request?.email ?? '';
  }

  set email(value: string) {
    this.state.updateEmail(this.requestId, value);
  }

  get urgent(): boolean {
    return this.request?.urgent ?? false;
  }

  set urgent(value: boolean) {
    this.state.updateUrgency(this.requestId, value);
  }

  get contactPreference(): ContactPreference {
    return this.request?.contactPreference ?? this.emailPreference;
  }

  set contactPreference(value: ContactPreference) {
    this.state.updateContactPreference(this.requestId, value);
  }

  get topics(): RequestTopic[] {
    return this.request?.topics ?? [];
  }

  get notes(): string {
    return this.request?.notes ?? '';
  }

  set notes(value: string) {
    this.state.updateNotes(this.requestId, value);
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

  get supportTopicSummary(): RequestTopicSummary {
    return this.state.supportTopicSummary;
  }

  get canSubmit(): boolean {
    return this.customerName !== '' && this.email !== '';
  }

  submit(): void {
    void this.state.submitRequest(this.requestId);
  }

  private get request() {
    return this.state.readRequest(this.requestId);
  }
}
