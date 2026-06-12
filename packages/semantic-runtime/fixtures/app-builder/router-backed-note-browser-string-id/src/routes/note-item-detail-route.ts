import { resolve } from 'aurelia';
import { IRouteContext } from '@aurelia/router';
import { NoteItemBrowseState } from '../note-item-browse-state';
import { NoteItem } from '../note-item';

export class NoteItemDetailRoute {
  readonly state = resolve(NoteItemBrowseState);
  readonly routeParams = resolve(IRouteContext).getRouteParameters<{
    noteId: string;
  }>();

  get noteItem(): NoteItem | null {
    return this.state.findNoteItem(this.routeParams.noteId);
  }
}