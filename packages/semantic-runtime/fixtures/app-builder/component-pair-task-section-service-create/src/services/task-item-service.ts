export interface TaskItemRecord {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

export class TaskItemService {
  private readonly taskItems: TaskItemRecord[] = [
    {
      id: 1,
      title: 'Open service write boundary',
      done: false,
    },
    {
      id: 2,
      title: 'Verify generated create method',
      done: true,
    },
  ];

  async listTaskItems(): Promise<readonly TaskItemRecord[]> {
    return this.taskItems;
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
}
