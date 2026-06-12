export type FulfillmentMethod = 'ship' | 'pickup' | 'onsite';
export type ContactChannel = 'email' | 'phone' | 'sms';

export class CustomerProfile {
  id = '';
  displayName = '';
  email = '';
  phone = '';
  address = new PostalAddress();
}

export class PostalAddress {
  street = '';
  postalCode = '';
  countryCode = 'NL';
}

export class TicketOption<TValue> {
  constructor(
    readonly label: string,
    readonly value: TValue,
  ) {}
}

export interface TicketDraft {
  id: string;
  customer: CustomerProfile;
  fulfillmentMethod: FulfillmentMethod;
  preferredChannels: ContactChannel[];
  channelConsent: Map<ContactChannel, boolean>;
  requestedTags: string[];
  priority: number;
  metadata: Record<string, unknown>;
  looseFields: Record<string, string | number | boolean | null>;
}
