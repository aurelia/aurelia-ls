import { resolve } from 'aurelia';
import { TaskItem } from './task-item';
import { TaskItemService } from './services/task-item-service';

export class TaskItemBrowseState {
  private readonly taskItemService = resolve(TaskItemService);

  listTaskItems(): Promise<readonly TaskItem[]> {
    return this.taskItemService.listTaskItems();
  }

  findTaskItem(id: string): Promise<TaskItem | null> {
    return this.taskItemService.findTaskItem(id);
  }

  createTaskItem(title: string, done: boolean): Promise<readonly TaskItem[]> {
    return this.taskItemService.createTaskItem(title, done);
  }
}
