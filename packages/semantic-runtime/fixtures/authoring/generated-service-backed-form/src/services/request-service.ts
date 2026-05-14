import { resolve } from '@aurelia/kernel';
import { AppState, type ContactPreference, type RequestTopic, type RequestTopicSummary, type ServiceRequest } from '../state/app-state';

export class RequestService {
  private readonly state = resolve(AppState);

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

  readRequest(requestId: string): ServiceRequest | null {
    return this.state.readRequest(requestId);
  }

  updateCustomerName(requestId: string, value: string): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.customerName = value;
    }
  }

  updateEmail(requestId: string, value: string): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.email = value;
    }
  }

  updateUrgency(requestId: string, value: boolean): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.urgent = value;
    }
  }

  updateContactPreference(requestId: string, value: ContactPreference): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.contactPreference = value;
    }
  }

  updateNotes(requestId: string, value: string): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.notes = value;
    }
  }

  submitRequest(requestId: string): void {
    this.state.markSubmitted(requestId);
  }
}
