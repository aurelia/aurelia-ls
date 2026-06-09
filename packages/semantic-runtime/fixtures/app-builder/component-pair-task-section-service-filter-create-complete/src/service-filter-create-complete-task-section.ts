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
    return this.taskItemsPromise;
  }

  title: string = '';
  done: boolean = false;
  allFilterStatusMessage: string = '';
  openFilterStatusMessage: string = '';
  completedFilterStatusMessage: string = '';
  createStatusMessage: string = '';
  completeStatusMessage: string = '';
  taskItemsPromise: ReturnType<TaskItemService['listTaskItems']> = this.taskItemService.listTaskItems();

  async showAllTaskItems() {
    this.taskItemDoneFilter = null;
    await this.reloadTaskItems();
    this.allFilterStatusMessage = 'Showing all tasks.';
  }

  async showOpenTaskItems() {
    this.taskItemDoneFilter = false;
    await this.reloadTaskItems();
    this.openFilterStatusMessage = 'Showing open tasks.';
  }

  async showCompletedTaskItems() {
    this.taskItemDoneFilter = true;
    await this.reloadTaskItems();
    this.completedFilterStatusMessage = 'Showing completed tasks.';
  }

  async create() {
    await this.taskItemService.createTaskItem(this.title, this.done);
    await this.reloadTaskItems();
    this.createStatusMessage = 'Task saved.';
  }

  async complete(taskItem: TaskItemRecord) {
    await this.taskItemService.completeTaskItem(taskItem.id, true);
    await this.reloadTaskItems();
    this.completeStatusMessage = 'Task completed.';
  }
}