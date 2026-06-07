import { resolve } from 'aurelia';
import { TaskItemService } from './services/task-item-service';

export class RefreshableServiceTaskTable {
  private readonly taskItemService = resolve(TaskItemService);

  refreshStatusMessage: string = '';
  taskItemsPromise: ReturnType<TaskItemService['listTaskItems']> = this.taskItemService.listTaskItems();

  refreshTaskItems() {
    this.taskItemsPromise = this.taskItemService.listTaskItems();
    this.refreshStatusMessage = 'Tasks refreshed.';
  }
}