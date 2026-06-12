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
      title: 'Filter completed service rows',
      done: true,
    },
    {
      id: 2,
      title: 'Create a new service-backed row',
      done: false,
    },
    {
      id: 3,
      title: 'Complete a row command',
      done: false,
    },
  ];

  async listTaskItems(): Promise<readonly TaskItemRecord[]> {
    return this.taskItems;
  }

  async listTaskItemsByDone(done: boolean): Promise<readonly TaskItemRecord[]> {
    return this.taskItems.filter((taskItem) => taskItem.done === done);
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
