import { resolve } from 'aurelia';
import { TaskItemBrowseState } from '../task-item-browse-state';

export class TaskItemListRoute {
  readonly state = resolve(TaskItemBrowseState);

  taskItemsPromise: ReturnType<TaskItemBrowseState['loadAssignedTasks']> = this.state.loadAssignedTasks();
  title: string = '';
  assigneeId: string = 'ada';
  reviewerIds: string[] = ['ada'];
  createStatusMessage: string = '';

  async create() {
    this.taskItemsPromise = this.state.createTaskItem(this.title, this.assigneeId, this.reviewerIds);
    await this.taskItemsPromise;
    this.createStatusMessage = 'Task assignment saved.';
  }
}