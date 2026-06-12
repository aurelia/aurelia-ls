import { resolve } from 'aurelia';
import { NoteItemBrowseState } from '../note-item-browse-state';

export class NoteItemListRoute {
  readonly state = resolve(NoteItemBrowseState);
}