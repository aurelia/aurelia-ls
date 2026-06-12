import { resolve } from 'aurelia';
import { TaskItemBrowseState } from '../task-item-browse-state';

export class TaskItemListRoute {
  readonly state = resolve(TaskItemBrowseState);

  title: string = '';
  assigneeId: string = 'ada';
  reviewerIds: string[] = ['ada'];

  create() {
    this.state.createTaskItem(this.title, this.assigneeId, this.reviewerIds);
  }
}