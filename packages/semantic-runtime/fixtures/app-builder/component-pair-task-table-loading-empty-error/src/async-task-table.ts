export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class AsyncTaskTable {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Collect vendor quotes', false),
    new TaskItem(2, 'Publish meeting summary', true),
  ];

  readonly taskItemsPromise: Promise<TaskItem[]> = Promise.resolve(this.taskItems);
}