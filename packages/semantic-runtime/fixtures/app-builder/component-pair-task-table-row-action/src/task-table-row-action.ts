export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    public done: boolean,
  ) {}
}

export class TaskTableRowAction {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Prepare onboarding checklist', false),
    new TaskItem(2, 'Send invoice reminder', false),
  ];

  complete(taskItem: TaskItem) {
    taskItem.done = true;
  }
}