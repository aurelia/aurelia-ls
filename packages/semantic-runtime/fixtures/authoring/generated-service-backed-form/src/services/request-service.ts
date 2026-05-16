import type { ServiceRequest } from '../state/app-state';

export class RequestService {
  async loadRequests(): Promise<readonly ServiceRequest[]> {
    return [
      createRequest('request-1', 'Ada Lovelace'),
      createRequest('request-2', 'Grace Hopper'),
    ];
  }

  async submitRequest(_request: ServiceRequest): Promise<void> {
    return;
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
