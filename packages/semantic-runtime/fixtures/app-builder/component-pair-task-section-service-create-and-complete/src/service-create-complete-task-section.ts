import { resolve } from 'aurelia';
import { TaskItemService } from './services/task-item-service';
import type { TaskItemRecord } from './services/task-item-service';

export class ServiceCreateCompleteTaskSection {
  private readonly taskItemService = resolve(TaskItemService);

  title: string = '';
  done: boolean = false;
  createStatusMessage: string = '';
  completeStatusMessage: string = '';
  taskItemsPromise: ReturnType<TaskItemService['listTaskItems']> = this.taskItemService.listTaskItems();

  async create() {
    this.taskItemsPromise = this.taskItemService.createTaskItem(this.title, this.done);
    await this.taskItemsPromise;
    this.createStatusMessage = 'Task saved.';
  }

  async complete(taskItem: TaskItemRecord) {
    this.taskItemsPromise = this.taskItemService.completeTaskItem(taskItem.id, true);
    await this.taskItemsPromise;
    this.completeStatusMessage = 'Task completed.';
  }
}