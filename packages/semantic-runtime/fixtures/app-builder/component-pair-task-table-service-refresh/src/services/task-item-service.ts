export interface TaskItemRecord {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

export class TaskItemService {
  private readonly taskItems: TaskItemRecord[] = [
    {
      id: 1,
      title: 'Refresh generated fixtures',
      done: false,
    },
    {
      id: 2,
      title: 'Review service boundary inputs',
      done: true,
    },
  ];

  async listTaskItems(): Promise<readonly TaskItemRecord[]> {
    return this.taskItems;
  }
}
