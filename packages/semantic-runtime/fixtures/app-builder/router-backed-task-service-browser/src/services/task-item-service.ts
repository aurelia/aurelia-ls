import { TaskItem } from '../task-item';

export class TaskItemService {
  private readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Plan the release checklist', false),
    new TaskItem(2, 'Publish the onboarding guide', true),
  ];

  async listTaskItems(): Promise<readonly TaskItem[]> {
    return this.taskItems;
  }

  async findTaskItem(id: string): Promise<TaskItem | null> {
    return this.taskItems.find((taskItem) => String(taskItem.id) === id) ?? null;
  }

  async createTaskItem(title: string, done: boolean): Promise<readonly TaskItem[]> {
    const nextId = this.taskItems.length === 0 ? 1 : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push(new TaskItem(nextId, title, done));
    return this.taskItems;
  }
}
