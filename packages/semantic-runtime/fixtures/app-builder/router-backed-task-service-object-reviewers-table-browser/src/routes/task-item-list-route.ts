import { resolve } from 'aurelia';
import { TaskItemBrowseState } from '../task-item-browse-state';
import type { ContactEntry } from '../contact-entry';

export class TaskItemListRoute {
  readonly state = resolve(TaskItemBrowseState);

  taskItemsPromise: ReturnType<TaskItemBrowseState['loadReviewedTasks']> = this.state.loadReviewedTasks();
  title: string = '';
  done: boolean = false;
  reviewers: ContactEntry[] = [];
  createStatusMessage: string = '';

  async create() {
    this.taskItemsPromise = this.state.createTaskItem(this.title, this.done, this.reviewers);
    await this.taskItemsPromise;
    this.createStatusMessage = 'Task reviewers saved.';
  }
}