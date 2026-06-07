export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
    readonly effort: TaskEffort,
  ) {}
}

export class TaskEffort {
  constructor(
    readonly summary: string,
    readonly hours: number,
  ) {}
}

export class TaskEffortSection {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Prepare release notes', false, new TaskEffort('Short focused pass', 2)),
    new TaskItem(2, 'Check deployment checklist', true, new TaskEffort('Review with owner', 1)),
  ];

  effortLabelForTaskItem(taskItem: TaskItem): string {
    return String(taskItem.effort.summary);
  }
}