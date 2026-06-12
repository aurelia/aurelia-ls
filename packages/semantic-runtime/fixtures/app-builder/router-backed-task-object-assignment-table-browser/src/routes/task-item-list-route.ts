import { resolve } from 'aurelia';
import { TaskItemBrowseState } from '../task-item-browse-state';
import type { ContactEntry } from '../contact-entry';

export class TaskItemListRoute {
  readonly state = resolve(TaskItemBrowseState);

  title: string = '';
  done: boolean = false;
  assignee: ContactEntry | null = this.state.contacts[0] ?? null;
  createStatusMessage: string = '';

  create() {
    this.state.createTaskItem(this.title, this.done, this.assignee);
    this.createStatusMessage = 'Task assignment saved.';
  }
}