import { resolve } from 'aurelia';
import { TaskItemService } from './services/task-item-service';
import type { TaskItemRecord } from './services/task-item-service';

export class ServiceSearchCreateCompleteTaskSection {
  private readonly taskItemService = resolve(TaskItemService);

  taskItemTitleQuery: string = '';

  reloadTaskItemsByTitle() {
    const queryValue = this.taskItemTitleQuery;
    this.taskItemsPromise = queryValue === ''
      ? this.taskItemService.listTaskItems()
      : this.taskItemService.searchTaskItemsByTitle(queryValue);
  }

  title: string = '';
  done: boolean = false;
  searchStatusMessage: string = '';
  clearSearchStatusMessage: string = '';
  createStatusMessage: string = '';
  completeStatusMessage: string = '';
  taskItemsPromise: ReturnType<TaskItemService['listTaskItems']> = this.taskItemService.listTaskItems();

  searchTaskItems() {
    this.reloadTaskItemsByTitle();
    this.searchStatusMessage = 'Search applied.';
  }

  clearTaskItemSearch() {
    this.taskItemTitleQuery = '';
    this.reloadTaskItemsByTitle();
    this.clearSearchStatusMessage = 'Search cleared.';
  }

  async create() {
    await this.taskItemService.createTaskItem(this.title, this.done);
    this.reloadTaskItemsByTitle();
    this.createStatusMessage = 'Task saved.';
  }

  async complete(taskItem: TaskItemRecord) {
    await this.taskItemService.completeTaskItem(taskItem.id, true);
    this.reloadTaskItemsByTitle();
    this.completeStatusMessage = 'Task completed.';
  }
}