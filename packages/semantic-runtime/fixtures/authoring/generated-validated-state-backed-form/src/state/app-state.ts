export type ContactPreference = 'email' | 'phone';
export type RequestTopic = 'hardware' | 'billing' | 'support';

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
  readonly requestIds = ['request-1', 'request-2'];
  selectedRequestId = 'request-1';

  readonly emailPreference: ContactPreference = 'email';
  readonly phonePreference: ContactPreference = 'phone';
  readonly hardwareTopic: RequestTopic = 'hardware';
  readonly billingTopic: RequestTopic = 'billing';
  readonly supportTopic: RequestTopic = 'support';
  readonly supportAgents: readonly SupportAgent[] = [
    { id: 'agent-ada', name: 'Ada' },
    { id: 'agent-grace', name: 'Grace' },
  ];

  private readonly requests = new Map<string, ServiceRequest>([
    ['request-1', createRequest('request-1', 'Ada Lovelace')],
    ['request-2', createRequest('request-2', 'Grace Hopper')],
  ]);

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

  sameSupportAgent(left: SupportAgent | null, right: SupportAgent | null): boolean {
    return left?.id === right?.id;
  }
}

function createRequest(id: string, customerName: string): ServiceRequest {
  return new ServiceRequest(
    id,
    customerName,
    `${customerName.toLowerCase().replace(' ', '.')}@example.test`,
    false,
    'email',
    null,
    null,
    ['support'],
    '',
    0,
  );
}
