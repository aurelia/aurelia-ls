import { resolve } from 'aurelia';
import { TaskItemService } from './services/task-item-service';

export class ServiceSearchTaskSection {
  private readonly taskItemService = resolve(TaskItemService);

  taskItemTitleQuery: string = '';

  reloadTaskItemsByTitle() {
    const queryValue = this.taskItemTitleQuery;
    this.taskItemsPromise = queryValue === ''
      ? this.taskItemService.listTaskItems()
      : this.taskItemService.searchTaskItemsByTitle(queryValue);
    return this.taskItemsPromise;
  }

  searchStatusMessage: string = '';
  clearSearchStatusMessage: string = '';
  taskItemsPromise: ReturnType<TaskItemService['listTaskItems']> = this.taskItemService.listTaskItems();

  async searchTaskItems() {
    await this.reloadTaskItemsByTitle();
    this.searchStatusMessage = 'Search applied.';
  }

  async clearTaskItemSearch() {
    this.taskItemTitleQuery = '';
    await this.reloadTaskItemsByTitle();
    this.clearSearchStatusMessage = 'Search cleared.';
  }
}