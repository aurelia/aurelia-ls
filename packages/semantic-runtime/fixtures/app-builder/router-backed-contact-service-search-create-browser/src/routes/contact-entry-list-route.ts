import { resolve } from 'aurelia';
import { ContactEntryBrowseState } from '../contact-entry-browse-state';

export class ContactEntryListRoute {
  readonly state = resolve(ContactEntryBrowseState);

  contactsPromise: ReturnType<ContactEntryBrowseState['loadContacts']> = this.state.loadContacts();
  contactNameQuery: string = '';
  searchStatusMessage: string = '';
  clearSearchStatusMessage: string = '';

  reloadContactsByName() {
    const queryValue = this.contactNameQuery;
    this.contactsPromise = queryValue === ''
      ? this.state.loadContacts()
      : this.state.searchContactsByName(queryValue);
    return this.contactsPromise;
  }

  async searchContacts() {
    await this.reloadContactsByName();
    this.searchStatusMessage = 'Search applied.';
  }

  async clearContactSearch() {
    this.contactNameQuery = '';
    await this.reloadContactsByName();
    this.clearSearchStatusMessage = 'Search cleared.';
  }

  fullName: string = '';
  email: string = '';
  websiteUrl: string = '';
  supportPhone: string = '';
  active: boolean = true;
  createStatusMessage: string = '';

  async createContact() {
    this.contactsPromise = this.state.createContactEntry(this.fullName, this.email, this.websiteUrl, this.supportPhone, this.active);
    await this.contactsPromise;
    this.createStatusMessage = 'Contact saved.';
  }
}