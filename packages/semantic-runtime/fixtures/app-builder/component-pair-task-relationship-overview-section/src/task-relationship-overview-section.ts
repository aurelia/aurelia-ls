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

export class TaskRelationshipOverviewSection {
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
}