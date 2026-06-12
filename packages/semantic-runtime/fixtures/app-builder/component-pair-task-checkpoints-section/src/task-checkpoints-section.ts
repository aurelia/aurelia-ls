export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
    readonly checkpoints: CheckpointItem[],
  ) {}
}

export class CheckpointItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class TaskCheckpointsSection {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Prepare release notes', false, [
      new CheckpointItem(101, 'Draft summary', true),
      new CheckpointItem(102, 'Review changes', false),
    ]),
    new TaskItem(2, 'Check deployment checklist', true, [
      new CheckpointItem(201, 'Confirm owners', true),
    ]),
  ];

  checkpointsLabelForTaskItem(taskItem: TaskItem): string {
    return taskItem.checkpoints.length === 0 ? '' : taskItem.checkpoints.map((checkpointItem) => String(checkpointItem.title)).join(', ');
  }
}