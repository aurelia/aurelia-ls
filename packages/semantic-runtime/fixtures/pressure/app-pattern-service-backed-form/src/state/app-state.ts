import { resolve } from 'aurelia';
import { RequestService } from '../services/request-service';

export type ContactPreference = 'email' | 'phone';
export type RequestTopic = 'hardware' | 'billing' | 'support';

export interface RequestTopicSummary {
  id: RequestTopic;
  label: string;
}

export interface SupportAgent {
  readonly id: string;
  readonly name: string;
}

export class ServiceRequest {
  constructor(
    readonly id: string,
    public customerName: string,
    public email: string,
    public urgent: boolean,
    public contactPreference: ContactPreference,
    public primaryTopic: RequestTopic | null,
    public assignee: SupportAgent | null,
    public topics: RequestTopic[],
    public notes: string,
    public submitCount: number,
  ) {}

  get canSubmit(): boolean {
    return this.customerName !== '' && this.email !== '';
  }
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
  readonly supportAgents: readonly SupportAgent[] = [
    { id: 'agent-ada', name: 'Ada' },
    { id: 'agent-grace', name: 'Grace' },
  ];

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

  async submitRequest(requestId: string): Promise<void> {
    const request = this.readRequest(requestId);
    if (request != null) {
      request.submitCount += 1;
      await this.requestService.submitRequest(request);
    }
  }

  sameSupportAgent(left: SupportAgent | null, right: SupportAgent | null): boolean {
    return left?.id === right?.id;
  }

  private replaceRequests(requests: readonly ServiceRequest[]): void {
    this.requests.clear();
    for (const request of requests) {
      this.requests.set(request.id, request);
    }
  }
}
