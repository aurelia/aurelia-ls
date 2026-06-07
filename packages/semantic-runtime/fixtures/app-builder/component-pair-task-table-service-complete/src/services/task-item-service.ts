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
      title: 'Trace row command service call',
      done: false,
    },
    {
      id: 2,
      title: 'Keep completed rows visible',
      done: true,
    },
  ];

  async listTaskItems(): Promise<readonly TaskItemRecord[]> {
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
