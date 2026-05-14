import { bindable, customElement } from '@aurelia/runtime-html';
import { resolve } from '@aurelia/kernel';
import { RequestService } from '../services/request-service';
import { type ContactPreference, type RequestTopic, type RequestTopicSummary } from '../state/app-state';
import template from './service-backed-form.html';

@customElement({
  name: 'service-backed-form',
  template,
})
export class ServiceBackedForm {
  private readonly requests = resolve(RequestService);

  @bindable requestId = '';

  get customerName(): string {
    return this.request?.customerName ?? '';
  }

  set customerName(value: string) {
    this.requests.updateCustomerName(this.requestId, value);
  }

  get email(): string {
    return this.request?.email ?? '';
  }

  set email(value: string) {
    this.requests.updateEmail(this.requestId, value);
  }

  get urgent(): boolean {
    return this.request?.urgent ?? false;
  }

  set urgent(value: boolean) {
    this.requests.updateUrgency(this.requestId, value);
  }

  get contactPreference(): ContactPreference {
    return this.request?.contactPreference ?? this.emailPreference;
  }

  set contactPreference(value: ContactPreference) {
    this.requests.updateContactPreference(this.requestId, value);
  }

  get topics(): RequestTopic[] {
    return this.request?.topics ?? [];
  }

  get notes(): string {
    return this.request?.notes ?? '';
  }

  set notes(value: string) {
    this.requests.updateNotes(this.requestId, value);
  }

  get emailPreference(): ContactPreference {
    return this.requests.emailPreference;
  }

  get phonePreference(): ContactPreference {
    return this.requests.phonePreference;
  }

  get hardwareTopic(): RequestTopic {
    return this.requests.hardwareTopic;
  }

  get billingTopic(): RequestTopic {
    return this.requests.billingTopic;
  }

  get supportTopic(): RequestTopic {
    return this.requests.supportTopic;
  }

  get supportTopicSummary(): RequestTopicSummary {
    return this.requests.supportTopicSummary;
  }

  get canSubmit(): boolean {
    return this.customerName !== '' && this.email !== '';
  }

  submit(): void {
    this.requests.submitRequest(this.requestId);
  }

  private get request() {
    return this.requests.readRequest(this.requestId);
  }
}
