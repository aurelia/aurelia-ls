export interface TaskItemRecord {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

export class TaskItemService {
  private readonly taskItems: TaskItemRecord[] = [
    {
      id: 1,
      title: 'Prepare import contract',
      done: false,
    },
    {
      id: 2,
      title: 'Verify service topology',
      done: true,
    },
  ];

  async listTaskItems(): Promise<readonly TaskItemRecord[]> {
    return this.taskItems;
  }
}
