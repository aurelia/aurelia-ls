import { resolve } from 'aurelia';
import { TaskItemService } from './services/task-item-service';
import type { TaskItemRecord } from './services/task-item-service';

export class ServiceFilterCreateCompleteTaskSection {
  private readonly taskItemService = resolve(TaskItemService);

  taskItemDoneFilter: boolean | null = null;

  reloadTaskItems() {
    const queryValue = this.taskItemDoneFilter;
    this.taskItemsPromise = queryValue === null
      ? this.taskItemService.listTaskItems()
      : this.taskItemService.listTaskItemsByDone(queryValue);
  }

  title: string = '';
  done: boolean = false;
  allFilterStatusMessage: string = '';
  openFilterStatusMessage: string = '';
  completedFilterStatusMessage: string = '';
  createStatusMessage: string = '';
  completeStatusMessage: string = '';
  taskItemsPromise: ReturnType<TaskItemService['listTaskItems']> = this.taskItemService.listTaskItems();

  showAllTaskItems() {
    this.taskItemDoneFilter = null;
    this.reloadTaskItems();
    this.allFilterStatusMessage = 'Showing all tasks.';
  }

  showOpenTaskItems() {
    this.taskItemDoneFilter = false;
    this.reloadTaskItems();
    this.openFilterStatusMessage = 'Showing open tasks.';
  }

  showCompletedTaskItems() {
    this.taskItemDoneFilter = true;
    this.reloadTaskItems();
    this.completedFilterStatusMessage = 'Showing completed tasks.';
  }

  async create() {
    await this.taskItemService.createTaskItem(this.title, this.done);
    this.reloadTaskItems();
    this.createStatusMessage = 'Task saved.';
  }

  async complete(taskItem: TaskItemRecord) {
    await this.taskItemService.completeTaskItem(taskItem.id, true);
    this.reloadTaskItems();
    this.completeStatusMessage = 'Task completed.';
  }
}