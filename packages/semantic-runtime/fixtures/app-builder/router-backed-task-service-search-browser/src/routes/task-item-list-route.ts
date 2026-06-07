import { resolve } from 'aurelia';
import { TaskItemBrowseState } from '../task-item-browse-state';

export class TaskItemListRoute {
  readonly state = resolve(TaskItemBrowseState);

  taskItemsPromise: ReturnType<TaskItemBrowseState['loadTaskItems']> = this.state.loadTaskItems();
  taskItemTitleQuery: string = '';
  searchStatusMessage: string = '';
  clearSearchStatusMessage: string = '';

  reloadTaskItemsByTitle() {
    const queryValue = this.taskItemTitleQuery;
    this.taskItemsPromise = queryValue === ''
      ? this.state.loadTaskItems()
      : this.state.searchTaskItemsByTitle(queryValue);
  }

  searchTaskItems() {
    this.reloadTaskItemsByTitle();
    this.searchStatusMessage = 'Search applied.';
  }

  clearTaskItemSearch() {
    this.taskItemTitleQuery = '';
    this.reloadTaskItemsByTitle();
    this.clearSearchStatusMessage = 'Search cleared.';
  }
}