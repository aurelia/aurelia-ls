export interface ContactEntryInit {
  readonly contactId: number;
  readonly fullName: string;
  readonly email: string;
  readonly websiteUrl: string;
  readonly supportPhone: string;
  readonly active: boolean;
}

export class ContactEntry {
  readonly contactId: number;
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
