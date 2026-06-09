import { resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { ContactEntryBrowseState } from '../contact-entry-browse-state';

export class ContactEntryDetailRoute {
  readonly state = resolve(ContactEntryBrowseState);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    contactId: string;
  }>();
  readonly contactEntryPromise: ReturnType<ContactEntryBrowseState['loadContact']> = this.state.loadContact(this.routeParams.contactId);
}