export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class AsyncTaskSection {
  title: string = '';
  done: boolean = false;

  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Prepare sprint report', false),
    new TaskItem(2, 'Send release update', true),
  ];

  readonly taskItemsPromise: Promise<TaskItem[]> = Promise.resolve(this.taskItems);

  create() {
    const nextId = this.taskItems.length === 0 ? 1 : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push(new TaskItem(nextId, this.title, this.done));
    this.title = '';
    this.done = false;
  }
}