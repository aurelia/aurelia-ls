export type ContactPreference = 'email' | 'phone';
export type RequestTopic = 'hardware' | 'billing' | 'support';

export interface ServiceRequest {
  id: string;
  customerName: string;
  email: string;
  urgent: boolean;
  contactPreference: ContactPreference;
  topics: RequestTopic[];
  notes: string;
  submitCount: number;
}

export class AppState {
  readonly requestIds = ['request-1', 'request-2'];
  selectedRequestId = 'request-1';

  readonly emailPreference: ContactPreference = 'email';
  readonly phonePreference: ContactPreference = 'phone';
  readonly hardwareTopic: RequestTopic = 'hardware';
  readonly billingTopic: RequestTopic = 'billing';
  readonly supportTopic: RequestTopic = 'support';

  private readonly requests = new Map<string, ServiceRequest>([
    ['request-1', createRequest('request-1', 'Ada Lovelace')],
    ['request-2', createRequest('request-2', 'Grace Hopper')],
  ]);

  get selectedRequest(): ServiceRequest | null {
    return this.readRequest(this.selectedRequestId);
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

  submitRequest(requestId: string): void {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.submitCount += 1;
    }
  }
}

function createRequest(id: string, customerName: string): ServiceRequest {
  return {
    id,
    customerName,
    email: `${customerName.toLowerCase().replace(' ', '.')}@example.test`,
    urgent: false,
    contactPreference: 'email',
    topics: ['support'],
    notes: '',
    submitCount: 0,
  };
}
