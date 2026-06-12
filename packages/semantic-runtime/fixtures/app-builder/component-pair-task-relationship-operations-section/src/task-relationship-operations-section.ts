export interface TaskItemInit {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
  readonly assigneeId: string;
  readonly reviewerIds: string[];
  readonly schedule: ScheduleWindow;
  readonly checkpoints: CheckpointItem[];
  readonly effort: TaskEffort;
}

export class TaskItem {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
  readonly assigneeId: string;
  readonly reviewerIds: string[];
  readonly schedule: ScheduleWindow;
  readonly checkpoints: CheckpointItem[];
  readonly effort: TaskEffort;

  constructor(init: TaskItemInit) {
    this.id = init.id;
    this.title = init.title;
    this.done = init.done;
    this.assigneeId = init.assigneeId;
    this.reviewerIds = init.reviewerIds;
    this.schedule = init.schedule;
    this.checkpoints = init.checkpoints;
    this.effort = init.effort;
  }
}

export class ContactEntry {
  constructor(
    readonly contactId: string,
    readonly fullName: string,
    readonly email: string,
  ) {}
}

export class ScheduleWindow {
  constructor(
    readonly id: number,
    readonly label: string,
    readonly confirmed: boolean,
  ) {}
}

export class CheckpointItem {
  constructor(
    readonly id: number,
    readonly title: string,
    readonly done: boolean,
  ) {}
}

export class TaskEffort {
  constructor(
    readonly summary: string,
    readonly hours: number,
  ) {}
}

export class TaskRelationshipOperationsSection {
  readonly contacts: ContactEntry[] = [
    new ContactEntry('ada', 'Ada Lovelace', 'ada@example.test'),
    new ContactEntry('grace', 'Grace Hopper', 'grace@example.test'),
  ];

  readonly taskItems: TaskItem[] = [
    new TaskItem({
      id: 1,
      title: 'Prepare release notes',
      done: false,
      assigneeId: 'ada',
      reviewerIds: ['ada', 'grace'],
      schedule: new ScheduleWindow(101, 'Draft review', true),
      checkpoints: [
        new CheckpointItem(1001, 'Draft summary', true),
        new CheckpointItem(1002, 'Review changes', false),
      ],
      effort: new TaskEffort('Short focused pass', 2),
    }),
    new TaskItem({
      id: 2,
      title: 'Check deployment checklist',
      done: true,
      assigneeId: 'grace',
      reviewerIds: ['ada'],
      schedule: new ScheduleWindow(102, 'Launch readiness', false),
      checkpoints: [
        new CheckpointItem(2001, 'Confirm owners', true),
      ],
      effort: new TaskEffort('Review with owner', 1),
    }),
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

  taskItemsPage: number = 1;
  readonly taskItemsPageSize: number = 1;

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
    return this.contacts.find((contactEntry) => contactEntry.contactId === taskItem.assigneeId) ?? null;
  }

  assigneeLabelForTaskItem(taskItem: TaskItem): string {
    const contactEntry = this.assigneeForTaskItem(taskItem);
    return contactEntry == null ? '' : String(contactEntry.fullName);
  }

  reviewersForTaskItem(taskItem: TaskItem): ContactEntry[] {
    return this.contacts.filter((contactEntry) => taskItem.reviewerIds.includes(contactEntry.contactId));
  }

  reviewersLabelForTaskItem(taskItem: TaskItem): string {
    const contacts = this.reviewersForTaskItem(taskItem);
    return contacts.length === 0 ? '' : contacts.map((contactEntry) => String(contactEntry.fullName)).join(', ');
  }

  scheduleLabelForTaskItem(taskItem: TaskItem): string {
    return String(taskItem.schedule.label);
  }

  checkpointsLabelForTaskItem(taskItem: TaskItem): string {
    return taskItem.checkpoints.length === 0 ? '' : taskItem.checkpoints.map((checkpointItem) => String(checkpointItem.title)).join(', ');
  }

  effortLabelForTaskItem(taskItem: TaskItem): string {
    return String(taskItem.effort.summary);
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
  }
}