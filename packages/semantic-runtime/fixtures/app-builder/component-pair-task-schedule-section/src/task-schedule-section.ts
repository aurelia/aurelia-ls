export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
    readonly schedule: ScheduleWindow,
  ) {}
}

export class ScheduleWindow {
  constructor(
    readonly id: number,
    readonly label: string,
    readonly confirmed: boolean,
  ) {}
}

export class TaskScheduleSection {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Prepare release notes', false, new ScheduleWindow(101, 'Draft review', true)),
    new TaskItem(2, 'Check deployment checklist', true, new ScheduleWindow(102, 'Launch readiness', false)),
  ];

  scheduleLabelForTaskItem(taskItem: TaskItem): string {
    return String(taskItem.schedule.label);
  }
}