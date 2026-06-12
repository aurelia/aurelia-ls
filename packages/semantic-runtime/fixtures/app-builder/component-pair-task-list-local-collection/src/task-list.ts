export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class TaskList {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Draft onboarding task', false),
    new TaskItem(2, 'Schedule stakeholder review', true),
  ];
}