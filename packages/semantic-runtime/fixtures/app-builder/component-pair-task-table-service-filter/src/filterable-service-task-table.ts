import { resolve } from 'aurelia';
import { TaskItemService } from './services/task-item-service';

export class FilterableServiceTaskTable {
  private readonly taskItemService = resolve(TaskItemService);

  filterStatusMessage: string = '';
  taskItemsPromise: ReturnType<TaskItemService['listTaskItems']> = this.taskItemService.listTaskItems();

  async showCompletedTaskItems() {
    this.taskItemsPromise = this.taskItemService.listTaskItemsByDone(true);
    await this.taskItemsPromise;
    this.filterStatusMessage = 'Showing completed tasks.';
  }
}