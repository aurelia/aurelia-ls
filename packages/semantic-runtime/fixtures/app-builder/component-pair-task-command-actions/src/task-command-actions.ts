export class TaskItem {
  constructor(
    readonly id: number,
    public title: string,
    public done: boolean,
  ) {}
}

export class TaskCommandActions {
  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Review release notes', false),
    new TaskItem(2, 'Confirm migration checklist', false),
  ];

  updateTask(taskItem: TaskItem) {
    taskItem.title = taskItem.title.trim();
  }

  deleteTask(taskItem: TaskItem) {
    const index = this.taskItems.findIndex((candidate) => candidate.id === taskItem.id);
    if (index >= 0) {
      this.taskItems.splice(index, 1);
    }
  }

  archiveTask(taskItem: TaskItem) {
    taskItem.done = true;
  }

  assignTask(taskItem: TaskItem) {
    taskItem.title = `${taskItem.title} (assigned)`;
  }

  submitTaskReport() {
    console.info('submit task report', this.taskItems.length);
  }

  refreshTaskItems() {
    this.taskItems.sort((left, right) => left.title.localeCompare(right.title));
  }
}