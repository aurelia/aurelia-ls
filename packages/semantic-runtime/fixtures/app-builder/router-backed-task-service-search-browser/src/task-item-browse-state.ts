import { resolve } from 'aurelia';
import { TaskItem } from './task-item';
import { TaskSearchService } from './services/task-search-service';

export class TaskItemBrowseState {
  private readonly taskSearchService = resolve(TaskSearchService);

  loadTaskItems(): Promise<readonly TaskItem[]> {
    return this.taskSearchService.loadTaskItems();
  }

  loadTaskItem(id: string): Promise<TaskItem | null> {
    return this.taskSearchService.loadTaskItem(id);
  }

  searchTaskItemsByTitle(query: string): Promise<readonly TaskItem[]> {
    return this.taskSearchService.searchTaskItemsByTitle(query);
  }
}
