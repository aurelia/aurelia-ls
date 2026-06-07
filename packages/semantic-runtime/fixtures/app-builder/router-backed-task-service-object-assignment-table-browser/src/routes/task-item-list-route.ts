import { resolve } from 'aurelia';
import { TaskItemBrowseState } from '../task-item-browse-state';
import type { ContactEntry } from '../contact-entry';

export class TaskItemListRoute {
  readonly state = resolve(TaskItemBrowseState);

  taskItemsPromise: ReturnType<TaskItemBrowseState['loadAssignedTasks']> = this.state.loadAssignedTasks();
  title: string = '';
  done: boolean = false;
  assignee: ContactEntry | null = this.state.contacts[0] ?? null;
  createStatusMessage: string = '';

  async create() {
    this.taskItemsPromise = this.state.createTaskItem(this.title, this.done, this.assignee);
    await this.taskItemsPromise;
    this.createStatusMessage = 'Task assignment saved.';
  }
}