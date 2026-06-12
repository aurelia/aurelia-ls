export interface TaskItemRecord {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

export class TaskItemService {
  private readonly taskItems: TaskItemRecord[] = [
    {
      id: 1,
      title: 'Search service rows',
      done: false,
    },
    {
      id: 2,
      title: 'Review generated query state',
      done: true,
    },
    {
      id: 3,
      title: 'Clear task search',
      done: false,
    },
  ];

  async listTaskItems(): Promise<readonly TaskItemRecord[]> {
    return this.taskItems;
  }

  async searchTaskItemsByTitle(query: string): Promise<readonly TaskItemRecord[]> {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length === 0) {
      return this.taskItems;
    }
    return this.taskItems.filter((taskItem) => taskItem.title.toLowerCase().includes(normalizedQuery));
  }
}
