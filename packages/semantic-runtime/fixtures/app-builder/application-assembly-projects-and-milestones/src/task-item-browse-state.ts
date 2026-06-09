import { resolve } from 'aurelia';
import { TaskItem } from './task-item';
import { AppState } from './app-state';
import { Project } from './project';

export class TaskItemBrowseState {
  private readonly appState = resolve(AppState);
  readonly projects = this.appState.projects;
  readonly taskItems = this.appState.taskItems;

  findTaskItem(id: string): TaskItem | null {
    return this.taskItems.find((taskItem) => String(taskItem.id) === id) ?? null;
  }

  createTaskItem(title: string, done: boolean, projectId: number): void {
    const nextId = this.taskItems.length === 0
      ? 1
      : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push(new TaskItem(nextId, title, done, projectId));
  }

  projectForTaskItem(taskItem: TaskItem): Project | null {
    return this.projects.find((project) => project.id === taskItem.projectId) ?? null;
  }

  projectLabelForTaskItem(taskItem: TaskItem): string {
    const project = this.projectForTaskItem(taskItem);
    return project == null ? '' : String(project.name);
  }
}
