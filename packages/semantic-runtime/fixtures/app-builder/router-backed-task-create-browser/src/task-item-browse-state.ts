import { TaskItem } from './task-item';

export class TaskItemBrowseState {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Plan the release checklist', false),
    new TaskItem(2, 'Publish the onboarding guide', true),
  ];

  findTaskItem(id: string): TaskItem | null {
    return this.taskItems.find((taskItem) => String(taskItem.id) === id) ?? null;
  }

  createTaskItem(title: string, done: boolean): void {
    const nextId = this.taskItems.length === 0
      ? 1
      : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push(new TaskItem(nextId, title, done));
  }
}
