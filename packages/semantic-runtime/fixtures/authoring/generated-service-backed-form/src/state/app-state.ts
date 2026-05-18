import { resolve } from '@aurelia/kernel';
import { RequestService } from '../services/request-service';

export type ContactPreference = 'email' | 'phone';
export type RequestTopic = 'hardware' | 'billing' | 'support';

export interface RequestTopicSummary {
  id: RequestTopic;
  label: string;
}

export interface ServiceRequest {
  id: string;
  customerName: string;
  email: string;
  urgent: boolean;
  contactPreference: ContactPreference;
  primaryTopic: RequestTopic | null;
  topics: RequestTopic[];
  notes: string;
  submitCount: number;
}

export class AppState {
  private readonly requestService = resolve(RequestService);
  private readonly requests = new Map<string, ServiceRequest>();

  selectedRequestId = '';
  isLoadingRequests = false;

  readonly emailPreference: ContactPreference = 'email';
  readonly phonePreference: ContactPreference = 'phone';
  readonly hardwareTopic: RequestTopic = 'hardware';
  readonly billingTopic: RequestTopic = 'billing';
  readonly supportTopic: RequestTopic = 'support';
  readonly supportTopicSummary: RequestTopicSummary = { id: 'support', label: 'Support' };

  get requestIds(): readonly string[] {
    return [...this.requests.keys()];
  }

  get submittedCount(): number {
    let count = 0;
    for (const request of this.requests.values()) {
      count += request.submitCount;
    }
    return count;
  }

  readRequest(requestId: string): ServiceRequest | null {
    return this.requests.get(requestId) ?? null;
  }

  async loadRequests(): Promise<void> {
    if (this.requests.size > 0 || this.isLoadingRequests) {
      return;
    }

    this.isLoadingRequests = true;
    try {
      this.replaceRequests(await this.requestService.loadRequests());
      this.selectedRequestId = this.requestIds[0] ?? '';
    } finally {
      this.isLoadingRequests = false;
    }
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

  updatePrimaryTopic(requestId: string, value: RequestTopic | null): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.primaryTopic = value;
    }
  }

  updateNotes(requestId: string, value: string): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.notes = value;
    }
  }

  async submitRequest(requestId: string): Promise<void> {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.submitCount += 1;
      await this.requestService.submitRequest(request);
    }
  }

  private replaceRequests(requests: readonly ServiceRequest[]): void {
    this.requests.clear();
    for (const request of requests) {
      this.requests.set(request.id, request);
    }
  }
}
