export interface TaskItemRecord {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

export class TaskItemService {
  private readonly taskItems: TaskItemRecord[] = [
    {
      id: 1,
      title: 'Model service filter inputs',
      done: false,
    },
    {
      id: 2,
      title: 'Verify filtered source lowering',
      done: true,
    },
  ];

  async listTaskItems(): Promise<readonly TaskItemRecord[]> {
    return this.taskItems;
  }

  async listTaskItemsByDone(done: boolean): Promise<readonly TaskItemRecord[]> {
    return this.taskItems.filter((taskItem) => taskItem.done === done);
  }
}
