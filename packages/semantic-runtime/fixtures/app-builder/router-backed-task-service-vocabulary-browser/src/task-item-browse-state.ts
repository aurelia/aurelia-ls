import { resolve } from 'aurelia';
import { TaskItem } from './task-item';
import { TaskRepository } from './api/task-repository';

export class TaskItemBrowseState {
  private readonly taskRepository = resolve(TaskRepository);

  fetchTaskItems(): Promise<readonly TaskItem[]> {
    return this.taskRepository.fetchTaskItems();
  }

  readTaskItem(id: string): Promise<TaskItem | null> {
    return this.taskRepository.readTaskItem(id);
  }

  createTaskItem(title: string, done: boolean): Promise<readonly TaskItem[]> {
    return this.taskRepository.addTaskItem(title, done);
  }
}
