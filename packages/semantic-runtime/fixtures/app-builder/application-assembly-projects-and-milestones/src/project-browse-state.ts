import { resolve } from 'aurelia';
import { Project } from './project';
import { AppState } from './app-state';
import { TaskItem } from './task-item';

export class ProjectBrowseState {
  private readonly appState = resolve(AppState);
  readonly taskItems = this.appState.taskItems;
  readonly projects = this.appState.projects;

  findProject(id: string): Project | null {
    return this.projects.find((project) => String(project.id) === id) ?? null;
  }

  createProject(name: string, phase: string): void {
    const nextId = this.projects.length === 0
      ? 1
      : Math.max(...this.projects.map((project) => project.id)) + 1;
    this.projects.push(new Project(nextId, name, phase));
  }

  taskItemsForProject(project: Project): TaskItem[] {
    return this.taskItems.filter((taskItem) => taskItem.projectId === project.id);
  }
}
