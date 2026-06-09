export interface ContactEntryInit {
  readonly contactId: string;
  readonly fullName: string;
  readonly email: string;
  readonly websiteUrl: string;
  readonly supportPhone: string;
  readonly active: boolean;
}

export class ContactEntry {
  readonly contactId: string;
  readonly fullName: string;
  readonly email: string;
  readonly websiteUrl: string;
  readonly supportPhone: string;
  readonly active: boolean;

  constructor(init: ContactEntryInit) {
    this.contactId = init.contactId;
    this.fullName = init.fullName;
    this.email = init.email;
    this.websiteUrl = init.websiteUrl;
    this.supportPhone = init.supportPhone;
    this.active = init.active;
  }
}

export class ContactCards {
  readonly contacts: ContactEntry[] = [
    new ContactEntry({
      contactId: 'contact-alex',
      fullName: 'Alex Morgan',
      email: 'alex@example.com',
      websiteUrl: 'https://example.com/alex',
      supportPhone: '+31 20 000 0001',
      active: true,
    }),
    new ContactEntry({
      contactId: 'contact-riley',
      fullName: 'Riley Chen',
      email: 'riley@example.com',
      websiteUrl: 'https://example.com/riley',
      supportPhone: '+31 20 000 0002',
      active: false,
    }),
  ];
}