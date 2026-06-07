import { resolve } from 'aurelia';
import { TaskItemService } from './services/task-item-service';

export class ServiceTaskTable {
  private readonly taskItemService = resolve(TaskItemService);

  readonly taskItemsPromise: ReturnType<TaskItemService['listTaskItems']> = this.taskItemService.listTaskItems();
}