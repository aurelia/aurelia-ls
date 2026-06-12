export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class SelectableTaskTable {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Write project brief', false),
    new TaskItem(2, 'Confirm launch checklist', true),
    new TaskItem(3, 'Review onboarding notes', false),
  ];

  selectedTaskItemIds: number[] = [];

  toggleTaskItemSelection(taskItem: TaskItem): void {
    const identity = taskItem.id;
    if (this.selectedTaskItemIds.includes(identity)) {
      this.selectedTaskItemIds = this.selectedTaskItemIds.filter((selectedIdentity) => selectedIdentity !== identity);
      return;
    }
    this.selectedTaskItemIds = [...this.selectedTaskItemIds, identity];
  }
}