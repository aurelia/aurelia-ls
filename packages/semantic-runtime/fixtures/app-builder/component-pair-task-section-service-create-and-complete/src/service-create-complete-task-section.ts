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

  create() {
    this.taskItemsPromise = this.taskItemService.createTaskItem(this.title, this.done);
    this.createStatusMessage = 'Task saved.';
  }

  complete(taskItem: TaskItemRecord) {
    this.taskItemsPromise = this.taskItemService.completeTaskItem(taskItem.id, true);
    this.completeStatusMessage = 'Task completed.';
  }
}