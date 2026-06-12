import { TaskItem } from './task-item';
import type { TaskItemPriority, TaskItemLabel } from './task-item';

export class TaskItemBrowseState {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Review release notes', 'normal', ['docs']),
    new TaskItem(2, 'Prepare issue triage', 'urgent', ['frontend', 'review']),
  ];
  readonly priorityOptions: readonly { readonly value: TaskItemPriority; readonly title: string }[] = [
    { value: 'low', title: 'Low' },
    { value: 'normal', title: 'Normal' },
    { value: 'urgent', title: 'Urgent' },
  ];
  readonly labelOptions: readonly { readonly value: TaskItemLabel; readonly title: string }[] = [
    { value: 'frontend', title: 'Frontend' },
    { value: 'review', title: 'Review' },
    { value: 'docs', title: 'Docs' },
  ];

  findTaskItem(id: string): TaskItem | null {
    return this.taskItems.find((taskItem) => String(taskItem.id) === id) ?? null;
  }

  createTaskItem(title: string, priority: TaskItemPriority, labels: TaskItemLabel[]): void {
    const nextId = this.taskItems.length === 0
      ? 1
      : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push(new TaskItem(nextId, title, priority, labels));
  }
}
