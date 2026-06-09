import { resolve } from 'aurelia';
import { ContactEntry } from './contact-entry';
import { ContactService } from './services/contact-service';

export class ContactEntryBrowseState {
  private readonly contactService = resolve(ContactService);

  loadContacts(): Promise<readonly ContactEntry[]> {
    return this.contactService.loadContacts();
  }

  loadContact(contactId: string): Promise<ContactEntry | null> {
    return this.contactService.loadContact(contactId);
  }

  searchContactsByName(query: string): Promise<readonly ContactEntry[]> {
    return this.contactService.searchContactsByName(query);
  }

  createContactEntry(fullName: string, email: string, websiteUrl: string, supportPhone: string, active: boolean): Promise<readonly ContactEntry[]> {
    return this.contactService.createContact(fullName, email, websiteUrl, supportPhone, active);
  }
}
