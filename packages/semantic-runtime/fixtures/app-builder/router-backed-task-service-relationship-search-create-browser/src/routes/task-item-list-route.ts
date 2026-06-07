import { resolve } from 'aurelia';
import { TaskItemBrowseState } from '../task-item-browse-state';

export class TaskItemListRoute {
  readonly state = resolve(TaskItemBrowseState);

  taskItemsPromise: ReturnType<TaskItemBrowseState['loadTaskRelationships']> = this.state.loadTaskRelationships();
  taskRelationshipTitleQuery: string = '';
  searchStatusMessage: string = '';
  clearSearchStatusMessage: string = '';

  reloadTaskRelationshipsByTitle() {
    const queryValue = this.taskRelationshipTitleQuery;
    this.taskItemsPromise = queryValue === ''
      ? this.state.loadTaskRelationships()
      : this.state.searchTaskRelationshipsByTitle(queryValue);
  }

  searchTaskRelationships() {
    this.reloadTaskRelationshipsByTitle();
    this.searchStatusMessage = 'Search applied.';
  }

  clearTaskRelationshipSearch() {
    this.taskRelationshipTitleQuery = '';
    this.reloadTaskRelationshipsByTitle();
    this.clearSearchStatusMessage = 'Search cleared.';
  }

  title: string = '';
  done: boolean = false;
  assigneeId: string = 'ada';
  reviewerIds: string[] = ['ada'];
  createStatusMessage: string = '';

  async create() {
    this.taskItemsPromise = this.state.createTaskItem(this.title, this.done, this.assigneeId, this.reviewerIds);
    await this.taskItemsPromise;
    this.createStatusMessage = 'Task relationship saved.';
  }
}