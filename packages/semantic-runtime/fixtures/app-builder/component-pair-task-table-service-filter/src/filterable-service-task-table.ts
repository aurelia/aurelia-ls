import { resolve } from 'aurelia';
import { TaskItemService } from './services/task-item-service';

export class FilterableServiceTaskTable {
  private readonly taskItemService = resolve(TaskItemService);

  filterStatusMessage: string = '';
  taskItemsPromise: ReturnType<TaskItemService['listTaskItems']> = this.taskItemService.listTaskItems();

  showCompletedTaskItems() {
    this.taskItemsPromise = this.taskItemService.listTaskItemsByDone(true);
    this.filterStatusMessage = 'Showing completed tasks.';
  }
}