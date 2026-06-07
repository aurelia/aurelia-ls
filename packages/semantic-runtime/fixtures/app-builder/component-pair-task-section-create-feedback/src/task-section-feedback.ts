export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class TaskSectionFeedback {
  title: string = '';
  done: boolean = false;
  actionStatusMessage: string = '';

  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Plan sprint goals', false),
    new TaskItem(2, 'Review pull request', true),
  ];

  create() {
    const nextId = this.taskItems.length === 0 ? 1 : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push(new TaskItem(nextId, this.title, this.done));
    this.title = '';
    this.done = false;
    this.actionStatusMessage = 'Task saved.';
  }
}