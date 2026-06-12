export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class TaskTable {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Write project brief', false),
    new TaskItem(2, 'Confirm launch checklist', true),
  ];
}