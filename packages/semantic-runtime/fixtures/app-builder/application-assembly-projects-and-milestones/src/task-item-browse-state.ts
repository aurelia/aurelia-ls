import { TaskItem } from './task-item';
import { Project } from './project';

export class TaskItemBrowseState {
  readonly projects: Project[] = [
    new Project(1, 'Platform refresh', 'Planning'),
    new Project(2, 'Docs cleanup', 'Active'),
  ];
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Prepare release notes', false, 1),
    new TaskItem(2, 'Check deployment checklist', true, 2),
    new TaskItem(3, 'Collect preview feedback', false, 1),
  ];

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
