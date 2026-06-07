import { TaskItem } from '../task-item';

export class TaskRepository {
  private readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Prepare onboarding checklist', false),
    new TaskItem(2, 'Send invoice reminder', false),
  ];

  async fetchTaskItems(): Promise<readonly TaskItem[]> {
    return this.taskItems;
  }

  async readTaskItem(id: string): Promise<TaskItem | null> {
    return this.taskItems.find((taskItem) => String(taskItem.id) === id) ?? null;
  }

  async addTaskItem(title: string, done: boolean): Promise<readonly TaskItem[]> {
    const nextId = this.taskItems.length === 0 ? 1 : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push(new TaskItem(nextId, title, done));
    return this.taskItems;
  }
}
