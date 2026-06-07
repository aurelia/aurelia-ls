export interface TaskItemRecord {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

interface MutableTaskItemRecord {
  id: number;
  title: string;
  done: boolean;
}

export class TaskItemService {
  private readonly taskItems: MutableTaskItemRecord[] = [
    {
      id: 1,
      title: 'Search before creating rows',
      done: false,
    },
    {
      id: 2,
      title: 'Complete a searched row',
      done: false,
    },
    {
      id: 3,
      title: 'Review search preservation',
      done: true,
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

  async createTaskItem(title: string, done: boolean): Promise<readonly TaskItemRecord[]> {
    const nextId = this.taskItems.length === 0 ? 1 : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push({
      id: nextId,
      title,
      done,
    });
    return this.taskItems;
  }

  async completeTaskItem(id: number, done: boolean): Promise<readonly TaskItemRecord[]> {
    const taskItem = this.taskItems.find((candidate) => candidate.id === id);
    if (taskItem != null) {
      taskItem.done = done;
    }
    return this.taskItems;
  }
}
