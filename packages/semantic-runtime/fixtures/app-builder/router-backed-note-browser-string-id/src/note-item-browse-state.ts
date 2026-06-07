import { NoteItem } from './note-item';

export class NoteItemBrowseState {
  readonly noteItems: NoteItem[] = [
    new NoteItem('note-alpha', 'Project kickoff notes', false),
    new NoteItem('note-beta', 'Archived deployment notes', true),
  ];

  findNoteItem(code: string): NoteItem | null {
    return this.noteItems.find((noteItem) => noteItem.code === code) ?? null;
  }
}
