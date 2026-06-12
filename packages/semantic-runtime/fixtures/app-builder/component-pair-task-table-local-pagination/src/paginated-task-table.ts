export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class PaginatedTaskTable {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Write project brief', false),
    new TaskItem(2, 'Confirm launch checklist', true),
    new TaskItem(3, 'Review onboarding notes', false),
    new TaskItem(4, 'Send stakeholder update', true),
    new TaskItem(5, 'Archive planning notes', false),
  ];

  taskItemsPage: number = 1;
  readonly taskItemsPageSize: number = 2;

  get taskItemsPageCount(): number {
    return Math.max(1, Math.ceil(this.taskItems.length / this.taskItemsPageSize));
  }

  get pagedTaskItems(): TaskItem[] {
    const safePage = Math.min(Math.max(1, this.taskItemsPage), this.taskItemsPageCount);
    const start = (safePage - 1) * this.taskItemsPageSize;
    return this.taskItems.slice(start, start + this.taskItemsPageSize);
  }

  previousTaskItemsPage(): void {
    this.taskItemsPage = Math.max(1, this.taskItemsPage - 1);
  }

  nextTaskItemsPage(): void {
    this.taskItemsPage = Math.min(this.taskItemsPageCount, this.taskItemsPage + 1);
  }
}