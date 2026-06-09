import { ContactEntry } from '../contact-entry';

export class ContactService {
  private readonly contacts: ContactEntry[] = [
    new ContactEntry({
      contactId: 1,
      fullName: 'Ada Lovelace',
      email: 'ada@example.test',
      websiteUrl: 'https://example.test/ada',
      supportPhone: '+31 20 000 0001',
      active: true,
    }),
    new ContactEntry({
      contactId: 2,
      fullName: 'Grace Hopper',
      email: 'grace@example.test',
      websiteUrl: 'https://example.test/grace',
      supportPhone: '+31 20 000 0002',
      active: true,
    }),
    new ContactEntry({
      contactId: 3,
      fullName: 'Katherine Johnson',
      email: 'katherine@example.test',
      websiteUrl: 'https://example.test/katherine',
      supportPhone: '+31 20 000 0003',
      active: false,
    }),
  ];

  async loadContacts(): Promise<readonly ContactEntry[]> {
    return this.contacts;
  }

  async loadContact(contactId: string): Promise<ContactEntry | null> {
    return this.contacts.find((contactEntry) => String(contactEntry.contactId) === contactId) ?? null;
  }

  async searchContactsByName(query: string): Promise<readonly ContactEntry[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return this.contacts;
    }
    return this.contacts.filter((contactEntry) => contactEntry.fullName.toLowerCase().includes(normalizedQuery));
  }

  async createContact(fullName: string, email: string, websiteUrl: string, supportPhone: string, active: boolean): Promise<readonly ContactEntry[]> {
    const nextId = this.contacts.length === 0 ? 1 : Math.max(...this.contacts.map((contactEntry) => contactEntry.contactId)) + 1;
    this.contacts.push(new ContactEntry({
      contactId: nextId,
      fullName: fullName,
      email: email,
      websiteUrl: websiteUrl,
      supportPhone: supportPhone,
      active: active,
    }));
    return this.contacts;
  }
}
