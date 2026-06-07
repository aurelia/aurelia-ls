import { resolve } from 'aurelia';
import { TaskItemService } from './services/task-item-service';
import type { TaskItemRecord } from './services/task-item-service';

export class ServiceCompleteTaskTable {
  private readonly taskItemService = resolve(TaskItemService);

  taskItemsPromise: ReturnType<TaskItemService['listTaskItems']> = this.taskItemService.listTaskItems();

  complete(taskItem: TaskItemRecord) {
    this.taskItemsPromise = this.taskItemService.completeTaskItem(taskItem.id, true);
  }
}