export class TaskItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
    public assignee: ContactEntry | null,
  ) {}
}

export class ContactEntry {
  constructor(
    readonly contactId: string,
    readonly fullName: string,
    readonly email: string,
  ) {}
}

export class TaskOperationsSection {
  title: string = '';
  done: boolean = false;
  createStatusMessage: string = '';
  batchStatusMessage: string = '';

  readonly contacts: ContactEntry[] = [
    new ContactEntry('ada', 'Ada Lovelace', 'ada@example.test'),
    new ContactEntry('grace', 'Grace Hopper', 'grace@example.test'),
  ];

  readonly taskItems: TaskItem[] = [
    new TaskItem(1, 'Prepare release notes', false, this.contacts.find((contactEntry) => contactEntry.contactId === 'ada') ?? null),
    new TaskItem(2, 'Check deployment checklist', true, this.contacts.find((contactEntry) => contactEntry.contactId === 'grace') ?? null),
    new TaskItem(3, 'Review accessibility labels', false, this.contacts.find((contactEntry) => contactEntry.contactId === 'ada') ?? null),
    new TaskItem(4, 'Publish sprint summary', false, this.contacts.find((contactEntry) => contactEntry.contactId === 'grace') ?? null),
  ];

  assignee: ContactEntry | null = this.contacts[0] ?? null;
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

  taskItemsPage: number = 1;
  readonly taskItemsPageSize: number = 2;

  get taskItemsPageCount(): number {
    return Math.max(1, Math.ceil(this.filteredTaskItems.length / this.taskItemsPageSize));
  }

  get pagedTaskItems(): TaskItem[] {
    const safePage = Math.min(Math.max(1, this.taskItemsPage), this.taskItemsPageCount);
    const start = (safePage - 1) * this.taskItemsPageSize;
    return this.filteredTaskItems.slice(start, start + this.taskItemsPageSize);
  }

  previousTaskItemsPage(): void {
    this.taskItemsPage = Math.max(1, this.taskItemsPage - 1);
  }

  nextTaskItemsPage(): void {
    this.taskItemsPage = Math.min(this.taskItemsPageCount, this.taskItemsPage + 1);
  }

  selectedTaskItemIds: number[] = [];

  toggleTaskItemSelection(taskItem: TaskItem): void {
    const identity = taskItem.id;
    if (this.selectedTaskItemIds.includes(identity)) {
      this.selectedTaskItemIds = this.selectedTaskItemIds.filter((selectedIdentity) => selectedIdentity !== identity);
      return;
    }
    this.selectedTaskItemIds = [...this.selectedTaskItemIds, identity];
  }

  assigneeForTaskItem(taskItem: TaskItem): ContactEntry | null {
    return taskItem.assignee;
  }

  assigneeLabelForTaskItem(taskItem: TaskItem): string {
    const contactEntry = this.assigneeForTaskItem(taskItem);
    return contactEntry == null ? '' : String(contactEntry.fullName);
  }

  matchContactEntry(left: ContactEntry | null, right: ContactEntry | null): boolean {
    return left?.contactId === right?.contactId;
  }

  create() {
    const nextId = this.taskItems.length === 0 ? 1 : Math.max(...this.taskItems.map((taskItem) => taskItem.id)) + 1;
    this.taskItems.push(new TaskItem(nextId, this.title, this.done, this.assignee));
    this.title = '';
    this.done = false;
    this.assignee = this.contacts[0] ?? null;
    this.createStatusMessage = 'Task saved.';
  }

  sortByTitle() {
    this.taskItems.sort((left, right) => left.title.localeCompare(right.title));
    this.taskItemsPage = 1;
  }

  deleteSelectedTaskItems() {
    const selectedIds = new Set(this.selectedTaskItemIds);
    for (let index = this.taskItems.length - 1; index >= 0; index -= 1) {
      if (selectedIds.has(this.taskItems[index]!.id)) {
        this.taskItems.splice(index, 1);
      }
    }
    this.selectedTaskItemIds = [];
    this.taskItemsPage = Math.min(this.taskItemsPage, this.taskItemsPageCount);
    this.batchStatusMessage = 'Selected tasks deleted.';
  }
}