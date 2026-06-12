import { TaskItem } from '../task-item';

export class TaskSearchService {
  private readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Search routed tasks', false),
    new TaskItem(2, 'Review generated service query', true),
    new TaskItem(3, 'Clear task search', false),
  ];

  async loadTaskItems(): Promise<readonly TaskItem[]> {
    return this.taskItems;
  }

  async loadTaskItem(id: string): Promise<TaskItem | null> {
    return this.taskItems.find((taskItem) => String(taskItem.id) === id) ?? null;
  }

  async searchTaskItemsByTitle(query: string): Promise<readonly TaskItem[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return this.taskItems;
    }
    return this.taskItems.filter((taskItem) => taskItem.title.toLowerCase().includes(normalizedQuery));
  }
}
