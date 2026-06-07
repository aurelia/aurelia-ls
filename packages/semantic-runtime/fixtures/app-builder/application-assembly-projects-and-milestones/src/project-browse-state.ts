import { Project } from './project';
import { TaskItem } from './task-item';

export class ProjectBrowseState {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Prepare release notes', false, 1),
    new TaskItem(2, 'Check deployment checklist', true, 2),
    new TaskItem(3, 'Collect preview feedback', false, 1),
  ];
  readonly projects: Project[] = [
    new Project(1, 'Platform refresh', 'Planning'),
    new Project(2, 'Docs cleanup', 'Active'),
  ];

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
