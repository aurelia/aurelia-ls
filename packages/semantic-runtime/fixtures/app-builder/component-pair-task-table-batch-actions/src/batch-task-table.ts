export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class BatchTaskTable {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Draft onboarding plan', false),
    new TaskItem(2, 'Ship accessibility pass', false),
    new TaskItem(3, 'Review table states', true),
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

  deleteSelectedTaskItems() {
    const selectedIds = new Set(this.selectedTaskItemIds);
    for (let index = this.taskItems.length - 1; index >= 0; index -= 1) {
      if (selectedIds.has(this.taskItems[index]!.id)) {
        this.taskItems.splice(index, 1);
      }
    }
    this.selectedTaskItemIds = [];
  }
}