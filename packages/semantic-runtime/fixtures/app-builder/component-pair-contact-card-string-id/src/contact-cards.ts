export class ContactEntry {
  constructor(
    readonly contactId: string,
    readonly fullName: string,
    readonly email: string,
    readonly active: boolean,
  ) {}
}

export class ContactCards {
  readonly contacts: ContactEntry[] = [
    new ContactEntry('contact-alex', 'Alex Morgan', 'alex@example.com', true),
    new ContactEntry('contact-riley', 'Riley Chen', 'riley@example.com', false),
  ];
}