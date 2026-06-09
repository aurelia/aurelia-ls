import { resolve } from 'aurelia';
import { TaskItemService } from './services/task-item-service';

export class ServiceCreateTaskSection {
  private readonly taskItemService = resolve(TaskItemService);

  title: string = '';
  done: boolean = false;
  createStatusMessage: string = '';
  taskItemsPromise: ReturnType<TaskItemService['listTaskItems']> = this.taskItemService.listTaskItems();

  async create() {
    this.taskItemsPromise = this.taskItemService.createTaskItem(this.title, this.done);
    await this.taskItemsPromise;
    this.createStatusMessage = 'Task saved.';
  }
}