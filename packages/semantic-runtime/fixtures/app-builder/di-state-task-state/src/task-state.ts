export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class TaskItemState {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Prepare project outline', false),
    new TaskItem(2, 'Confirm team schedule', true),
  ];
}
