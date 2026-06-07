export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class TaskTableHooks {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Review quarterly goals', false),
    new TaskItem(2, 'Confirm team availability', true),
  ];
}