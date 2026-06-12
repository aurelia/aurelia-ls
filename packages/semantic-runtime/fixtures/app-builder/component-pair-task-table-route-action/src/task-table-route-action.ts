export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class TaskTableRouteAction {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Prepare onboarding checklist', false),
    new TaskItem(2, 'Send invoice reminder', false),
  ];
}