export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class TaskCards {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Prepare welcome email', false),
    new TaskItem(2, 'Confirm design review', true),
  ];
}