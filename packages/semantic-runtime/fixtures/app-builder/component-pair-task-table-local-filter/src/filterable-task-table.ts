export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class FilterableTaskTable {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Write project brief', false),
    new TaskItem(2, 'Confirm launch checklist', true),
    new TaskItem(3, 'Review onboarding notes', false),
  ];

  titleFilter: string = '';

  get filteredTaskItems(): TaskItem[] {
    const filterText = this.titleFilter.trim().toLowerCase();
    if (filterText.length === 0) {
      return this.taskItems;
    }
    return this.taskItems.filter((taskItem) =>
      String(taskItem.title).toLowerCase().includes(filterText)
    );
  }
}