import { resolve } from 'aurelia';
import { TaskItemBrowseState } from '../task-item-browse-state';

export class TaskItemListRoute {
  readonly state = resolve(TaskItemBrowseState);

  taskItemsPromise: ReturnType<TaskItemBrowseState['fetchTaskItems']> = this.state.fetchTaskItems();
  title: string = '';
  done: boolean = false;
  createStatusMessage: string = '';

  async create() {
    this.taskItemsPromise = this.state.createTaskItem(this.title, this.done);
    await this.taskItemsPromise;
    this.createStatusMessage = 'Task saved.';
  }
}